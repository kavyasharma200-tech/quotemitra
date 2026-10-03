// POST /api/whatsapp/send — send a WhatsApp text message via the Cloud API.
//   body: { to, text }   (to = recipient wa_id, e.g. '919876543210')
//   → { ok: true, messageId } on success
//   → { ok: false, reason: 'whatsapp-not-configured' } when
//     WHATSAPP_TOKEN / WHATSAPP_PHONE_NUMBER_ID are absent
//     (the reply is logged server-side instead of throwing)

import { methodNotAllowed, readJsonBody, sendJson } from '../_lib/http.js';
import { sendWhatsAppText } from '../_lib/whatsapp.js';

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
    const body = await readJsonBody(req);
    const to = body?.to ? String(body.to).trim() : '';
    const text = body?.text ? String(body.text) : '';
    if (!to || !text) {
      return sendJson(res, 400, {
        ok: false,
        error: 'missing-fields: to, text',
      });
    }
    const result = await sendWhatsAppText(to, text);
    // 200 even when unconfigured — the reply was logged, nothing crashed.
    return sendJson(res, 200, result);
  } catch (err) {
    console.error('[QuoteMitra] /api/whatsapp/send error:', err);
    return sendJson(res, 500, { ok: false, error: 'internal-error' });
  }
}
