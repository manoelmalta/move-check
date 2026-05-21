"use server";

import { createServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ─── Types ────────────────────────────────────────────────────────────────────

export type OperationType = "PRODUCT_INVENTORY" | "PRODUCT_REGISTRATION";

export type Session = {
  id: string;
  name: string;
  status: string;
  operationType: OperationType;
  companyId: string;
  createdAt: Date;
  closedAt: Date | null;
  comment: string | null;
};

export type SessionSummary = Session & {
  // PRODUCT_INVENTORY
  totalEntries: number;
  vinculadoCount: number;
  pendenteCount: number;
  // PRODUCT_REGISTRATION
  totalLogs: number;
  linkedCount: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapSession(row: {
  id: string;
  name: string;
  status: string;
  operation_type: string;
  company_id: string;
  created_at: string;
  closed_at: string | null;
  comment?: string | null;
}): Session {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    operationType: (row.operation_type as OperationType) ?? "PRODUCT_INVENTORY",
    companyId: row.company_id,
    createdAt: new Date(row.created_at),
    closedAt: row.closed_at ? new Date(row.closed_at) : null,
    comment: row.comment ?? null,
  };
}

const SESSION_SELECT = "id, name, status, operation_type, company_id, created_at, closed_at, comment";

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getMostRecentOpenSession(companyId: string): Promise<Session | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("scan_sessions")
    .select(SESSION_SELECT)
    .eq("company_id", companyId)
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return mapSession(data);
}

export async function getSessionById(companyId: string, id: string): Promise<Session | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("scan_sessions")
    .select(SESSION_SELECT)
    .eq("company_id", companyId)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return mapSession(data);
}

export async function getSessions(companyId: string): Promise<SessionSummary[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("scan_sessions")
    .select(
      `${SESSION_SELECT}, scan_entries(status), product_registration_logs(action)`
    )
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((s) => {
    const entries = (s.scan_entries as { status: string }[]) ?? [];
    const logs = (s.product_registration_logs as { action: string }[]) ?? [];
    return {
      ...mapSession(s),
      totalEntries: entries.length,
      vinculadoCount: entries.filter((e) => e.status === "VINCULADO").length,
      pendenteCount: entries.filter((e) => e.status === "PENDENTE_DE_VINCULO").length,
      totalLogs: logs.length,
      linkedCount: logs.filter((l) => l.action === "BARCODE_LINKED").length,
    };
  });
}

export async function getMostRecentOpenSessionByType(
  companyId: string,
  operationType: OperationType
): Promise<Session | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("scan_sessions")
    .select(SESSION_SELECT)
    .eq("company_id", companyId)
    .eq("status", "open")
    .eq("operation_type", operationType)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return mapSession(data);
}

export async function getOpenSessions(companyId: string): Promise<{ id: string; name: string }[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("scan_sessions")
    .select("id, name")
    .eq("company_id", companyId)
    .eq("status", "open")
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data;
}

// ─── Write ────────────────────────────────────────────────────────────────────

export async function createSession(
  companyId: string,
  name?: string,
  operationType: OperationType = "PRODUCT_INVENTORY",
  comment?: string
): Promise<Session> {
  const supabase = createServerClient();
  const now = new Date();
  const autoName = `${operationType === "PRODUCT_REGISTRATION" ? "Cadastro" : "Inventário"} ${now.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })} ${now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;

  const { data, error } = await supabase
    .from("scan_sessions")
    .insert({
      company_id: companyId,
      name: name?.trim() || autoName,
      status: "open",
      operation_type: operationType,
      comment: comment?.trim() || null,
    })
    .select(SESSION_SELECT)
    .single();

  if (error || !data) throw new Error("Falha ao criar sessão");

  revalidatePath(`/empresas/${companyId}/inventarios`);
  return mapSession(data);
}

export async function closeSession(companyId: string, sessionId: string): Promise<void> {
  const supabase = createServerClient();
  await supabase
    .from("scan_sessions")
    .update({ status: "closed", closed_at: new Date().toISOString() })
    .eq("company_id", companyId)
    .eq("id", sessionId);

  revalidatePath(`/empresas/${companyId}/inventarios`);
}

export async function reopenSession(companyId: string, sessionId: string): Promise<void> {
  const supabase = createServerClient();
  await supabase
    .from("scan_sessions")
    .update({ status: "open", closed_at: null })
    .eq("company_id", companyId)
    .eq("id", sessionId);

  revalidatePath(`/empresas/${companyId}/inventarios`);
}
