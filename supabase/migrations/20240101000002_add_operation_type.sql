-- ─────────────────────────────────────────────────────────────────────────────
-- MOVE CHECK — Migration 002: operation_type + product_registration_logs
--
-- Aplicar via: Supabase Dashboard › SQL Editor › Run
-- Additive-only — registros existentes recebem DEFAULT 'PRODUCT_INVENTORY'.
-- NÃO apaga dados. NÃO reseta banco. NÃO altera schema existente.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Adiciona operation_type em scan_sessions
alter table scan_sessions
  add column if not exists operation_type text not null default 'PRODUCT_INVENTORY'
    constraint scan_sessions_operation_type_check
    check (operation_type in ('PRODUCT_REGISTRATION', 'PRODUCT_INVENTORY'));

comment on column scan_sessions.operation_type is
  'Tipo de operação: PRODUCT_INVENTORY = contagem de estoque; '
  'PRODUCT_REGISTRATION = cadastro/enriquecimento de barcodes no catálogo.';

-- 2. Cria tabela de log de sessões de Cadastro de Produto
create table if not exists product_registration_logs (
  id          uuid        primary key default gen_random_uuid(),
  session_id  uuid        not null references scan_sessions(id) on delete cascade,
  product_id  uuid        references products(id) on delete set null,
  barcode_id  uuid        references product_barcodes(id) on delete set null,
  code        text        not null,
  code_type   text        not null
    check (code_type in ('EAN', 'DUN', 'UNKNOWN')),
  action      text        not null
    check (action in ('BARCODE_LINKED', 'BARCODE_ALREADY_EXISTS')),
  created_at  timestamptz not null default now()
);

create index if not exists idx_prl_session_id on product_registration_logs (session_id);
create index if not exists idx_prl_product_id on product_registration_logs (product_id);
create index if not exists idx_prl_barcode_id on product_registration_logs (barcode_id);

comment on table product_registration_logs is
  'Histórico de ações em sessões de Cadastro de Produto (PRODUCT_REGISTRATION). '
  'BARCODE_LINKED = novo vínculo barcode↔produto criado. '
  'BARCODE_ALREADY_EXISTS = barcode lido já estava vinculado ao produto.';
