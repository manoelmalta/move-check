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
  createdAt: Date;
  closedAt: Date | null;
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
  created_at: string;
  closed_at: string | null;
}): Session {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    operationType: (row.operation_type as OperationType) ?? "PRODUCT_INVENTORY",
    createdAt: new Date(row.created_at),
    closedAt: row.closed_at ? new Date(row.closed_at) : null,
  };
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getMostRecentOpenSession(): Promise<Session | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("scan_sessions")
    .select("id, name, status, operation_type, created_at, closed_at")
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return mapSession(data);
}

export async function getSessionById(id: string): Promise<Session | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("scan_sessions")
    .select("id, name, status, operation_type, created_at, closed_at")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return mapSession(data);
}

export async function getSessions(): Promise<SessionSummary[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("scan_sessions")
    .select(
      "id, name, status, operation_type, created_at, closed_at, scan_entries(status), product_registration_logs(action)"
    )
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
  operationType: OperationType
): Promise<Session | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("scan_sessions")
    .select("id, name, status, operation_type, created_at, closed_at")
    .eq("status", "open")
    .eq("operation_type", operationType)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return mapSession(data);
}

export async function getOpenSessions(): Promise<{ id: string; name: string }[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("scan_sessions")
    .select("id, name")
    .eq("status", "open")
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data;
}

// ─── Write ────────────────────────────────────────────────────────────────────

export async function createSession(
  name?: string,
  operationType: OperationType = "PRODUCT_INVENTORY"
): Promise<Session> {
  const supabase = createServerClient();
  const now = new Date();
  const autoName = `${operationType === "PRODUCT_REGISTRATION" ? "Cadastro" : "Coleta"} ${now.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })} ${now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;

  const { data, error } = await supabase
    .from("scan_sessions")
    .insert({
      name: name?.trim() || autoName,
      status: "open",
      operation_type: operationType,
    })
    .select("id, name, status, operation_type, created_at, closed_at")
    .single();

  if (error || !data) throw new Error("Falha ao criar sessão");

  revalidatePath("/sessoes");
  revalidatePath("/coletar");
  revalidatePath("/");
  return mapSession(data);
}

export async function closeSession(sessionId: string): Promise<void> {
  const supabase = createServerClient();
  await supabase
    .from("scan_sessions")
    .update({ status: "closed", closed_at: new Date().toISOString() })
    .eq("id", sessionId);

  revalidatePath("/sessoes");
  revalidatePath("/coletar");
  revalidatePath("/");
}

export async function reopenSession(sessionId: string): Promise<void> {
  const supabase = createServerClient();
  await supabase
    .from("scan_sessions")
    .update({ status: "open", closed_at: null })
    .eq("id", sessionId);

  revalidatePath("/sessoes");
  revalidatePath("/coletar");
  revalidatePath("/");
}
