"use server";

import { createServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Address = {
  id: string;
  companyId: string;
  code: string;
  rua: string;
  predio: string;
  nivel: string;
  apto: string;
  description: string | null;
  area: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

function mapAddress(row: {
  id: string;
  company_id: string;
  code: string;
  rua: string;
  predio: string;
  nivel: string;
  apto: string;
  description: string | null;
  area: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}): Address {
  return {
    id: row.id,
    companyId: row.company_id,
    code: row.code,
    rua: row.rua,
    predio: row.predio,
    nivel: row.nivel,
    apto: row.apto,
    description: row.description,
    area: row.area,
    notes: row.notes,
    isActive: row.is_active,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

const ADDRESS_SELECT =
  "id, company_id, code, rua, predio, nivel, apto, description, area, notes, is_active, created_at, updated_at";

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

// ─── Schema ───────────────────────────────────────────────────────────────────

// Accepts raw user input (1–2 digits for rua/predio/nivel, 1–3 for apto).
// Normalizes via transform (zero-padding). Generated code validated by regex.

const twoDigits = z
  .string()
  .min(1, "Obrigatório")
  .regex(/^\d{1,2}$/, "Apenas dígitos (máx. 2)")
  .transform((v) => v.padStart(2, "0"));

const threeDigits = z
  .string()
  .min(1, "Obrigatório")
  .regex(/^\d{1,3}$/, "Apenas dígitos (máx. 3)")
  .transform((v) => v.padStart(3, "0"));

const AddressInputSchema = z.object({
  rua: twoDigits,
  predio: twoDigits,
  nivel: twoDigits,
  apto: threeDigits,
  description: z.string().optional(),
  area: z.string().optional(),
  notes: z.string().optional(),
});

type AddressInputRaw = z.input<typeof AddressInputSchema>;

// ─── Write ────────────────────────────────────────────────────────────────────

export async function createAddress(
  companyId: string,
  data: AddressInputRaw
): Promise<{ ok: true; address: Address } | { ok: false; error: string }> {
  const parsed = AddressInputSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const { rua, predio, nivel, apto } = parsed.data;
  const code = `${rua}-${predio}-${nivel}-${apto}`;

  const supabase = createServerClient();
  const { data: address, error } = await supabase
    .from("addresses")
    .insert({
      company_id: companyId,
      code,
      rua,
      predio,
      nivel,
      apto,
      description: parsed.data.description?.trim() || null,
      area: parsed.data.area?.trim() || null,
      notes: parsed.data.notes?.trim() || null,
      is_active: true,
    })
    .select(ADDRESS_SELECT)
    .single();

  if (error || !address) {
    const isDuplicate = error?.code === "23505" || error?.message?.toLowerCase().includes("unique");
    return {
      ok: false,
      error: isDuplicate
        ? "Endereço com esse código já existe nesta empresa"
        : "Erro ao criar endereço",
    };
  }

  revalidatePath(`/empresas/${companyId}/enderecos`);
  return { ok: true, address: mapAddress(address) };
}

export async function updateAddress(
  companyId: string,
  id: string,
  data: AddressInputRaw
): Promise<{ ok: true; address: Address } | { ok: false; error: string }> {
  const parsed = AddressInputSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const { rua, predio, nivel, apto } = parsed.data;
  const code = `${rua}-${predio}-${nivel}-${apto}`;

  const supabase = createServerClient();
  const { data: address, error } = await supabase
    .from("addresses")
    .update({
      code,
      rua,
      predio,
      nivel,
      apto,
      description: parsed.data.description?.trim() || null,
      area: parsed.data.area?.trim() || null,
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
