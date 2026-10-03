// Lanes CRUD.
//   GET    /api/lanes            → { lanes: Lane[] }
//   POST   /api/lanes            → body { origin, destination, distanceKm, vehicleType,
//                                  mileageKmpl?, tollRs?, typicalRateRs? } → created lane
//   PATCH  /api/lanes            → body { id, ...fields } → updated lane
//   DELETE /api/lanes?id=...     → { ok: true }

import { getDb, type NewLane } from './_lib/db.js';
import {
  methodNotAllowed,
  queryParam,
  readJsonBody,
  sendJson,
} from './_lib/http.js';

export default async function handler(req: any, res: any) {
  try {
    const db = await getDb();

    if (req.method === 'GET') {
      const lanes = await db.listLanes();
      return sendJson(res, 200, { lanes });
    }

    if (req.method === 'POST') {
      const body = await readJsonBody(req);
      const required = ['origin', 'destination', 'distanceKm', 'vehicleType'];
      const missing = required.filter(
        (k) => body?.[k] === undefined || body?.[k] === '',
      );
      if (missing.length > 0) {
        return sendJson(res, 400, {
          ok: false,
          error: `missing-fields: ${missing.join(', ')}`,
        });
      }
      const data: NewLane = {
        origin: String(body.origin),
        destination: String(body.destination),
        distanceKm: Number(body.distanceKm),
        vehicleType: String(body.vehicleType),
        ...(body.mileageKmpl !== undefined
          ? { mileageKmpl: Number(body.mileageKmpl) }
          : {}),
        ...(body.tollRs !== undefined ? { tollRs: Number(body.tollRs) } : {}),
        ...(body.typicalRateRs !== undefined
          ? { typicalRateRs: Number(body.typicalRateRs) }
          : {}),
      };
      if (!Number.isFinite(data.distanceKm) || data.distanceKm <= 0) {
        return sendJson(res, 400, {
          ok: false,
          error: 'invalid distanceKm',
        });
      }
      const lane = await db.createLane(data);
      return sendJson(res, 201, { lane });
    }

    if (req.method === 'PATCH') {
      const body = await readJsonBody(req);
      const id = body?.id ? String(body.id) : undefined;
      if (!id) {
        return sendJson(res, 400, { ok: false, error: 'missing id' });
      }
      const allowed = [
        'origin',
        'destination',
        'distanceKm',
        'vehicleType',
        'mileageKmpl',
        'tollRs',
        'typicalRateRs',
      ] as const;
      const patch: Record<string, unknown> = {};
      for (const k of allowed) {
        if (body?.[k] !== undefined) {
          patch[k] =
            ['distanceKm', 'mileageKmpl', 'tollRs', 'typicalRateRs'].includes(k)
              ? Number(body[k])
              : String(body[k]);
        }
      }
      const lane = await db.updateLane(id, patch as any);
      if (!lane) return sendJson(res, 404, { ok: false, error: 'not-found' });
      return sendJson(res, 200, { lane });
    }

    if (req.method === 'DELETE') {
      const id = queryParam(req, 'id');
      if (!id) return sendJson(res, 400, { ok: false, error: 'missing id' });
      const deleted = await db.deleteLane(id);
      if (!deleted)
        return sendJson(res, 404, { ok: false, error: 'not-found' });
      return sendJson(res, 200, { ok: true });
    }

    return methodNotAllowed(res, ['GET', 'POST', 'PATCH', 'DELETE']);
  } catch (err) {
    console.error('[QuoteMitra] /api/lanes error:', err);
    return sendJson(res, 500, { ok: false, error: 'internal-error' });
  }
}
