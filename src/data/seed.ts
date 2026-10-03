import type { AppState, Enquiry, Lane, Quote } from '../types';

// Seed data: realistic Jharkhand industrial-belt demo data so the app is
// alive on first load. All rates/distances are plausible market figures.

const L = (
  id: string,
  origin: string,
  destination: string,
  distanceKm: number,
  vehicleType: Lane['vehicleType'],
  capacityT: number,
  mileageKmpl: number,
  tollEstimate: number,
  typicalRate: number,
): Lane => ({
  id,
  origin,
  destination,
  distanceKm,
  vehicleType,
  capacityT,
  mileageKmpl,
  tollEstimate,
  typicalRate,
  lastRateAt: '2026-09-28T10:30:00+05:30',
});

const lanes: Lane[] = [
  L('lane-01', 'Bokaro', 'Dhanbad', 45, '14ft Eicher (5T)', 5, 7.5, 120, 3200),
  L('lane-02', 'Bokaro', 'Jamshedpur', 150, '17ft Eicher (7T)', 7, 6.2, 450, 9500),
  L('lane-03', 'Bokaro', 'Ranchi', 115, '14ft Eicher (5T)', 5, 7.5, 350, 7000),
  L('lane-04', 'Dhanbad', 'Kolkata', 270, '10-Wheeler (16T)', 16, 4.2, 1400, 22000),
  L('lane-05', 'Bokaro', 'Patna', 280, '17ft Eicher (7T)', 7, 6.2, 1100, 17500),
  L('lane-06', 'Jamshedpur', 'Kolkata', 250, 'Container 32ft (18T)', 18, 4.0, 1300, 21000),
  L('lane-07', 'Bokaro', 'Rourkela', 220, '10-Wheeler (16T)', 16, 4.2, 950, 18000),
  L('lane-08', 'Dhanbad', 'Varanasi', 330, '17ft Eicher (7T)', 7, 6.2, 1500, 21500),
  L('lane-09', 'Ranchi', 'Kolkata', 410, 'Multi-Axle (25T)', 25, 3.6, 2100, 32000),
  L('lane-10', 'Bokaro', 'Durgapur', 200, '14ft Eicher (5T)', 5, 7.5, 800, 12500),
];

const enquiries: Enquiry[] = [
  {
    id: 'enq-01',
    senderName: 'Ramesh Agarwal',
    senderPhone: '+91 98351 22014',
    receivedAt: '2026-10-03T09:12:00+05:30',
    rawText:
      'Bhai, 5 ton TMT bars Bokaro se Dhanbad kal subah chahiye. 14ft chalega. Rate batao jaldi.',
    parsed: {
      origin: 'Bokaro',
      destination: 'Dhanbad',
      weightT: 5,
      goods: 'TMT bars',
      neededBy: 'tomorrow morning',
      urgency: 'urgent',
    },
    status: 'new',
    thread: [
      {
        id: 'enq-01-m1',
        from: 'customer',
        text: 'Bhai, 5 ton TMT bars Bokaro se Dhanbad kal subah chahiye. 14ft chalega. Rate batao jaldi.',
        at: '2026-10-03T09:12:00+05:30',
        kind: 'text',
      },
    ],
  },
  {
    id: 'enq-02',
    senderName: 'Santosh Mahato',
    senderPhone: '+91 99341 87652',
    receivedAt: '2026-10-03T10:47:00+05:30',
    rawText:
      'Namaste, 16 ton coal washery reject Dhanbad to Kolkata, 10-wheeler. Party ready, aaj loading ho sakta hai kya? Rate confirm karo.',
    parsed: {
      origin: 'Dhanbad',
      destination: 'Kolkata',
      weightT: 16,
      goods: 'Coal washery reject',
      neededBy: 'today',
      urgency: 'same-day',
    },
    status: 'new',
    thread: [
      {
        id: 'enq-02-m1',
        from: 'customer',
        text: 'Namaste, 16 ton coal washery reject Dhanbad to Kolkata, 10-wheeler. Party ready, aaj loading ho sakta hai kya? Rate confirm karo.',
        at: '2026-10-03T10:47:00+05:30',
        kind: 'text',
      },
    ],
  },
  {
    id: 'enq-03',
    senderName: 'Priya Traders',
    senderPhone: '+91 98012 33445',
    receivedAt: '2026-10-02T16:20:00+05:30',
    rawText:
      '7 ton cement bags Bokaro to Patna, next week. 17ft Eicher. Best rate do, regular kaam milega.',
    parsed: {
      origin: 'Bokaro',
      destination: 'Patna',
      weightT: 7,
      goods: 'Cement bags',
      neededBy: 'next week',
      urgency: 'standard',
    },
    status: 'new',
    thread: [
      {
        id: 'enq-03-m1',
        from: 'customer',
        text: '7 ton cement bags Bokaro to Patna, next week. 17ft Eicher. Best rate do, regular kaam milega.',
        at: '2026-10-02T16:20:00+05:30',
        kind: 'text',
      },
    ],
  },
];

const quotes: Quote[] = [
  {
    id: 'q-101',
    enquiryId: null,
    laneId: 'lane-01',
    laneLabel: 'Bokaro → Dhanbad',
    customerName: 'Ramesh Agarwal',
    createdAt: '2026-09-30T11:05:00+05:30',
    rate: 3400,
    breakdown: {
      fuel: 552, toll: 120, driverBata: 800, handling: 800,
      operatingCost: 2272, marginPct: 13, marginRs: 395,
      urgencyMultiplier: 1.1, historyRate: 3200, finalRate: 3400,
    },
    status: 'won',
  },
  {
    id: 'q-102',
    enquiryId: null,
    laneId: 'lane-02',
    laneLabel: 'Bokaro → Jamshedpur',
    customerName: 'Jharkhand Steel Co.',
    createdAt: '2026-09-29T14:40:00+05:30',
    rate: 9800,
    breakdown: {
      fuel: 2226, toll: 450, driverBata: 1200, handling: 1500,
      operatingCost: 5376, marginPct: 13, marginRs: 699,
      urgencyMultiplier: 1.0, historyRate: 9500, finalRate: 9800,
    },
    status: 'won',
  },
  {
    id: 'q-103',
    enquiryId: null,
    laneId: 'lane-04',
    laneLabel: 'Dhanbad → Kolkata',
    customerName: 'Bengal Minerals',
    createdAt: '2026-09-28T09:15:00+05:30',
    rate: 23500,
    breakdown: {
      fuel: 5914, toll: 1400, driverBata: 1200, handling: 1500,
      operatingCost: 10014, marginPct: 15, marginRs: 1502,
      urgencyMultiplier: 1.15, historyRate: 22000, finalRate: 23500,
    },
    status: 'lost',
  },
  {
    id: 'q-104',
    enquiryId: null,
    laneId: 'lane-03',
    laneLabel: 'Bokaro → Ranchi',
    customerName: 'City Hardware',
    createdAt: '2026-09-27T17:22:00+05:30',
    rate: 7300,
    breakdown: {
      fuel: 1411, toll: 350, driverBata: 800, handling: 800,
      operatingCost: 3361, marginPct: 13, marginRs: 437,
      urgencyMultiplier: 1.0, historyRate: 7000, finalRate: 7300,
    },
    status: 'sent',
  },
  {
    id: 'q-105',
    enquiryId: null,
    laneId: 'lane-05',
    laneLabel: 'Bokaro → Patna',
    customerName: 'Priya Traders',
    createdAt: '2026-09-26T12:10:00+05:30',
    rate: 18200,
    breakdown: {
      fuel: 4153, toll: 1100, driverBata: 1200, handling: 1500,
      operatingCost: 7953, marginPct: 13, marginRs: 1034,
      urgencyMultiplier: 1.0, historyRate: 17500, finalRate: 18200,
    },
    status: 'won',
  },
  {
    id: 'q-106',
    enquiryId: null,
    laneId: 'lane-10',
    laneLabel: 'Bokaro → Durgapur',
    customerName: 'Durgapur Alloys',
    createdAt: '2026-09-25T15:48:00+05:30',
    rate: 12900,
    breakdown: {
      fuel: 2453, toll: 800, driverBata: 1200, handling: 1500,
      operatingCost: 5953, marginPct: 13, marginRs: 774,
      urgencyMultiplier: 1.0, historyRate: 12500, finalRate: 12900,
    },
    status: 'lost',
  },
];

export function seedState(): AppState {
  return {
    broker: {
      name: 'Kavya Sharma',
      company: 'Sharma Roadlines',
      phone: '+91 98765 43210',
      defaultMarginPct: 13,
      dieselPricePerLitre: 92,
    },
    lanes,
    enquiries,
    quotes,
    seededAt: new Date().toISOString(),
  };
}
