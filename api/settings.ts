// Broker settings (single row).
//   GET /api/settings → { broker: BrokerSettings }
//   PUT /api/settings → body { name?, company?, phone?, defaultMarginPct?, dieselPrice? }
//                       → { broker: BrokerSettings }

import { getDb } from './_lib/db.js';
import {
  methodNotAllowed,
  readJsonBody,
  sendJson,
} from './_lib/http.js';

export default async function handler(req: any, res: any) {
  try {
    const db = await getDb();

    if (req.method === 'GET') {
      const broker = await db.getBroker();
      return sendJson(res, 200, { broker });
    }

    if (req.method === 'PUT') {
      const body = await readJsonBody(req);
      const patch: Record<string, unknown> = {};
      if (body?.name !== undefined) patch.name = String(body.name);
      if (body?.company !== undefined) patch.company = String(body.company);
      if (body?.phone !== undefined) patch.phone = String(body.phone);
      if (body?.defaultMarginPct !== undefined) {
        const m = Number(body.defaultMarginPct);
        if (!Number.isFinite(m) || m < 0 || m > 100) {
          return sendJson(res, 400, {
            ok: false,
            error: 'invalid defaultMarginPct (0–100)',
          });
        }
        patch.defaultMarginPct = m;
      }
      if (body?.dieselPrice !== undefined) {
        const d = Number(body.dieselPrice);
        if (!Number.isFinite(d) || d <= 0) {
          return sendJson(res, 400, { ok: false, error: 'invalid dieselPrice' });
        }
        patch.dieselPrice = d;
      }
      const broker = await db.updateBroker(patch as any);
      return sendJson(res, 200, { broker });
    }

    return methodNotAllowed(res, ['GET', 'PUT']);
  } catch (err) {
    console.error('[QuoteMitra] /api/settings error:', err);
    return sendJson(res, 500, { ok: false, error: 'internal-error' });
  }
}
