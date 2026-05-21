-- ─────────────────────────────────────────────────────────────────────────────
-- MOVE CHECK — Migration 004: addresses
--
-- Introduz a malha de endereçamento por empresa.
-- product_addresses fica para próxima rodada (vínculo produto↔endereço).
--
-- Aplicar via: Supabase Dashboard › SQL Editor › Run
-- SEGURO: puramente additive. Não apaga dados. Não reseta banco.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists addresses (
  id          uuid        primary key default gen_random_uuid(),
  company_id  uuid        not null references companies(id) on delete cascade,
  code        text        not null,
  description text        null,
  area        text        null,
  street      text        null,
  level       text        null,
  position    text        null,
  notes       text        null,
  is_active   boolean     not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create unique index if not exists addresses_company_id_code_idx
  on addresses (company_id, code);

create index if not exists idx_addresses_company_id on addresses (company_id);
create index if not exists idx_addresses_active     on addresses (company_id, is_active);

create or replace trigger trg_addresses_updated_at
  before update on addresses
  for each row execute function handle_updated_at();

comment on table addresses is
  'Malha de endereçamento por empresa. Mesmo code pode existir em empresas '
  'diferentes (unique composto por company_id + code). product_addresses '
  '(vínculo produto↔endereço) ficará em migration posterior.';
