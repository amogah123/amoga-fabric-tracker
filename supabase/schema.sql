-- ============================================================
-- AMOGA FABRIC RECONCILIATION TRACKER — Supabase Schema
-- Paste this into Supabase SQL Editor and click Run.
-- ============================================================

create type order_status as enum ('open', 'in_progress', 'completed', 'cancelled');
create type process_stage as enum ('Knitting', 'Dyeing', 'Compacting', 'Stentering', 'Finishing');
create type qc_status_enum as enum ('Pending', 'Passed', 'Rejected', 'Partial');
create type shade_status_enum as enum ('Pending', 'Approved', 'Rejected');

create table orders (
  id                 uuid primary key default gen_random_uuid(),
  job_number         text unique not null,
  buyer_name         text not null,
  buyer_po           text,
  fabric_name        text not null,
  composition        text,
  gsm                numeric,
  colour             text,
  width              text,
  required_kgs       numeric,
  required_meters    numeric,
  order_date         date not null default current_date,
  target_date        date,
  status             order_status not null default 'open',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index idx_orders_status on orders(status);
create index idx_orders_buyer  on orders(buyer_name);

create table yarn_entries (
  id               uuid primary key default gen_random_uuid(),
  order_id         uuid not null references orders(id) on delete cascade,
  supplier_name    text,
  invoice_no       text,
  yarn_type        text,
  lot_no           text,
  yarn_kgs         numeric not null check (yarn_kgs > 0),
  received_date    date not null,
  created_at       timestamptz not null default now()
);
create index idx_yarn_order on yarn_entries(order_id);

create table process_entries (
  id                 uuid primary key default gen_random_uuid(),
  order_id           uuid not null references orders(id) on delete cascade,
  process_name       process_stage not null,
  vendor_name        text,
  inward_date        date,
  inward_dc          text,
  inward_kgs         numeric,
  outward_date       date,
  outward_dc         text,
  outward_kgs        numeric,
  rolls              int,
  avg_roll_weight    numeric,
  loss_kgs           numeric generated always as (
    coalesce(inward_kgs, 0) - coalesce(outward_kgs, 0)
  ) stored,
  loss_percent       numeric generated always as (
    case when coalesce(inward_kgs, 0) > 0
    then ((coalesce(inward_kgs, 0) - coalesce(outward_kgs, 0)) / inward_kgs) * 100
    else 0 end
  ) stored,
  days_taken         int generated always as (
    case when outward_date is not null and inward_date is not null
    then (outward_date - inward_date) else null end
  ) stored,
  remarks            text,
  created_at         timestamptz not null default now(),
  unique (order_id, process_name)
);
create index idx_process_order on process_entries(order_id);

create table inhouse_entries (
  id                 uuid primary key default gen_random_uuid(),
  order_id           uuid unique not null references orders(id) on delete cascade,
  inhouse_date       date not null,
  final_kgs          numeric not null check (final_kgs > 0),
  rolls              int,
  avg_roll_weight    numeric,
  qc_status          qc_status_enum default 'Pending',
  shade_status       shade_status_enum default 'Pending',
  rack_location      text,
  total_days         int,
  created_at         timestamptz not null default now()
);

-- Triggers
create or replace function touch_orders_updated() returns trigger as $$
begin new.updated_at = now(); return new; end $$ language plpgsql;
create trigger trg_orders_touch before update on orders for each row execute function touch_orders_updated();

create or replace function mark_order_completed() returns trigger as $$
begin update orders set status = 'completed', updated_at = now() where id = new.order_id; return new; end $$ language plpgsql;
create trigger trg_inhouse_complete after insert on inhouse_entries for each row execute function mark_order_completed();

create or replace function next_job_number() returns text as $$
declare n int;
begin select coalesce(max(substring(job_number from 'AMG-(\d+)')::int), 1000) + 1 into n from orders; return 'AMG-' || n; end $$ language plpgsql;

-- RLS
alter table orders           enable row level security;
alter table yarn_entries     enable row level security;
alter table process_entries  enable row level security;
alter table inhouse_entries  enable row level security;
create policy "auth_orders"   on orders          for all to authenticated using (true) with check (true);
create policy "auth_yarn"     on yarn_entries    for all to authenticated using (true) with check (true);
create policy "auth_process"  on process_entries for all to authenticated using (true) with check (true);
create policy "auth_inhouse"  on inhouse_entries for all to authenticated using (true) with check (true);
