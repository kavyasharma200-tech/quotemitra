// Shared server-side domain types for QuoteMitra's API layer.
// These mirror the client types in src/types.ts but use the DB's field
// naming internally; the db layer maps to snake_case columns.

export type Urgency = 'standard' | 'urgent' | 'same-day';

export type QuoteStatus = 'draft' | 'sent' | 'won' | 'lost';

export type EnquiryStatus = 'new' | 'quoted' | 'closed';

export interface BrokerSettings {
  id: string;
  name: string;
  company: string;
  phone: string;
  defaultMarginPct: number;
  dieselPrice: number; // ₹/litre
}

export interface Lane {
  id: string;
  brokerId: string;
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
  brokerId: string;
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
  brokerId: string;
  waFrom: string; // sender's WhatsApp number (wa_id)
  text: string;
  laneId: string | null;
  weightTons: number | null;
  status: EnquiryStatus;
  createdAt: string;
}
