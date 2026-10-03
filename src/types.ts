// Core domain types for QuoteMitra.

export type VehicleType =
  | '14ft Eicher (5T)'
  | '17ft Eicher (7T)'
  | '19ft Eicher (9T)'
  | '10-Wheeler (16T)'
  | 'Container 32ft (18T)'
  | 'Multi-Axle (25T)';

export interface Broker {
  name: string;
  company: string;
  phone: string;
  defaultMarginPct: number;
  dieselPricePerLitre: number;
}

export interface Lane {
  id: string;
  origin: string;
  destination: string;
  distanceKm: number;
  vehicleType: VehicleType;
  capacityT: number;
  mileageKmpl: number;
  tollEstimate: number;
  typicalRate: number;
  lastRateAt: string; // ISO date
}

export type Urgency = 'standard' | 'urgent' | 'same-day';

export interface ParsedEnquiry {
  origin?: string;
  destination?: string;
  weightT?: number;
  goods?: string;
  neededBy?: string;
  urgency: Urgency;
}

export interface ChatMessage {
  id: string;
  from: 'broker' | 'customer';
  text: string;
  at: string; // ISO datetime
  kind: 'text' | 'quote';
}

export type EnquiryStatus = 'new' | 'quoted' | 'closed';

export interface Enquiry {
  id: string;
  senderName: string;
  senderPhone: string;
  receivedAt: string;
  rawText: string;
  parsed: ParsedEnquiry;
  status: EnquiryStatus;
  thread: ChatMessage[];
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

export type QuoteStatus = 'sent' | 'won' | 'lost';

export interface Quote {
  id: string;
  enquiryId: string | null;
  laneId: string;
  laneLabel: string;
  customerName: string;
  createdAt: string;
  rate: number;
  breakdown: CostBreakdown;
  status: QuoteStatus;
}

export interface AppState {
  broker: Broker;
  lanes: Lane[];
  enquiries: Enquiry[];
  quotes: Quote[];
  seededAt: string;
}

export type View = 'landing' | 'dashboard' | 'inbox' | 'quotes' | 'lanes' | 'settings';
