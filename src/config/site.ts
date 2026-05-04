/**
 * Edit this file to update bikes, prices, UPI details, and contact info.
 * After deploy hosts (Vercel/Netlify) rebuild from git; local: save and refresh dev server.
 */
export const siteMeta = {
  name: "Vishwakarma Travels",
  tagline: "Fast, affordable bike taxi and local rides",
  /** Shown in footer and meta description */
  description:
    "Book bike taxi and other local ride options with Vishwakarma Travels. Enter trip distance for bike taxi fares, pay a 10% UPI advance, then confirm your ride.",
  phoneDisplay: "+91 91235 91711",
  /** tel: link — digits and + only */
  phoneTel: "+919123591711",
  whatsappTel: "+919123591711",
  email: "vishwakarmatravels70@gmail.com",
};

/** Bike taxi fare slabs (manual km entry on booking). */
export const fareRates = {
  firstKmInr: 12,
  additionalKmInr: 6,
  /** Advance collected before ride confirmation */
  advancePercent: 0.1,
} as const;

export const bikeTaxiId = "bike-taxi" as const;

export type Bike = {
  id: string;
  name: string;
  description: string;
  /** Shown on cards; change anytime */
  priceNote: string;
};

export const bikes: Bike[] = [
  {
    id: bikeTaxiId,
    name: "Bike Taxi",
    description: "Quick and budget-friendly rides for one passenger across the city.",
    priceNote: "Rs 12 first km + Rs 6 per additional km (you enter distance)",
  },
  {
    id: "car",
    name: "Car Taxi",
    description: "Comfortable city and outstation-ready rides for daily travel.",
    priceNote: "From Rs 22/km (approx.)",
  },
  {
    id: "auto",
    name: "Auto",
    description: "Convenient point-to-point rides for short city routes.",
    priceNote: "From Rs 18/km (approx.)",
  },
];

/**
 * Keep `current` as your active operating zone.
 * Update `futureExpansion` now so team members know planned rollout.
 */
export const serviceCoverage = {
  current: "Madurai and surrounding areas",
  futureExpansion: "All districts across Tamil Nadu",
};

export const upi = {
  /** Default UPI VPA for advance payments (scan QR or copy ID) */
  id: "balamurugan44397@okicici",
  payeeName: "Bala Murugan",
  /** Optional note under the UPI ID */
  paymentNote:
    "For bike taxi: pay the 10% advance amount shown using our UPI ID or the QR below, then continue to upload your payment confirmation.",
};

/** Merchant UPI QR in /public (scan to pay advance) */
export const publicUpiQrPath = "/upi-merchant-qr.png";

/** Main brand artwork (header, home, booking) */
export const publicBrandLogoPath = "/brand-logo.png";

export const navLinks = [
  { href: "/", label: "Home" },
  { href: "/book", label: "Book a ride" },
];
