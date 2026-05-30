import type { APIRoute } from "astro";
import { requireAdmin } from "../../../lib/adminAuth";
import { getAdminSettings, logAdminAction, saveAdminSettings } from "../../../lib/adminStore";

export const prerender = false;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const GET: APIRoute = async (context) => {
  const { response } = await requireAdmin(context);
  if (response) return response;
  try {
    return json({ settings: await getAdminSettings() });
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : "Could not load admin settings." },
      503,
    );
  }
};

export const POST: APIRoute = async (context) => {
  const { session, response } = await requireAdmin(context);
  if (response || !session) return response;

  let payload: {
    blockedVehicleTypes?: string[];
    closedWeekdays?: number[];
    closedDates?: string[];
  };
  try {
    payload = (await context.request.json()) as typeof payload;
  } catch {
    return json({ error: "Invalid settings request." }, 400);
  }

  try {
    const settings = await saveAdminSettings(payload);
    await logAdminAction({
      userId: session.userId,
      action: "update_settings",
      details: settings,
      ip: context.clientAddress,
    });
    return json({ settings });
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : "Could not save admin settings." },
      503,
    );
  }
};
