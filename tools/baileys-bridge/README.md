# QuoteMitra — Baileys Bridge (unofficial WhatsApp autopilot)

Runs on **your own computer**, pairs your WhatsApp via QR (as a linked
device, like WhatsApp Web), and auto-replies to incoming enquiry messages
with drafted freight quotes — no Meta app, no business verification needed.

## ⚠️ Read this first — your choice

**This uses an unofficial API.** Baileys talks to WhatsApp's web protocol,
which is **not** an official Meta/WhatsApp API:

- WhatsApp's Terms of Service don't allow third-party clients. There is a
  **small but real risk of your number being temporarily restricted or
  banned**, especially if the account sends lots of automated messages.
- **Strongly recommended: use a secondary number** (a spare SIM / eSIM) for
  this bridge — not your primary personal number.
- The **official, zero-risk path** is the WhatsApp Cloud API documented in
  the repo's `WHATSAPP_SETUP.md` (free test number, Meta-supported).

This bridge exists because it's the fastest way to run the bot on your own
number today. Whether to use it is **entirely your call** — nothing here
phones home or changes your QuoteMitra data unless you run it.

## How it works

1. `node index.mjs` prints a QR code in your terminal.
2. Scan it with WhatsApp → **Linked Devices → Link a Device**.
3. The session is saved in `auth_info_baileys/` — you only scan once.
4. Any DM you receive is matched against your lanes in `config.json`:
   - **Lane found** → the quote engine prices it (diesel + toll + driver
     bata + labour + your margin, blended with your quote history in
     `data/quotes.json`) and replies with the ₹ quote + breakup.
   - **No match** → replies with your route list and asks for origin/destination.
5. Your own messages, status updates, and groups are ignored (DMs only).

The pricing math is a dependency-free port of `api/_lib/quoteEngine.ts`
(see `engine.mjs`), so quotes match the dashboard and the Cloud API bot.

## Setup

```bash
cd tools/baileys-bridge
npm install     # installs @whiskeysockets/baileys + @hapi/boom (this folder only)
npm start       # prints the QR code
```

Requirements: **Node.js 20+**. On first run, scan the QR within ~60 seconds
(a new one prints if it expires — just restart).

## Configure your lanes

Edit `config.json`:

```json
{
  "broker": { "name": "Kavya Sharma", "company": "Sharma Roadlines",
              "defaultMarginPct": 13, "dieselPrice": 92 },
  "lanes": [
    { "origin": "Bokaro", "destination": "Dhanbad", "distanceKm": 45,
      "vehicleType": "14ft Eicher (5T)", "mileageKmpl": 7.5,
      "tollRs": 120, "typicalRateRs": 3200 }
  ]
}
```

- `dieselPrice` — update when diesel moves; the engine drifts your history
  rates with it automatically.
- `mileageKmpl` — omit it and the engine estimates from the vehicle type.
- Restart the bridge after editing.

## Files

| File | What it is |
|---|---|
| `index.mjs` | Connection lifecycle + message handler (Baileys v7 API) |
| `engine.mjs` | Pricing engine port (no dependencies) |
| `config.json` | Your broker profile + lanes — edit freely |
| `auth_info_baileys/` | Login session (created on first run — **keep private, never share**) |
| `data/quotes.json` | Local quote history for history-blending (created on first quote) |

## Re-pairing / logging out

- **Temporary disconnects** (network, phone offline) reconnect automatically.
- If WhatsApp logs the session out: delete the `auth_info_baileys/` folder
  and run `npm start` again to scan a fresh QR.
- To unlink: WhatsApp → Linked Devices → tap the session → Log out.

## Troubleshooting

| Symptom | Fix |
|---|---|
| QR won't scan / expires | Restart; scan within ~60s; check phone camera focus |
| `Connection closed … 401/405` repeatedly | Baileys version vs WhatsApp protocol drift — `npm update @whiskeysockets/baileys` and retry |
| Bot replies to group messages | By design it ignores `@g.us` — check the sender is a DM |
| Quotes look off | Update `dieselPrice` / `defaultMarginPct` in `config.json` and restart |

## Technical notes

- Baileys API surface used here (verified against the official
  WhiskeySockets/Baileys README, v7.x, Oct 2026): `makeWASocket`,
  `useMultiFileAuthState`, `Browsers.ubuntu`, `printQRInTerminal`,
  `connection.update` + `DisconnectReason.loggedOut` reconnect logic,
  `messages.upsert` (`type === 'notify'`), `creds.update` → `saveCreds`,
  `sock.sendMessage(jid, { text }, { quoted })`, `sendPresenceUpdate`.
  If the library changes, the README's migration notes (`whiskey.so/migrate-latest`)
  are the source of truth — don't guess.
- Session keys in `auth_info_baileys/` are as sensitive as a password.
