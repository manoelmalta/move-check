"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createAddress } from "@/actions/address";

type Props = { companyId: string };

export function AddressForm({ companyId }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    code: "",
    description: "",
    area: "",
    street: "",
    level: "",
    position: "",
    notes: "",
  });
  const router = useRouter();

  const reset = () =>
    setForm({ code: "", description: "", area: "", street: "", level: "", position: "", notes: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await createAddress(companyId, form);
    setLoading(false);
    if (result.ok) {
      reset();
      setOpen(false);
      router.refresh();
    } else {
      setError(result.error);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 bg-[#0F766E] text-white font-bold rounded-2xl py-4 active:bg-[#0d5d56] transition-colors shadow-md"
      >
        <span className="text-xl leading-none">+</span>
        Novo Endereço
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="font-bold text-sm text-gray-900">Novo Endereço</span>
        <button type="button" onClick={() => setOpen(false)} className="text-gray-400 text-xl leading-none">×</button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">{error}</div>
      )}

      <Field label="Código *" value={form.code} onChange={(v) => setForm((f) => ({ ...f, code: v }))} placeholder="ex: A-01-02-03" mono required />
      <Field label="Descrição" value={form.description} onChange={(v) => setForm((f) => ({ ...f, description: v }))} placeholder="ex: Picking detergentes" />

      <div className="grid grid-cols-2 gap-3">
        <Field label="Área" value={form.area} onChange={(v) => setForm((f) => ({ ...f, area: v }))} placeholder="A" />
        <Field label="Rua" value={form.street} onChange={(v) => setForm((f) => ({ ...f, street: v }))} placeholder="01" />
        <Field label="Nível" value={form.level} onChange={(v) => setForm((f) => ({ ...f, level: v }))} placeholder="02" />
        <Field label="Posição" value={form.position} onChange={(v) => setForm((f) => ({ ...f, position: v }))} placeholder="03" />
      </div>

      <Field label="Observação" value={form.notes} onChange={(v) => setForm((f) => ({ ...f, notes: v }))} placeholder="Campo livre" />

      <button
        type="submit"
        disabled={!form.code.trim() || loading}
        className="w-full bg-[#0F766E] text-white font-bold rounded-xl py-3.5 active:bg-[#0d5d56] disabled:opacity-40 transition-colors mt-1"
      >
        {loading ? "Salvando…" : "Salvar Endereço"}
      </button>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
  mono,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] text-gray-400 tracking-wider uppercase font-medium">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className={`border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#0F766E] focus:ring-1 focus:ring-[#0F766E]/20 transition ${mono ? "font-mono" : ""}`}
      />
    </div>
  );
}
