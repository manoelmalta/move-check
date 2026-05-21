"use client";

import { useState } from "react";
import Link from "next/link";
import { createSession } from "@/actions/session";
import type { OperationType } from "@/actions/session";
import { useRouter } from "next/navigation";
import { MoveCheckLogo } from "@/components/move-check-logo";

type Props = {
  operationType?: OperationType;
  companyId?: string;
};

export function NoSession({ operationType = "PRODUCT_INVENTORY", companyId }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const isRegistration = operationType === "PRODUCT_REGISTRATION";
  const backHref = companyId ? `/empresas/${companyId}/inventarios` : "/empresas";

  const handleCreate = async () => {
    if (!companyId) { router.push("/empresas"); return; }
    setLoading(true);
    const session = await createSession(companyId, name, operationType);
    if (isRegistration) {
      router.push(`/empresas/${companyId}/cadastro-produto?sessionId=${session.id}`);
    } else {
      router.push(`/empresas/${companyId}/inventarios/${session.id}/produto`);
    }
  };

  return (
    <div className="min-h-dvh bg-[#f4f6f9] flex flex-col">
      <header className={`${isRegistration ? "bg-teal-600" : "bg-[#0057B8]"} text-white px-4 pt-4 pb-4 relative overflow-hidden`}>
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.12] pointer-events-none mix-blend-screen"
          style={{
            backgroundImage: "url('/branding/background-check.png')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="relative flex items-center gap-2.5">
          <Link href={backHref} className="text-white/70 active:text-white transition-colors shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </Link>
          <MoveCheckLogo size={30} className="shrink-0" />
          <div className="min-w-0">
            <div className="text-[10px] text-white/55 tracking-[0.25em] uppercase">MOVE CHECK · {isRegistration ? "CADASTRO" : "INVENTÁRIO"}</div>
            <div className="font-bold text-sm">Nenhum inventário aberto</div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6 max-w-sm mx-auto w-full">
        <div className="text-center">
          <div className={`w-16 h-16 rounded-2xl ${isRegistration ? "bg-teal-50" : "bg-gray-100"} flex items-center justify-center mx-auto mb-4`}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={isRegistration ? "#0d9488" : "#9ca3af"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="6" width="3" height="12" rx="0.5" />
              <rect x="8" y="6" width="1.5" height="12" rx="0.5" />
              <rect x="11.5" y="6" width="2.5" height="12" rx="0.5" />
              <rect x="16" y="6" width="1.5" height="12" rx="0.5" />
              <rect x="19.5" y="6" width="1.5" height="12" rx="0.5" />
            </svg>
          </div>
          <h2 className="text-gray-900 font-bold text-xl mb-1">Nenhum inventário aberto</h2>
          <p className="text-gray-400 text-sm">
            Crie um novo inventário para começar a contar.
          </p>
        </div>

        {!showForm ? (
          <div className="w-full flex flex-col gap-3">
            <button
              onClick={() => setShowForm(true)}
              className={`w-full ${isRegistration ? "bg-teal-600 active:bg-teal-700" : "bg-[#0057B8] active:bg-[#003F8A]"} text-white font-bold text-base rounded-2xl py-4 transition-colors shadow-md`}
            >
              + Criar novo inventário
            </button>
            <Link
              href={backHref}
              className="w-full flex items-center justify-center bg-white border-2 border-gray-200 text-gray-600 font-medium text-sm rounded-2xl py-4 active:bg-gray-50 transition-colors"
            >
              Ver inventários existentes
            </Link>
          </div>
        ) : (
          <div className="w-full bg-white rounded-2xl border border-gray-200 p-4 shadow-sm flex flex-col gap-3">
            <div className="text-[10px] text-gray-400 tracking-wider uppercase font-medium">
              Nome do inventário
            </div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex: Inventário Manhã — Galpão A"
              className={`border border-gray-200 rounded-xl px-3 py-3 text-sm outline-none focus:ring-1 ${isRegistration ? "focus:border-teal-500 focus:ring-teal-500/20" : "focus:border-[#0057B8] focus:ring-[#0057B8]/20"}`}
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
            <div className="text-[10px] text-gray-400">
              Deixe em branco para nome automático com data e hora.
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 bg-gray-50 border border-gray-200 text-gray-600 font-medium text-sm rounded-xl py-3 active:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={loading}
                className={`flex-[2] ${isRegistration ? "bg-teal-600 active:bg-teal-700" : "bg-[#0057B8] active:bg-[#003F8A]"} text-white font-bold text-sm rounded-xl py-3 disabled:opacity-50 transition-colors`}
              >
                {loading ? "Criando…" : "Criar e Contar"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
