// POST /api/quotes/draft — run the quote engine server-side and persist
// the result as a Quote with status 'draft'.
//   body: { laneId, weightTons?, urgency? }
//   → 201 { quote: Quote } | 400/404 on bad input

import { getDb } from '../_lib/db.js';
import { methodNotAllowed, readJsonBody, sendJson } from '../_lib/http.js';
import { draftQuote, pastRatesFor } from '../_lib/quoteEngine.js';
import type { Urgency } from '../_lib/types.js';

const VALID_URGENCY: Urgency[] = ['standard', 'urgent', 'same-day'];

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
    const body = await readJsonBody(req);
    const laneId = body?.laneId ? String(body.laneId) : undefined;
    if (!laneId) {
      return sendJson(res, 400, { ok: false, error: 'missing laneId' });
    }
    const urgency: Urgency = VALID_URGENCY.includes(body?.urgency)
      ? body.urgency
      : 'standard';
    const weightTons =
      body?.weightTons !== undefined && body?.weightTons !== null
        ? Number(body.weightTons)
        : null;
    if (weightTons !== null && (!Number.isFinite(weightTons) || weightTons <= 0)) {
      return sendJson(res, 400, { ok: false, error: 'invalid weightTons' });
    }

    const db = await getDb();
    const lane = (await db.listLanes()).find((l) => l.id === laneId);
    if (!lane) {
      return sendJson(res, 404, { ok: false, error: 'lane-not-found' });
    }
    const [broker, quotes] = await Promise.all([
      db.getBroker(),
      db.listQuotes(),
    ]);
    const quote = draftQuote({
      lane,
      broker,
      pastRates: pastRatesFor(quotes, lane.id),
      weightTons,
      urgency,
    });
    const saved = await db.createQuote(quote);
    return sendJson(res, 201, { quote: saved });
  } catch (err) {
    console.error('[QuoteMitra] /api/quotes/draft error:', err);
    return sendJson(res, 500, { ok: false, error: 'internal-error' });
  }
}
