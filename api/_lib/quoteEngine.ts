// Server port of the QuoteMitra pricing engine.
// Logic mirrors src/lib/quoteEngine.ts exactly so quotes drafted by the
// WhatsApp webhook match quotes drafted in the dashboard.
//
// Pricing model (see PLAN.md §6):
//   trip cost = diesel(distance / mileage × price) + toll
//             + driver bata (800 / 1200 / 1800 by distance) + labour
//   history blend: weighted avg of last 5 quotes, drifted +2.6% per ₹5/L
//                  diesel move vs the ₹92/L anchor
//   final = (50% history-adjusted + 50% cost-plus) × urgency
//           (1.0 / 1.1 / 1.15), rounded to ₹50
//   no history → cost-plus × 1.05 safety factor
//
// NOTE: weight_tons is stored for reference; pricing is per full truck
// trip (a broker quotes the whole vehicle, not per-tonne, in this segment).

import type {
  BrokerSettings,
  CostBreakdown,
  Lane,
  Quote,
  Urgency,
} from './types.js';

export const URGENCY_MULTIPLIERS: Record<Urgency, number> = {
  standard: 1.0,
  urgent: 1.1,
  'same-day': 1.15,
};

export const URGENCY_LABELS: Record<Urgency, string> = {
  standard: 'Standard',
  urgent: 'Urgent',
  'same-day': 'Same-day',
};

// CRISIL estimate: every ₹5/L diesel rise needs +2.5–2.8% on freight rates
// to preserve margins. Used to drift historical lane rates with fuel price.
const DIESEL_DRIFT_PER_5RS = 0.026;

// ₹/L — reference price the seed/market rates were anchored to.
const DIESEL_ANCHOR = 92;

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

/** Fallback mileage (km/l) when a lane doesn't record one, by vehicle. */
export function defaultMileageFor(vehicleType: string): number {
  const v = vehicleType.toLowerCase();
  if (v.includes('14ft')) return 7.5;
  if (v.includes('17ft')) return 6.2;
  if (v.includes('19ft')) return 5.5;
  if (v.includes('10-wheeler') || v.includes('10 wheeler')) return 4.2;
  if (v.includes('32ft') || v.includes('container')) return 4.0;
  if (v.includes('multi-axle') || v.includes('multi axle')) return 3.6;
  return 4.5;
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

  const mileage = lane.mileageKmpl > 0 ? lane.mileageKmpl : defaultMileageFor(lane.vehicleType);
  const fuel = (lane.distanceKm / mileage) * dieselPrice;
  const toll = lane.tollRs;
  const driverBata = driverBataFor(lane.distanceKm);
  const handling = handlingFor(lane.distanceKm);
  const operatingCost = fuel + toll + driverBata + handling;

  // Diesel drift: how far has diesel moved since the lane's last known rate?
  const driftFactor =
    1 + ((dieselPrice - DIESEL_ANCHOR) / 5) * DIESEL_DRIFT_PER_5RS;

  let historyRate: number | undefined;
  let baseRate: number;
  if (pastRates.length > 0) {
    const top = pastRates.slice(0, 5);
    const weights = top.map((_, i) => 5 - i);
    const weighted =
      top.reduce((sum, r, i) => sum + r * weights[i], 0) /
      weights.reduce((sum, w) => sum + w, 0);
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

/** Best matching lane for an origin→destination pair (exact, case-insensitive). */
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

/** Heuristic lane match from free text: lane whose origin AND destination
 *  both appear as substrings in the message. Returns undefined when
 *  zero or more than one lane matches (ambiguous). */
export function findLaneInText(lanes: Lane[], text: string): Lane | undefined {
  const t = text.toLowerCase();
  const matches = lanes.filter(
    (l) =>
      l.origin.trim().length > 1 &&
      l.destination.trim().length > 1 &&
      t.includes(l.origin.trim().toLowerCase()) &&
      t.includes(l.destination.trim().toLowerCase()),
  );
  return matches.length === 1 ? matches[0] : undefined;
}

/** Past quoted rates for a lane, most recent first — used as history. */
export function pastRatesFor(quotes: Quote[], laneId: string): number[] {
  return quotes
    .filter((q) => q.laneId === laneId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((q) => q.rateRs);
}

export function formatINR(n: number): string {
  return '₹' + Math.round(n).toLocaleString('en-IN');
}

export interface DraftInputs {
  lane: Lane;
  broker: BrokerSettings;
  pastRates: number[];
  weightTons?: number | null;
  urgency?: Urgency;
  enquiryId?: string | null;
}

/** Build a full Quote object (status 'draft') from engine inputs. */
export function draftQuote(inputs: DraftInputs): Quote {
  const {
    lane,
    broker,
    pastRates,
    weightTons = null,
    urgency = 'standard',
    enquiryId = null,
  } = inputs;
  const breakdown = computeQuote({
    lane,
    dieselPrice: broker.dieselPrice,
    marginPct: broker.defaultMarginPct,
    urgency,
    pastRates,
  });
  const now = new Date().toISOString();
  return {
    id: `q-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    brokerId: broker.id,
    laneId: lane.id,
    enquiryId,
    weightTons,
    urgency,
    rateRs: breakdown.finalRate,
    marginRs: breakdown.marginRs,
    breakdown,
    status: 'draft',
    createdAt: now,
    sentAt: null,
  };
}
