import { computeAdvanceInr, computeFareForDistanceKm } from "../lib/fare";

function formatInr(n: number): string {
  return `Rs ${n.toFixed(2)}`;
}

function getSelectedBikeId(form: HTMLFormElement): string {
  const el = form.querySelector('input[name="bikeId"]:checked');
  return el instanceof HTMLInputElement ? el.value : "";
}

function isBikeTaxi(form: HTMLFormElement, bikeTaxiId: string): boolean {
  return getSelectedBikeId(form) === bikeTaxiId;
}

function syncVehicleUi(form: HTMLFormElement, bikeTaxiId: string) {
  const bike = isBikeTaxi(form, bikeTaxiId);
  document.querySelectorAll("[data-bike-only]").forEach((el) => {
    el.classList.toggle("hidden", !bike);
  });
  document.querySelectorAll("[data-enquiry-only]").forEach((el) => {
    el.classList.toggle("hidden", bike);
  });
}

export function initBookingFormClient(options: {
  bikeTaxiId: string;
  upiId: string;
  upiPayeeName: string;
}) {
  const { bikeTaxiId, upiId, upiPayeeName } = options;

  function merchantUpiHref(advanceInr: number | null): string {
    const base = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(upiPayeeName)}&cu=INR`;
    if (advanceInr != null && Number.isFinite(advanceInr) && advanceInr > 0) {
      return `${base}&am=${encodeURIComponent(advanceInr.toFixed(2))}&tn=${encodeURIComponent("Bike taxi advance")}`;
    }
    return base;
  }

  function updateMerchantUpiLink(advanceInr: number | null) {
    const a = document.getElementById("upi-pay-link");
    if (a instanceof HTMLAnchorElement) a.href = merchantUpiHref(advanceInr);
  }

  const fareSummary = document.getElementById("fare-summary");
  const calcFareBtn = document.getElementById("calc-fare-btn");
  const calcFareStatus = document.getElementById("calc-fare-status");
  const steps = Array.from(document.querySelectorAll("[data-step]"));
  const dots = Array.from(document.querySelectorAll("[data-step-dot]"));

  let current = 1;
  let fareReady = false;

  function setFareReady(ready: boolean) {
    fareReady = ready;
    const cont = document.getElementById("continue-after-fare");
    if (cont instanceof HTMLButtonElement) {
      cont.disabled = !ready;
    }
  }

  function invalidateFare() {
    setFareReady(false);
    fareSummary?.classList.add("hidden");
    const dk = document.getElementById("distanceKm");
    const tf = document.getElementById("totalFare");
    const adv = document.getElementById("advanceAmount");
    if (dk instanceof HTMLInputElement) dk.value = "";
    if (tf instanceof HTMLInputElement) tf.value = "";
    if (adv instanceof HTMLInputElement) adv.value = "";
    updateMerchantUpiLink(null);
  }

  function showStep(n: number) {
    current = n;
    steps.forEach((el) => {
      const s = Number(el.getAttribute("data-step"));
      el.classList.toggle("hidden", s !== n);
    });
    dots.forEach((el) => {
      const s = Number(el.getAttribute("data-step-dot"));
      const on = s === n;
      el.classList.toggle("border-accent-500", on);
      el.classList.toggle("bg-brand-800", on);
      el.classList.toggle("text-white", on);
      el.classList.toggle("border-brand-700", !on);
      el.classList.toggle("bg-brand-900", !on);
      el.classList.toggle("text-brand-200", !on);
    });
    const form = document.getElementById("booking-form");
    if (form instanceof HTMLFormElement && n === 2) {
      syncVehicleUi(form, bikeTaxiId);
    }
    if (n === 3) void refreshPayStepSummary();
  }

  function stepError(msg: string) {
    const err = document.getElementById("form-banner");
    if (err) {
      err.textContent = msg;
      err.classList.remove("hidden");
    }
  }

  function clearError() {
    const err = document.getElementById("form-banner");
    if (err) {
      err.textContent = "";
      err.classList.add("hidden");
    }
  }

  function validateStepTwo(formEl: HTMLFormElement) {
    const requiredIds = ["date", "time", "customerName", "customerPhone", "pickup", "drop"];
    for (const id of requiredIds) {
      const input = formEl.querySelector(`#${id}`);
      if (input instanceof HTMLInputElement && !input.value.trim()) {
        input.focus();
        input.reportValidity();
        return false;
      }
    }
    return true;
  }

  async function refreshPayStepSummary() {
    const advInput = document.getElementById("advanceAmount");
    const totalInput = document.getElementById("totalFare");
    const distInput = document.getElementById("distanceKm");
    const totalEl = document.getElementById("pay-step-total");
    const advEl = document.getElementById("pay-step-advance");
    const distEl = document.getElementById("pay-step-distance");

    const advanceStr =
      advInput instanceof HTMLInputElement ? advInput.value.trim() : "";
    const totalStr =
      totalInput instanceof HTMLInputElement ? totalInput.value.trim() : "";
    const distStr =
      distInput instanceof HTMLInputElement ? distInput.value.trim() : "";

    const advance = Number(advanceStr);
    const total = Number(totalStr);
    const dist = Number(distStr);

    if (totalEl) totalEl.textContent = Number.isFinite(total) ? formatInr(total) : "—";
    if (advEl) advEl.textContent = Number.isFinite(advance) ? formatInr(advance) : "—";
    if (distEl) distEl.textContent = Number.isFinite(dist) ? `${dist} km` : "—";

    updateMerchantUpiLink(Number.isFinite(advance) && advance > 0 ? advance : null);
  }

  function attachLocationButton(
    buttonId: string,
    statusId: string,
    fieldPrefix: "pickup" | "drop",
  ) {
    const btn = document.getElementById(buttonId);
    const status = document.getElementById(statusId);
    const latInput = document.getElementById(`${fieldPrefix}Lat`);
    const lngInput = document.getElementById(`${fieldPrefix}Lng`);
    const addressInput = document.getElementById(fieldPrefix);
    if (!(btn instanceof HTMLButtonElement)) return;
    btn.addEventListener("click", () => {
      if (!navigator.geolocation) {
        if (status) status.textContent = "Location is not supported on this browser.";
        return;
      }
      btn.disabled = true;
      if (status) status.textContent = "Fetching location…";
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude.toFixed(6);
          const lng = position.coords.longitude.toFixed(6);
          if (latInput instanceof HTMLInputElement) latInput.value = lat;
          if (lngInput instanceof HTMLInputElement) lngInput.value = lng;
          if (status) status.textContent = `Saved: ${lat}, ${lng}`;
          if (addressInput instanceof HTMLInputElement && !addressInput.value.trim()) {
            addressInput.value = `Current location (${lat}, ${lng})`;
          }
          btn.disabled = false;
        },
        () => {
          if (status) status.textContent = "Unable to fetch location. Enter address manually.";
          btn.disabled = false;
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
      );
    });
  }

  attachLocationButton("pickup-locate-btn", "pickup-location-status", "pickup");
  attachLocationButton("drop-locate-btn", "drop-location-status", "drop");

  const form = document.getElementById("booking-form");
  if (!(form instanceof HTMLFormElement)) return;

  form.querySelectorAll('input[name="bikeId"]').forEach((radio) => {
    radio.addEventListener("change", () => {
      invalidateFare();
      const manual = document.getElementById("manualDistanceKm");
      if (manual instanceof HTMLInputElement) manual.value = "";
      syncVehicleUi(form, bikeTaxiId);
    });
  });

  for (const id of ["pickup", "drop"]) {
    const el = document.getElementById(id);
    el?.addEventListener("input", () => {
      if (isBikeTaxi(form, bikeTaxiId)) invalidateFare();
    });
  }

  const manualKm = document.getElementById("manualDistanceKm");
  manualKm?.addEventListener("input", () => {
    invalidateFare();
    if (calcFareStatus) calcFareStatus.textContent = "";
  });

  if (calcFareBtn instanceof HTMLButtonElement) {
    calcFareBtn.addEventListener("click", () => {
      clearError();
      if (!isBikeTaxi(form, bikeTaxiId)) return;
      if (!validateStepTwo(form)) return;

      const raw = (document.getElementById("manualDistanceKm") as HTMLInputElement)?.value.trim() ?? "";
      const km = Number(raw);
      if (!Number.isFinite(km) || km <= 0 || km > 999) {
        stepError("Enter trip distance in kilometres (e.g. 3.5). Maximum 999 km.");
        (document.getElementById("manualDistanceKm") as HTMLInputElement)?.focus();
        setFareReady(false);
        return;
      }

      const roundedKm = Math.round(km * 100) / 100;
      const totalFare = computeFareForDistanceKm(roundedKm);
      const advance = computeAdvanceInr(totalFare);

      const setNum = (id: string, v: number) => {
        const el = document.getElementById(id);
        if (el instanceof HTMLInputElement) el.value = String(v);
      };
      setNum("distanceKm", roundedKm);
      setNum("totalFare", totalFare);
      setNum("advanceAmount", advance);

      const distRead = document.getElementById("fare-distance-read");
      const totalRead = document.getElementById("fare-total-read");
      const advRead = document.getElementById("fare-advance-read");
      const slabsRead = document.getElementById("fare-slabs-read");
      if (distRead) distRead.textContent = `${roundedKm} km (entered)`;
      if (totalRead) totalRead.textContent = formatInr(totalFare);
      if (advRead) advRead.textContent = formatInr(advance);
      if (slabsRead) {
        const slabs = Math.max(1, Math.ceil(roundedKm - 1e-9));
        slabsRead.textContent = `First km Rs 12 + ${Math.max(0, slabs - 1)} × Rs 6`;
      }

      fareSummary?.classList.remove("hidden");
      if (calcFareStatus) {
        calcFareStatus.textContent =
          "Fare is ready. Review the total, then continue to pay the 10% advance via UPI.";
      }
      setFareReady(true);
      updateMerchantUpiLink(advance);
    });
  }

  updateMerchantUpiLink(null);

  document.querySelectorAll("[data-next]").forEach((btn) => {
    btn.addEventListener("click", () => {
      clearError();

      if (current === 1) {
        const bike = form.querySelector('input[name="bikeId"]:checked');
        if (!bike) {
          stepError("Please select a vehicle.");
          return;
        }
        showStep(2);
        syncVehicleUi(form, bikeTaxiId);
      } else if (current === 2) {
        if (!validateStepTwo(form)) return;
        if (isBikeTaxi(form, bikeTaxiId)) {
          if (!fareReady) {
            stepError('Tap “Calculate fare” after entering trip distance in km.');
            return;
          }
          showStep(3);
        } else {
          stepError("Use “Submit booking request” below for car or auto.");
        }
      } else if (current === 3) {
        showStep(4);
      }
    });
  });

  document.querySelectorAll("[data-prev]").forEach((btn) => {
    btn.addEventListener("click", () => {
      clearError();
      if (current > 1) showStep(current - 1);
    });
  });

  const successPanel = document.getElementById("success-panel");
  const submitBtn = document.getElementById("submit-btn");
  const enquiryBtn = document.getElementById("enquiry-submit-btn");

  async function postBooking(body: FormData) {
    const res = await fetch("/api/booking", {
      method: "POST",
      body,
    });
    return res;
  }

  function showSuccess(data: { reference?: string }) {
    const refEl = document.getElementById("booking-ref");
    if (refEl && typeof data.reference === "string") {
      refEl.textContent = data.reference;
    }
    form.classList.add("hidden");
    document.getElementById("step-indicator")?.classList.add("hidden");
    successPanel?.classList.remove("hidden");
    if (successPanel instanceof HTMLElement) successPanel.focus();
  }

  if (enquiryBtn instanceof HTMLButtonElement) {
    enquiryBtn.addEventListener("click", async () => {
      clearError();
      if (isBikeTaxi(form, bikeTaxiId)) return;
      if (!validateStepTwo(form)) return;

      enquiryBtn.disabled = true;
      enquiryBtn.textContent = "Sending…";

      try {
        const body = new FormData(form);
        body.delete("proof");
        body.delete("distanceKm");
        body.delete("totalFare");
        body.delete("advanceAmount");

        const res = await postBooking(body);
        const data = await res.json().catch(() => ({} as { error?: string; reference?: string }));

        if (!res.ok) {
          stepError(
            typeof data.error === "string" ? data.error : "Something went wrong. Please try again.",
          );
          return;
        }
        showSuccess(data);
      } catch {
        stepError("Network error. Check your connection and try again.");
      } finally {
        enquiryBtn.disabled = false;
        enquiryBtn.textContent = "Submit booking request";
      }
    });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearError();
    if (!isBikeTaxi(form, bikeTaxiId)) {
      stepError("For car or auto, use Submit booking request on step 2.");
      return;
    }
    if (!form.reportValidity()) return;

    const proof = document.getElementById("proof");
    if (!(proof instanceof HTMLInputElement) || !proof.files?.length) {
      stepError("Please choose your advance payment confirmation screenshot.");
      return;
    }
    if (submitBtn instanceof HTMLButtonElement) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Sending…";
    }

    try {
      const body = new FormData(form);
      const res = await postBooking(body);
      const data = await res.json().catch(() => ({} as { error?: string; reference?: string }));

      if (!res.ok) {
        stepError(
          typeof data.error === "string" ? data.error : "Something went wrong. Please try again.",
        );
        return;
      }
      showSuccess(data);
    } catch {
      stepError("Network error. Check your connection and try again.");
    } finally {
      if (submitBtn instanceof HTMLButtonElement) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Confirm booking";
      }
    }
  });

  const dateInput = document.getElementById("date");
  if (dateInput instanceof HTMLInputElement) {
    const t = new Date();
    const y = t.getFullYear();
    const m = String(t.getMonth() + 1).padStart(2, "0");
    const d = String(t.getDate()).padStart(2, "0");
    dateInput.min = `${y}-${m}-${d}`;
  }

  setFareReady(false);
  syncVehicleUi(form, bikeTaxiId);

  const copyUpiBtn = document.getElementById("copy-upi-btn");
  const upiStatus = document.getElementById("upi-action-status");
  if (copyUpiBtn instanceof HTMLButtonElement) {
    copyUpiBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(upiId);
        if (upiStatus) upiStatus.textContent = "UPI ID copied.";
      } catch {
        if (upiStatus) upiStatus.textContent = "Could not copy. Select the ID and copy manually.";
      }
    });
  }

  const qrImg = document.getElementById("upi-qr-img");
  if (qrImg instanceof HTMLImageElement) {
    qrImg.addEventListener("load", () => qrImg.classList.remove("hidden"));
    qrImg.addEventListener("error", () => qrImg.classList.add("hidden"));
    if (qrImg.complete && qrImg.naturalHeight > 0) qrImg.classList.remove("hidden");
  }

  const payWithUpiBtn = document.getElementById("pay-with-upi-btn");
  const qrPanel = document.getElementById("upi-qr-panel");
  if (payWithUpiBtn instanceof HTMLButtonElement) {
    payWithUpiBtn.addEventListener("click", () => {
      if (qrPanel) qrPanel.classList.toggle("hidden");
      if (upiStatus) upiStatus.textContent = qrPanel?.classList.contains("hidden")
        ? ""
        : "Scan the QR or tap “Pay advance in UPI app”.";
      qrPanel?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }
}
