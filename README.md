# QuoteMitra

**Instant WhatsApp freight quotes for small Indian brokers.**

A broker gets a load enquiry on WhatsApp — "5 ton TMT, Bokaro se Dhanbad, kal subah" — and QuoteMitra drafts a quote from their own lane history in under a minute: fuel, toll, driver bata, margin, all shown line by line. The broker checks it, taps send, and every quote is logged with its margin, won or lost.

This is a real full-stack app on the zero-budget free tier: Vite + React frontend, Vercel serverless API, Supabase Postgres. With no credentials configured it runs in honest demo mode (local data, simulated WhatsApp); add the env vars below and it talks to the real database and the real WhatsApp Cloud API.

## Run it

```bash
npm install
npm run dev      # local dev server (API routes need `vercel dev`)
npm run build    # production build → dist/
```

## Architecture

```
browser ──▶ Vite SPA (src/) ──▶ /api/* (Vercel serverless, api/) ──▶ Supabase Postgres
   │                                    │
   │ fallback                           └── dev fallback: /tmp/quotemitra-dev.json
   ▼                                         (when env vars absent)
localStorage (demo mode)
```

- **Frontend** (`src/`): 7 views — Landing, Dashboard, Inbox, QuoteComposer, Quotes, Lanes, Settings. All data goes through `src/lib/api.ts`, which calls the backend and silently falls back to localStorage when the API is unreachable (a "Demo mode — local data" badge shows in the nav).
- **Backend** (`api/`): Vercel serverless functions. CRUD for lanes/quotes/enquiries/settings, server-side quote drafting, WhatsApp webhook + sender.
- **Database** (`supabase/schema.sql`): `brokers`, `lanes`, `enquiries`, `quotes` tables with RLS (permissive single-user MVP policies — scope by `auth.uid()` before multi-user).
- **WhatsApp**: see `WHATSAPP_SETUP.md` for the exact setup walkthrough.

## API surface

| Route | Methods | Notes |
|---|---|---|
| `/api/webhooks/whatsapp` | GET | Meta verification handshake (`WHATSAPP_VERIFY_TOKEN`) |
| `/api/webhooks/whatsapp` | POST | Inbound messages: signature-checked, creates enquiry → drafts quote → replies |
| `/api/whatsapp/send` | POST | `{to, text}` via Graph API v21.0 |
| `/api/lanes` | GET/POST/PATCH/DELETE | PATCH body `{id, ...}`; DELETE `?id=` |
| `/api/quotes` | GET/POST/PATCH/DELETE | PATCH `{id, status}` for won/lost (stamps `sentAt`) |
| `/api/quotes/draft` | POST | `{laneId, weightTons?, urgency?}` → server-computed draft, persisted |
| `/api/enquiries` | GET/POST/PATCH/DELETE | |
| `/api/settings` | GET/PUT | Single broker row |

## Environment variables

| Var | Where | Required for |
|---|---|---|
| `SUPABASE_URL` | Vercel env | Real database (else dev JSON fallback) |
| `SUPABASE_SERVICE_KEY` | Vercel env (server only — never expose client-side) | Real database |
| `SUPABASE_ANON_KEY` | docs/future client use | — |
| `WHATSAPP_VERIFY_TOKEN` | Vercel env | Webhook verification (invent any string) |
| `WHATSAPP_APP_SECRET` | Vercel env | Webhook signature validation |
| `WHATSAPP_TOKEN` | Vercel env | Sending WhatsApp messages |
| `WHATSAPP_PHONE_NUMBER_ID` | Vercel env | Sending WhatsApp messages |

Run `supabase/schema.sql` in the Supabase SQL editor once, then set the env vars in Vercel → Project → Settings → Environment Variables and redeploy.

## The quote engine (`api/_lib/quoteEngine.ts`, mirrored in `src/lib/quoteEngine.ts`)

Pure TypeScript, no black box:

1. **Trip cost** = diesel (distance ÷ mileage × ₹/L) + toll + driver bata (₹800/1200/1800 by trip length) + loading/unloading labour
2. **Lane history**: weighted average of past quotes on the lane, drifted by **+2.6% per ₹5/L diesel move**
3. **Final rate** = 50% history-adjusted + 50% cost-plus, × urgency (`standard` 1.0 / `urgent` 1.1 / `same-day` 1.15), rounded to ₹50. No history → cost-plus with 5% safety factor
4. Broker can edit the rate and margin before sending; the breakdown recomputes live

## Design

Hand-written CSS only — no Tailwind, no component libraries, no icon packs (22 hand-drawn SVG icons in `src/components/Icon.tsx`). Typography: **Fraunces** (display serif with italic accents) + **IBM Plex Mono** (every ₹ figure, tabular numbers) + **Manrope** (UI text). Palette: white + sage green used sparingly as accent; hairline dividers, no card shadows, no gradients.

## WhatsApp paths

1. **Cloud API (official, recommended):** `WHATSAPP_SETUP.md` — free test number works today with no business verification (up to 5 registered recipients).
2. **Baileys bridge (unofficial):** `tools/baileys-bridge/` — QR-pair her real personal WhatsApp number. Separate mini-package; **unofficial API, small risk of number restriction, strongly recommend a secondary number — her choice.**

## What's still simulated / TODO

- Without WhatsApp env vars, inbound/outbound WhatsApp is simulated (replies are logged, never crash).
- Webhook drafts always use `standard` urgency — urgency detection from message text not yet implemented.
- No per-message dedupe on `wamid` — add if Meta retries cause duplicates.
- No rate limiting on API routes.
- Baileys bridge dependencies intentionally not installed (run `npm install` inside `tools/baileys-bridge` when needed).
