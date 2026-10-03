// Quote engine: pure, transparent freight-rate math.
// Every number is derived from researched Indian trucking cost components
// (see PLAN.md §6). The broker sees the full breakdown before sending.

import type { CostBreakdown, Lane, Quote, Urgency } from '../types';

export const URGENCY_MULTIPLIERS: Record<Urgency, number> = {
  'standard': 1.0,
  'urgent': 1.1,
  'same-day': 1.15,
};

export const URGENCY_LABELS: Record<Urgency, string> = {
  'standard': 'Standard',
  'urgent': 'Urgent',
  'same-day': 'Same-day',
};

// CRISIL estimate: every ₹5/L diesel rise needs +2.5–2.8% on freight rates
// to preserve margins. Used to drift historical lane rates with fuel price.
const DIESEL_DRIFT_PER_5RS = 0.026;

export function roundTo50(n: number): number {
  return Math.round(n / 50) * 50;
}

/** Driver bata (daily allowance) by trip length — industry norm. */
export function driverBataFor(distanceKm: number): number {
  if (distanceKm < 150) return 800;
  if (distanceKm <= 350) return 1200;
  return 1800;
}

/** Loading/unloading labour per shipment. */
export function handlingFor(distanceKm: number): number {
  return distanceKm < 150 ? 800 : 1500;
}

export interface EngineInputs {
  lane: Lane;
  dieselPrice: number; // ₹/litre
  marginPct: number; // broker margin, e.g. 13
  urgency: Urgency;
  pastRates: number[]; // historical quoted rates on this lane (most recent first)
}

export function computeQuote(inputs: EngineInputs): CostBreakdown {
  const { lane, dieselPrice, marginPct, urgency, pastRates } = inputs;

  const fuel = (lane.distanceKm / lane.mileageKmpl) * dieselPrice;
  const toll = lane.tollEstimate;
  const driverBata = driverBataFor(lane.distanceKm);
  const handling = handlingFor(lane.distanceKm);
  const operatingCost = fuel + toll + driverBata + handling;

  // Diesel drift: how far has diesel moved since the lane's last known rate?
  // We anchor past rates to "today's" diesel using the CRISIL factor.
  const dieselAnchor = 92; // ₹/L — reference price when seed rates were logged
  const driftFactor = 1 + ((dieselPrice - dieselAnchor) / 5) * DIESEL_DRIFT_PER_5RS;

  let historyRate: number | undefined;
  let baseRate: number;
  if (pastRates.length > 0) {
    const weighted =
      pastRates.slice(0, 5).reduce((sum, r, i) => sum + r * (5 - i), 0) /
      pastRates.slice(0, 5).reduce((sum, _r, i) => sum + (5 - i), 0);
    historyRate = roundTo50(weighted * driftFactor);
    const costPlus = operatingCost * (1 + marginPct / 100);
    baseRate = 0.5 * historyRate + 0.5 * costPlus;
  } else {
    // No history: cost-plus with a 5% safety factor.
    baseRate = operatingCost * (1 + marginPct / 100) * 1.05;
  }

  const urgencyMultiplier = URGENCY_MULTIPLIERS[urgency];
  const finalRate = roundTo50(baseRate * urgencyMultiplier);
  const marginRs = Math.round(finalRate - operatingCost);

  return {
    fuel: Math.round(fuel),
    toll: Math.round(toll),
    driverBata,
    handling,
    operatingCost: Math.round(operatingCost),
    marginPct,
    marginRs,
    urgencyMultiplier,
    historyRate,
    finalRate,
  };
}

/** Find the best matching lane for an origin→destination pair. */
export function findLane(
  lanes: Lane[],
  origin?: string,
  destination?: string,
): Lane | undefined {
  if (!origin || !destination) return undefined;
  const o = origin.trim().toLowerCase();
  const d = destination.trim().toLowerCase();
  return lanes.find(
    (l) =>
      l.origin.toLowerCase() === o && l.destination.toLowerCase() === d,
  );
}

/** Past quoted rates for a lane, most recent first — used as history. */
export function pastRatesFor(quotes: Quote[], laneId: string): number[] {
  return quotes
    .filter((q) => q.laneId === laneId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((q) => q.rate);
}

export function formatINR(n: number): string {
  return '₹' + Math.round(n).toLocaleString('en-IN');
}
