// Quotes CRUD.
//   GET    /api/quotes           → { quotes: Quote[] } (newest first)
//   POST   /api/quotes           → body { laneId, urgency?, weightTons?, enquiryId?,
//                                  rateRs?, breakdown?, marginRs?, status? }
//                                  Creates a quote. If rateRs/breakdown are
//                                  omitted, the server drafts them via the
//                                  quote engine (same as POST /api/quotes/draft).
//   PATCH  /api/quotes           → body { id, status?, ... } — used for
//                                  won/lost updates; marking 'sent' stamps sentAt.
//   DELETE /api/quotes?id=...    → { ok: true }

import { getDb } from './_lib/db.js';
import {
  methodNotAllowed,
  queryParam,
  readJsonBody,
  sendJson,
} from './_lib/http.js';
import { draftQuote, pastRatesFor } from './_lib/quoteEngine.js';
import type { QuoteStatus, Urgency } from './_lib/types.js';

const VALID_STATUS: QuoteStatus[] = ['draft', 'sent', 'won', 'lost'];
const VALID_URGENCY: Urgency[] = ['standard', 'urgent', 'same-day'];

export default async function handler(req: any, res: any) {
  try {
    const db = await getDb();

    if (req.method === 'GET') {
      const quotes = await db.listQuotes();
      return sendJson(res, 200, { quotes });
    }

    if (req.method === 'POST') {
      const body = await readJsonBody(req);
      const laneId = body?.laneId ? String(body.laneId) : undefined;
      if (!laneId) {
        return sendJson(res, 400, { ok: false, error: 'missing laneId' });
      }
      const urgency: Urgency = VALID_URGENCY.includes(body?.urgency)
        ? body.urgency
        : 'standard';
      const lane = (await db.listLanes()).find((l) => l.id === laneId);
      if (!lane) {
        return sendJson(res, 404, { ok: false, error: 'lane-not-found' });
      }

      let quote;
      if (body?.rateRs !== undefined && body?.breakdown) {
        // Client-supplied numbers (e.g. broker-edited quote).
        const now = new Date().toISOString();
        quote = {
          id: `q-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
          brokerId: (await db.getBroker()).id,
          laneId,
          enquiryId: body.enquiryId ? String(body.enquiryId) : null,
          weightTons:
            body.weightTons !== undefined && body.weightTons !== null
              ? Number(body.weightTons)
              : null,
          urgency,
          rateRs: Number(body.rateRs),
          marginRs: Number(body.marginRs ?? 0),
          breakdown: body.breakdown,
          status: (VALID_STATUS.includes(body.status) ? body.status : 'draft') as QuoteStatus,
          createdAt: now,
          sentAt: null,
        };
      } else {
        // Server-side draft via the quote engine.
        const [broker, quotes] = await Promise.all([
          db.getBroker(),
          db.listQuotes(),
        ]);
        quote = draftQuote({
          lane,
          broker,
          pastRates: pastRatesFor(quotes, lane.id),
          weightTons:
            body?.weightTons !== undefined && body?.weightTons !== null
              ? Number(body.weightTons)
              : null,
          urgency,
          enquiryId: body?.enquiryId ? String(body.enquiryId) : null,
        });
      }
      const saved = await db.createQuote(quote);
      return sendJson(res, 201, { quote: saved });
    }

    if (req.method === 'PATCH') {
      const body = await readJsonBody(req);
      const id = body?.id ? String(body.id) : undefined;
      if (!id) return sendJson(res, 400, { ok: false, error: 'missing id' });
      const patch: Record<string, unknown> = {};
      if (body?.status !== undefined) {
        if (!VALID_STATUS.includes(body.status)) {
          return sendJson(res, 400, { ok: false, error: 'invalid status' });
        }
        patch.status = body.status;
        // Stamping sentAt when a quote goes out.
        if (body.status === 'sent' && body.sentAt === undefined) {
          patch.sentAt = new Date().toISOString();
        }
      }
      if (body?.sentAt !== undefined) patch.sentAt = body.sentAt;
      if (body?.urgency !== undefined) {
        if (!VALID_URGENCY.includes(body.urgency)) {
          return sendJson(res, 400, { ok: false, error: 'invalid urgency' });
        }
        patch.urgency = body.urgency;
      }
      if (body?.rateRs !== undefined) patch.rateRs = Number(body.rateRs);
      if (body?.marginRs !== undefined) patch.marginRs = Number(body.marginRs);
      if (body?.breakdown !== undefined) patch.breakdown = body.breakdown;
      if (body?.weightTons !== undefined)
        patch.weightTons =
          body.weightTons === null ? null : Number(body.weightTons);
      const quote = await db.updateQuote(id, patch as any);
      if (!quote)
        return sendJson(res, 404, { ok: false, error: 'not-found' });
      return sendJson(res, 200, { quote });
    }

    if (req.method === 'DELETE') {
      const id = queryParam(req, 'id');
      if (!id) return sendJson(res, 400, { ok: false, error: 'missing id' });
      const deleted = await db.deleteQuote(id);
      if (!deleted)
        return sendJson(res, 404, { ok: false, error: 'not-found' });
      return sendJson(res, 200, { ok: true });
    }

    return methodNotAllowed(res, ['GET', 'POST', 'PATCH', 'DELETE']);
  } catch (err) {
    console.error('[QuoteMitra] /api/quotes error:', err);
    return sendJson(res, 500, { ok: false, error: 'internal-error' });
  }
}
