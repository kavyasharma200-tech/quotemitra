# QuoteMitra

**Instant WhatsApp freight quotes for small Indian brokers.**

A broker gets a load enquiry on WhatsApp — "5 ton TMT, Bokaro se Dhanbad, kal subah" — and QuoteMitra drafts a quote from their own lane history in under a minute: fuel, toll, driver bata, margin, all shown line by line. The broker checks it, taps send, and every quote is logged with its margin, won or lost.

This is the zero-budget MVP: a complete, working web app. WhatsApp send/receive is simulated; the real WhatsApp Cloud API plugs in later without UI changes (see `src/lib/whatsapp.ts`).

## Run it

```bash
npm install
npm run dev      # local dev server
npm run build    # production build → dist/
```

No backend, no API keys, no database. All data persists in the browser's `localStorage`. To reset the demo, use **Settings → Reset demo data**.

## What's inside

| Screen | What it does |
|---|---|
| **Landing** | Marketing page: hero, 3-step how-it-works, pay-per-won-load pricing teaser |
| **Dashboard** | Quotes sent, win rate, margin earned, enquiries waiting for a reply |
| **Inbox** | WhatsApp-style threads. "Simulate incoming enquiry" injects realistic new load requests; "Draft quote" opens the composer |
| **Quote composer** | Rule-based quote from lane history with a transparent cost breakdown; margin slider, urgency levels, editable final rate; "Send on WhatsApp" logs the quote |
| **Quote log** | Every sent quote — mark won/lost manually, filter by status |
| **Lanes** | CRUD for lanes (origin, destination, distance, vehicle, toll, typical rate) — the rate history every quote is drafted from |
| **Settings** | Broker profile, default margin %, diesel price (past rates auto-adjust when diesel moves) |

## The quote engine (`src/lib/quoteEngine.ts`)

Pure TypeScript, no black box:

1. **Trip cost** = diesel (distance ÷ mileage × ₹/L) + toll estimate + driver bata (₹800/1200/1800 by trip length) + loading/unloading labour
2. **Lane history**: weighted average of past quotes on the lane, drifted by **+2.6% per ₹5/L diesel move** (CRISIL estimate)
3. **Final rate** = 50% history-adjusted + 50% cost-plus, × urgency (1.0 / 1.1 / 1.15), rounded to ₹50. No history → cost-plus with 5% safety factor
4. Broker can edit the rate and margin before sending; the breakdown recomputes live

## What's simulated vs real

- **Simulated:** WhatsApp threads and sending. The UI talks only to the `WhatsAppAdapter` interface (`src/lib/whatsapp.ts`); `SimulatedWhatsAppAdapter` is active now.
- **Real later:** finish Meta Business verification → implement `CloudApiWhatsAppAdapter.sendText` (Graph API POST shape is documented in the file) → add a webhook receiver that calls `parseMetaWebhook()`. The UI doesn't change.

## Tech

Vite + React 19 + TypeScript. Hand-written CSS only — no Tailwind, no component libraries, no icon packs (custom SVG icon set in `src/components/Icon.tsx`). Typography: Fraunces (display serif) + Manrope (UI sans). Palette: white + sage green.

## Roadmap

- Phase 2: real WhatsApp Cloud API (inbound-first, ₹0 at MVP scale on Meta's free service conversations)
- Phase 3: booking confirmation + trip tracking on the same thread
- Phase 4: pay-per-won-load billing
