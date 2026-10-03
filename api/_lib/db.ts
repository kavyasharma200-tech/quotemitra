// Storage abstraction for QuoteMitra's API layer.
//
// Primary store: Supabase Postgres (tables in supabase/schema.sql).
// Uses SUPABASE_URL + SUPABASE_SERVICE_KEY — server-side only, NEVER
// exposed to the browser. (SUPABASE_ANON_KEY is for the client-side
// dashboard; documented in supabase/schema.sql.)
//
// DEV FALLBACK: when SUPABASE_URL / SUPABASE_SERVICE_KEY are absent, the
// API falls back to a local JSON file at /tmp/quotemitra-dev.json so it
// NEVER crashes from missing env. Clearly marked: dev fallback, not for
// production (serverless /tmp is ephemeral per invocation).

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';
import type {
  BrokerSettings,
  Enquiry,
  Lane,
  Quote,
} from './types.js';

const DEV_STORE_PATH = '/tmp/quotemitra-dev.json';

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

export interface Db {
  // broker (single row)
  getBroker(): Promise<BrokerSettings>;
  updateBroker(patch: Partial<BrokerSettings>): Promise<BrokerSettings>;
  // lanes
  listLanes(): Promise<Lane[]>;
  createLane(data: NewLane): Promise<Lane>;
  updateLane(id: string, patch: Partial<Lane>): Promise<Lane | null>;
  deleteLane(id: string): Promise<boolean>;
  // quotes
  listQuotes(): Promise<Quote[]>;
  createQuote(q: Quote): Promise<Quote>;
  updateQuote(id: string, patch: Partial<Quote>): Promise<Quote | null>;
  deleteQuote(id: string): Promise<boolean>;
  // enquiries
  listEnquiries(): Promise<Enquiry[]>;
  createEnquiry(data: NewEnquiry): Promise<Enquiry>;
  updateEnquiry(id: string, patch: Partial<Enquiry>): Promise<Enquiry | null>;
  deleteEnquiry(id: string): Promise<boolean>;
}

export interface NewLane {
  origin: string;
  destination: string;
  distanceKm: number;
  vehicleType: string;
  mileageKmpl?: number;
  tollRs?: number;
  typicalRateRs?: number;
}

export interface NewEnquiry {
  waFrom: string;
  text: string;
  laneId?: string | null;
  weightTons?: number | null;
  status?: Enquiry['status'];
}

let cached: Db | null = null;

/** Get the storage backend for this invocation. Cached per process. */
export async function getDb(): Promise<Db> {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (url && key) {
    cached = createSupabaseDb(url, key);
  } else {
    console.warn(
      '[QuoteMitra] SUPABASE_URL/SUPABASE_SERVICE_KEY not set — using DEV JSON fallback at /tmp/quotemitra-dev.json (NOT for production).',
    );
    cached = createDevDb();
  }
  return cached;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function nowIso(): string {
  return new Date().toISOString();
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function num(v: unknown, fallback = 0): number {
  const n = typeof v === 'string' ? Number(v) : (v as number);
  return Number.isFinite(n) ? n : fallback;
}

function defaultBroker(): BrokerSettings {
  return {
    id: 'default',
    name: '',
    company: 'QuoteMitra',
    phone: '',
    defaultMarginPct: 13,
    dieselPrice: 92,
  };
}

// ---------------------------------------------------------------------------
// Supabase backend
// ---------------------------------------------------------------------------

function createSupabaseDb(url: string, serviceKey: string): Db {
  // Typed as `any`: supabase-js's generated Database generics resolve table
  // rows to `never` when no Database type is supplied, which only adds
  // friction here. Runtime behavior is unchanged.
  const supa: any = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });

  const rowToLane = (r: any): Lane => ({
    id: r.id,
    brokerId: r.broker_id,
    origin: r.origin,
    destination: r.destination,
    distanceKm: num(r.distance_km),
    vehicleType: r.vehicle_type,
    mileageKmpl: num(r.mileage_kmpl),
    tollRs: num(r.toll_rs),
    typicalRateRs: num(r.typical_rate_rs),
    createdAt: r.created_at,
  });

  const rowToQuote = (r: any): Quote => ({
    id: r.id,
    brokerId: r.broker_id,
    laneId: r.lane_id,
    enquiryId: r.enquiry_id,
    weightTons:
      r.weight_tons === null || r.weight_tons === undefined
        ? null
        : num(r.weight_tons),
    urgency: r.urgency,
    rateRs: num(r.rate_rs),
    marginRs: num(r.margin_rs),
    breakdown: r.breakdown,
    status: r.status,
    createdAt: r.created_at,
    sentAt: r.sent_at,
  });

  const rowToEnquiry = (r: any): Enquiry => ({
    id: r.id,
    brokerId: r.broker_id,
    waFrom: r.wa_from,
    text: r.text,
    laneId: r.lane_id,
    weightTons:
      r.weight_tons === null || r.weight_tons === undefined
        ? null
        : num(r.weight_tons),
    status: r.status,
    createdAt: r.created_at,
  });

  const rowToBroker = (r: any): BrokerSettings => ({
    id: r.id,
    name: r.name ?? '',
    company: r.company ?? '',
    phone: r.phone ?? '',
    defaultMarginPct: num(r.default_margin_pct, 13),
    dieselPrice: num(r.diesel_price, 92),
  });

  const lanePatchToRow = (l: Partial<Lane>): Record<string, unknown> => ({
    ...(l.brokerId !== undefined ? { broker_id: l.brokerId } : {}),
    ...(l.origin !== undefined ? { origin: l.origin } : {}),
    ...(l.destination !== undefined ? { destination: l.destination } : {}),
    ...(l.distanceKm !== undefined ? { distance_km: l.distanceKm } : {}),
    ...(l.vehicleType !== undefined ? { vehicle_type: l.vehicleType } : {}),
    ...(l.mileageKmpl !== undefined ? { mileage_kmpl: l.mileageKmpl } : {}),
    ...(l.tollRs !== undefined ? { toll_rs: l.tollRs } : {}),
    ...(l.typicalRateRs !== undefined
      ? { typical_rate_rs: l.typicalRateRs }
      : {}),
  });

  return {
    async getBroker(): Promise<BrokerSettings> {
      const { data, error } = await supa
        .from('brokers')
        .select('*')
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (data) return rowToBroker(data);
      const seeded = defaultBroker();
      const { data: inserted, error: insErr } = await supa
        .from('brokers')
        .insert({
          id: seeded.id,
          name: seeded.name,
          company: seeded.company,
          phone: seeded.phone,
          default_margin_pct: seeded.defaultMarginPct,
          diesel_price: seeded.dieselPrice,
        })
        .select()
        .single();
      if (insErr) throw insErr;
      return rowToBroker(inserted);
    },

    async updateBroker(patch): Promise<BrokerSettings> {
      const broker = await this.getBroker();
      const row: Record<string, unknown> = {};
      if (patch.name !== undefined) row.name = patch.name;
      if (patch.company !== undefined) row.company = patch.company;
      if (patch.phone !== undefined) row.phone = patch.phone;
      if (patch.defaultMarginPct !== undefined)
        row.default_margin_pct = patch.defaultMarginPct;
      if (patch.dieselPrice !== undefined) row.diesel_price = patch.dieselPrice;
      const { data, error } = await supa
        .from('brokers')
        .update(row)
        .eq('id', broker.id)
        .select()
        .single();
      if (error) throw error;
      return rowToBroker(data);
    },

    async listLanes(): Promise<Lane[]> {
      const { data, error } = await supa
        .from('lanes')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map(rowToLane);
    },

    async createLane(data: NewLane): Promise<Lane> {
      const broker = await this.getBroker();
      const { data: row, error } = await supa
        .from('lanes')
        .insert({
          broker_id: broker.id,
          origin: data.origin,
          destination: data.destination,
          distance_km: data.distanceKm,
          vehicle_type: data.vehicleType,
          mileage_kmpl: data.mileageKmpl ?? null,
          toll_rs: data.tollRs ?? 0,
          typical_rate_rs: data.typicalRateRs ?? 0,
        })
        .select()
        .single();
      if (error) throw error;
      return rowToLane(row);
      return rowToLane(data);
    },

    async updateLane(id, patch): Promise<Lane | null> {
      const { data, error } = await supa
        .from('lanes')
        .update(lanePatchToRow(patch))
        .eq('id', id)
        .select()
        .maybeSingle();
      if (error) throw error;
      return data ? rowToLane(data) : null;
    },

    async deleteLane(id): Promise<boolean> {
      const { error, count } = await supa
        .from('lanes')
        .delete({ count: 'exact' })
        .eq('id', id);
      if (error) throw error;
      return (count ?? 0) > 0;
    },

    async listQuotes(): Promise<Quote[]> {
      const { data, error } = await supa
        .from('quotes')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map(rowToQuote);
    },

    async createQuote(q: Quote): Promise<Quote> {
      const { data: row, error } = await supa
        .from('quotes')
        .insert({
          id: q.id,
          broker_id: q.brokerId,
          lane_id: q.laneId,
          enquiry_id: q.enquiryId,
          weight_tons: q.weightTons,
          urgency: q.urgency,
          rate_rs: q.rateRs,
          margin_rs: q.marginRs,
          breakdown: q.breakdown,
          status: q.status,
          created_at: q.createdAt,
          sent_at: q.sentAt,
        })
        .select()
        .single();
      if (error) throw error;
      return rowToQuote(row);
    },

    async updateQuote(id, patch): Promise<Quote | null> {
      const row: Record<string, unknown> = {};
      if (patch.urgency !== undefined) row.urgency = patch.urgency;
      if (patch.rateRs !== undefined) row.rate_rs = patch.rateRs;
      if (patch.marginRs !== undefined) row.margin_rs = patch.marginRs;
      if (patch.breakdown !== undefined) row.breakdown = patch.breakdown;
      if (patch.status !== undefined) row.status = patch.status;
      if (patch.sentAt !== undefined) row.sent_at = patch.sentAt;
      if (patch.weightTons !== undefined) row.weight_tons = patch.weightTons;
      const { data, error } = await supa
        .from('quotes')
        .update(row)
        .eq('id', id)
        .select()
        .maybeSingle();
      if (error) throw error;
      return data ? rowToQuote(data) : null;
    },

    async deleteQuote(id): Promise<boolean> {
      const { error, count } = await supa
        .from('quotes')
        .delete({ count: 'exact' })
        .eq('id', id);
      if (error) throw error;
      return (count ?? 0) > 0;
    },

    async listEnquiries(): Promise<Enquiry[]> {
      const { data, error } = await supa
        .from('enquiries')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map(rowToEnquiry);
    },

    async createEnquiry(data: NewEnquiry): Promise<Enquiry> {
      const broker = await this.getBroker();
      const { data: row, error } = await supa
        .from('enquiries')
        .insert({
          broker_id: broker.id,
          wa_from: data.waFrom,
          text: data.text,
          lane_id: data.laneId ?? null,
          weight_tons: data.weightTons ?? null,
          status: data.status ?? 'new',
        })
        .select()
        .single();
      if (error) throw error;
      return rowToEnquiry(row);
    },

    async updateEnquiry(id, patch): Promise<Enquiry | null> {
      const row: Record<string, unknown> = {};
      if (patch.laneId !== undefined) row.lane_id = patch.laneId;
      if (patch.weightTons !== undefined) row.weight_tons = patch.weightTons;
      if (patch.status !== undefined) row.status = patch.status;
      if (patch.text !== undefined) row.text = patch.text;
      const { data, error } = await supa
        .from('enquiries')
        .update(row)
        .eq('id', id)
        .select()
        .maybeSingle();
      if (error) throw error;
      return data ? rowToEnquiry(data) : null;
    },

    async deleteEnquiry(id): Promise<boolean> {
      const { error, count } = await supa
        .from('enquiries')
        .delete({ count: 'exact' })
        .eq('id', id);
      if (error) throw error;
      return (count ?? 0) > 0;
    },
  };
}

// ---------------------------------------------------------------------------
// Dev fallback backend (local JSON file — NOT for production)
// ---------------------------------------------------------------------------

interface DevStore {
  broker: BrokerSettings;
  lanes: Lane[];
  quotes: Quote[];
  enquiries: Enquiry[];
}

// Demo seed lanes (Jharkhand belt) so the quote engine is exercisable
// without Supabase. Clearly demo data.
const DEMO_LANES: Array<Omit<Lane, 'id' | 'brokerId' | 'createdAt'>> = [
  {
    origin: 'Bokaro',
    destination: 'Dhanbad',
    distanceKm: 45,
    vehicleType: '14ft Eicher (5T)',
    mileageKmpl: 7.5,
    tollRs: 120,
    typicalRateRs: 3200,
  },
  {
    origin: 'Bokaro',
    destination: 'Jamshedpur',
    distanceKm: 150,
    vehicleType: '17ft Eicher (7T)',
    mileageKmpl: 6.2,
    tollRs: 450,
    typicalRateRs: 9500,
  },
  {
    origin: 'Bokaro',
    destination: 'Ranchi',
    distanceKm: 115,
    vehicleType: '14ft Eicher (5T)',
    mileageKmpl: 7.5,
    tollRs: 350,
    typicalRateRs: 7000,
  },
  {
    origin: 'Dhanbad',
    destination: 'Kolkata',
    distanceKm: 270,
    vehicleType: '10-Wheeler (16T)',
    mileageKmpl: 4.2,
    tollRs: 1400,
    typicalRateRs: 22000,
  },
];

function createDevDb(): Db {
  function load(): DevStore {
    try {
      const raw = readFileSync(DEV_STORE_PATH, 'utf8');
      return JSON.parse(raw) as DevStore;
    } catch {
      // First run: seed broker + demo lanes.
      const now = nowIso();
      const store: DevStore = {
        broker: {
          ...defaultBroker(),
          name: 'Demo Broker',
          company: 'Demo Roadlines',
        },
        lanes: DEMO_LANES.map((l, i) => ({
          ...l,
          id: `lane-demo-${i + 1}`,
          brokerId: 'default',
          createdAt: now,
        })),
        quotes: [],
        enquiries: [],
      };
      save(store);
      console.warn('[QuoteMitra] Dev store seeded with demo lanes.');
      return store;
    }
  }

  function save(store: DevStore): void {
    writeFileSync(DEV_STORE_PATH, JSON.stringify(store, null, 2), 'utf8');
  }

  return {
    async getBroker() {
      return load().broker;
    },
    async updateBroker(patch) {
      const s = load();
      s.broker = { ...s.broker, ...patch, id: s.broker.id };
      save(s);
      return s.broker;
    },
    async listLanes() {
      return load().lanes;
    },
    async createLane(data) {
      const s = load();
      const lane: Lane = {
        id: newId('lane'),
        brokerId: s.broker.id,
        origin: data.origin,
        destination: data.destination,
        distanceKm: data.distanceKm,
        vehicleType: data.vehicleType,
        mileageKmpl: data.mileageKmpl ?? 0,
        tollRs: data.tollRs ?? 0,
        typicalRateRs: data.typicalRateRs ?? 0,
        createdAt: nowIso(),
      };
      s.lanes.unshift(lane);
      save(s);
      return lane;
    },
    async updateLane(id, patch) {
      const s = load();
      const lane = s.lanes.find((l) => l.id === id);
      if (!lane) return null;
      Object.assign(lane, patch, { id: lane.id });
      save(s);
      return lane;
    },
    async deleteLane(id) {
      const s = load();
      const n = s.lanes.length;
      s.lanes = s.lanes.filter((l) => l.id !== id);
      save(s);
      return s.lanes.length < n;
    },
    async listQuotes() {
      return load().quotes;
    },
    async createQuote(q) {
      const s = load();
      s.quotes.unshift({ ...q });
      save(s);
      return q;
    },
    async updateQuote(id, patch) {
      const s = load();
      const q = s.quotes.find((x) => x.id === id);
      if (!q) return null;
      Object.assign(q, patch, { id: q.id });
      save(s);
      return q;
    },
    async deleteQuote(id) {
      const s = load();
      const n = s.quotes.length;
      s.quotes = s.quotes.filter((x) => x.id !== id);
      save(s);
      return s.quotes.length < n;
    },
    async listEnquiries() {
      return load().enquiries;
    },
    async createEnquiry(data) {
      const s = load();
      const enq: Enquiry = {
        id: newId('enq'),
        brokerId: s.broker.id,
        waFrom: data.waFrom,
        text: data.text,
        laneId: data.laneId ?? null,
        weightTons: data.weightTons ?? null,
        status: data.status ?? 'new',
        createdAt: nowIso(),
      };
      s.enquiries.unshift(enq);
      save(s);
      return enq;
    },
    async updateEnquiry(id, patch) {
      const s = load();
      const e = s.enquiries.find((x) => x.id === id);
      if (!e) return null;
      Object.assign(e, patch, { id: e.id });
      save(s);
      return e;
    },
    async deleteEnquiry(id) {
      const s = load();
      const n = s.enquiries.length;
      s.enquiries = s.enquiries.filter((x) => x.id !== id);
      save(s);
      return s.enquiries.length < n;
    },
  };
}
