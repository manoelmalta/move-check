-- ─────────────────────────────────────────────────────────────────────────────
-- MOVE CHECK — Migration 005: fix addresses structural columns
--
-- Contexto: migration 004 foi aplicada sem as colunas rua/predio/nivel/apto
-- (versão com street/level/position). Esta migration corrige a estrutura de
-- forma incremental, sem apagar dados e sem resetar banco.
--
-- Aplicar via: Supabase Dashboard › SQL Editor › Run
-- SEGURO: additive + data migration. Sem DROP de colunas. Sem reset.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Adicionar colunas estruturais (nullable inicialmente) ─────────────────

alter table addresses add column if not exists rua    text;
alter table addresses add column if not exists predio text;
alter table addresses add column if not exists nivel  text;
alter table addresses add column if not exists apto   text;

-- ── 2. Migrar street → rua (extrai dígitos, normaliza para 2 casas) ──────────

update addresses
set rua = lpad(right(regexp_replace(coalesce(street, ''), '[^0-9]', '', 'g'), 2), 2, '0')
where rua is null;

-- ── 3. predio: sem origem direta — preenche '01' para registros antigos ───────

update addresses
set predio = '01'
where predio is null;

-- ── 4. Migrar level → nivel (extrai dígitos, normaliza para 2 casas) ─────────

update addresses
set nivel = lpad(right(regexp_replace(coalesce(level, ''), '[^0-9]', '', 'g'), 2), 2, '0')
where nivel is null;

-- ── 5. Migrar position → apto (extrai dígitos, normaliza para 3 casas) ───────

update addresses
set apto = lpad(right(regexp_replace(coalesce(position, ''), '[^0-9]', '', 'g'), 3), 3, '0')
where apto is null;

-- ── 6. Tornar NOT NULL (todas as linhas já estão preenchidas acima) ───────────

alter table addresses alter column rua    set not null;
alter table addresses alter column predio set not null;
alter table addresses alter column nivel  set not null;
alter table addresses alter column apto   set not null;

-- ── 7. Dropar índice único antigo antes de atualizar code ─────────────────────
-- Necessário para evitar violação de unicidade durante o update em lote
-- (registros antigos podem ter codes arbitrários; o novo code é determinístico).

drop index if exists addresses_company_id_code_idx;

-- ── 8. Atualizar code para formato oficial RR-PP-NN-AAA ───────────────────────

update addresses
set code = rua || '-' || predio || '-' || nivel || '-' || apto;

-- ── 9. Adicionar CHECK constraint (NOT VALID = aplica apenas a novas linhas) ──
-- NOT VALID evita re-scan de tabela em prod e é seguro para dados que acabamos
-- de normalizar. Se quiser validar retroativamente:
--   alter table addresses validate constraint addresses_code_format;

alter table addresses
  drop constraint if exists addresses_code_format;

alter table addresses
  add constraint addresses_code_format
    check (code ~ '^[0-9]{2}-[0-9]{2}-[0-9]{2}-[0-9]{3}$')
    not valid;

-- ── 10. Recriar índice único em (company_id, code) ───────────────────────────

create unique index if not exists addresses_company_id_code_idx
  on addresses (company_id, code);

-- ── 11. Garantir índices auxiliares (idempotente se já existem) ───────────────

create index if not exists idx_addresses_company_id on addresses (company_id);
create index if not exists idx_addresses_active     on addresses (company_id, is_active);

-- ── Nota ──────────────────────────────────────────────────────────────────────
-- Colunas antigas (street, level, position) permanecem na tabela nesta rodada.
-- Serão removidas em migration futura após confirmação de que não há dados
-- relevantes que não foram migrados.
-- ─────────────────────────────────────────────────────────────────────────────
