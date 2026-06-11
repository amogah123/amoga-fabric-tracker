-- ============================================================
-- AMOGA FABRIC TRACKER v2 — Migration
-- 3-Pool Model: Yarn Stock -> Knitting Batches -> Orders
-- Safe to run whether or not the earlier migration was applied.
-- ============================================================

-- Clean up v1 yarn objects if they exist (model changed)
drop view if exists v_order_yarn_summary;
drop view if exists v_yarn_stock_balance;
drop table if exists yarn_allocations cascade;

-- ---------- POOL 1: YARN STOCK (per invoice line) ----------
create table if not exists yarn_stock (
  id               uuid primary key default gen_random_uuid(),
  supplier_name    text not null,
  invoice_no       text not null,
  invoice_date     date not null,
  yarn_count       text not null,
  lot_no           text,
  total_kgs        numeric not null check (total_kgs > 0),
  rate_per_kg      numeric,
  remarks          text,
  locked           boolean default false,
  locked_by        text,
  created_at       timestamptz not null default now()
);
create index if not exists idx_ys_invoice on yarn_stock(invoice_no);

-- ---------- POOL 2: KNITTING BATCHES (grey fabric) ----------
create table if not exists knitting_batches (
  id               uuid primary key default gen_random_uuid(),
  batch_no         text unique not null,
  fabric_structure text not null,        -- e.g. Single Jersey
  dia              text,                 -- e.g. 28"
  gsm              numeric,
  vendor_name      text,
  start_date       date,
  end_date         date,
  output_kgs       numeric,              -- knitted grey fabric produced
  rolls            int,
  remarks          text,
  locked           boolean default false,
  locked_by        text,
  created_at       timestamptz not null default now()
);

-- Yarn pulled into a knitting batch (many invoice lines -> one batch)
create table if not exists batch_yarn_allocations (
  id               uuid primary key default gen_random_uuid(),
  yarn_stock_id    uuid not null references yarn_stock(id) on delete cascade,
  batch_id         uuid not null references knitting_batches(id) on delete cascade,
  allocated_kgs    numeric not null check (allocated_kgs > 0),
  created_at       timestamptz not null default now()
);
create index if not exists idx_bya_stock on batch_yarn_allocations(yarn_stock_id);
create index if not exists idx_bya_batch on batch_yarn_allocations(batch_id);

-- Grey fabric allocated from a batch to an order (many batches -> one order)
create table if not exists order_fabric_allocations (
  id               uuid primary key default gen_random_uuid(),
  batch_id         uuid not null references knitting_batches(id) on delete cascade,
  order_id         uuid not null references orders(id) on delete cascade,
  allocated_kgs    numeric not null check (allocated_kgs > 0),
  rolls            int,
  allocated_date   date not null default current_date,
  locked           boolean default false,
  locked_by        text,
  created_at       timestamptz not null default now()
);
create index if not exists idx_ofa_batch on order_fabric_allocations(batch_id);
create index if not exists idx_ofa_order on order_fabric_allocations(order_id);

-- ---------- ORDER PIPELINE CHANGES ----------
alter table orders add column if not exists dyeing_stenter_combined boolean default false;

-- process_name must accept 'Dyeing & Stentering' so change enum -> text
alter table process_entries alter column process_name type text;

alter table process_entries add column if not exists locked boolean default false;
alter table process_entries add column if not exists locked_by text;
alter table process_entries add column if not exists locked_at timestamptz;

alter table inhouse_entries add column if not exists locked boolean default false;
alter table inhouse_entries add column if not exists locked_by text;
alter table inhouse_entries add column if not exists locked_at timestamptz;

-- ---------- RLS ----------
alter table yarn_stock              enable row level security;
alter table knitting_batches        enable row level security;
alter table batch_yarn_allocations  enable row level security;
alter table order_fabric_allocations enable row level security;

drop policy if exists "auth_yarn_stock" on yarn_stock;
create policy "auth_yarn_stock" on yarn_stock for all to authenticated using (true) with check (true);
drop policy if exists "auth_kb" on knitting_batches;
create policy "auth_kb" on knitting_batches for all to authenticated using (true) with check (true);
drop policy if exists "auth_bya" on batch_yarn_allocations;
create policy "auth_bya" on batch_yarn_allocations for all to authenticated using (true) with check (true);
drop policy if exists "auth_ofa" on order_fabric_allocations;
create policy "auth_ofa" on order_fabric_allocations for all to authenticated using (true) with check (true);

-- ---------- BALANCE VIEWS ----------
create or replace view v_yarn_stock_balance as
select ys.*,
  coalesce((select sum(a.allocated_kgs) from batch_yarn_allocations a where a.yarn_stock_id = ys.id), 0) as used_kgs,
  ys.total_kgs - coalesce((select sum(a.allocated_kgs) from batch_yarn_allocations a where a.yarn_stock_id = ys.id), 0) as balance_kgs
from yarn_stock ys;

create or replace view v_batch_balance as
select kb.*,
  coalesce((select sum(a.allocated_kgs) from batch_yarn_allocations a where a.batch_id = kb.id), 0) as yarn_in_kgs,
  coalesce((select sum(f.allocated_kgs) from order_fabric_allocations f where f.batch_id = kb.id), 0) as allocated_kgs,
  coalesce(kb.output_kgs, 0) - coalesce((select sum(f.allocated_kgs) from order_fabric_allocations f where f.batch_id = kb.id), 0) as balance_kgs
from knitting_batches kb;
