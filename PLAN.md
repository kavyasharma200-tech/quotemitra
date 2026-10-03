# QuoteMitra — MVP Plan

**What it is:** A web app that simulates the full working flow of QuoteMitra — instant WhatsApp freight quotes for small Indian freight brokers. A broker receives an enquiry on WhatsApp, taps "Draft quote", gets a transparent, editable quote computed from their own lane history, and sends it back — all in under a minute.

**Who it's for:** Kavya Sharma's zero-budget MVP. Everything runs client-side; no server, no paid services.

---

## 1. Architecture

Single-page app, fully client-side. State lives in React + `localStorage` (survives reloads, zero backend cost).

```
Browser (React SPA)
├── Views: Landing · Dashboard · Inbox · Quotes · Lanes · Settings
├── Lib: quoteEngine (pure TS) · whatsapp adapter (interface + simulator) · store (localStorage)
└── Data: seed.ts (demo lanes, quotes, enquiries)
```

**Simulated vs real:**
- **Simulated (MVP):** WhatsApp send/receive. Inbound enquiries arrive via the "Simulate incoming enquiry" button and through a parser that accepts real WhatsApp Cloud API webhook payloads. Outbound quotes are logged as "sent" in the thread.
- **Real later:** Meta business verification → WhatsApp Cloud API credentials → swap `SimulatedWhatsAppAdapter` for `CloudApiWhatsAppAdapter` (same interface, no UI changes). The adapter contract is designed so this is a drop-in replacement.

## 2. Tech stack (and why)

| Choice | Reason |
|---|---|
| **Vite + React 19 + TypeScript** | Fast dev/build, type-safe quote math, deploys free on Vercel/GitHub Pages |
| **Hand-written CSS, zero libraries** | User requirement: no Tailwind, no component kits, no Lucide. Full visual control, tiny bundle |
| **localStorage persistence** | Zero-cost "database"; broker's lane history and quotes survive reloads |
| **Google Fonts: Fraunces + Manrope** | Hybrid typography — Fraunces (serif display) for headlines, Manrope (clean sans) for UI |
| **Custom SVG icons** | Hand-drawn minimal icon set (chat, chart, document, route, gear, send, check, truck, fuel, rupee, clock) |

## 3. Data model

```ts
Broker   { name, company, phone, defaultMarginPct, dieselPricePerLitre }
Lane     { id, origin, destination, distanceKm, vehicleType, capacityT,
           mileageKmpl, tollEstimate, typicalRate, lastRateDate }
Enquiry  { id, senderName, senderPhone, receivedAt, rawText,
           parsed: { origin?, destination?, weightT?, goods?, neededBy?, urgency },
           status: 'new' | 'quoted' | 'closed', thread: Message[] }
Quote    { id, enquiryId, laneId, createdAt, rate, costBreakdown,
           marginPct, marginRs, status: 'sent' | 'won' | 'lost', sentVia }
Message  { id, from: 'broker' | 'customer', text, at, kind: 'text' | 'quote' }
```

## 4. Quote engine (the heart) — `src/lib/quoteEngine.ts`

Pure functions, fully transparent math shown to the broker:

1. **Operating cost** = fuel + toll + driver bata + handling
   - fuel = (distanceKm / mileageKmpl) × dieselPrice (default ₹92/L; mileage 3–5 km/L by vehicle)
   - toll = lane.tollEstimate (sensible default ≈ ₹8/km on highway lanes)
   - driver bata = ₹800 (<150 km), ₹1,200 (150–350 km), ₹1,800 (>350 km)
   - handling (loading/unloading labour) = ₹800 short / ₹1,500 long
2. **Lane-history adjustment:** if the lane has past quotes, take the weighted average past rate and adjust for diesel drift: **+2.6% per ₹5/L change** (CRISIL estimate, via Hindu BusinessLine, May 2026).
3. **Final rate** = 50% × history-adjusted + 50% × (operating cost × (1 + margin%)), rounded to nearest ₹50.
   - No history → cost-plus × 1.05 safety factor.
   - Urgency multiplier: standard ×1.0, urgent ×1.1, same-day ×1.15.
4. **Broker can edit** the rate and margin before sending; the breakdown recomputes live.

Default margin 13% (typical Indian broker commission ₹3,000 on a ₹23,000 trip ≈ 13%).

## 5. File structure

```
quotemitra/
├── PLAN.md
├── README.md
├── index.html                  # title, fonts (Fraunces + Manrope)
├── src/
│   ├── main.tsx
│   ├── App.tsx                 # view routing + landing/app shell switch
│   ├── styles.css              # entire design system, hand-written, responsive
│   ├── types.ts
│   ├── data/seed.ts            # 10 lanes, 6 past quotes, 3 open enquiries, broker profile
│   ├── lib/
│   │   ├── quoteEngine.ts      # costing + history blending (pure functions)
│   │   ├── whatsapp.ts         # WhatsAppAdapter interface, simulator, webhook parser,
│   │   │                       # CloudApiWhatsAppAdapter stub for later
│   │   └── store.ts            # localStorage load/save, seed-on-first-run
│   ├── components/
│   │   ├── Icon.tsx            # custom SVG icon set
│   │   ├── ui.tsx              # StatCard, Badge, Modal, EmptyState, Field
│   │   └── Sidebar.tsx
│   └── views/
│       ├── Landing.tsx
│       ├── Dashboard.tsx
│       ├── Inbox.tsx           # thread list + conversation + simulate button + draft quote
│       ├── QuoteComposer.tsx   # editable quote + live cost breakdown
│       ├── Quotes.tsx          # quote log, mark won/lost
│       ├── Lanes.tsx           # lane CRUD
│       └── Settings.tsx        # broker profile, margin, diesel price
└── public/
```

## 6. Research notes (sources)

**WhatsApp Cloud API (Meta):**
- Inbound webhook: `POST` to your URL, body `{object:"whatsapp_business_account", entry:[{changes:[{field:"messages", value:{messages:[{from, id, timestamp, type:"text", text:{body}}]}}]}]}` — verified via Meta webhook docs and community integration notes (Oct 2026).
- Send: `POST https://graph.facebook.com/v23.0/{PHONE_NUMBER_ID}/messages` with `{messaging_product:"whatsapp", to, type:"text", text:{body}}`.
- India pricing (Jan 2026 rate card): **service conversations inside the 24h customer-service window are free**; first 1,000 user-initiated conversations/month free. So an inbound-first bot costs ₹0 at MVP scale. Business-initiated messages (utility ₹0.115/msg) are avoided by design.
- Requires: Meta Business verification + app + phone number registration. That's why it's Phase 2, not MVP.

**Indian freight costing (realistic defaults used in the engine):**
- Fuel = 55–65% of operating cost; loaded trucks do 3–5 km/L (truckguru.co.in, Hindu BusinessLine May 2026).
- Maintenance/tyres ≈ ₹2–3/km; tolls ≈ 10% of cost; driver ₹18,000–35,000/month + bata; loading/unloading ₹500–2,500/shipment (truckguru.co.in).
- Operator margin typically 10–20% (thinner on busy corridors, higher on empty-return routes).
- Per-km market rates 2025: mini truck ₹10–25, LCV ₹15–40, medium ₹20–30, 10-wheeler ₹25–40, multi-axle ₹35–85 (shipzip.in).
- Diesel ₹5/L rise → freight rates must rise 2.5–2.8% to preserve margins (CRISIL via Hindu BusinessLine, May 2026) — used as the engine's diesel-drift factor.

## 7. Free-tier deployment path

1. `npm run build` → static `dist/` (zero server needed)
2. Deploy on **Vercel** (free, `vercel --prod`) or **GitHub Pages** — both free for public repos
3. Phase 2 (real WhatsApp): add a tiny webhook receiver (Cloudflare Workers free tier) implementing the adapter's `parseWebhook()` + `sendText()` against the Graph API; frontend unchanged.

## 8. Deliberately out of MVP scope

- Real WhatsApp sending (needs Meta verification — weeks, not code)
- Multi-broker accounts / login (single broker profile in settings)
- Hindi/vernacular UI (English first; message templates already use broker-style Hinglish)
- Payments/billing (pay-per-won-load is the pricing page teaser, not wired yet)
- Push notifications
