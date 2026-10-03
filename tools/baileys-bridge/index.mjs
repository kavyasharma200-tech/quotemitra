// QuoteMitra Baileys bridge — unofficial WhatsApp autopilot.
//
// Listens on YOUR WhatsApp (paired via QR as a linked device), and for every
// incoming text message: matches a lane from config.json, runs the quote
// engine, and replies with the drafted quote.
//
// Baileys API verified against the official README (WhiskeySockets/Baileys,
// v7.x): makeWASocket + useMultiFileAuthState + printQRInTerminal,
// 'connection.update' / 'messages.upsert' / 'creds.update' events,
// DisconnectReason.loggedOut for the reconnect check, and
// sock.sendMessage(jid, { text }) for replies.
//
// Run:  npm install   (once, inside this folder)
//       npm start

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import makeWASocket, {
  Browsers,
  DisconnectReason,
  useMultiFileAuthState,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import {
  computeQuote,
  findLaneInText,
  formatLaneHelpReply,
  formatQuoteReply,
} from './engine.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Config + tiny local quote history (so history-blending works across runs)
// ---------------------------------------------------------------------------

const config = JSON.parse(readFileSync(join(__dirname, 'config.json'), 'utf8'));
const { broker, lanes } = config;

const DATA_DIR = join(__dirname, 'data');
const QUOTES_PATH = join(DATA_DIR, 'quotes.json');

function loadQuoteHistory() {
  try {
    return JSON.parse(readFileSync(QUOTES_PATH, 'utf8'));
  } catch {
    return [];
  }
}

function appendQuoteHistory(entry) {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  const history = loadQuoteHistory();
  history.unshift(entry);
  writeFileSync(QUOTES_PATH, JSON.stringify(history.slice(0, 500), null, 2));
}

function pastRatesFor(laneKey, history) {
  return history
    .filter((q) => q.laneKey === laneKey)
    .map((q) => q.rate)
    .slice(0, 5);
}

function laneKey(lane) {
  return `${lane.origin.toLowerCase()}→${lane.destination.toLowerCase()}`;
}

function extractText(m) {
  return (
    m.message?.conversation ??
    m.message?.extendedTextMessage?.text ??
    m.message?.imageMessage?.caption ??
    ''
  ).trim();
}

// ---------------------------------------------------------------------------
// Message handling
// ---------------------------------------------------------------------------

async function handleMessage(sock, m) {
  const jid = m.key.remoteJid;
  if (!jid) return;
  // Skip our own messages, status updates, and groups — DMs only.
  if (m.key.fromMe) return;
  if (jid === 'status@broadcast' || jid.endsWith('@g.us')) return;

  const text = extractText(m);
  if (!text) return;

  const sender = jid.split('@')[0];
  console.log(`[in] ${sender}: ${text.slice(0, 120)}`);

  try {
    await sock.sendPresenceUpdate('composing', jid).catch(() => {});
  } catch {
    /* presence is best-effort */
  }

  const lane = findLaneInText(lanes, text);
  const brokerName = broker.name || broker.company || 'QuoteMitra';

  let reply;
  if (lane) {
    const breakdown = computeQuote({
      lane,
      dieselPrice: broker.dieselPrice,
      marginPct: broker.defaultMarginPct,
      urgency: 'standard',
      pastRates: pastRatesFor(laneKey(lane), loadQuoteHistory()),
    });
    appendQuoteHistory({
      at: new Date().toISOString(),
      from: sender,
      laneKey: laneKey(lane),
      rate: breakdown.finalRate,
      text,
    });
    reply = formatQuoteReply({
      lane,
      breakdown,
      urgency: 'standard',
      brokerName,
    });
    console.log(`[quote] ${lane.origin}→${lane.destination}: ₹${breakdown.finalRate}`);
  } else {
    reply = formatLaneHelpReply(lanes, brokerName);
    console.log('[quote] no lane match — sent route list');
  }

  await sock.sendMessage(jid, { text: reply }, { quoted: m }).catch((err) => {
    console.error('[send] failed:', err?.message ?? err);
  });
}

// ---------------------------------------------------------------------------
// Connection lifecycle
// ---------------------------------------------------------------------------

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState(
    join(__dirname, 'auth_info_baileys'),
  );

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true, // scan with WhatsApp → Linked Devices → Link a Device
    browser: Browsers.ubuntu('QuoteMitra'),
    markOnlineOnConnect: false, // keep phone notifications working
  });

  // Persist credentials whenever they update (required for the session
  // keys to stay valid — don't skip this).
  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'close') {
      const statusCode = (lastDisconnect?.error instanceof Boom
        ? lastDisconnect.error
        : new Boom(lastDisconnect?.error)
      )?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      console.log(
        `[conn] closed (${lastDisconnect?.error?.message ?? statusCode}). Reconnecting: ${shouldReconnect}`,
      );
      if (shouldReconnect) {
        connectToWhatsApp();
      } else {
        console.log(
          '[conn] logged out — delete the auth_info_baileys folder and restart to re-pair.',
        );
      }
    } else if (connection === 'open') {
      console.log('[conn] ✅ WhatsApp connected — listening for enquiries.');
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    // Only brand-new incoming messages, not history syncs.
    if (type !== 'notify') return;
    for (const m of messages) {
      try {
        await handleMessage(sock, m);
      } catch (err) {
        console.error('[msg] handler failed:', err?.message ?? err);
      }
    }
  });
}

console.log('QuoteMitra Baileys bridge starting…');
console.log(`Routes loaded: ${lanes.length} · broker: ${broker.name || broker.company}`);
connectToWhatsApp();
