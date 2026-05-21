"use server";

import { createServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Address = {
  id: string;
  companyId: string;
  code: string;
  description: string | null;
  area: string | null;
  street: string | null;
  level: string | null;
  position: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

function mapAddress(row: {
  id: string;
  company_id: string;
  code: string;
  description: string | null;
  area: string | null;
  street: string | null;
  level: string | null;
  position: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}): Address {
  return {
    id: row.id,
    companyId: row.company_id,
    code: row.code,
    description: row.description,
    area: row.area,
    street: row.street,
    level: row.level,
    position: row.position,
    notes: row.notes,
    isActive: row.is_active,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

const ADDRESS_SELECT =
  "id, company_id, code, description, area, street, level, position, notes, is_active, created_at, updated_at";

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function listAddresses(companyId: string, query?: string): Promise<Address[]> {
  const supabase = createServerClient();
  let q = supabase
    .from("addresses")
    .select(ADDRESS_SELECT)
    .eq("company_id", companyId)
    .order("code", { ascending: true });

  if (query?.trim()) {
    q = q.or(`code.ilike.%${query.trim()}%,description.ilike.%${query.trim()}%`);
  }

  const { data, error } = await q;
  if (error || !data) return [];
  return data.map(mapAddress);
}

export async function getAddress(companyId: string, id: string): Promise<Address | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("addresses")
    .select(ADDRESS_SELECT)
    .eq("company_id", companyId)
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return mapAddress(data);
}

// ─── Write ────────────────────────────────────────────────────────────────────

const AddressInputSchema = z.object({
  code: z.string().min(1, "Código obrigatório"),
  description: z.string().optional(),
  area: z.string().optional(),
  street: z.string().optional(),
  level: z.string().optional(),
  position: z.string().optional(),
  notes: z.string().optional(),
});

type AddressInput = z.infer<typeof AddressInputSchema>;

export async function createAddress(
  companyId: string,
  data: AddressInput
): Promise<{ ok: true; address: Address } | { ok: false; error: string }> {
  const parsed = AddressInputSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = createServerClient();
  const { data: address, error } = await supabase
    .from("addresses")
    .insert({
      company_id: companyId,
      code: parsed.data.code.trim(),
      description: parsed.data.description?.trim() || null,
      area: parsed.data.area?.trim() || null,
      street: parsed.data.street?.trim() || null,
      level: parsed.data.level?.trim() || null,
      position: parsed.data.position?.trim() || null,
      notes: parsed.data.notes?.trim() || null,
      is_active: true,
    })
    .select(ADDRESS_SELECT)
    .single();

  if (error || !address) {
    const isDuplicate = error?.code === "23505" || error?.message?.toLowerCase().includes("unique");
    return { ok: false, error: isDuplicate ? "Endereço com esse código já existe nesta empresa" : "Erro ao criar endereço" };
  }

  revalidatePath(`/empresas/${companyId}/enderecos`);
  return { ok: true, address: mapAddress(address) };
}

export async function updateAddress(
  companyId: string,
  id: string,
  data: AddressInput
): Promise<{ ok: true; address: Address } | { ok: false; error: string }> {
  const parsed = AddressInputSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = createServerClient();
  const { data: address, error } = await supabase
    .from("addresses")
    .update({
      code: parsed.data.code.trim(),
      description: parsed.data.description?.trim() || null,
      area: parsed.data.area?.trim() || null,
      street: parsed.data.street?.trim() || null,
      level: parsed.data.level?.trim() || null,
      position: parsed.data.position?.trim() || null,
      notes: parsed.data.notes?.trim() || null,
    })
    .eq("company_id", companyId)
    .eq("id", id)
    .select(ADDRESS_SELECT)
    .single();

  if (error || !address) return { ok: false, error: "Erro ao atualizar endereço" };

  revalidatePath(`/empresas/${companyId}/enderecos`);
  return { ok: true, address: mapAddress(address) };
}

export async function toggleAddressActive(companyId: string, id: string, isActive: boolean): Promise<void> {
  const supabase = createServerClient();
  await supabase
    .from("addresses")
    .update({ is_active: isActive })
    .eq("company_id", companyId)
    .eq("id", id);

  revalidatePath(`/empresas/${companyId}/enderecos`);
}
