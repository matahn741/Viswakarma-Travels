import type { APIRoute } from "astro";
import { bikes, bikeTaxiId } from "../../config/site";
import { dateIsClosed, getBookingAdminSettings } from "../../lib/adminStore";
import { computeAdvanceInr, computeFareForDistanceKm } from "../../lib/fare";

export const prerender = false;

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function json(data: unknown, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function envValue(name: "TELEGRAM_BOT_TOKEN" | "TELEGRAM_CHAT_ID") {
  return String(import.meta.env[name] ?? "").trim();
}

type TelegramApiResponse = {
  ok?: boolean;
  description?: string;
};

async function sendTelegramDocument(
  token: string,
  chatId: string,
  blob: Blob,
  filename: string,
  caption: string,
): Promise<{ ok: boolean; description?: string }> {
  const docBody = new FormData();
  docBody.append("chat_id", chatId);
  docBody.append("caption", caption);
  docBody.append("document", blob, filename);
  const sendDocUrl = `https://api.telegram.org/bot${token}/sendDocument`;
  let docRes: Response;
  try {
    docRes = await fetch(sendDocUrl, { method: "POST", body: docBody });
  } catch (error) {
    console.error("Telegram document request failed:", error);
    return { ok: false, description: "Network error sending document." };
  }
  let docPayload: TelegramApiResponse | null = null;
  try {
    docPayload = (await docRes.json()) as TelegramApiResponse;
  } catch {
    docPayload = null;
  }
  if (!docRes.ok || docPayload?.ok === false) {
    console.error("Telegram document rejected:", docPayload?.description ?? docRes.statusText);
    return { ok: false, description: docPayload?.description };
  }
  return { ok: true };
}

export const GET: APIRoute = () =>
  new Response(JSON.stringify({ error: "Method not allowed" }), {
    status: 405,
    headers: { "Content-Type": "application/json" },
  });

export const POST: APIRoute = async ({ request }) => {
  const token = envValue("Token existe:", !!token);
  const chatId = envValue("Chat ID exists:", !!chatId);

  if (!token || !chatId) {
    return json(
      { error: "Booking service is not configured. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID." },
      503,
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return json({ error: "Invalid form data." }, 400);
  }

  const bikeId = String(formData.get("bikeId") ?? "").trim();
  const date = String(formData.get("date") ?? "").trim();
  const time = String(formData.get("time") ?? "").trim();
  const customerName = String(formData.get("customerName") ?? "").trim();
  const customerPhone = String(formData.get("customerPhone") ?? "").trim();
  const pickup = String(formData.get("pickup") ?? "").trim();
  const drop = String(formData.get("drop") ?? "").trim();
  const pickupLat = String(formData.get("pickupLat") ?? "").trim();
  const pickupLng = String(formData.get("pickupLng") ?? "").trim();
  const dropLat = String(formData.get("dropLat") ?? "").trim();
  const dropLng = String(formData.get("dropLng") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const proof = formData.get("proof");

  const bike = bikes.find((b) => b.id === bikeId);
  if (!bike) {
    return json({ error: "Please select a valid vehicle." }, 400);
  }

  const adminSettings = await getBookingAdminSettings();
  if (adminSettings.blockedVehicleTypes.includes(bikeId)) {
    return json({ error: `${bike.name} bookings are currently unavailable.` }, 403);
  }

  if (!date || !time || !customerName || !customerPhone || !pickup || !drop) {
    return json(
      { error: "Name, phone, date, time, pickup, and drop are required." },
      400,
    );
  }

  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return json({ error: "Invalid date." }, 400);
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const pickDay = new Date(parsed);
  pickDay.setHours(0, 0, 0, 0);
  if (pickDay < today) {
    return json({ error: "Date must be today or in the future." }, 400);
  }
  if (dateIsClosed(date, adminSettings)) {
    return json({ error: "Bookings are closed for the selected date." }, 403);
  }

  const isBikeTaxi = bikeId === bikeTaxiId;
  let distanceKm: number | null = null;
  let totalFare: number | null = null;
  let advanceAmount: number | null = null;

  if (isBikeTaxi) {
    const distRaw = String(formData.get("distanceKm") ?? "").trim();
    const totalRaw = String(formData.get("totalFare") ?? "").trim();
    const advRaw = String(formData.get("advanceAmount") ?? "").trim();
    distanceKm = Number(distRaw);
    const submittedTotal = Number(totalRaw);
    const submittedAdvance = Number(advRaw);

    if (!Number.isFinite(distanceKm) || distanceKm <= 0 || distanceKm > 999) {
      return json({ error: "Invalid trip distance. Go back and calculate fare again." }, 400);
    }

    const roundedKm = Math.round(distanceKm * 100) / 100;
    const expectedTotal = computeFareForDistanceKm(roundedKm);
    const expectedAdvance = computeAdvanceInr(expectedTotal);

    if (!Number.isFinite(submittedTotal) || Math.abs(submittedTotal - expectedTotal) > 0.02) {
      return json({ error: "Fare mismatch. Recalculate fare on the booking page." }, 400);
    }
    if (!Number.isFinite(submittedAdvance) || Math.abs(submittedAdvance - expectedAdvance) > 0.02) {
      return json({ error: "Advance amount mismatch. Recalculate fare on the booking page." }, 400);
    }

    distanceKm = roundedKm;
    totalFare = expectedTotal;
    advanceAmount = expectedAdvance;

    if (!(proof instanceof File) || proof.size === 0) {
      return json({ error: "Please upload your UPI advance payment proof image." }, 400);
    }
    if (proof.size > MAX_BYTES) {
      return json({ error: "Payment proof image must be 5 MB or smaller." }, 400);
    }
    const mime = proof.type || "application/octet-stream";
    if (!ALLOWED_TYPES.has(mime)) {
      return json({ error: "Payment proof must be JPEG, PNG, or WebP." }, 400);
    }
  }

  const reference = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  const textLines = [
    isBikeTaxi ? "New bike taxi booking - Vishwakarma Travels" : "New ride enquiry - Vishwakarma Travels",
    `Reference: ${reference}`,
    "",
    `Name: ${customerName}`,
    `Phone: ${customerPhone}`,
    `Vehicle: ${bike.name}`,
    `Pickup: ${pickup}`,
    `Drop: ${drop}`,
    `Date: ${date}`,
    `Time: ${time}`,
  ];
  if (isBikeTaxi && distanceKm != null && totalFare != null && advanceAmount != null) {
    textLines.push(
      "",
      `Distance (km): ${distanceKm}`,
      `Total fare (Rs): ${totalFare.toFixed(2)}`,
      `10% advance (Rs): ${advanceAmount.toFixed(2)}`,
    );
  }
  if (pickupLat && pickupLng) textLines.push(`Pickup coords: ${pickupLat}, ${pickupLng}`);
  if (dropLat && dropLng) textLines.push(`Drop coords: ${dropLat}, ${dropLng}`);
  if (notes) textLines.push(`Notes: ${notes}`);
  const text = textLines.join("\n");

  const sendMessageUrl = `https://api.telegram.org/bot${token}/sendMessage`;
  let messageRes: Response;
  try {
    messageRes = await fetch(sendMessageUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
      }),
    });
  } catch (error) {
    console.error("Telegram message request failed:", error);
    return json({ error: "Could not reach Telegram. Please try again." }, 502);
  }
  let messagePayload: TelegramApiResponse | null = null;
  try {
    messagePayload = (await messageRes.json()) as TelegramApiResponse;
  } catch {
    messagePayload = null;
  }
  if (!messageRes.ok || messagePayload?.ok === false) {
    console.error("Telegram message rejected:", messagePayload?.description ?? messageRes.statusText);
    return json(
      {
        error:
          messagePayload?.description ||
          "Could not send booking notification. Try again later.",
      },
      502,
    );
  }

  if (isBikeTaxi && proof instanceof File && proof.size > 0) {
    const mime = proof.type || "application/octet-stream";
    const fileBlob = new Blob([await proof.arrayBuffer()], { type: mime });
    const filename = proof.name?.replace(/[^\w.\-]/g, "_") || "payment-proof.jpg";
    const docSend = await sendTelegramDocument(
      token,
      chatId,
      fileBlob,
      filename,
      `UPI advance payment proof - ${reference}`,
    );
    if (!docSend.ok) {
      return json(
        {
          error:
            docSend.description ||
            "Booking details were sent, but payment proof upload failed. Contact support with your reference.",
          reference,
        },
        502,
      );
    }
  }

  return json({ ok: true, reference }, 200);
};
