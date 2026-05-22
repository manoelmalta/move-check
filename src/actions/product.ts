"use server";

import { createServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// Zod v4: permissive UUID regex (accepts non-standard IDs like Empresa Padrão)
const zId = z.string().regex(
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  "ID inválido"
);

// ─── Types ────────────────────────────────────────────────────────────────────

export type Barcode = {
  code: string;
  codeType: string;
  unitsPerPackage: number | null;
};

export type CatalogProduct = {
  id: string;
  codigoInterno: string;
  descricao: string;
  unidadeMedida: string;
  observacao: string | null;
  hasFixedPicking: boolean;
  fixedPickingAddress: string | null;
  hasFixedAddress: boolean;
  fixedAddress: string | null;
  barcodes: Barcode[];
};

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

// ─── Schemas ──────────────────────────────────────────────────────────────────

const CreateProductSchema = z.object({
  codigoInterno: z.string().min(1, "Código interno obrigatório"),
  descricao: z.string().min(1, "Descrição obrigatória"),
  unidadeMedida: z.string().default("UN"),
  observacao: z.string().nullish(),
  hasFixedPicking: z.boolean().default(false),
  fixedPickingAddress: z.string().nullish(),
  hasFixedAddress: z.boolean().default(false),
  fixedAddress: z.string().nullish(),
});

const UpdateProductSchema = z.object({
  descricao: z.string().min(1, "Descrição obrigatória"),
  unidadeMedida: z.string().default("UN"),
  observacao: z.string().nullish(),
  hasFixedPicking: z.boolean().default(false),
  fixedPickingAddress: z.string().nullish(),
  hasFixedAddress: z.boolean().default(false),
  fixedAddress: z.string().nullish(),
});

const AddBarcodeSchema = z.object({
  code: z.string().min(1, "Código obrigatório").transform((v) => v.trim()),
  codeType: z.enum(["EAN", "DUN", "UNKNOWN"]),
  unitsPerPackage: z.number().int().positive().nullish(),
});

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getProductsForCatalog(
  companyId: string
): Promise<CatalogProduct[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("products")
    .select(`id, codigo_interno, descricao, unidade_medida, observacao,
      has_fixed_picking, fixed_picking_address, has_fixed_address, fixed_address,
      product_barcodes(code, code_type, units_per_package)`)
    .eq("company_id", companyId)
    .order("descricao", { ascending: true })
    .limit(500);

  if (error || !data) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]).map((p) => {
    const bars: Array<{ code: string; code_type: string; units_per_package: number | null }> =
      p.product_barcodes ?? [];
    return {
      id: p.id as string,
      codigoInterno: p.codigo_interno as string,
      descricao: p.descricao as string,
      unidadeMedida: (p.unidade_medida as string) ?? "UN",
      observacao: (p.observacao as string | null) ?? null,
      hasFixedPicking: Boolean(p.has_fixed_picking),
      fixedPickingAddress: (p.fixed_picking_address as string | null) ?? null,
      hasFixedAddress: Boolean(p.has_fixed_address),
      fixedAddress: (p.fixed_address as string | null) ?? null,
      barcodes: bars.map((b) => ({
        code: b.code,
        codeType: b.code_type,
        unitsPerPackage: b.units_per_package,
      })),
    };
  });
}

// Legacy — kept for import page and product-search components
export async function getProducts(companyId: string, query?: string) {
  const supabase = createServerClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = supabase
    .from("products")
    .select(`id, codigo_interno, descricao, unidade_medida, observacao,
      product_barcodes(code, code_type, units_per_package)`)
    .eq("company_id", companyId)
    .order("descricao", { ascending: true });

  if (query?.trim()) {
    q = q.or(
      `codigo_interno.ilike.%${query.trim()}%,descricao.ilike.%${query.trim()}%`
    );
  }

  const { data, error } = await q;
  if (error || !data) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]).map((p) => ({
    id: p.id as string,
    codigoInterno: p.codigo_interno as string,
    descricao: p.descricao as string,
    unidadeMedida: p.unidade_medida as string,
    observacao: (p.observacao as string | null) ?? null,
    barcodes: (
      (p.product_barcodes as {
        code: string; code_type: string; units_per_package: number | null;
      }[]) ?? []
    ).map((b) => ({
      code: b.code,
      codeType: b.code_type,
      unitsPerPackage: b.units_per_package,
    })),
  }));
}

export async function searchProducts(
  companyId: string,
  query: string
): Promise<ProductResult[]> {
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

// ─── Write — Create ───────────────────────────────────────────────────────────

export async function createProduct(
  companyId: string,
  data: unknown
): Promise<{ ok: true; product: CatalogProduct } | { ok: false; error: string }> {
  const parsed = CreateProductSchema.safeParse(data);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join(", ");
    return { ok: false, error: `Dados inválidos: ${msg}` };
  }

  const {
    codigoInterno, descricao, unidadeMedida, observacao,
    hasFixedPicking, fixedPickingAddress, hasFixedAddress, fixedAddress,
  } = parsed.data;

  const supabase = createServerClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: product, error } = await (supabase
    .from("products")
    .insert({
      company_id: companyId,
      codigo_interno: codigoInterno,
      descricao,
      unidade_medida: unidadeMedida,
      observacao: observacao ?? null,
      has_fixed_picking: hasFixedPicking,
      fixed_picking_address: hasFixedPicking ? (fixedPickingAddress ?? null) : null,
      has_fixed_address: hasFixedAddress,
      fixed_address: hasFixedAddress ? (fixedAddress ?? null) : null,
    })
    .select(`id, codigo_interno, descricao, unidade_medida, observacao,
      has_fixed_picking, fixed_picking_address, has_fixed_address, fixed_address`)
    .single() as unknown as Promise<{ data: Record<string, unknown> | null; error: { code: string; message: string } | null }>);

  if (error) {
    const isDuplicate =
      error.code === "23505" || error.message?.toLowerCase().includes("unique");
    return {
      ok: false,
      error: isDuplicate
        ? "Código interno já existe nesta empresa"
        : `Erro ao criar produto: ${error.message}`,
    };
  }

  if (!product) return { ok: false, error: "Erro ao criar produto" };

  revalidatePath(`/empresas/${companyId}/produtos`);
  return {
    ok: true,
    product: {
      id: product.id as string,
      codigoInterno: product.codigo_interno as string,
      descricao: product.descricao as string,
      unidadeMedida: (product.unidade_medida as string) ?? "UN",
      observacao: (product.observacao as string | null) ?? null,
      hasFixedPicking: Boolean(product.has_fixed_picking),
      fixedPickingAddress: (product.fixed_picking_address as string | null) ?? null,
      hasFixedAddress: Boolean(product.has_fixed_address),
      fixedAddress: (product.fixed_address as string | null) ?? null,
      barcodes: [],
    },
  };
}

// ─── Write — Update ───────────────────────────────────────────────────────────

export async function updateProduct(
  companyId: string,
  productId: string,
  data: unknown
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = UpdateProductSchema.safeParse(data);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join(", ");
    return { ok: false, error: `Dados inválidos: ${msg}` };
  }

  const {
    descricao, unidadeMedida, observacao,
    hasFixedPicking, fixedPickingAddress, hasFixedAddress, fixedAddress,
  } = parsed.data;

  const supabase = createServerClient();

  // Ownership check
  const { data: existing } = await supabase
    .from("products")
    .select("id")
    .eq("company_id", companyId)
    .eq("id", productId)
    .maybeSingle();

  if (!existing) return { ok: false, error: "Produto não encontrado nesta empresa" };

  const { error } = await supabase
    .from("products")
    .update({
      descricao,
      unidade_medida: unidadeMedida,
      observacao: observacao ?? null,
      has_fixed_picking: hasFixedPicking,
      fixed_picking_address: hasFixedPicking ? (fixedPickingAddress ?? null) : null,
      has_fixed_address: hasFixedAddress,
      fixed_address: hasFixedAddress ? (fixedAddress ?? null) : null,
    })
    .eq("company_id", companyId)
    .eq("id", productId);

  if (error) return { ok: false, error: `Erro ao atualizar cadastro: ${error.message}` };

  revalidatePath(`/empresas/${companyId}/produtos`);
  return { ok: true };
}

// ─── Write — Barcode ──────────────────────────────────────────────────────────

export async function addBarcode(
  companyId: string,
  productId: string,
  data: unknown
): Promise<
  | { ok: true; code: string; codeType: string; unitsPerPackage: number | null }
  | { ok: false; error: string }
> {
  const parsed = AddBarcodeSchema.safeParse(data);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join(", ");
    return { ok: false, error: `Dados inválidos: ${msg}` };
  }

  const { code, codeType, unitsPerPackage } = parsed.data;
  const supabase = createServerClient();

  // Product ownership check
  const { data: product } = await supabase
    .from("products")
    .select("id")
    .eq("company_id", companyId)
    .eq("id", productId)
    .maybeSingle();

  if (!product) return { ok: false, error: "Produto não encontrado nesta empresa" };

  // Duplicate check within company
  const { data: dup } = await supabase
    .from("product_barcodes")
    .select("id, product_id")
    .eq("company_id", companyId)
    .eq("code", code)
    .maybeSingle();

  if (dup) {
    if ((dup.product_id as string) === productId) {
      return { ok: false, error: "Este código já está vinculado a este produto" };
    }
    return {
      ok: false,
      error: "Este código já está vinculado a outro produto desta empresa",
    };
  }

  const { error } = await supabase.from("product_barcodes").insert({
    company_id: companyId,
    product_id: productId,
    code,
    code_type: codeType,
    units_per_package: unitsPerPackage ?? null,
  });

  if (error) return { ok: false, error: `Erro ao vincular código: ${error.message}` };

  revalidatePath(`/empresas/${companyId}/produtos`);
  return { ok: true, code, codeType, unitsPerPackage: unitsPerPackage ?? null };
}

// ─── Write — Remove barcode ───────────────────────────────────────────────────

export async function removeBarcode(
  companyId: string,
  productId: string,
  code: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createServerClient();

  const { error } = await supabase
    .from("product_barcodes")
    .delete()
    .eq("company_id", companyId)
    .eq("product_id", productId)
    .eq("code", code);

  if (error) return { ok: false, error: `Erro ao remover código: ${error.message}` };

  revalidatePath(`/empresas/${companyId}/produtos`);
  return { ok: true };
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

  const existingSet = new Set(
    (existing ?? []).map((p) => p.codigo_interno as string)
  );
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

  const existingSet = new Set(
    (existing ?? []).map((p) => p.codigo_interno as string)
  );

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
