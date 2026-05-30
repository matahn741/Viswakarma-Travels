import type { APIRoute } from "astro";
import { requireAdmin } from "../../../lib/adminAuth";
import { listAdminActions } from "../../../lib/adminStore";

export const prerender = false;

export const GET: APIRoute = async (context) => {
  const { response } = await requireAdmin(context);
  if (response) return response;
  try {
    return new Response(JSON.stringify({ logs: await listAdminActions(50) }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Could not load admin logs.",
      }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }
};
