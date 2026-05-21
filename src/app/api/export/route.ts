import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId");
  const companyId = req.nextUrl.searchParams.get("companyId");
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }
  if (!companyId) {
    return NextResponse.json({ error: "companyId required" }, { status: 400 });
  }

  const supabase = createServerClient();

  const { data: session } = await supabase
    .from("scan_sessions")
    .select("name, operation_type")
    .eq("company_id", companyId)
    .eq("id", sessionId)
    .maybeSingle();

  if (!session) {
    return NextResponse.json({ error: "Sessão não encontrada nesta empresa" }, { status: 404 });
  }

  const sessionName = (session?.name as string | undefined) ?? sessionId;
  const operationType = (session?.operation_type as string | undefined) ?? "PRODUCT_INVENTORY";
  const safeName = sessionName.replace(/[^a-z0-9]/gi, "-");

  // ─── Cadastro de Produto ──────────────────────────────────────────────────

  if (operationType === "PRODUCT_REGISTRATION") {
    const { data: logs } = await supabase
      .from("product_registration_logs")
      .select(
        "code, code_type, action, created_at, products(codigo_interno, descricao), product_barcodes(units_per_package)"
      )
      .eq("company_id", companyId)
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    const header =
      "sessao,data_hora,codigo_interno,descricao,code,code_type,units_per_package,action";

    const rows = (logs ?? []).map((l) => {
      const product = l.products as unknown as
        | { codigo_interno: string; descricao: string }
        | null;
      const barcode = l.product_barcodes as unknown as
        | { units_per_package: number | null }
        | null;
      const dt = new Date(l.created_at as string).toLocaleString("pt-BR");
      return [
        `"${sessionName.replace(/"/g, '""')}"`,
        `"${dt}"`,
        `"${product?.codigo_interno ?? ""}"`,
        `"${(product?.descricao ?? "").replace(/"/g, '""')}"`,
        `"${l.code}"`,
        l.code_type,
        barcode?.units_per_package ?? "",
        l.action,
      ].join(",");
    });

    const csv = "﻿" + [header, ...rows].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="move-check-cadastro-${safeName}.csv"`,
      },
    });
  }

  // ─── Inventário por Produto (comportamento existente) ─────────────────────

  const { data: entries } = await supabase
    .from("scan_entries")
    .select(
      "code, code_type, quantity, units_per_package, status, created_at, products(codigo_interno, descricao)"
    )
    .eq("company_id", companyId)
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  const header =
    "sessao,data_hora,codigo_lido,tipo_codigo,codigo_interno,descricao,quantidade,units_per_package,status";

  const rows = (entries ?? []).map((e) => {
    const product = e.products as unknown as
      | { codigo_interno: string; descricao: string }
      | null;
    const dt = new Date(e.created_at as string).toLocaleString("pt-BR");
    return [
      `"${sessionName.replace(/"/g, '""')}"`,
      `"${dt}"`,
      `"${e.code}"`,
      e.code_type,
      `"${product?.codigo_interno ?? ""}"`,
      `"${(product?.descricao ?? "").replace(/"/g, '""')}"`,
      e.quantity,
      (e.units_per_package as number | null) ?? "",
      e.status,
    ].join(",");
  });

  const csv = "﻿" + [header, ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="move-check-${safeName}.csv"`,
    },
  });
}
