"use server";

import { createServerClient } from "@/lib/supabase/server";
import { detectCodeType } from "@/lib/barcode";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// Zod v4 rejeita UUIDs não-padrão como 00000000-0000-0000-0000-000000000001
// (exige version nibble 1-8 e variant bits 89ab). Usamos regex permissiva para
// aceitar qualquer sequência UUID-formatted incluindo o ID da Empresa Padrão.
const zId = z.string().regex(
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  "ID inválido"
);

// ─── Lookup ───────────────────────────────────────────────────────────────────

export type LookupResult =
  | {
      status: "found";
      barcodeId: string;
      codeType: string;
      unitsPerPackage: number | null;
      product: { id: string; codigoInterno: string; descricao: string; unidadeMedida: string };
    }
  | { status: "not_found"; codeType: string }
  | { status: "error"; message: string };

export async function lookupCode(companyId: string, rawCode: string): Promise<LookupResult> {
  const code = rawCode.trim().replace(/\D/g, "");
  if (!code) return { status: "error", message: "Código vazio" };

  const codeType = detectCodeType(code);
  const supabase = createServerClient();

  const { data: barcode } = await supabase
    .from("product_barcodes")
    .select("id, code, code_type, units_per_package, products(id, codigo_interno, descricao, unidade_medida)")
    .eq("company_id", companyId)
    .eq("code", code)
    .maybeSingle();

  if (barcode?.products) {
    const p = barcode.products as unknown as {
      id: string;
      codigo_interno: string;
      descricao: string;
      unidade_medida: string;
    };
    return {
      status: "found",
      barcodeId: barcode.id as string,
      codeType,
      unitsPerPackage: barcode.units_per_package as number | null,
      product: {
        id: p.id,
        codigoInterno: p.codigo_interno,
        descricao: p.descricao,
        unidadeMedida: p.unidade_medida,
      },
    };
  }

  return { status: "not_found", codeType };
}

// ─── Guard ────────────────────────────────────────────────────────────────────

async function assertSessionOpen(companyId: string, sessionId: string): Promise<string | null> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("scan_sessions")
    .select("status")
    .eq("company_id", companyId)
    .eq("id", sessionId)
    .maybeSingle();

  if (!data) return "Sessão não encontrada nesta empresa";
  if (data.status !== "open") return "Sessão fechada — reabra para continuar coletando";
  return null;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type SaveResult = { ok: true; entryId: string } | { ok: false; error: string };

// ─── Save — código já vinculado (found) ───────────────────────────────────────

const SaveLinkedSchema = z.object({
  companyId: zId,
  sessionId: z.string(),
  code: z.string().min(1),
  quantity: z.number().int().positive(),
  productId: z.string(),
  unitsPerPackage: z.number().int().positive().optional(),
});

export async function saveLinkedScan(data: z.infer<typeof SaveLinkedSchema>): Promise<SaveResult> {
  const parsed = SaveLinkedSchema.safeParse(data);
  if (!parsed.success) return { ok: false, error: "Dados inválidos" };

  const { companyId, sessionId, code, quantity, productId, unitsPerPackage } = parsed.data;
  const codeType = detectCodeType(code);
  const supabase = createServerClient();

  const sessionError = await assertSessionOpen(companyId, sessionId);
  if (sessionError) return { ok: false, error: sessionError };

  const { data: dup } = await supabase
    .from("scan_entries")
    .select("id")
    .eq("session_id", sessionId)
    .eq("code", code)
    .maybeSingle();
  if (dup) return { ok: false, error: "Código já registrado nesta sessão" };

  const { data: entry, error } = await supabase
    .from("scan_entries")
    .insert({
      company_id: companyId,
      session_id: sessionId,
      code,
      code_type: codeType,
      quantity,
      units_per_package: unitsPerPackage ?? null,
      product_id: productId,
      status: "VINCULADO",
    })
    .select("id")
    .single();

  if (error || !entry) return { ok: false, error: "Falha ao salvar leitura" };

  revalidatePath(`/empresas/${companyId}/inventario-produto`);
  return { ok: true, entryId: entry.id };
}

// ─── Save + Link — vincula barcode ao produto e salva leitura ─────────────────

const LinkAndSaveSchema = z.object({
  companyId: zId,
  sessionId: z.string(),
  code: z.string().min(1),
  quantity: z.number().int().positive(),
  productId: z.string(),
  unitsPerPackage: z.number().int().positive().optional(),
});

export async function linkAndSave(data: z.infer<typeof LinkAndSaveSchema>): Promise<SaveResult> {
  const parsed = LinkAndSaveSchema.safeParse(data);
  if (!parsed.success) return { ok: false, error: "Dados inválidos" };

  const { companyId, sessionId, code, quantity, productId, unitsPerPackage } = parsed.data;
  const codeType = detectCodeType(code);
  const supabase = createServerClient();

  const sessionError = await assertSessionOpen(companyId, sessionId);
  if (sessionError) return { ok: false, error: sessionError };

  const { data: dup } = await supabase
    .from("scan_entries")
    .select("id")
    .eq("session_id", sessionId)
    .eq("code", code)
    .maybeSingle();
  if (dup) return { ok: false, error: "Código já registrado nesta sessão" };

  await supabase
    .from("product_barcodes")
    .upsert(
      {
        company_id: companyId,
        code,
        code_type: codeType,
        product_id: productId,
        units_per_package: unitsPerPackage ?? null,
      },
      { onConflict: "company_id,code" }
    );

  const { data: entry, error } = await supabase
    .from("scan_entries")
    .insert({
      company_id: companyId,
      session_id: sessionId,
      code,
      code_type: codeType,
      quantity,
      units_per_package: unitsPerPackage ?? null,
      product_id: productId,
      status: "VINCULADO",
    })
    .select("id")
    .single();

  if (error || !entry) return { ok: false, error: "Falha ao salvar leitura" };

  revalidatePath(`/empresas/${companyId}/inventario-produto`);
  return { ok: true, entryId: entry.id };
}

// ─── Save — pendente de vínculo ───────────────────────────────────────────────

const SavePendingSchema = z.object({
  companyId: zId,
  sessionId: z.string(),
  code: z.string().min(1),
  quantity: z.number().int().positive(),
});

export async function savePendingScan(data: z.infer<typeof SavePendingSchema>): Promise<SaveResult> {
  const parsed = SavePendingSchema.safeParse(data);
  if (!parsed.success) return { ok: false, error: "Dados inválidos" };

  const { companyId, sessionId, code } = parsed.data;
  const codeType = detectCodeType(code);
  const supabase = createServerClient();

  const sessionError = await assertSessionOpen(companyId, sessionId);
  if (sessionError) return { ok: false, error: sessionError };

  // Regra: item sem cadastro → só pendência, não gera scan_entry.
  // scan_entries registram apenas contagens de produtos conhecidos.
  const { error } = await supabase
    .from("registration_pending_items")
    .insert({
      company_id: companyId,
      session_id: sessionId,
      code,
      code_type: codeType,
      origin: "INVENTORY_PENDING_SCAN",
      status: "PENDENTE",
    });

  if (error) return { ok: false, error: `Falha ao gerar pendência: ${error.message}` };

  revalidatePath(`/empresas/${companyId}/pendencias`);
  return { ok: true, entryId: "pending" };
}

// ─── Busca por texto (código interno ou descrição) ────────────────────────────

export type ProductWithBarcodes = {
  id: string;
  codigoInterno: string;
  descricao: string;
  unidadeMedida: string;
  unitsPerPackage: number | null;
  barcodes: Array<{ code: string; codeType: string }>;
};

export type TextSearchResult =
  | { status: "found"; products: ProductWithBarcodes[] }
  | { status: "not_found" }
  | { status: "error"; message: string };

export async function searchProductByText(
  companyId: string,
  term: string
): Promise<TextSearchResult> {
  const trimmed = term.trim();
  if (!trimmed) return { status: "not_found" };

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, codigo_interno, descricao, unidade_medida, product_barcodes(code, code_type, units_per_package)")
    .eq("company_id", companyId)
    .or(`codigo_interno.ilike.%${trimmed}%,descricao.ilike.%${trimmed}%`)
    .order("descricao", { ascending: true })
    .limit(10);

  if (error) return { status: "error", message: "Falha na busca" };
  if (!data || data.length === 0) return { status: "not_found" };

  return {
    status: "found",
    products: data.map((p) => {
      const bars = (
        (p.product_barcodes as Array<{ code: string; code_type: string; units_per_package: number | null }>) ?? []
      );
      return {
        id: p.id as string,
        codigoInterno: p.codigo_interno as string,
        descricao: p.descricao as string,
        unidadeMedida: p.unidade_medida as string,
        unitsPerPackage: bars[0]?.units_per_package ?? null,
        barcodes: bars.map((b) => ({ code: b.code, codeType: b.code_type })),
      };
    }),
  };
}

// ─── Save — contagem de inventário (ação única para EAN/DUN e texto) ──────────
// Não inclui identification_method no INSERT para compatibilidade com
// instâncias que ainda não aplicaram migration 001 (campo usa DEFAULT 'BARCODE').

const SaveInventoryCountSchema = z.object({
  companyId: zId,
  sessionId: z.string(),
  code: z.string().min(1),
  codeType: z.enum(["EAN", "DUN", "UNKNOWN"]),
  quantity: z.number().int().positive(),
  productId: zId,
  unitsPerPackage: z.number().int().positive().optional(),
});

export async function saveInventoryCount(
  data: z.infer<typeof SaveInventoryCountSchema>
): Promise<SaveResult> {
  const parsed = SaveInventoryCountSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false, error: `Dados inválidos: ${parsed.error.issues.map((i) => i.message).join(", ")}` };
  }

  const { companyId, sessionId, code, codeType, quantity, productId, unitsPerPackage } = parsed.data;
  const supabase = createServerClient();

  const sessionError = await assertSessionOpen(companyId, sessionId);
  if (sessionError) return { ok: false, error: sessionError };

  const { data: dup } = await supabase
    .from("scan_entries")
    .select("id")
    .eq("company_id", companyId)
    .eq("session_id", sessionId)
    .eq("code", code)
    .maybeSingle();
  if (dup) return { ok: false, error: "Este produto já foi contado neste inventário" };

  const { data: entry, error } = await supabase
    .from("scan_entries")
    .insert({
      company_id: companyId,
      session_id: sessionId,
      code,
      code_type: codeType,
      quantity,
      units_per_package: unitsPerPackage ?? null,
      product_id: productId,
      status: "VINCULADO",
    })
    .select("id")
    .single();

  if (error || !entry) {
    return { ok: false, error: `Falha ao gravar contagem${error ? `: ${error.message}` : ""}` };
  }

  revalidatePath(`/empresas/${companyId}/inventarios`);
  return { ok: true, entryId: entry.id };
}

// ─── (Legacy) saveProductScan — mantido por compatibilidade ──────────────────

const SaveProductScanSchema = z.object({
  companyId: zId,
  sessionId: z.string(),
  code: z.string().min(1),
  identificationMethod: z.enum(["CODIGO_INTERNO", "DESCRICAO"]),
  quantity: z.number().int().positive(),
  productId: z.string(),
  unitsPerPackage: z.number().int().positive().optional(),
});

export async function saveProductScan(
  data: z.infer<typeof SaveProductScanSchema>
): Promise<SaveResult> {
  const parsed = SaveProductScanSchema.safeParse(data);
  if (!parsed.success) return { ok: false, error: "Dados inválidos" };
  const { companyId, sessionId, code, quantity, productId, unitsPerPackage } = parsed.data;
  return saveInventoryCount({ companyId, sessionId, code, codeType: "UNKNOWN", quantity, productId, unitsPerPackage });
}

// ─── Entradas da sessão ───────────────────────────────────────────────────────

export async function getSessionEntries(companyId: string, sessionId: string) {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("scan_entries")
    .select(
      "id, code, code_type, status, quantity, units_per_package, created_at, products(codigo_interno, descricao)"
    )
    .eq("company_id", companyId)
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error || !data) return [];

  return data.map((e) => {
    const product = e.products as unknown as
      | { codigo_interno: string; descricao: string }
      | null;
    return {
      id: e.id as string,
      code: e.code as string,
      codeType: e.code_type as string,
      status: e.status as string,
      quantity: Number(e.quantity),
      unitsPerPackage: e.units_per_package ? Number(e.units_per_package) : null,
      scannedAt: new Date(e.created_at as string),
      product: product
        ? { codigoInterno: product.codigo_interno, descricao: product.descricao }
        : null,
    };
  });
}
