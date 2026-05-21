import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  const supabase = createServerClient();

  const { data: session } = await supabase
    .from("scan_sessions")
    .select("name")
    .eq("id", sessionId)
    .maybeSingle();

  const { data: entries } = await supabase
    .from("scan_entries")
    .select("code, code_type, quantity, units_per_package, status, created_at, products(codigo_interno, descricao)")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  const sessionName = (session?.name as string | undefined) ?? sessionId;

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
      `"${product?.descricao ?? ""}"`,
      e.quantity,
      (e.units_per_package as number | null) ?? "",
      e.status,
    ].join(",");
  });

  const csv = "﻿" + [header, ...rows].join("\n"); // BOM for Excel UTF-8

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="move-check-${sessionName.replace(/[^a-z0-9]/gi, "-")}.csv"`,
    },
  });
}
