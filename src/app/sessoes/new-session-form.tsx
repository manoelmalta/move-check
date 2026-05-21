"use client";

import { useState } from "react";
import { createSession } from "@/actions/session";
import type { OperationType } from "@/actions/session";
import { useRouter } from "next/navigation";

type Props = { companyId: string };

export function NewSessionForm({ companyId }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [operationType, setOperationType] = useState<OperationType>("PRODUCT_INVENTORY");
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleCreate = async () => {
    setLoading(true);
    await createSession(companyId, name, operationType, comment);
    setName("");
    setOperationType("PRODUCT_INVENTORY");
    setComment("");
    setOpen(false);
    setLoading(false);
    router.refresh();
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 bg-[#0057B8] text-white font-bold rounded-2xl py-4 active:bg-[#003F8A] transition-colors shadow-md"
      >
        <span className="text-xl leading-none">+</span>
        Nova Sessão
      </button>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="font-bold text-sm text-gray-900">Nova Sessão</span>
        <button type="button" onClick={() => setOpen(false)} className="text-gray-400 text-xl leading-none">×</button>
      </div>

      {/* Operation type selector */}
      <div className="flex flex-col gap-1.5">
        <div className="text-[10px] text-gray-400 tracking-wider uppercase font-medium">
          Tipo de operação
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setOperationType("PRODUCT_INVENTORY")}
            className={`flex flex-col items-start gap-1 rounded-xl border-2 px-3 py-3 text-left transition-colors ${
              operationType === "PRODUCT_INVENTORY"
                ? "border-[#0057B8] bg-blue-50"
                : "border-gray-200 bg-white active:bg-gray-50"
            }`}
          >
            <span className={`text-[10px] font-bold tracking-wider uppercase ${
              operationType === "PRODUCT_INVENTORY" ? "text-[#0057B8]" : "text-gray-400"
            }`}>
              Inventário
            </span>
            <span className={`text-xs leading-tight ${
              operationType === "PRODUCT_INVENTORY" ? "text-gray-700" : "text-gray-400"
            }`}>
              Contar quantidades físicas
            </span>
          </button>
          <button
            type="button"
            onClick={() => setOperationType("PRODUCT_REGISTRATION")}
            className={`flex flex-col items-start gap-1 rounded-xl border-2 px-3 py-3 text-left transition-colors ${
              operationType === "PRODUCT_REGISTRATION"
                ? "border-teal-500 bg-teal-50"
                : "border-gray-200 bg-white active:bg-gray-50"
            }`}
          >
            <span className={`text-[10px] font-bold tracking-wider uppercase ${
              operationType === "PRODUCT_REGISTRATION" ? "text-teal-700" : "text-gray-400"
            }`}>
              Cadastro
            </span>
            <span className={`text-xs leading-tight ${
              operationType === "PRODUCT_REGISTRATION" ? "text-gray-700" : "text-gray-400"
            }`}>
              Vincular EAN/DUN a produtos
            </span>
          </button>
        </div>
      </div>

      {/* Name */}
      <div className="flex flex-col gap-1">
        <label className="text-[10px] text-gray-400 tracking-wider uppercase font-medium">
          Nome da sessão
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="ex: Coleta Manhã — Galpão A"
          className="border border-gray-200 rounded-xl px-3 py-3 text-sm outline-none focus:border-[#0057B8] focus:ring-1 focus:ring-[#0057B8]/20"
          autoFocus
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
        />
        <div className="text-[10px] text-gray-400 mt-0.5">
          Deixe em branco para nome automático com data e hora.
        </div>
      </div>

      {/* Comment */}
      <div className="flex flex-col gap-1">
        <label className="text-[10px] text-gray-400 tracking-wider uppercase font-medium">
          Finalidade / comentário <span className="normal-case text-gray-300">(opcional)</span>
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="ex: Cíclico mensal — área de picking"
          rows={2}
          className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0057B8] focus:ring-1 focus:ring-[#0057B8]/20 resize-none"
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setOpen(false)}
          className="flex-1 bg-gray-50 border border-gray-200 text-gray-600 font-medium text-sm rounded-xl py-3 active:bg-gray-100"
        >
          Cancelar
        </button>
        <button
          onClick={handleCreate}
          disabled={loading}
          className={`flex-[2] text-white font-bold text-sm rounded-xl py-3 disabled:opacity-50 transition-colors ${
            operationType === "PRODUCT_REGISTRATION"
              ? "bg-teal-600 active:bg-teal-700"
              : "bg-[#0057B8] active:bg-[#003F8A]"
          }`}
        >
          {loading ? "Criando…" : "Criar Sessão"}
        </button>
      </div>
    </div>
  );
}
