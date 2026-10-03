// Realistic incoming-enquiry generator for the "simulate" flow.
// Messages mirror how Indian freight customers actually write on WhatsApp.

import type { Enquiry, ParsedEnquiry, Urgency } from '../types';
import { uid } from './store';

interface Template {
  senderName: string;
  senderPhone: string;
  text: string;
  parsed: ParsedEnquiry;
}

const SENDER_POOL = [
  { name: 'Manoj Sao', phone: '+91 94311 50982' },
  { name: 'Deepak Kumar', phone: '+91 99554 31720' },
  { name: 'Shree Balaji Traders', phone: '+91 92046 88113' },
  { name: 'Anil Verma', phone: '+91 97714 60235' },
  { name: 'Khan Transport Co.', phone: '+91 93049 12764' },
  { name: 'Suresh Yadav', phone: '+91 91234 90871' },
  { name: 'Modern Steel Suppliers', phone: '+91 89877 44502' },
  { name: 'Prakash Singh', phone: '+91 95460 73118' },
];

const TEMPLATES: Omit<Template, 'senderName' | 'senderPhone'>[] = [
  {
    text: 'Bhai sahab, 9 ton sponge iron Bokaro se Rourkela parso loading hai. 10-wheeler lagega. Rate bhejo.',
    parsed: { origin: 'Bokaro', destination: 'Rourkela', weightT: 9, goods: 'Sponge iron', neededBy: 'day after tomorrow', urgency: 'standard' as Urgency },
  },
  {
    text: 'Urgent hai — 4 ton machinery parts Jamshedpur to Kolkata, aaj shaam tak gaadi chahiye. Container chalega. Price bolo.',
    parsed: { origin: 'Jamshedpur', destination: 'Kolkata', weightT: 4, goods: 'Machinery parts', neededBy: 'today evening', urgency: 'same-day' as Urgency },
  },
  {
    text: 'Namaste ji, 7 ton rice bags Dhanbad se Varanasi, next week. 17ft Eicher. Regular party hai, achha rate dena.',
    parsed: { origin: 'Dhanbad', destination: 'Varanasi', weightT: 7, goods: 'Rice bags', neededBy: 'next week', urgency: 'standard' as Urgency },
  },
  {
    text: '5 ton cement Bokaro to Ranchi kal subah. 14ft. Rate final karo jaldi, party wait kar rahi hai.',
    parsed: { origin: 'Bokaro', destination: 'Ranchi', weightT: 5, goods: 'Cement', neededBy: 'tomorrow morning', urgency: 'urgent' as Urgency },
  },
  {
    text: 'Bhai, 20 ton coal Dhanbad to Kolkata, multi-axle lagega. Aaj loading possible hai? Rate batao.',
    parsed: { origin: 'Dhanbad', destination: 'Kolkata', weightT: 20, goods: 'Coal', neededBy: 'today', urgency: 'same-day' as Urgency },
  },
  {
    text: 'Hello, 6 ton TMT Bokaro to Jamshedpur, Friday loading. 17ft Eicher. Quotation chahiye.',
    parsed: { origin: 'Bokaro', destination: 'Jamshedpur', weightT: 6, goods: 'TMT bars', neededBy: 'Friday', urgency: 'standard' as Urgency },
  },
  {
    text: '12 ton fly ash Bokaro se Durgapur, 10-wheeler. Kal loading. Rate bhejo WhatsApp par.',
    parsed: { origin: 'Bokaro', destination: 'Durgapur', weightT: 12, goods: 'Fly ash', neededBy: 'tomorrow', urgency: 'urgent' as Urgency },
  },
  {
    text: 'Bhaiya 8 ton hardware goods Ranchi to Kolkata, next week. Multi-axle ya container. Best rate do.',
    parsed: { origin: 'Ranchi', destination: 'Kolkata', weightT: 8, goods: 'Hardware goods', neededBy: 'next week', urgency: 'standard' as Urgency },
  },
  {
    text: '5 ton billets Bokaro to Dhanbad aaj dopahar tak chahiye. Bahut urgent hai. 14ft bhejo, rate bolo.',
    parsed: { origin: 'Bokaro', destination: 'Dhanbad', weightT: 5, goods: 'Steel billets', neededBy: 'today afternoon', urgency: 'same-day' as Urgency },
  },
  {
    text: 'Namaskar, 15 ton fertilizer Dhanbad se Patna nahi — sorry, Dhanbad se Varanasi. 17ft. Parso loading.',
    parsed: { origin: 'Dhanbad', destination: 'Varanasi', weightT: 15, goods: 'Fertilizer', neededBy: 'day after tomorrow', urgency: 'standard' as Urgency },
  },
];

let cursor = Math.floor(Math.random() * TEMPLATES.length);

export function simulateEnquiry(): Enquiry {
  const t = TEMPLATES[cursor % TEMPLATES.length];
  const sender = SENDER_POOL[cursor % SENDER_POOL.length];
  cursor += 1;
  const now = new Date().toISOString();
  const id = uid('enq');
  return {
    id,
    senderName: sender.name,
    senderPhone: sender.phone,
    receivedAt: now,
    rawText: t.text,
    parsed: t.parsed,
    status: 'new',
    thread: [
      { id: `${id}-m1`, from: 'customer', text: t.text, at: now, kind: 'text' },
    ],
  };
}
