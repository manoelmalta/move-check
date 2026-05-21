"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createCompany } from "@/actions/company";

export function CreateCompanyForm() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [document, setDocument] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleCreate = async () => {
    if (!name.trim()) { setError("Nome é obrigatório"); return; }
    setLoading(true);
    setError("");
    const result = await createCompany({ name, document, notes });
    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }
    router.push(`/empresas/${result.company.id}`);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 bg-white/15 border border-white/25 text-white font-bold rounded-2xl py-4 active:bg-white/20 transition-colors"
      >
        <span className="text-xl leading-none">+</span>
        Nova Empresa / Ambiente
      </button>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-5 shadow-xl flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="font-bold text-gray-900">Nova Empresa / Ambiente</span>
        <button type="button" onClick={() => setOpen(false)} className="text-gray-400 text-xl leading-none">×</button>
      </div>

      <div className="flex flex-col gap-3">
        <div>
          <label className="text-[10px] text-gray-400 tracking-wider uppercase font-medium block mb-1">
            Nome <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ex: Amazon Cleaner"
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm outline-none focus:border-[#0057B8] focus:ring-1 focus:ring-[#0057B8]/20"
          />
        </div>
        <div>
          <label className="text-[10px] text-gray-400 tracking-wider uppercase font-medium block mb-1">
            CNPJ / Documento <span className="text-gray-300">(opcional)</span>
          </label>
          <input
            type="text"
            value={document}
            onChange={(e) => setDocument(e.target.value)}
            placeholder="ex: 12.345.678/0001-90"
            className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm outline-none focus:border-[#0057B8] focus:ring-1 focus:ring-[#0057B8]/20"
          />
        </div>
        <div>
          <label className="text-[10px] text-gray-400 tracking-wider uppercase font-medium block mb-1">
            Observações <span className="text-gray-300">(opcional)</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="ex: Filial SP — Galpão Logístico"
            rows={2}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0057B8] focus:ring-1 focus:ring-[#0057B8]/20 resize-none"
          />
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-600 font-medium">{error}</div>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => setOpen(false)}
          className="flex-1 bg-gray-50 border border-gray-200 text-gray-600 font-medium text-sm rounded-xl py-3 active:bg-gray-100"
        >
          Cancelar
        </button>
        <button
          onClick={handleCreate}
          disabled={loading || !name.trim()}
          className="flex-[2] bg-[#0057B8] text-white font-bold text-sm rounded-xl py-3 active:bg-[#003F8A] disabled:opacity-50 transition-colors"
        >
          {loading ? "Criando…" : "Criar e Entrar"}
        </button>
      </div>
    </div>
  );
}
