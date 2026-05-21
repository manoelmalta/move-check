"use server";

import { createServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PendingStatus = "PENDENTE" | "RESOLVIDO" | "DESCARTADO";

export type PendingItem = {
  id: string;
  companyId: string;
  sessionId: string | null;
  sessionName: string | null;
  code: string | null;
  codeType: string | null;
  description: string | null;
  origin: string;
  status: PendingStatus;
  createdAt: Date;
  resolvedAt: Date | null;
};

function mapPending(row: {
  id: string;
  company_id: string;
  session_id: string | null;
  code: string | null;
  code_type: string | null;
  description: string | null;
  origin: string;
  status: string;
  created_at: string;
  resolved_at: string | null;
  scan_sessions?: { name: string | null } | null;
}): PendingItem {
  return {
    id: row.id,
    companyId: row.company_id,
    sessionId: row.session_id,
    sessionName: row.scan_sessions?.name ?? null,
    code: row.code,
    codeType: row.code_type,
    description: row.description,
    origin: row.origin,
    status: row.status as PendingStatus,
    createdAt: new Date(row.created_at),
    resolvedAt: row.resolved_at ? new Date(row.resolved_at) : null,
  };
}

const PENDING_SELECT =
  "id, company_id, session_id, code, code_type, description, origin, status, created_at, resolved_at, scan_sessions(name)";

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function listPendingItems(companyId: string, status?: PendingStatus): Promise<PendingItem[]> {
  const supabase = createServerClient();
  let q = supabase
    .from("registration_pending_items")
    .select(PENDING_SELECT)
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (status) q = q.eq("status", status);

  const { data, error } = await q;
  if (error || !data) return [];
  return (data as unknown as Parameters<typeof mapPending>[0][]).map(mapPending);
}

// ─── Write ────────────────────────────────────────────────────────────────────

export async function resolvePendingItem(companyId: string, id: string): Promise<void> {
  const supabase = createServerClient();
  await supabase
    .from("registration_pending_items")
    .update({ status: "RESOLVIDO", resolved_at: new Date().toISOString() })
    .eq("company_id", companyId)
    .eq("id", id);

  revalidatePath(`/empresas/${companyId}/pendencias`);
}

export async function dismissPendingItem(companyId: string, id: string): Promise<void> {
  const supabase = createServerClient();
  await supabase
    .from("registration_pending_items")
    .update({ status: "DESCARTADO", resolved_at: new Date().toISOString() })
    .eq("company_id", companyId)
    .eq("id", id);

  revalidatePath(`/empresas/${companyId}/pendencias`);
}
