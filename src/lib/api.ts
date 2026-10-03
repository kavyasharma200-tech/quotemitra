// QuoteMitra API client.
//
// Every data call goes through here. Any failure — network error or non-OK
// HTTP status — throws, and the db layer (lib/db.tsx) silently falls back to
// the localStorage store so the demo never breaks.
//
// Endpoint assumptions (conventional REST over the backend builder's
// api/_lib contract):
//   GET/POST            /api/lanes, /api/quotes, /api/enquiries
//   PATCH               /api/lanes, /api/quotes, /api/enquiries  (body {id, ...fields})
//   DELETE              /api/lanes?id=.., /api/quotes?id=.., /api/enquiries?id=..
//   POST                /api/quotes/draft        {laneId, weightTons, urgency, marginPct?}
//   GET/PUT             /api/settings
// List responses may be bare arrays or wrapped ({lanes:[...]}, etc.) —
// both are unwrapped. Demo-only local fields (senderName, thread,
// customerName) are stripped from every request body.

import type {
  Enquiry,
  Lane,
  LocalEnquiry,
  LocalLane,
  LocalQuote,
  Quote,
  Settings,
  Urgency,
} from '../types';

export class ApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (e) {
    throw new ApiError(`network: ${e instanceof Error ? e.message : 'fetch failed'}`);
  }
  if (!res.ok) throw new ApiError(`http-${res.status} ${method} ${path}`);
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

/** Unwrap a list response: bare array or {lanes|quotes|enquiries|items|data:[...]}. */
function asList<T>(x: unknown): T[] {
  if (Array.isArray(x)) return x as T[];
  if (x && typeof x === 'object') {
    const o = x as Record<string, unknown>;
    for (const k of ['lanes', 'quotes', 'enquiries', 'items', 'data', 'rows']) {
      if (Array.isArray(o[k])) return o[k] as T[];
    }
  }
  return [];
}

/** Unwrap a single-object response: bare object or {lane|quote|enquiry|settings:{...}}. */
function asOne<T>(x: unknown, keys: string[]): T {
  if (x && typeof x === 'object') {
    const o = x as Record<string, unknown>;
    for (const k of keys) {
      if (o[k] && typeof o[k] === 'object') return o[k] as T;
    }
  }
  return x as T;
}

// Request bodies carry contract fields only — never demo-only extras.
const laneBody = (l: Partial<LocalLane>) => ({
  ...(l.origin !== undefined ? { origin: l.origin } : {}),
  ...(l.destination !== undefined ? { destination: l.destination } : {}),
  ...(l.distanceKm !== undefined ? { distanceKm: l.distanceKm } : {}),
  ...(l.vehicleType !== undefined ? { vehicleType: l.vehicleType } : {}),
  ...(l.mileageKmpl !== undefined ? { mileageKmpl: l.mileageKmpl } : {}),
  ...(l.tollRs !== undefined ? { tollRs: l.tollRs } : {}),
  ...(l.typicalRateRs !== undefined ? { typicalRateRs: l.typicalRateRs } : {}),
});

const quoteBody = (q: Partial<LocalQuote>) => ({
  ...(q.laneId !== undefined ? { laneId: q.laneId } : {}),
  ...(q.enquiryId !== undefined ? { enquiryId: q.enquiryId } : {}),
  ...(q.weightTons !== undefined ? { weightTons: q.weightTons } : {}),
  ...(q.urgency !== undefined ? { urgency: q.urgency } : {}),
  ...(q.rateRs !== undefined ? { rateRs: q.rateRs } : {}),
  ...(q.marginRs !== undefined ? { marginRs: q.marginRs } : {}),
  ...(q.breakdown !== undefined ? { breakdown: q.breakdown } : {}),
  ...(q.status !== undefined ? { status: q.status } : {}),
  ...(q.sentAt !== undefined ? { sentAt: q.sentAt } : {}),
});

const enquiryBody = (e: Partial<LocalEnquiry>) => ({
  ...(e.waFrom !== undefined ? { waFrom: e.waFrom } : {}),
  ...(e.text !== undefined ? { text: e.text } : {}),
  ...(e.laneId !== undefined ? { laneId: e.laneId } : {}),
  ...(e.weightTons !== undefined ? { weightTons: e.weightTons } : {}),
  ...(e.status !== undefined ? { status: e.status } : {}),
});

const settingsBody = (s: Partial<Settings>) => ({
  ...(s.name !== undefined ? { name: s.name } : {}),
  ...(s.company !== undefined ? { company: s.company } : {}),
  ...(s.phone !== undefined ? { phone: s.phone } : {}),
  ...(s.defaultMarginPct !== undefined ? { defaultMarginPct: s.defaultMarginPct } : {}),
  ...(s.dieselPrice !== undefined ? { dieselPrice: s.dieselPrice } : {}),
});

// Backend names its diesel field `dieselPrice` (matches BrokerSettings).
// Normalise both directions defensively.
function normSettings(x: unknown): Settings {
  const o = (asOne<Record<string, unknown>>(x, ['settings', 'broker']) ?? {}) as Record<string, unknown>;
  const num = (v: unknown, d: number) => {
    const n = typeof v === 'string' ? Number(v) : (v as number);
    return Number.isFinite(n) ? n : d;
  };
  return {
    name: String(o.name ?? o.brokerName ?? ''),
    company: String(o.company ?? 'QuoteMitra'),
    phone: String(o.phone ?? ''),
    defaultMarginPct: num(o.defaultMarginPct, 13),
    dieselPrice: num(o.dieselPrice ?? o.dieselPricePerLitre, 92),
  };
}

export const api = {
  /** Cheap connectivity probe. Resolves true only when the API answers. */
  async ping(): Promise<boolean> {
    try {
      await req('GET', '/api/settings');
      return true;
    } catch {
      return false;
    }
  },

  settings: {
    async get(): Promise<Settings> {
      return normSettings(await req('GET', '/api/settings'));
    },
    async update(s: Partial<Settings>): Promise<Settings> {
      return normSettings(await req('PUT', '/api/settings', settingsBody(s)));
    },
  },

  lanes: {
    async list(): Promise<Lane[]> {
      return asList<Lane>(await req('GET', '/api/lanes'));
    },
    async create(l: LocalLane): Promise<Lane> {
      return asOne<Lane>(await req('POST', '/api/lanes', laneBody(l)), ['lane']);
    },
    async update(id: string, patch: Partial<LocalLane>): Promise<Lane> {
      return asOne<Lane>(await req('PATCH', '/api/lanes', { id, ...laneBody(patch) }), ['lane']);
    },
    async remove(id: string): Promise<void> {
      await req('DELETE', `/api/lanes?id=${encodeURIComponent(id)}`);
    },
  },

  quotes: {
    async list(): Promise<Quote[]> {
      return asList<Quote>(await req('GET', '/api/quotes'));
    },
    async create(q: LocalQuote): Promise<Quote> {
      return asOne<Quote>(await req('POST', '/api/quotes', quoteBody(q)), ['quote']);
    },
    async update(id: string, patch: Partial<LocalQuote>): Promise<Quote> {
      return asOne<Quote>(await req('PATCH', '/api/quotes', { id, ...quoteBody(patch) }), ['quote']);
    },
    /**
     * Ask the server to draft a quote. On success returns a Quote-shaped
     * object (status 'draft'). Throws on any failure — the caller falls back
     * to the local quote engine.
     */
    async draft(input: {
      laneId: string;
      weightTons: number | null;
      urgency: Urgency;
      marginPct?: number;
      enquiryId?: string | null;
    }): Promise<Quote> {
      return asOne<Quote>(await req('POST', '/api/quotes/draft', input), ['quote']);
    },
  },

  enquiries: {
    async list(): Promise<Enquiry[]> {
      return asList<Enquiry>(await req('GET', '/api/enquiries'));
    },
    async create(e: LocalEnquiry): Promise<Enquiry> {
      return asOne<Enquiry>(await req('POST', '/api/enquiries', enquiryBody(e)), ['enquiry']);
    },
    async update(id: string, patch: Partial<LocalEnquiry>): Promise<Enquiry> {
      return asOne<Enquiry>(await req('PATCH', '/api/enquiries', { id, ...enquiryBody(patch) }), ['enquiry']);
    },
  },
};
