"use client";

import { useState } from "react";
import { createProduct } from "@/actions/product";
import { useRouter } from "next/navigation";

export function AddProductForm() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    codigoInterno: "",
    descricao: "",
    unidadeMedida: "UN",
    observacao: "",
  });
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await createProduct(form);
    setLoading(false);
    if (result.ok) {
      setForm({ codigoInterno: "", descricao: "", unidadeMedida: "UN", observacao: "" });
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
        className="w-full flex items-center justify-center gap-2 bg-[#0057B8] text-white font-bold rounded-2xl py-4 active:bg-[#003F8A] transition-colors shadow-md"
      >
        <span className="text-xl leading-none">+</span>
        Novo Produto
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm flex flex-col gap-3"
    >
      <div className="flex items-center justify-between">
        <span className="font-bold text-sm text-gray-900">Novo Produto</span>
        <button type="button" onClick={() => setOpen(false)} className="text-gray-400 text-xl leading-none">×</button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Código interno *"
          value={form.codigoInterno}
          onChange={(v) => setForm((f) => ({ ...f, codigoInterno: v }))}
          placeholder="1001"
          mono
          required
        />
        <Field
          label="Unidade"
          value={form.unidadeMedida}
          onChange={(v) => setForm((f) => ({ ...f, unidadeMedida: v }))}
          placeholder="UN"
        />
      </div>

      <Field
        label="Descrição *"
        value={form.descricao}
        onChange={(v) => setForm((f) => ({ ...f, descricao: v }))}
        placeholder="Nome do produto"
        required
      />

      <Field
        label="Observação"
        value={form.observacao}
        onChange={(v) => setForm((f) => ({ ...f, observacao: v }))}
        placeholder="Campo livre (opcional)"
      />

      <button
        type="submit"
        disabled={!form.codigoInterno.trim() || !form.descricao.trim() || loading}
        className="w-full bg-[#0057B8] text-white font-bold rounded-xl py-3.5 active:bg-[#003F8A] disabled:opacity-40 transition-colors mt-1"
      >
        {loading ? "Salvando…" : "Salvar Produto"}
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
        className={`border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#0057B8] focus:ring-1 focus:ring-[#0057B8]/20 transition ${mono ? "font-mono" : ""}`}
      />
    </div>
  );
}
