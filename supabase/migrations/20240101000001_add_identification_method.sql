-- ─────────────────────────────────────────────────────────────────────────────
-- MOVE CHECK — Migration 001: identification_method em scan_entries
--
-- Problema: code_type representa o TIPO DO CÓDIGO DE BARRAS (EAN/DUN/UNKNOWN)
--           e possui CHECK constraint. Gravar 'CODIGO_INTERNO' nele violava o
--           constraint e causava erro ao salvar buscas manuais.
--
-- Solução: adicionar coluna identification_method que registra COMO o produto
--          foi localizado, desacoplando do tipo do código lido.
--
-- Aplicar via: Supabase Dashboard › SQL Editor › Run
-- Seguro: apenas additive — registros existentes recebem DEFAULT 'BARCODE'.
-- NÃO apaga dados. NÃO reseta banco. NÃO altera schema existente.
-- ─────────────────────────────────────────────────────────────────────────────

alter table scan_entries
  add column if not exists identification_method text not null default 'BARCODE'
    constraint scan_entries_identification_method_check
    check (identification_method in ('BARCODE', 'CODIGO_INTERNO', 'DESCRICAO', 'MANUAL'));

comment on column scan_entries.identification_method is
  'Como o produto foi localizado: BARCODE = código de barras lido (EAN/DUN); '
  'CODIGO_INTERNO = busca pelo código interno do produto; '
  'DESCRICAO = busca pela descrição; MANUAL = digitação livre.';
