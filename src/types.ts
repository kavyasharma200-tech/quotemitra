// QuoteMitra domain types.
//
// These mirror the backend contract in api/_lib/types.ts field-for-field
// (the server is the source of truth; the client never invents fields).
// `Local*` extensions are DEMO-FALLBACK ONLY: extra display fields used when
// the API is unreachable. api.ts strips them from every request body — they
// never cross the wire.

export type Urgency = 'standard' | 'urgent' | 'same-day';

export type QuoteStatus = 'draft' | 'sent' | 'won' | 'lost';

export type EnquiryStatus = 'new' | 'quoted' | 'closed';

export interface Settings {
  name: string;
  company: string;
  phone: string;
  defaultMarginPct: number;
  dieselPrice: number; // ₹/litre
}

export interface Lane {
  id: string;
  origin: string;
  destination: string;
  distanceKm: number;
  vehicleType: string;
  mileageKmpl: number;
  tollRs: number;
  typicalRateRs: number;
  createdAt: string;
}

export interface CostBreakdown {
  fuel: number;
  toll: number;
  driverBata: number;
  handling: number;
  operatingCost: number;
  marginPct: number;
  marginRs: number;
  urgencyMultiplier: number;
  historyRate?: number;
  finalRate: number;
}

export interface Quote {
  id: string;
  laneId: string;
  enquiryId: string | null;
  weightTons: number | null;
  urgency: Urgency;
  rateRs: number;
  marginRs: number;
  breakdown: CostBreakdown;
  status: QuoteStatus;
  createdAt: string;
  sentAt: string | null;
}

export interface Enquiry {
  id: string;
  waFrom: string; // sender's WhatsApp number (wa_id)
  text: string;
  laneId: string | null;
  weightTons: number | null;
  status: EnquiryStatus;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Local demo-fallback extensions (never sent to the API)
// ---------------------------------------------------------------------------

export interface ThreadMessage {
  id: string;
  from: 'customer' | 'broker';
  text: string;
  at: string; // ISO datetime
  kind: 'text' | 'quote';
  rateRs?: number;
}

/** Demo-only: display name, parsed goods, and the simulated chat thread. */
export interface LocalEnquiry extends Enquiry {
  senderName?: string;
  goods?: string;
  neededBy?: string;
  urgency?: Urgency;
  thread?: ThreadMessage[];
}

/** Demo-only: customer display name for seed quotes. */
export interface LocalQuote extends Quote {
  customerName?: string;
}

export type LocalLane = Lane; // lanes need no demo-only fields

export interface DraftInput {
  laneId: string;
  weightTons: number | null;
  urgency: Urgency;
  marginPct: number;
  enquiryId?: string | null;
}

export interface DbData {
  settings: Settings;
  lanes: LocalLane[];
  enquiries: LocalEnquiry[];
  quotes: LocalQuote[];
}

export type View =
  | 'landing'
  | 'dashboard'
  | 'inbox'
  | 'quotes'
  | 'lanes'
  | 'settings';
