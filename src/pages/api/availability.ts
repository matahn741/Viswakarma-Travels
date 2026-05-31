import type { APIRoute } from "astro";
import { getBookingAdminSettings } from "../../lib/adminStore";

export const prerender = false;

export const GET: APIRoute = async () => {
  const settings = await getBookingAdminSettings();
  return new Response(
    JSON.stringify({
      blockedVehicleTypes: settings.blockedVehicleTypes,
      closedWeekdays: settings.closedWeekdays,
      closedDates: settings.closedDates,
    }),
    {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    },
  );
};
