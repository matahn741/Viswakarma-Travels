import type { APIRoute } from "astro";
import { clearAdminCookie, requireAdmin } from "../../../lib/adminAuth";
import { logAdminAction } from "../../../lib/adminStore";

export const prerender = false;

export const POST: APIRoute = async (context) => {
  const { session } = await requireAdmin(context);
  clearAdminCookie(context.cookies);
  if (session) {
    try {
      await logAdminAction({ userId: session.userId, action: "logout", ip: context.clientAddress });
    } catch {
      // Ignore audit write failures during logout.
    }
  }
  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
};
