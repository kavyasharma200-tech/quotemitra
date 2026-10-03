// Self-contained port of QuoteMitra's server quote engine
// (api/_lib/quoteEngine.ts) for the Baileys bridge. Same math, zero
// dependencies, so this mini-package stays standalone.
//
// Pricing model:
//   trip cost = diesel(distance / mileage × price) + toll
//             + driver bata (800 / 1200 / 1800 by distance) + labour
//   history blend: weighted avg of last 5 quotes, drifted +2.6% per ₹5/L
//                  diesel move vs the ₹92/L anchor
//   final = (50% history-adjusted + 50% cost-plus) × urgency
//           (1.0 / 1.1 / 1.15), rounded to ₹50
//   no history → cost-plus × 1.05 safety factor

export const URGENCY_MULTIPLIERS = {
  standard: 1.0,
  urgent: 1.1,
  'same-day': 1.15,
};

export const URGENCY_LABELS = {
  standard: 'Standard',
  urgent: 'Urgent',
  'same-day': 'Same-day',
};

// CRISIL estimate: every ₹5/L diesel rise needs +2.5–2.8% on freight rates
// to preserve margins.
const DIESEL_DRIFT_PER_5RS = 0.026;
const DIESEL_ANCHOR = 92; // ₹/L — reference price market rates were anchored to

export function roundTo50(n) {
  return Math.round(n / 50) * 50;
}

export function driverBataFor(distanceKm) {
  if (distanceKm < 150) return 800;
  if (distanceKm <= 350) return 1200;
  return 1800;
}

export function handlingFor(distanceKm) {
  return distanceKm < 150 ? 800 : 1500;
}

export function defaultMileageFor(vehicleType) {
  const v = String(vehicleType).toLowerCase();
  if (v.includes('14ft')) return 7.5;
  if (v.includes('17ft')) return 6.2;
  if (v.includes('19ft')) return 5.5;
  if (v.includes('10-wheeler') || v.includes('10 wheeler')) return 4.2;
  if (v.includes('32ft') || v.includes('container')) return 4.0;
  if (v.includes('multi-axle') || v.includes('multi axle')) return 3.6;
  return 4.5;
}

/**
 * @param {object} inputs
 * @param {object} inputs.lane  {origin, destination, distanceKm, vehicleType, mileageKmpl, tollRs}
 * @param {number} inputs.dieselPrice  ₹/litre
 * @param {number} inputs.marginPct    broker margin, e.g. 13
 * @param {string} inputs.urgency      'standard' | 'urgent' | 'same-day'
 * @param {number[]} inputs.pastRates  historical quoted rates, most recent first
 */
export function computeQuote({ lane, dieselPrice, marginPct, urgency, pastRates }) {
  const mileage =
    lane.mileageKmpl > 0 ? lane.mileageKmpl : defaultMileageFor(lane.vehicleType);
  const fuel = (lane.distanceKm / mileage) * dieselPrice;
  const toll = lane.tollRs || 0;
  const driverBata = driverBataFor(lane.distanceKm);
  const handling = handlingFor(lane.distanceKm);
  const operatingCost = fuel + toll + driverBata + handling;

  const driftFactor =
    1 + ((dieselPrice - DIESEL_ANCHOR) / 5) * DIESEL_DRIFT_PER_5RS;

  let historyRate;
  let baseRate;
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
    baseRate = operatingCost * (1 + marginPct / 100) * 1.05;
  }

  const urgencyMultiplier = URGENCY_MULTIPLIERS[urgency] ?? 1.0;
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

/** Heuristic lane match from free text: exactly one lane whose origin AND
 *  destination both appear as substrings in the message. */
export function findLaneInText(lanes, text) {
  const t = String(text).toLowerCase();
  const matches = lanes.filter(
    (l) =>
      l.origin.trim().length > 1 &&
      l.destination.trim().length > 1 &&
      t.includes(l.origin.trim().toLowerCase()) &&
      t.includes(l.destination.trim().toLowerCase()),
  );
  return matches.length === 1 ? matches[0] : undefined;
}

export function formatINR(n) {
  return '₹' + Math.round(n).toLocaleString('en-IN');
}

/** The WhatsApp reply text for a drafted quote. */
export function formatQuoteReply({ lane, breakdown, urgency, brokerName }) {
  const b = breakdown;
  return [
    `🚚 *${lane.origin} → ${lane.destination}* — freight quote`,
    `🚛 ${lane.vehicleType} · ${lane.distanceKm} km`,
    ``,
    `💰 *${formatINR(b.finalRate)}* ${urgency !== 'standard' ? `(${URGENCY_LABELS[urgency]})` : ''}`,
    ``,
    `Breakup: Fuel ${formatINR(b.fuel)} · Toll ${formatINR(b.toll)} · Driver ${formatINR(b.driverBata)} · Loading/labour ${formatINR(b.handling)}`,
    b.historyRate
      ? `Market history (diesel-adjusted): ${formatINR(b.historyRate)}`
      : `Rate built from live diesel cost + ${b.marginPct}% margin`,
    ``,
    `✅ Valid 24 hrs. Reply OK to confirm, or tell me a different route.`,
    `— ${brokerName}`,
  ].join('\n');
}

/** Reply when no lane matches the customer's message. */
export function formatLaneHelpReply(lanes, brokerName) {
  if (lanes.length === 0) {
    return `Namaste! 🙏 This is ${brokerName}. My route list is being set up — please reply with your origin and destination (e.g. "Bokaro to Dhanbad, 10 ton") and I'll quote it.`;
  }
  const list = lanes
    .slice(0, 10)
    .map((l) => `• ${l.origin} → ${l.destination} (${l.vehicleType})`)
    .join('\n');
  return [
    `Namaste! 🙏 I couldn't match your message to one of my routes.`,
    ``,
    `My regular routes:`,
    list,
    ``,
    `Reply like: "Bokaro to Dhanbad, 10 ton, urgent" and I'll send a rate.`,
    `— ${brokerName}`,
  ].join('\n');
}
