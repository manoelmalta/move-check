"use server";

import { createServerClient } from "@/lib/supabase/server";
import { detectCodeType } from "@/lib/barcode";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// ─── Types ────────────────────────────────────────────────────────────────────

export type RegSaveResult = { ok: true; logId: string } | { ok: false; error: string };

export type RegLogEntry = {
  id: string;
  code: string;
  codeType: string;
  action: "BARCODE_LINKED" | "BARCODE_ALREADY_EXISTS";
  createdAt: Date;
  product: { codigoInterno: string; descricao: string } | null;
  unitsPerPackage: number | null;
};

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
  if (data.status !== "open") return "Sessão fechada — reabra para continuar";
  return null;
}

// ─── Link barcode to product (Cadastro de Produto) ────────────────────────────

const LinkBarcodeSchema = z.object({
  companyId: z.string().uuid(),
  sessionId: z.string(),
  code: z.string().min(1),
  productId: z.string(),
  unitsPerPackage: z.number().int().positive().optional(),
});

export async function linkBarcodeOnly(
  data: z.infer<typeof LinkBarcodeSchema>
): Promise<RegSaveResult> {
  const parsed = LinkBarcodeSchema.safeParse(data);
  if (!parsed.success) return { ok: false, error: "Dados inválidos" };

  const { companyId, sessionId, code, productId, unitsPerPackage } = parsed.data;
  const codeType = detectCodeType(code);
  const supabase = createServerClient();

  const sessionError = await assertSessionOpen(companyId, sessionId);
  if (sessionError) return { ok: false, error: sessionError };

  const { data: barcode, error: barcodeError } = await supabase
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
    )
    .select("id")
    .single();

  if (barcodeError || !barcode) return { ok: false, error: "Falha ao vincular código" };

  const { data: log, error: logError } = await supabase
    .from("product_registration_logs")
    .insert({
      company_id: companyId,
      session_id: sessionId,
      product_id: productId,
      barcode_id: barcode.id,
      code,
      code_type: codeType,
      action: "BARCODE_LINKED",
    })
    .select("id")
    .single();

  if (logError || !log) return { ok: false, error: "Falha ao registrar ação" };

  revalidatePath(`/empresas/${companyId}/cadastro-produto`);
  revalidatePath(`/empresas/${companyId}/produtos`);
  return { ok: true, logId: log.id as string };
}

// ─── Log barcode already linked ───────────────────────────────────────────────

const LogAlreadyLinkedSchema = z.object({
  companyId: z.string().uuid(),
  sessionId: z.string(),
  code: z.string().min(1),
  productId: z.string(),
  barcodeId: z.string(),
});

export async function logAlreadyLinked(
  data: z.infer<typeof LogAlreadyLinkedSchema>
): Promise<RegSaveResult> {
  const parsed = LogAlreadyLinkedSchema.safeParse(data);
  if (!parsed.success) return { ok: false, error: "Dados inválidos" };

  const { companyId, sessionId, code, productId, barcodeId } = parsed.data;
  const codeType = detectCodeType(code);
  const supabase = createServerClient();

  const sessionError = await assertSessionOpen(companyId, sessionId);
  if (sessionError) return { ok: false, error: sessionError };

  const { data: log, error } = await supabase
    .from("product_registration_logs")
    .insert({
      company_id: companyId,
      session_id: sessionId,
      product_id: productId,
      barcode_id: barcodeId,
      code,
      code_type: codeType,
      action: "BARCODE_ALREADY_EXISTS",
    })
    .select("id")
    .single();

  if (error || !log) return { ok: false, error: "Falha ao registrar" };

  return { ok: true, logId: log.id as string };
}

// ─── Get registration logs for session ───────────────────────────────────────

export async function getRegistrationLogs(companyId: string, sessionId: string): Promise<RegLogEntry[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("product_registration_logs")
    .select(
      "id, code, code_type, action, created_at, products(codigo_interno, descricao), product_barcodes(units_per_package)"
    )
    .eq("company_id", companyId)
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error || !data) return [];

  return data.map((l) => {
    const product = l.products as unknown as
      | { codigo_interno: string; descricao: string }
      | null;
    const barcode = l.product_barcodes as unknown as
      | { units_per_package: number | null }
      | null;
    return {
      id: l.id as string,
      code: l.code as string,
      codeType: l.code_type as string,
      action: l.action as "BARCODE_LINKED" | "BARCODE_ALREADY_EXISTS",
      createdAt: new Date(l.created_at as string),
      product: product
        ? { codigoInterno: product.codigo_interno, descricao: product.descricao }
        : null,
      unitsPerPackage: barcode?.units_per_package ?? null,
    };
  });
}
