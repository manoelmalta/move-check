-- ─────────────────────────────────────────────────────────────────────────────
-- MOVE CHECK — Initial Schema
-- Apply via: Supabase Dashboard › SQL Editor › Run, or Supabase CLI.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── updated_at trigger function ───────────────────────────────────────────────
create or replace function handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── products ──────────────────────────────────────────────────────────────────
create table if not exists products (
  id              uuid        primary key default gen_random_uuid(),
  codigo_interno  text        not null unique,
  descricao       text        not null,
  unidade_medida  text        not null default 'UN',
  observacao      text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_products_codigo_interno on products (codigo_interno);
create index if not exists idx_products_descricao      on products (descricao);

create or replace trigger trg_products_updated_at
  before update on products
  for each row execute function handle_updated_at();

-- ── product_barcodes ──────────────────────────────────────────────────────────
create table if not exists product_barcodes (
  id                uuid        primary key default gen_random_uuid(),
  product_id        uuid        not null references products (id) on delete cascade,
  code              text        not null unique,
  code_type         text        not null check (code_type in ('EAN', 'DUN', 'UNKNOWN')),
  units_per_package numeric,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_product_barcodes_code       on product_barcodes (code);
create index if not exists idx_product_barcodes_product_id on product_barcodes (product_id);

create or replace trigger trg_product_barcodes_updated_at
  before update on product_barcodes
  for each row execute function handle_updated_at();

-- ── scan_sessions ─────────────────────────────────────────────────────────────
create table if not exists scan_sessions (
  id         uuid        primary key default gen_random_uuid(),
  name       text        not null,
  status     text        not null default 'open' check (status in ('open', 'closed')),
  closed_at  timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_scan_sessions_status on scan_sessions (status);

create or replace trigger trg_scan_sessions_updated_at
  before update on scan_sessions
  for each row execute function handle_updated_at();

-- ── scan_entries ──────────────────────────────────────────────────────────────
create table if not exists scan_entries (
  id                uuid        primary key default gen_random_uuid(),
  session_id        uuid        not null references scan_sessions (id) on delete cascade,
  product_id        uuid        references products (id) on delete set null,
  code              text        not null,
  code_type         text        not null check (code_type in ('EAN', 'DUN', 'UNKNOWN')),
  quantity          numeric     not null default 1,
  units_per_package numeric,
  status            text        not null check (status in ('VINCULADO', 'PENDENTE_DE_VINCULO')),
  created_at        timestamptz not null default now()
);

create index if not exists idx_scan_entries_session_id on scan_entries (session_id);
create index if not exists idx_scan_entries_code       on scan_entries (code);
create index if not exists idx_scan_entries_product_id on scan_entries (product_id);
