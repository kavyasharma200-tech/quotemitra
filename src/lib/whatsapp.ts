// WhatsApp messaging adapter.
//
// The MVP simulates WhatsApp. When Meta business verification is done,
// swap `SimulatedWhatsAppAdapter` for `CloudApiWhatsAppAdapter` — the UI
// only talks to the `WhatsAppAdapter` interface, so nothing else changes.
//
// Real Cloud API reference (Meta, Graph API v23.0):
//   Send:    POST https://graph.facebook.com/v23.0/{PHONE_NUMBER_ID}/messages
//            body: { messaging_product:'whatsapp', to, type:'text', text:{body} }
//   Receive: webhook POST { object:'whatsapp_business_account',
//              entry:[{ changes:[{ field:'messages',
//                value:{ messages:[{ from, id, timestamp, type:'text',
//                                    text:{ body } }] } }] }] }
//   Pricing (India, Jan 2026): service conversations inside the 24h
//   customer-service window are FREE — an inbound-first bot costs ₹0 at
//   MVP scale.

export interface WhatsAppAdapter {
  /** "Send" a text message. MVP: appends to the thread locally. */
  sendText(to: string, body: string): { ok: boolean; messageId: string };
  /** Whether this adapter talks to Meta's real API. */
  readonly isLive: boolean;
}

/** Raw shape of a Meta inbound webhook payload (subset we care about). */
export interface MetaWebhookPayload {
  object?: string;
  entry?: Array<{
    changes?: Array<{
      field?: string;
      value?: {
        messages?: Array<{
          from?: string;
          id?: string;
          timestamp?: string;
          type?: string;
          text?: { body?: string };
        }>;
        contacts?: Array<{ profile?: { name?: string }; wa_id?: string }>;
      };
    }>;
  }>;
}

export interface ParsedInbound {
  from: string;
  senderName: string;
  body: string;
  messageId: string;
  timestamp: string;
}

/** Extract a usable inbound message from a real Meta webhook payload.
 *  This is the function a future Cloudflare-Worker webhook will call. */
export function parseMetaWebhook(payload: MetaWebhookPayload): ParsedInbound | null {
  try {
    const change = payload?.entry?.[0]?.changes?.[0];
    const value = change?.value;
    const msg = value?.messages?.[0];
    if (!msg || msg.type !== 'text' || !msg.text?.body) return null;
    const contact = value?.contacts?.[0];
    return {
      from: msg.from ?? 'unknown',
      senderName: contact?.profile?.name ?? 'WhatsApp Customer',
      body: msg.text.body,
      messageId: msg.id ?? `wamid.sim${Date.now()}`,
      timestamp: msg.timestamp
        ? new Date(Number(msg.timestamp) * 1000).toISOString()
        : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

let simCounter = 0;

/** MVP adapter: "sending" just records the message for the UI to display. */
export class SimulatedWhatsAppAdapter implements WhatsAppAdapter {
  readonly isLive = false;
  sendText(_to: string, _body: string): { ok: boolean; messageId: string } {
    simCounter += 1;
    return { ok: true, messageId: `sim-${Date.now()}-${simCounter}` };
  }
}

/**
 * Phase-2 adapter stub. To go live:
 *   1. Finish Meta Business verification, register a phone number.
 *   2. Set env: WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN.
 *   3. Replace the body of sendText with a fetch() to the Graph API
 *      (see the POST shape documented at the top of this file).
 */
export class CloudApiWhatsAppAdapter implements WhatsAppAdapter {
  readonly isLive = true;
  private phoneNumberId: string;
  private accessToken: string;
  constructor(phoneNumberId: string, accessToken: string) {
    this.phoneNumberId = phoneNumberId;
    this.accessToken = accessToken;
  }
  sendText(_to: string, _body: string): { ok: boolean; messageId: string } {
    // eslint-disable-next-line no-console
    console.warn(
      '[QuoteMitra] CloudApiWhatsAppAdapter is a stub. Configure WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN, then implement the Graph API POST.',
      { phoneNumberId: this.phoneNumberId, hasToken: Boolean(this.accessToken) },
    );
    return { ok: false, messageId: '' };
  }
}

export const whatsapp = new SimulatedWhatsAppAdapter();
