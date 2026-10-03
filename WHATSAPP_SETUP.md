# QuoteMitra — WhatsApp Setup Guide

**Goal:** make your QuoteMitra bot send and receive REAL WhatsApp messages.
No coding needed — just clicking through dashboards and copy-pasting keys.

There are two ways to do this. **Start with Path A** — it works today, for
free, with no business verification.

---

## Path A — "Real messages today" (recommended first)

Meta gives every new WhatsApp app a **FREE test phone number** that can send
and receive real WhatsApp messages with **up to 5 registered recipient
numbers** — no business verification, no paperwork, no payment.

### Step 1 — Create a Meta app

1. Go to <https://developers.facebook.com> and log in with your Facebook account.
2. Click **My Apps → Create App**.
3. When asked for a use case, choose **Other** (or "Business"), then pick the
   **Business** app type. Name it e.g. `QuoteMitra`. Click **Create app**.

### Step 2 — Add the WhatsApp product

1. In the left sidebar of your app dashboard, click **Add Product** (or the
   **+** next to Products).
2. Find **WhatsApp** and click **Set up**.
3. You land on **WhatsApp → API Setup**. Meta has already created a **test
   phone number** for you — you'll see a phone number like `1555xxxxxxx`
   and a **Phone number ID** next to it. Keep this tab open.

### Step 3 — Register your number as a recipient (up to 5)

1. On the same **API Setup** page, find the section **"To" — Add recipients**
   (labelled *Send and receive messages*).
2. Click **Add phone number**, enter **your own WhatsApp number**
   (the one you'll test with, e.g. `91XXXXXXXXXX`), and verify it with the
   OTP WhatsApp sends you.
3. Repeat for up to 4 more numbers if you want (a helper, a customer, etc.).

> Only these registered numbers can chat with the test number. That's the
> only limit — everything else works like the real thing.

### Step 4 — Connect the webhook (this is QuoteMitra's brain)

1. In the left sidebar go to **WhatsApp → Configuration**.
2. Under **Webhook**, click **Edit** (or **Configure webhooks**).
3. Fill in:
   - **Callback URL:** `https://quotemitra-iota.vercel.app/api/webhooks/whatsapp`
   - **Verify token:** invent a long random token, e.g.
     `qm-verify-9f3k2-77xzaq-2026` — write it down, you'll need it in Step 5.
4. Click **Verify and save**. (This calls QuoteMitra's verification
   handshake — if it says "verified", the URL is correct.)
5. Click **Manage** next to Webhook fields, and subscribe to **`messages`**.
   (Tick the checkbox for `messages` and save.)

### Step 5 — Paste the keys into Vercel

1. Go to <https://vercel.com>, open the **quotemitra** project →
   **Settings → Environment Variables**.
2. Add these four (click **Add New** for each), then **redeploy**
   (Deployments → ⋯ → Redeploy) so the functions pick them up:

   | Variable | Where to find it |
   |---|---|
   | `WHATSAPP_TOKEN` | Meta app dashboard → **WhatsApp → API Setup** → *Temporary access token* → **Copy**. ⚠️ This token **expires in 24 hours**. Fine for testing; for a permanent token see the note below. |
   | `WHATSAPP_PHONE_NUMBER_ID` | Same **API Setup** page → under the test phone number → **Phone number ID** |
   | `WHATSAPP_VERIFY_TOKEN` | The token **you invented** in Step 4 |
   | `WHATSAPP_APP_SECRET` | App dashboard → **App settings → Basic** → **App secret** → Show → copy |

   > **Permanent token (do this once testing works):** the temporary token
   > dies every 24h, which silently breaks replies. Create a **System User**
   > (App dashboard → App settings → Advanced → or via Meta Business
   > Settings → System users), give it the `whatsapp_business_messaging`
   > permission, generate a token, and replace `WHATSAPP_TOKEN` with it.
   > That token doesn't expire.

### Step 6 — Test end-to-end

1. From **your registered number**, send a WhatsApp message to the **test
   phone number** (the `1555…` number from Step 2):
   `Bokaro to Dhanbad, 10 ton`
2. Within a few seconds you should get a reply with a drafted freight quote
   (route, truck, ₹ rate, cost breakup).
3. Check it landed in your data: open your QuoteMitra dashboard — the
   enquiry and the drafted quote should be there.

**If no reply arrives:** Vercel → project → **Logs** (or Deployments →
pick the deployment → Functions logs). You'll see either the sent reply,
or a warning like `WHATSAPP_TOKEN/PHONE_NUMBER_ID not set` — which means a
key from Step 5 is missing or the redeploy didn't happen.

---

## Path B — Production (your own business number)

Path A is enough to demo and pilot with real customers. When you're ready
for your *own* number:

1. **Meta Business verification** — Business Settings → Security Center →
   start verification (business documents, ~a few days).
2. **Add your real phone number** — WhatsApp → API Setup → add a phone
   number (it must NOT be currently used in the WhatsApp app — use a fresh
   SIM/eSIM or migrate the number off the app first).
3. **Display name approval** — submit your business display name; Meta
   approves it (usually 1–2 days).
4. Swap `WHATSAPP_PHONE_NUMBER_ID` in Vercel to the new number's ID.
   The webhook URL and code stay exactly the same.
5. **Pricing note (India):** conversations *you* start (marketing/utility
   templates) are billed per conversation; **customer-initiated service
   conversations inside the 24-hour window are FREE**. QuoteMitra is
   inbound-first (customer messages → instant quote reply), so at MVP
   scale your Meta bill is effectively ₹0.

---

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| "Verify and save" fails in Step 4 | Wrong callback URL, or `WHATSAPP_VERIFY_TOKEN` doesn't match the token you typed in Meta |
| Webhook verified but no reply | Temporary token expired (Step 5 note), or recipient number not registered |
| Reply arrives but quote looks wrong | Check diesel price / margin in the app's Settings — the engine uses those |
| `Invalid signature` in Vercel logs | `WHATSAPP_APP_SECRET` pasted incorrectly — re-copy from App settings → Basic |

## What QuoteMitra does with each message

1. Meta POSTs the message to `/api/webhooks/whatsapp`.
2. QuoteMitra saves it as an **enquiry**, matches your lane
   (e.g. "Bokaro … Dhanbad"), runs the quote engine
   (diesel + toll + driver bata + labour + your margin, blended with your
   quote history), and saves a **draft quote**.
3. It replies on WhatsApp with the ₹ rate and full breakup.
4. If it can't match a lane, it replies with your route list and asks the
   customer to pick one.

All of this also works without WhatsApp configured — replies are logged
server-side and everything is stored, so the dashboard keeps working.
