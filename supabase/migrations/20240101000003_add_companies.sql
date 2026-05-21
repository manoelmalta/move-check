-- ─────────────────────────────────────────────────────────────────────────────
-- MOVE CHECK — Migration 003: companies + company_id isolation
--
-- Introduz o conceito de Empresa/Ambiente e isola os dados principais por empresa.
--
-- Aplicar via: Supabase Dashboard › SQL Editor › Run
-- SEGURO: additive — dados existentes recebem "Empresa Padrão" (UUID fixo).
-- NÃO apaga dados. NÃO reseta banco. NÃO faz DROP de tabelas com dados.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Tabela companies ───────────────────────────────────────────────────────

create table if not exists companies (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null,
  document    text        null,
  notes       text        null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create or replace trigger trg_companies_updated_at
  before update on companies
  for each row execute function handle_updated_at();

-- ── 2. Empresa Padrão (UUID fixo para facilitar migration determinística) ─────

insert into companies (id, name)
values ('00000000-0000-0000-0000-000000000001', 'Empresa Padrão')
on conflict (id) do nothing;

-- ── 3. company_id em products ─────────────────────────────────────────────────

alter table products
  add column if not exists company_id uuid references companies(id) on delete cascade;

update products
  set company_id = '00000000-0000-0000-0000-000000000001'
  where company_id is null;

alter table products alter column company_id set not null;

-- Novos campos de endereçamento (preparação de schema, edição completa na próxima rodada)
alter table products add column if not exists has_fixed_picking    boolean not null default false;
alter table products add column if not exists fixed_picking_address text    null;
alter table products add column if not exists has_fixed_address     boolean not null default false;
alter table products add column if not exists fixed_address         text    null;

create index if not exists idx_products_company_id on products (company_id);

-- ── 4. company_id em product_barcodes ─────────────────────────────────────────

alter table product_barcodes
  add column if not exists company_id uuid references companies(id) on delete cascade;

-- Deriva company_id do produto pai
update product_barcodes pb
  set company_id = p.company_id
  from products p
  where p.id = pb.product_id
    and pb.company_id is null;

-- Fallback para barcodes órfãos (não deveria haver, mas por segurança)
update product_barcodes
  set company_id = '00000000-0000-0000-0000-000000000001'
  where company_id is null;

alter table product_barcodes alter column company_id set not null;

create index if not exists idx_product_barcodes_company_id on product_barcodes (company_id);

-- ── 5. company_id em scan_sessions ────────────────────────────────────────────

alter table scan_sessions
  add column if not exists company_id uuid references companies(id) on delete cascade;

update scan_sessions
  set company_id = '00000000-0000-0000-0000-000000000001'
  where company_id is null;

alter table scan_sessions alter column company_id set not null;

-- Campo comentário/finalidade do inventário
alter table scan_sessions add column if not exists comment text null;

create index if not exists idx_scan_sessions_company_id on scan_sessions (company_id);

-- ── 6. company_id em scan_entries ─────────────────────────────────────────────

alter table scan_entries
  add column if not exists company_id uuid references companies(id) on delete cascade;

-- Deriva company_id da sessão pai
update scan_entries se
  set company_id = s.company_id
  from scan_sessions s
  where s.id = se.session_id
    and se.company_id is null;

update scan_entries
  set company_id = '00000000-0000-0000-0000-000000000001'
  where company_id is null;

alter table scan_entries alter column company_id set not null;

create index if not exists idx_scan_entries_company_id on scan_entries (company_id);

-- ── 7. company_id em product_registration_logs ───────────────────────────────

alter table product_registration_logs
  add column if not exists company_id uuid references companies(id) on delete cascade;

-- Deriva company_id da sessão pai
update product_registration_logs prl
  set company_id = s.company_id
  from scan_sessions s
  where s.id = prl.session_id
    and prl.company_id is null;

update product_registration_logs
  set company_id = '00000000-0000-0000-0000-000000000001'
  where company_id is null;

alter table product_registration_logs alter column company_id set not null;

create index if not exists idx_prl_company_id on product_registration_logs (company_id);

-- ── 8. Corrigir constraints de unicidade (global → por empresa) ───────────────
--
-- Antes: unique global em products.codigo_interno e product_barcodes.code
-- Depois: unique por (company_id, codigo_interno) e (company_id, code)
--
-- Os nomes padrão do PostgreSQL para unique columns são <tabela>_<coluna>_key.

alter table products drop constraint if exists products_codigo_interno_key;
alter table product_barcodes drop constraint if exists product_barcodes_code_key;

create unique index if not exists products_company_id_codigo_interno_idx
  on products (company_id, codigo_interno);

create unique index if not exists product_barcodes_company_id_code_idx
  on product_barcodes (company_id, code);

-- ── 9. Tabela registration_pending_items ──────────────────────────────────────

create table if not exists registration_pending_items (
  id          uuid        primary key default gen_random_uuid(),
  company_id  uuid        not null references companies(id) on delete cascade,
  session_id  uuid        null references scan_sessions(id) on delete set null,
  code        text        null,
  code_type   text        null,
  description text        null,
  origin      text        not null,
  status      text        not null default 'PENDENTE',
  created_at  timestamptz not null default now(),
  resolved_at timestamptz null
);

create index if not exists idx_rpi_company_id on registration_pending_items (company_id);
create index if not exists idx_rpi_session_id on registration_pending_items (session_id);
create index if not exists idx_rpi_status     on registration_pending_items (company_id, status);
