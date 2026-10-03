// Meta WhatsApp webhook — verification handshake (GET) and inbound
// messages (POST).
//
// GET  /api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...
//   → returns hub.challenge as plain text when hub.mode === 'subscribe'
//     and hub.verify_token === WHATSAPP_VERIFY_TOKEN, else 403.
//
// POST /api/webhooks/whatsapp
//   → validates X-Hub-Signature-256 against the raw body with
//     WHATSAPP_APP_SECRET (skipped with a console warning when absent);
//     parses incoming text messages; for each one creates an enquiry,
//     auto-drafts a quote via the server quote engine, and replies on
//     WhatsApp (or logs the reply when WhatsApp creds are absent).
//     Always responds 200 quickly.

import { getDb } from '../_lib/db.js';
import {
  draftQuote,
  findLaneInText,
  pastRatesFor,
} from '../_lib/quoteEngine.js';
import {
  formatLaneHelpReply,
  formatQuoteReply,
  parseMetaWebhook,
  sendWhatsAppText,
  verifyWebhookSignature,
  type InboundMessage,
} from '../_lib/whatsapp.js';

// Vercel: give us the raw body so we can validate the signature.
export const config = { api: { bodyParser: false } };

async function readRawBody(req: any): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

async function handleInbound(msg: InboundMessage): Promise<void> {
  const db = await getDb();
  const [broker, lanes, quotes] = await Promise.all([
    db.getBroker(),
    db.listLanes(),
    db.listQuotes(),
  ]);

  // 1. Record the enquiry.
  const lane = findLaneInText(lanes, msg.body);
  const enquiry = await db.createEnquiry({
    waFrom: msg.from,
    text: msg.body,
    laneId: lane ? lane.id : null,
    status: 'new',
  });

  // 2. No lane match → ask for clarification with the route list.
  if (!lane) {
    await sendWhatsAppText(
      msg.from,
      formatLaneHelpReply(lanes, broker.name || broker.company),
    );
    return;
  }

  // 3. Auto-draft a quote via the server quote engine.
  const quote = draftQuote({
    lane,
    broker,
    pastRates: pastRatesFor(quotes, lane.id),
    urgency: 'standard',
    enquiryId: enquiry.id,
  });
  await db.createQuote(quote);
  await db.updateEnquiry(enquiry.id, { status: 'quoted', laneId: lane.id });

  // 4. Reply on WhatsApp with the drafted quote.
  const reply = formatQuoteReply({
    lane,
    breakdown: quote.breakdown,
    urgency: quote.urgency,
    brokerName: broker.name || broker.company,
  });
  const result = await sendWhatsAppText(msg.from, reply);
  if (result.ok) {
    await db.updateQuote(quote.id, {
      status: 'sent',
      sentAt: new Date().toISOString(),
    });
  } else {
    console.warn(
      '[QuoteMitra] Quote drafted but not sent on WhatsApp:',
      quote.id,
      result.reason,
    );
  }
}

export default async function handler(req: any, res: any) {
  try {
    // ---- Verification handshake ----
    if (req.method === 'GET') {
      const mode = req.query?.['hub.mode'];
      const token = req.query?.['hub.verify_token'];
      const challenge = req.query?.['hub.challenge'];
      const expected = process.env.WHATSAPP_VERIFY_TOKEN;
      if (mode === 'subscribe' && token && expected && token === expected) {
        res.setHeader('Content-Type', 'text/plain');
        return res.status(200).send(String(challenge ?? ''));
      }
      return res.status(403).send('Forbidden');
    }

    // ---- Inbound webhook ----
    if (req.method === 'POST') {
      const raw = await readRawBody(req);
      const appSecret = process.env.WHATSAPP_APP_SECRET;
      if (appSecret) {
        const sig = req.headers?.['x-hub-signature-256'] as
          | string
          | undefined;
        if (!verifyWebhookSignature(raw, sig, appSecret)) {
          console.warn('[QuoteMitra] Webhook signature validation failed.');
          return res.status(403).send('Invalid signature');
        }
      } else {
        console.warn(
          '[QuoteMitra] WHATSAPP_APP_SECRET not set — skipping webhook signature validation (do NOT ship like this).',
        );
      }

      let payload: any = null;
      try {
        payload = JSON.parse(raw.toString('utf8'));
      } catch {
        return res.status(200).send('OK'); // ack anyway; nothing to parse
      }

      // Only process WhatsApp Business Account notifications.
      if (payload?.object && payload.object !== 'whatsapp_business_account') {
        return res.status(200).send('OK');
      }

      const messages = parseMetaWebhook(payload);
      // Process each message; never let one failure block the ack.
      for (const msg of messages) {
        try {
          await handleInbound(msg);
        } catch (err) {
          console.error('[QuoteMitra] Inbound message handling failed:', err);
        }
      }
      return res.status(200).send('OK');
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).send('Method Not Allowed');
  } catch (err) {
    console.error('[QuoteMitra] Webhook handler error:', err);
    // Always 200 for POST so Meta doesn't retry-storm; 500 otherwise.
    if (req.method === 'POST') return res.status(200).send('OK');
    return res.status(500).json({ ok: false, error: 'internal-error' });
  }
}
