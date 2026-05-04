import { fareRates } from "../config/site";

/** Bill distance in whole km slabs: first km + each started km after. */
export function billedKmSlabs(distanceKm: number): number {
  if (!Number.isFinite(distanceKm) || distanceKm <= 0) return 0;
  return Math.max(1, Math.ceil(distanceKm - 1e-9));
}

export function computeFareForDistanceKm(distanceKm: number): number {
  const slabs = billedKmSlabs(distanceKm);
  if (slabs === 0) return 0;
  return (
    fareRates.firstKmInr + (slabs - 1) * fareRates.additionalKmInr
  );
}

export function computeAdvanceInr(totalFareInr: number): number {
  if (!Number.isFinite(totalFareInr) || totalFareInr <= 0) return 0;
  return Math.round(totalFareInr * fareRates.advancePercent * 100) / 100;
}
