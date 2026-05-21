"use server";

import { createServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// ─── Types ────────────────────────────────────────────────────────────────────

const ProductSchema = z.object({
  codigoInterno: z.string().min(1),
  descricao: z.string().min(1),
  unidadeMedida: z.string().default("UN"),
  observacao: z.string().optional(),
});

export type ProductResult = {
  id: string;
  codigoInterno: string;
  descricao: string;
  unidadeMedida: string;
  observacao: string | null;
};

export type ImportRow = {
  codigoInterno: string;
  descricao: string;
  unidadeMedida?: string;
  observacao?: string;
};

export type ImportPreview = {
  newRows: ImportRow[];
  updateRows: ImportRow[];
  errorRows: { line: number; codigoInterno?: string; reason: string }[];
};

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getProducts(companyId: string, query?: string) {
  const supabase = createServerClient();

  let q = supabase
    .from("products")
    .select(
      "id, codigo_interno, descricao, unidade_medida, observacao, product_barcodes(code, code_type, units_per_package)"
    )
    .eq("company_id", companyId)
    .order("descricao", { ascending: true });

  if (query?.trim()) {
    q = q.or(
      `codigo_interno.ilike.%${query.trim()}%,descricao.ilike.%${query.trim()}%`
    );
  }

  const { data, error } = await q;
  if (error || !data) return [];

  return data.map((p) => ({
    id: p.id as string,
    codigoInterno: p.codigo_interno as string,
    descricao: p.descricao as string,
    unidadeMedida: p.unidade_medida as string,
    observacao: (p.observacao as string | null) ?? null,
    barcodes: ((p.product_barcodes as { code: string; code_type: string; units_per_package: number | null }[]) ?? []).map((b) => ({
      code: b.code,
      codeType: b.code_type,
      unitsPerPackage: b.units_per_package,
    })),
  }));
}

export async function searchProducts(companyId: string, query: string): Promise<ProductResult[]> {
  if (!query.trim()) return [];
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("products")
    .select("id, codigo_interno, descricao, unidade_medida, observacao")
    .eq("company_id", companyId)
    .or(
      `codigo_interno.ilike.%${query.trim()}%,descricao.ilike.%${query.trim()}%`
    )
    .order("descricao", { ascending: true })
    .limit(8);

  if (error || !data) return [];

  return data.map((p) => ({
    id: p.id as string,
    codigoInterno: p.codigo_interno as string,
    descricao: p.descricao as string,
    unidadeMedida: p.unidade_medida as string,
    observacao: (p.observacao as string | null) ?? null,
  }));
}

// ─── Write ────────────────────────────────────────────────────────────────────

export async function createProduct(companyId: string, data: unknown) {
  const parsed = ProductSchema.safeParse(data);
  if (!parsed.success) return { ok: false as const, error: "Dados inválidos" };

  const supabase = createServerClient();
  const { data: product, error } = await supabase
    .from("products")
    .insert({
      company_id: companyId,
      codigo_interno: parsed.data.codigoInterno,
      descricao: parsed.data.descricao,
      unidade_medida: parsed.data.unidadeMedida,
      observacao: parsed.data.observacao ?? null,
    })
    .select("id, codigo_interno, descricao, unidade_medida, observacao")
    .single();

  if (error) {
    const isDuplicate =
      error.code === "23505" || error.message?.toLowerCase().includes("unique");
    return {
      ok: false as const,
      error: isDuplicate ? "Código interno já existe nesta empresa" : "Erro ao criar produto",
    };
  }

  revalidatePath(`/empresas/${companyId}/produtos`);
  return {
    ok: true as const,
    product: {
      id: product.id as string,
      codigoInterno: product.codigo_interno as string,
      descricao: product.descricao as string,
      unidadeMedida: product.unidade_medida as string,
      observacao: (product.observacao as string | null) ?? null,
    },
  };
}

// ─── Import ───────────────────────────────────────────────────────────────────

export async function previewImport(
  companyId: string,
  rows: ImportRow[]
): Promise<ImportPreview> {
  const errorRows: ImportPreview["errorRows"] = [];
  const validRows: (ImportRow & { line: number })[] = [];
  const seenCodes = new Set<string>();

  rows.forEach((row, i) => {
    const line = i + 2;
    if (!row.codigoInterno?.trim()) {
      errorRows.push({ line, reason: "codigo_interno ausente" });
      return;
    }
    if (!row.descricao?.trim()) {
      errorRows.push({ line, codigoInterno: row.codigoInterno, reason: "descricao ausente" });
      return;
    }
    if (seenCodes.has(row.codigoInterno.trim())) {
      errorRows.push({ line, codigoInterno: row.codigoInterno, reason: "codigo_interno duplicado no arquivo" });
      return;
    }
    seenCodes.add(row.codigoInterno.trim());
    validRows.push({ ...row, line });
  });

  const supabase = createServerClient();
  const codes = validRows.map((r) => r.codigoInterno.trim());
  const { data: existing } = await supabase
    .from("products")
    .select("codigo_interno")
    .eq("company_id", companyId)
    .in("codigo_interno", codes);

  const existingSet = new Set((existing ?? []).map((p) => p.codigo_interno as string));
  const newRows: ImportRow[] = [];
  const updateRows: ImportRow[] = [];

  for (const row of validRows) {
    const clean: ImportRow = {
      codigoInterno: row.codigoInterno.trim(),
      descricao: row.descricao.trim(),
      unidadeMedida: row.unidadeMedida?.trim() || "UN",
      observacao: row.observacao?.trim() || undefined,
    };
    if (existingSet.has(clean.codigoInterno)) {
      updateRows.push(clean);
    } else {
      newRows.push(clean);
    }
  }

  return { newRows, updateRows, errorRows };
}

export async function executeImport(
  companyId: string,
  rows: ImportRow[]
): Promise<{ created: number; updated: number }> {
  if (rows.length === 0) return { created: 0, updated: 0 };

  const supabase = createServerClient();
  const codes = rows.map((r) => r.codigoInterno);

  const { data: existing } = await supabase
    .from("products")
    .select("codigo_interno")
    .eq("company_id", companyId)
    .in("codigo_interno", codes);

  const existingSet = new Set((existing ?? []).map((p) => p.codigo_interno as string));

  const { error } = await supabase.from("products").upsert(
    rows.map((row) => ({
      company_id: companyId,
      codigo_interno: row.codigoInterno,
      descricao: row.descricao,
      unidade_medida: row.unidadeMedida || "UN",
      observacao: row.observacao || null,
    })),
    { onConflict: "company_id,codigo_interno" }
  );

  if (error) throw new Error("Falha ao importar produtos");

  const created = rows.filter((r) => !existingSet.has(r.codigoInterno)).length;
  const updated = rows.filter((r) => existingSet.has(r.codigoInterno)).length;

  revalidatePath(`/empresas/${companyId}/produtos`);
  return { created, updated };
}
