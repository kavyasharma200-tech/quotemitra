// Seed data — realistic Jharkhand industrial-belt demo data.
// Used ONLY as the localStorage fallback when the API is unreachable.
// Field names mirror api/_lib/types.ts; demo-only display fields
// (senderName, thread, customerName) stay on the client.

import type { DbData, LocalEnquiry, LocalLane, LocalQuote } from '../types';

const lanes: LocalLane[] = [
  { id: 'lane-01', origin: 'Bokaro', destination: 'Dhanbad', distanceKm: 45, vehicleType: '14ft Eicher (5T)', mileageKmpl: 7.5, tollRs: 120, typicalRateRs: 3200, createdAt: '2026-09-28T10:30:00+05:30' },
  { id: 'lane-02', origin: 'Bokaro', destination: 'Jamshedpur', distanceKm: 150, vehicleType: '17ft Eicher (7T)', mileageKmpl: 6.2, tollRs: 450, typicalRateRs: 9500, createdAt: '2026-09-28T10:30:00+05:30' },
  { id: 'lane-03', origin: 'Bokaro', destination: 'Ranchi', distanceKm: 115, vehicleType: '14ft Eicher (5T)', mileageKmpl: 7.5, tollRs: 350, typicalRateRs: 7000, createdAt: '2026-09-28T10:30:00+05:30' },
  { id: 'lane-04', origin: 'Dhanbad', destination: 'Kolkata', distanceKm: 270, vehicleType: '10-Wheeler (16T)', mileageKmpl: 4.2, tollRs: 1400, typicalRateRs: 22000, createdAt: '2026-09-28T10:30:00+05:30' },
  { id: 'lane-05', origin: 'Bokaro', destination: 'Patna', distanceKm: 280, vehicleType: '17ft Eicher (7T)', mileageKmpl: 6.2, tollRs: 1100, typicalRateRs: 17500, createdAt: '2026-09-28T10:30:00+05:30' },
  { id: 'lane-06', origin: 'Jamshedpur', destination: 'Kolkata', distanceKm: 250, vehicleType: 'Container 32ft (18T)', mileageKmpl: 4.0, tollRs: 1300, typicalRateRs: 21000, createdAt: '2026-09-28T10:30:00+05:30' },
  { id: 'lane-07', origin: 'Bokaro', destination: 'Rourkela', distanceKm: 220, vehicleType: '10-Wheeler (16T)', mileageKmpl: 4.2, tollRs: 950, typicalRateRs: 18000, createdAt: '2026-09-28T10:30:00+05:30' },
  { id: 'lane-08', origin: 'Dhanbad', destination: 'Varanasi', distanceKm: 330, vehicleType: '17ft Eicher (7T)', mileageKmpl: 6.2, tollRs: 1500, typicalRateRs: 21500, createdAt: '2026-09-28T10:30:00+05:30' },
  { id: 'lane-09', origin: 'Ranchi', destination: 'Kolkata', distanceKm: 410, vehicleType: 'Multi-Axle (25T)', mileageKmpl: 3.6, tollRs: 2100, typicalRateRs: 32000, createdAt: '2026-09-28T10:30:00+05:30' },
  { id: 'lane-10', origin: 'Bokaro', destination: 'Durgapur', distanceKm: 200, vehicleType: '14ft Eicher (5T)', mileageKmpl: 7.5, tollRs: 800, typicalRateRs: 12500, createdAt: '2026-09-28T10:30:00+05:30' },
];

function thread(id: string, msgs: Array<[string, 'customer' | 'broker', string, 'text' | 'quote', number?]>): LocalEnquiry['thread'] {
  return msgs.map(([mid, from, text, kind, rateRs], i) => ({
    id: `${id}-m${i + 1}-${mid}`,
    from,
    text,
    at: new Date(new Date('2026-10-03T09:00:00+05:30').getTime() + i * 9 * 60000).toISOString(),
    kind,
    ...(rateRs !== undefined ? { rateRs } : {}),
  }));
}

const enquiries: LocalEnquiry[] = [
  {
    id: 'enq-01',
    waFrom: '919835122014',
    text: 'Bhai, 5 ton TMT bars Bokaro se Dhanbad kal subah chahiye. 14ft chalega. Rate batao jaldi.',
    laneId: 'lane-01',
    weightTons: 5,
    status: 'new',
    createdAt: '2026-10-03T09:12:00+05:30',
    senderName: 'Ramesh Agarwal',
    goods: 'TMT bars',
    neededBy: 'kal subah',
    urgency: 'urgent',
    thread: thread('enq-01', [
      ['a', 'customer', 'Bhai, 5 ton TMT bars Bokaro se Dhanbad kal subah chahiye. 14ft chalega. Rate batao jaldi.', 'text'],
    ]),
  },
  {
    id: 'enq-02',
    waFrom: '919934187652',
    text: 'Namaste, 16 ton coal washery reject Dhanbad to Kolkata, 10-wheeler. Party ready, aaj loading ho sakta hai kya? Rate confirm karo.',
    laneId: 'lane-04',
    weightTons: 16,
    status: 'new',
    createdAt: '2026-10-03T10:47:00+05:30',
    senderName: 'Santosh Mahato',
    goods: 'Coal washery reject',
    neededBy: 'aaj',
    urgency: 'same-day',
    thread: thread('enq-02', [
      ['a', 'customer', 'Namaste, 16 ton coal washery reject Dhanbad to Kolkata, 10-wheeler. Party ready, aaj loading ho sakta hai kya? Rate confirm karo.', 'text'],
    ]),
  },
  {
    id: 'enq-03',
    waFrom: '919801233445',
    text: '7 ton cement bags Bokaro to Patna, next week. 17ft Eicher. Best rate do, regular kaam milega.',
    laneId: 'lane-05',
    weightTons: 7,
    status: 'new',
    createdAt: '2026-10-02T16:20:00+05:30',
    senderName: 'Priya Traders',
    goods: 'Cement bags',
    neededBy: 'next week',
    urgency: 'standard',
    thread: thread('enq-03', [
      ['a', 'customer', '7 ton cement bags Bokaro to Patna, next week. 17ft Eicher. Best rate do, regular kaam milega.', 'text'],
    ]),
  },
  {
    id: 'enq-04',
    waFrom: '919431150982',
    text: '5 ton cement Bokaro to Ranchi kal subah. 14ft. Rate final karo jaldi, party wait kar rahi hai.',
    laneId: 'lane-03',
    weightTons: 5,
    status: 'quoted',
    createdAt: '2026-10-03T08:05:00+05:30',
    senderName: 'Manoj Sao',
    goods: 'Cement',
    neededBy: 'kal subah',
    urgency: 'urgent',
    thread: thread('enq-04', [
      ['a', 'customer', '5 ton cement Bokaro to Ranchi kal subah. 14ft. Rate final karo jaldi, party wait kar rahi hai.', 'text'],
      ['b', 'broker', 'Namaste Manoj ji, Bokaro se Ranchi ke liye hamara rate ₹7,300 rahega (14ft Eicher (5T), 5T). Gaadi turant available hai. Confirm karein? — Sharma Roadlines', 'quote', 7300],
      ['c', 'customer', 'Thoda kam karo bhai, 7000 me done karo to abhi confirm karta hun.', 'text'],
    ]),
  },
  {
    id: 'enq-05',
    waFrom: '919920468113',
    text: 'Bhai sahab, 9 ton sponge iron Bokaro se Rourkela parso loading hai. 10-wheeler lagega. Rate bhejo.',
    laneId: 'lane-07',
    weightTons: 9,
    status: 'closed',
    createdAt: '2026-10-01T14:30:00+05:30',
    senderName: 'Shree Balaji Traders',
    goods: 'Sponge iron',
    neededBy: 'parso',
    urgency: 'standard',
    thread: thread('enq-05', [
      ['a', 'customer', 'Bhai sahab, 9 ton sponge iron Bokaro se Rourkela parso loading hai. 10-wheeler lagega. Rate bhejo.', 'text'],
      ['b', 'broker', 'Namaste ji, Bokaro se Rourkela ke liye hamara rate ₹19,500 rahega (10-Wheeler (16T), 9T). Gaadi turant available hai. Confirm karein? — Sharma Roadlines', 'quote', 19500],
      ['c', 'customer', 'Theek hai, dusri party se 19 me ho gaya. Agli baar pakka aap se.', 'text'],
    ]),
  },
];

function bd(fuel: number, toll: number, driverBata: number, handling: number, marginPct: number, marginRs: number, urgencyMultiplier: number, finalRate: number, historyRate?: number) {
  return {
    fuel, toll, driverBata, handling,
    operatingCost: fuel + toll + driverBata + handling,
    marginPct, marginRs, urgencyMultiplier, finalRate,
    ...(historyRate !== undefined ? { historyRate } : {}),
  };
}

const quotes: LocalQuote[] = [
  { id: 'q-101', laneId: 'lane-01', enquiryId: null, weightTons: 5, urgency: 'urgent', rateRs: 3400, marginRs: 395, breakdown: bd(552, 120, 800, 800, 13, 395, 1.1, 3400, 3200), status: 'won', createdAt: '2026-09-30T11:05:00+05:30', sentAt: '2026-09-30T11:06:00+05:30', customerName: 'Ramesh Agarwal' },
  { id: 'q-102', laneId: 'lane-02', enquiryId: null, weightTons: 7, urgency: 'standard', rateRs: 9800, marginRs: 699, breakdown: bd(2226, 450, 1200, 1500, 13, 699, 1.0, 9800, 9500), status: 'won', createdAt: '2026-09-29T14:40:00+05:30', sentAt: '2026-09-29T14:41:00+05:30', customerName: 'Jharkhand Steel Co.' },
  { id: 'q-103', laneId: 'lane-04', enquiryId: null, weightTons: 16, urgency: 'same-day', rateRs: 23500, marginRs: 1502, breakdown: bd(5914, 1400, 1200, 1500, 15, 1502, 1.15, 23500, 22000), status: 'lost', createdAt: '2026-09-28T09:15:00+05:30', sentAt: '2026-09-28T09:16:00+05:30', customerName: 'Bengal Minerals' },
  { id: 'q-104', laneId: 'lane-03', enquiryId: 'enq-04', weightTons: 5, urgency: 'urgent', rateRs: 7300, marginRs: 437, breakdown: bd(1411, 350, 800, 800, 13, 437, 1.1, 7300, 7000), status: 'sent', createdAt: '2026-10-03T08:09:00+05:30', sentAt: '2026-10-03T08:09:00+05:30', customerName: 'Manoj Sao' },
  { id: 'q-105', laneId: 'lane-05', enquiryId: null, weightTons: 7, urgency: 'standard', rateRs: 18200, marginRs: 1034, breakdown: bd(4153, 1100, 1200, 1500, 13, 1034, 1.0, 18200, 17500), status: 'won', createdAt: '2026-09-26T12:10:00+05:30', sentAt: '2026-09-26T12:11:00+05:30', customerName: 'Priya Traders' },
  { id: 'q-106', laneId: 'lane-10', enquiryId: null, weightTons: 5, urgency: 'urgent', rateRs: 12900, marginRs: 774, breakdown: bd(2453, 800, 1200, 1500, 13, 774, 1.1, 12900, 12500), status: 'lost', createdAt: '2026-09-25T15:48:00+05:30', sentAt: '2026-09-25T15:49:00+05:30', customerName: 'Durgapur Alloys' },
];

export function seedDb(): DbData {
  return {
    settings: {
      name: 'Kavya Sharma',
      company: 'Sharma Roadlines',
      phone: '+91 98765 43210',
      defaultMarginPct: 13,
      dieselPrice: 92,
    },
    lanes,
    enquiries,
    quotes,
  };
}
