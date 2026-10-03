// Enquiries CRUD (WhatsApp inbound leads).
//   GET    /api/enquiries        → { enquiries: Enquiry[] } (newest first)
//   POST   /api/enquiries        → body { waFrom, text, laneId?, weightTons?, status? }
//   PATCH  /api/enquiries        → body { id, status?, laneId?, text?, weightTons? }
//   DELETE /api/enquiries?id=... → { ok: true }

import { getDb } from './_lib/db.js';
import {
  methodNotAllowed,
  queryParam,
  readJsonBody,
  sendJson,
} from './_lib/http.js';
import type { EnquiryStatus } from './_lib/types.js';

const VALID_STATUS: EnquiryStatus[] = ['new', 'quoted', 'closed'];

export default async function handler(req: any, res: any) {
  try {
    const db = await getDb();

    if (req.method === 'GET') {
      const enquiries = await db.listEnquiries();
      return sendJson(res, 200, { enquiries });
    }

    if (req.method === 'POST') {
      const body = await readJsonBody(req);
      if (!body?.waFrom || !body?.text) {
        return sendJson(res, 400, {
          ok: false,
          error: 'missing-fields: waFrom, text',
        });
      }
      const status: EnquiryStatus = VALID_STATUS.includes(body.status)
        ? body.status
        : 'new';
      const enquiry = await db.createEnquiry({
        waFrom: String(body.waFrom),
        text: String(body.text),
        laneId: body.laneId ? String(body.laneId) : null,
        weightTons:
          body.weightTons !== undefined && body.weightTons !== null
            ? Number(body.weightTons)
            : null,
        status,
      });
      return sendJson(res, 201, { enquiry });
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
      }
      if (body?.laneId !== undefined)
        patch.laneId = body.laneId === null ? null : String(body.laneId);
      if (body?.text !== undefined) patch.text = String(body.text);
      if (body?.weightTons !== undefined)
        patch.weightTons =
          body.weightTons === null ? null : Number(body.weightTons);
      const enquiry = await db.updateEnquiry(id, patch as any);
      if (!enquiry)
        return sendJson(res, 404, { ok: false, error: 'not-found' });
      return sendJson(res, 200, { enquiry });
    }

    if (req.method === 'DELETE') {
      const id = queryParam(req, 'id');
      if (!id) return sendJson(res, 400, { ok: false, error: 'missing id' });
      const deleted = await db.deleteEnquiry(id);
      if (!deleted)
        return sendJson(res, 404, { ok: false, error: 'not-found' });
      return sendJson(res, 200, { ok: true });
    }

    return methodNotAllowed(res, ['GET', 'POST', 'PATCH', 'DELETE']);
  } catch (err) {
    console.error('[QuoteMitra] /api/enquiries error:', err);
    return sendJson(res, 500, { ok: false, error: 'internal-error' });
  }
}
