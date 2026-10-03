-- ============================================================================
-- QuoteMitra — Supabase schema (Postgres)
-- ============================================================================
-- Env vars (Vercel → Project → Settings → Environment Variables):
--   SUPABASE_URL          — project URL, e.g. https://xyzcompany.supabase.co
--   SUPABASE_SERVICE_KEY  — service_role key. SERVER ONLY (api/**). It bypasses
--                           RLS, so it must NEVER be exposed to the browser.
--   SUPABASE_ANON_KEY     — anon/public key. Safe for the client-side dashboard
--                           (src/**); RLS policies below apply to it.
--
-- Run this file once in the Supabase SQL editor (or via the Supabase CLI).
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- brokers: single-row table with the broker's profile + pricing defaults
-- ----------------------------------------------------------------------------
create table if not exists brokers (
  id                text primary key default 'default',
  name              text not null default '',
  company           text not null default '',
  phone             text not null default '',
  default_margin_pct numeric not null default 13,
  diesel_price      numeric not null default 92,   -- ₹/litre
  created_at        timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- lanes: origin → destination routes the broker quotes on
-- ----------------------------------------------------------------------------
create table if not exists lanes (
  id               uuid primary key default gen_random_uuid(),
  broker_id        text not null default 'default' references brokers(id),
  origin           text not null,
  destination      text not null,
  distance_km      numeric not null,
  vehicle_type     text not null,
  mileage_kmpl     numeric,                        -- NULL → engine estimates by vehicle
  toll_rs          numeric not null default 0,
  typical_rate_rs  numeric not null default 0,
  created_at       timestamptz not null default now()
);
create index if not exists lanes_origin_destination_idx
  on lanes (lower(origin), lower(destination));

-- ----------------------------------------------------------------------------
-- enquiries: inbound WhatsApp leads
-- ----------------------------------------------------------------------------
create table if not exists enquiries (
  id          uuid primary key default gen_random_uuid(),
  broker_id   text not null default 'default' references brokers(id),
  wa_from     text not null,                      -- sender wa_id, e.g. '919876543210'
  text        text not null,                      -- raw inbound message
  lane_id     uuid references lanes(id) on delete set null,
  weight_tons numeric,
  status      text not null default 'new'
              check (status in ('new', 'quoted', 'closed')),
  created_at  timestamptz not null default now()
);
create index if not exists enquiries_created_idx
  on enquiries (created_at desc);

-- ----------------------------------------------------------------------------
-- quotes: drafted/sent/won/lost freight quotes
-- ----------------------------------------------------------------------------
create table if not exists quotes (
  id          uuid primary key default gen_random_uuid(),
  broker_id   text not null default 'default' references brokers(id),
  lane_id     uuid not null references lanes(id) on delete cascade,
  enquiry_id  uuid references enquiries(id) on delete set null,
  weight_tons numeric,
  urgency     text not null default 'standard'
              check (urgency in ('standard', 'urgent', 'same-day')),
  rate_rs     numeric not null,                   -- final quoted rate (₹)
  margin_rs   numeric not null default 0,         -- broker margin embedded (₹)
  breakdown   jsonb not null default '{}'::jsonb, -- CostBreakdown from the engine
  status      text not null default 'draft'
              check (status in ('draft', 'sent', 'won', 'lost')),
  created_at  timestamptz not null default now(),
  sent_at     timestamptz
);
create index if not exists quotes_lane_idx on quotes (lane_id);
create index if not exists quotes_created_idx on quotes (created_at desc);

-- ----------------------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------------------
-- Single-user MVP: the API talks to Supabase with the service_role key
-- (bypasses RLS entirely), and there is no multi-tenant auth yet, so these
-- policies are permissive for now.
--
-- TODO: when broker login is added, scope every policy to the authenticated
-- user (e.g. USING (broker_id = auth.uid()::text)) and switch the API to the
-- anon key + per-request auth instead of the service key.
-- ----------------------------------------------------------------------------
alter table brokers   enable row level security;
alter table lanes     enable row level security;
alter table enquiries enable row level security;
alter table quotes    enable row level security;

create policy "mvp: brokers readable by anyone"
  on brokers for select using (true);
create policy "mvp: brokers writable by anyone"
  on brokers for all using (true) with check (true);

create policy "mvp: lanes readable by anyone"
  on lanes for select using (true);
create policy "mvp: lanes writable by anyone"
  on lanes for all using (true) with check (true);

create policy "mvp: enquiries readable by anyone"
  on enquiries for select using (true);
create policy "mvp: enquiries writable by anyone"
  on enquiries for all using (true) with check (true);

create policy "mvp: quotes readable by anyone"
  on quotes for select using (true);
create policy "mvp: quotes writable by anyone"
  on quotes for all using (true) with check (true);
