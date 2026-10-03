// Realistic incoming-enquiry generator for the "simulate" flow.
// Messages mirror how Indian freight customers actually write on WhatsApp.
// Enquiries created here carry the API's field names plus demo-only
// display fields (senderName, thread); api.ts strips those on send.

import type { LocalEnquiry, Urgency } from '../types';
import { uid } from './store';

interface Template {
  text: string;
  laneId: string;
  weightTons: number;
  goods: string;
  neededBy: string;
  urgency: Urgency;
}

const SENDER_POOL = [
  { name: 'Manoj Sao', waFrom: '919431150982' },
  { name: 'Deepak Kumar', waFrom: '919955431720' },
  { name: 'Shree Balaji Traders', waFrom: '919204688113' },
  { name: 'Anil Verma', waFrom: '919771460235' },
  { name: 'Khan Transport Co.', waFrom: '919304912764' },
  { name: 'Suresh Yadav', waFrom: '919123490871' },
  { name: 'Modern Steel Suppliers', waFrom: '918987744502' },
  { name: 'Prakash Singh', waFrom: '919546073118' },
];

const TEMPLATES: Template[] = [
  { text: 'Bhai sahab, 9 ton sponge iron Bokaro se Rourkela parso loading hai. 10-wheeler lagega. Rate bhejo.', laneId: 'lane-07', weightTons: 9, goods: 'Sponge iron', neededBy: 'parso', urgency: 'standard' },
  { text: 'Urgent hai — 4 ton machinery parts Jamshedpur to Kolkata, aaj shaam tak gaadi chahiye. Container chalega. Price bolo.', laneId: 'lane-06', weightTons: 4, goods: 'Machinery parts', neededBy: 'aaj shaam', urgency: 'same-day' },
  { text: 'Namaste ji, 7 ton rice bags Dhanbad se Varanasi, next week. 17ft Eicher. Regular party hai, achha rate dena.', laneId: 'lane-08', weightTons: 7, goods: 'Rice bags', neededBy: 'next week', urgency: 'standard' },
  { text: '5 ton cement Bokaro to Ranchi kal subah. 14ft. Rate final karo jaldi, party wait kar rahi hai.', laneId: 'lane-03', weightTons: 5, goods: 'Cement', neededBy: 'kal subah', urgency: 'urgent' },
  { text: 'Bhai, 20 ton coal Dhanbad to Kolkata, multi-axle lagega. Aaj loading possible hai? Rate batao.', laneId: 'lane-04', weightTons: 20, goods: 'Coal', neededBy: 'aaj', urgency: 'same-day' },
  { text: 'Hello, 6 ton TMT Bokaro to Jamshedpur, Friday loading. 17ft Eicher. Quotation chahiye.', laneId: 'lane-02', weightTons: 6, goods: 'TMT bars', neededBy: 'Friday', urgency: 'standard' },
  { text: '12 ton fly ash Bokaro se Durgapur, 10-wheeler. Kal loading. Rate bhejo WhatsApp par.', laneId: 'lane-10', weightTons: 12, goods: 'Fly ash', neededBy: 'kal', urgency: 'urgent' },
  { text: 'Bhaiya 8 ton hardware goods Ranchi to Kolkata, next week. Multi-axle ya container. Best rate do.', laneId: 'lane-09', weightTons: 8, goods: 'Hardware goods', neededBy: 'next week', urgency: 'standard' },
  { text: '5 ton billets Bokaro to Dhanbad aaj dopahar tak chahiye. Bahut urgent hai. 14ft bhejo, rate bolo.', laneId: 'lane-01', weightTons: 5, goods: 'Steel billets', neededBy: 'aaj dopahar', urgency: 'same-day' },
  { text: 'Namaskar, 15 ton fertilizer Dhanbad se Varanasi, parso loading. 17ft. Rate batao.', laneId: 'lane-08', weightTons: 15, goods: 'Fertilizer', neededBy: 'parso', urgency: 'standard' },
];

let cursor = Math.floor(Math.random() * TEMPLATES.length);

export function simulateEnquiry(): LocalEnquiry {
  const t = TEMPLATES[cursor % TEMPLATES.length];
  const sender = SENDER_POOL[cursor % SENDER_POOL.length];
  cursor += 1;
  const now = new Date().toISOString();
  const id = uid('enq');
  return {
    id,
    waFrom: sender.waFrom,
    text: t.text,
    laneId: t.laneId,
    weightTons: t.weightTons,
    status: 'new',
    createdAt: now,
    senderName: sender.name,
    goods: t.goods,
    neededBy: t.neededBy,
    urgency: t.urgency,
    thread: [{ id: `${id}-m1`, from: 'customer', text: t.text, at: now, kind: 'text' }],
  };
}
