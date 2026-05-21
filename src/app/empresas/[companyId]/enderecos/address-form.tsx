"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createAddress } from "@/actions/address";

type Parts = { rua: string; predio: string; nivel: string; apto: string };

type FormState = Parts & {
  description: string;
  area: string;
  notes: string;
};

const EMPTY: FormState = {
  rua: "",
  predio: "",
  nivel: "",
  apto: "",
  description: "",
  area: "",
  notes: "",
};

function pad2(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 2);
  return d ? d.padStart(2, "0") : null;
}
function pad3(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 3);
  return d ? d.padStart(3, "0") : null;
}

function buildPreview({ rua, predio, nivel, apto }: Parts): string {
  return [
    pad2(rua) ?? "__",
    pad2(predio) ?? "__",
    pad2(nivel) ?? "__",
    pad3(apto) ?? "___",
  ].join("-");
}

function allFilled({ rua, predio, nivel, apto }: Parts) {
  return rua.trim() && predio.trim() && nivel.trim() && apto.trim();
}

type Props = { companyId: string };

export function AddressForm({ companyId }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<FormState>(EMPTY);
  const router = useRouter();

  const set = (key: keyof FormState) => (v: string) =>
    setForm((f) => ({ ...f, [key]: v }));

  // Strip non-digits for structural fields
  const setDigits2 = (key: "rua" | "predio" | "nivel") => (v: string) =>
    setForm((f) => ({ ...f, [key]: v.replace(/\D/g, "").slice(0, 2) }));

  const setDigits3 = (v: string) =>
    setForm((f) => ({ ...f, apto: v.replace(/\D/g, "").slice(0, 3) }));

  const reset = () => setForm(EMPTY);

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

  const preview = buildPreview(form);
  const ready = !!allFilled(form);

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="font-bold text-sm text-gray-900">Novo Endereço</span>
        <button type="button" onClick={() => { setOpen(false); reset(); }} className="text-gray-400 text-xl leading-none">×</button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">{error}</div>
      )}

      {/* Structural fields — 2×2 grid */}
      <div>
        <div className="text-[10px] text-gray-400 tracking-wider uppercase font-medium mb-2">
          Endereço estrutural
        </div>
        <div className="grid grid-cols-2 gap-2">
          <DigitField
            label="Rua"
            value={form.rua}
            onChange={setDigits2("rua")}
            placeholder="01"
            maxLength={2}
          />
          <DigitField
            label="Prédio"
            value={form.predio}
            onChange={setDigits2("predio")}
            placeholder="01"
            maxLength={2}
          />
          <DigitField
            label="Nível"
            value={form.nivel}
            onChange={setDigits2("nivel")}
            placeholder="01"
            maxLength={2}
          />
          <DigitField
            label="Apto"
            value={form.apto}
            onChange={setDigits3}
            placeholder="001"
            maxLength={3}
          />
        </div>
      </div>

      {/* Code preview */}
      <div className={`rounded-xl px-3 py-2.5 flex items-center gap-2 transition-colors ${ready ? "bg-teal-50 border border-teal-200" : "bg-gray-50 border border-gray-200"}`}>
        <span className="text-[10px] text-gray-400 tracking-wider uppercase font-medium shrink-0">
          Código do endereço
        </span>
        <span className={`font-mono text-sm font-bold tracking-wider ${ready ? "text-teal-700" : "text-gray-300"}`}>
          {preview}
        </span>
      </div>

      {/* Optional fields */}
      <TextField
        label="Área"
        value={form.area}
        onChange={set("area")}
        placeholder="ex: Galpão A"
      />
      <TextField
        label="Descrição"
        value={form.description}
        onChange={set("description")}
        placeholder="ex: Picking detergentes"
      />
      <TextField
        label="Observações"
        value={form.notes}
        onChange={set("notes")}
        placeholder="Campo livre"
      />

      <button
        type="submit"
        disabled={!ready || loading}
        className="w-full bg-[#0F766E] text-white font-bold rounded-xl py-3.5 active:bg-[#0d5d56] disabled:opacity-40 transition-colors mt-1"
      >
        {loading ? "Salvando…" : "Salvar Endereço"}
      </button>
    </form>
  );
}

function DigitField({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength: number;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] text-gray-400 tracking-wider uppercase font-medium">{label}</label>
      <input
        inputMode="numeric"
        pattern="\d*"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-mono outline-none focus:border-[#0F766E] focus:ring-1 focus:ring-[#0F766E]/20 transition text-center"
      />
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] text-gray-400 tracking-wider uppercase font-medium">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#0F766E] focus:ring-1 focus:ring-[#0F766E]/20 transition"
      />
    </div>
  );
}
