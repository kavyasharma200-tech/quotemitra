// WhatsApp Cloud API helpers for QuoteMitra's server layer.
//
// Env vars:
//   WHATSAPP_TOKEN            – Meta access token (temporary 24h token from
//                               the App Dashboard, or a permanent System User
//                               token — see WHATSAPP_SETUP.md)
//   WHATSAPP_PHONE_NUMBER_ID  – the WhatsApp test/business phone number ID
//   WHATSAPP_APP_SECRET       – App secret, used to validate inbound webhooks
//   WHATSAPP_VERIFY_TOKEN     – token you invent; Meta echoes it back during
//                               webhook verification
//
// Send:  POST https://graph.facebook.com/v21.0/{PHONE_NUMBER_ID}/messages
//        body: { messaging_product:'whatsapp', to, type:'text',
//                text:{ body, preview_url:false } }
// Receive: webhook POST { object:'whatsapp_business_account',
//          entry:[{ changes:[{ field:'messages',
//            value:{ messages:[{ from, id, timestamp, type:'text',
//                                text:{ body } }],
//                    contacts:[{ profile:{ name }, wa_id }] } }] }] }
//
// Pricing (India): service conversations inside the 24h customer-service
// window are FREE — an inbound-first bot costs ₹0 at MVP scale.

import { createHmac, timingSafeEqual } from 'crypto';
import type { CostBreakdown, Lane, Urgency } from './types.js';
import { formatINR, URGENCY_LABELS } from './quoteEngine.js';

const GRAPH_VERSION = 'v21.0';

// ---------------------------------------------------------------------------
// Inbound webhook parsing
// ---------------------------------------------------------------------------

export interface InboundMessage {
  from: string; // wa_id, e.g. '919876543210'
  senderName: string;
  body: string;
  messageId: string;
  timestamp: string; // ISO
}

/** Extract ALL incoming text messages from a Meta webhook payload.
 *  Iterates entry[].changes[].value.messages[] (not just the first). */
export function parseMetaWebhook(payload: any): InboundMessage[] {
  const out: InboundMessage[] = [];
  try {
    const entries = payload?.entry;
    if (!Array.isArray(entries)) return out;
    for (const entry of entries) {
      const changes = entry?.changes;
      if (!Array.isArray(changes)) continue;
      for (const change of changes) {
        const value = change?.value;
        const messages = value?.messages;
        if (!Array.isArray(messages)) continue;
        const contacts = Array.isArray(value?.contacts) ? value.contacts : [];
        const contactByWaId = new Map<string, string>();
        for (const c of contacts) {
          if (c?.wa_id)
            contactByWaId.set(
              c.wa_id,
              c?.profile?.name ?? 'WhatsApp Customer',
            );
        }
        for (const msg of messages) {
          if (!msg || msg.type !== 'text' || !msg.text?.body) continue;
          out.push({
            from: msg.from ?? 'unknown',
            senderName:
              contactByWaId.get(msg.from ?? '') ?? 'WhatsApp Customer',
            body: msg.text.body,
            messageId: msg.id ?? `wamid-${Date.now()}`,
            timestamp: msg.timestamp
              ? new Date(Number(msg.timestamp) * 1000).toISOString()
              : new Date().toISOString(),
          });
        }
      }
    }
  } catch (err) {
    console.warn('[QuoteMitra] parseMetaWebhook failed:', err);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Signature validation
// ---------------------------------------------------------------------------

/** Validate the X-Hub-Signature-256 header against the RAW request body
 *  using WHATSAPP_APP_SECRET. Timing-safe comparison. */
export function verifyWebhookSignature(
  rawBody: Buffer,
  signatureHeader: string | undefined | null,
  appSecret: string,
): boolean {
  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) return false;
  const expected = createHmac('sha256', appSecret).update(rawBody).digest();
  const received = Buffer.from(signatureHeader.slice('sha256='.length), 'hex');
  if (expected.length !== received.length) return false;
  return timingSafeEqual(expected, received);
}

// ---------------------------------------------------------------------------
// Sending
// ---------------------------------------------------------------------------

export interface SendResult {
  ok: boolean;
  messageId?: string;
  reason?: string;
}

export function isWhatsAppConfigured(): boolean {
  return Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

/** Send a plain-text WhatsApp message via the Cloud API.
 *  When creds are absent, logs the reply instead of failing —
 *  the API must never crash from missing env. */
export async function sendWhatsAppText(
  to: string,
  text: string,
): Promise<SendResult> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) {
    console.warn(
      '[QuoteMitra] WHATSAPP_TOKEN/PHONE_NUMBER_ID not set — logging reply instead of sending:',
      { to, text },
    );
    return { ok: false, reason: 'whatsapp-not-configured' };
  }
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: text, preview_url: false },
      }),
    });
  } catch (err) {
    console.error('[QuoteMitra] WhatsApp send failed (network):', err);
    return { ok: false, reason: 'network-error' };
  }
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON error body */
  }
  if (!res.ok) {
    console.error('[QuoteMitra] WhatsApp send failed:', res.status, data);
    return {
      ok: false,
      reason: `graph-api-${res.status}`,
    };
  }
  const messageId = data?.messages?.[0]?.id ?? undefined;
  return { ok: true, messageId };
}

// ---------------------------------------------------------------------------
// Reply formatting
// ---------------------------------------------------------------------------

export interface QuoteReplyInputs {
  lane: Lane;
  breakdown: CostBreakdown;
  urgency: Urgency;
  brokerName: string;
}

/** The WhatsApp message sent back with a drafted quote. */
export function formatQuoteReply(inputs: QuoteReplyInputs): string {
  const { lane, breakdown, urgency, brokerName } = inputs;
  const b = breakdown;
  const lines = [
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
  ];
  return lines.join('\n');
}

/** Reply when no lane matches the customer's message. */
export function formatLaneHelpReply(
  lanes: Lane[],
  brokerName: string,
): string {
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
