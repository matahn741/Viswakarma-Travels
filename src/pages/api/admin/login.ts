import type { APIRoute } from "astro";
import {
  createAdminSessionCookie,
  credentialsAreValid,
  isAdminConfigured,
  setAdminCookie,
} from "../../../lib/adminAuth";
import { logAdminAction } from "../../../lib/adminStore";

export const prerender = false;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const POST: APIRoute = async ({ request, cookies, clientAddress }) => {
  if (!isAdminConfigured()) {
    return json({ error: "Admin login is not configured." }, 503);
  }

  let payload: { userId?: string; password?: string };
  try {
    payload = (await request.json()) as { userId?: string; password?: string };
  } catch {
    return json({ error: "Invalid login request." }, 400);
  }

  const userId = String(payload.userId ?? "").trim();
  const password = String(payload.password ?? "");
  if (!credentialsAreValid(userId, password)) {
    return json({ error: "Invalid user ID or password." }, 401);
  }

  try {
    await logAdminAction({ userId, action: "login", ip: clientAddress });
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : "Could not write admin audit log." },
      503,
    );
  }
  setAdminCookie(cookies, await createAdminSessionCookie(userId));
  return json({ ok: true });
};
