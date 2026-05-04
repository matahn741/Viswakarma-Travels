import { initBookingFormClient } from "./booking-form-client";
import { bikeTaxiId, upi } from "../config/site";

initBookingFormClient({
  bikeTaxiId,
  upiId: upi.id,
  upiPayeeName: upi.payeeName,
});
