"use server";

import { createServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Company = {
  id: string;
  name: string;
  document: string | null;
  notes: string | null;
  createdAt: Date;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapCompany(row: {
  id: string;
  name: string;
  document: string | null;
  notes: string | null;
  created_at: string;
}): Company {
  return {
    id: row.id,
    name: row.name,
    document: row.document,
    notes: row.notes,
    createdAt: new Date(row.created_at),
  };
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getCompanies(): Promise<Company[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("companies")
    .select("id, name, document, notes, created_at")
    .order("name", { ascending: true });

  if (error || !data) return [];
  return data.map(mapCompany);
}

export async function getCompanyById(id: string): Promise<Company | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("companies")
    .select("id, name, document, notes, created_at")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return mapCompany(data);
}

// ─── Write ────────────────────────────────────────────────────────────────────

const CreateCompanySchema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  document: z.string().optional(),
  notes: z.string().optional(),
});

export async function createCompany(
  data: z.infer<typeof CreateCompanySchema>
): Promise<{ ok: true; company: Company } | { ok: false; error: string }> {
  const parsed = CreateCompanySchema.safeParse(data);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const supabase = createServerClient();
  const { data: company, error } = await supabase
    .from("companies")
    .insert({
      name: parsed.data.name.trim(),
      document: parsed.data.document?.trim() || null,
      notes: parsed.data.notes?.trim() || null,
    })
    .select("id, name, document, notes, created_at")
    .single();

  if (error || !company) return { ok: false, error: "Falha ao criar empresa" };

  revalidatePath("/empresas");
  return { ok: true, company: mapCompany(company) };
}
