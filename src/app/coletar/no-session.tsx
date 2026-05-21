"use client";

import { useState } from "react";
import Link from "next/link";
import { createSession } from "@/actions/session";
import { useRouter } from "next/navigation";

export function NoSession() {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleCreate = async () => {
    setLoading(true);
    const session = await createSession(name);
    router.push(`/coletar?sessionId=${session.id}`);
  };

  return (
    <div className="min-h-dvh bg-[#f4f6f9] flex flex-col">
      {/* Header */}
      <header className="bg-[#0057B8] text-white px-4 pt-4 pb-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-white/70 active:text-white transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </Link>
          <div>
            <div className="text-[10px] text-white/50 tracking-[0.25em] uppercase">MOVE CHECK</div>
            <div className="font-bold text-sm">Coletar</div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6 max-w-sm mx-auto w-full">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="6" width="3" height="12" rx="0.5" />
              <rect x="8" y="6" width="1.5" height="12" rx="0.5" />
              <rect x="11.5" y="6" width="2.5" height="12" rx="0.5" />
              <rect x="16" y="6" width="1.5" height="12" rx="0.5" />
              <rect x="19.5" y="6" width="1.5" height="12" rx="0.5" />
            </svg>
          </div>
          <h2 className="text-gray-900 font-bold text-xl mb-1">Nenhuma sessão aberta</h2>
          <p className="text-gray-400 text-sm">
            Crie uma nova sessão para começar a coletar leituras.
          </p>
        </div>

        {!showForm ? (
          <div className="w-full flex flex-col gap-3">
            <button
              onClick={() => setShowForm(true)}
              className="w-full bg-[#0057B8] text-white font-bold text-base rounded-2xl py-4.5 active:bg-[#003F8A] transition-colors shadow-md"
            >
              + Criar nova sessão
            </button>
            <Link
              href="/sessoes"
              className="w-full flex items-center justify-center bg-white border-2 border-gray-200 text-gray-600 font-medium text-sm rounded-2xl py-4 active:bg-gray-50 transition-colors"
            >
              Ver sessões existentes
            </Link>
          </div>
        ) : (
          <div className="w-full bg-white rounded-2xl border border-gray-200 p-4 shadow-sm flex flex-col gap-3">
            <div className="text-[10px] text-gray-400 tracking-wider uppercase font-medium">
              Nome da sessão
            </div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex: Coleta Manhã — Galpão A"
              className="border border-gray-200 rounded-xl px-3 py-3 text-sm outline-none focus:border-[#0057B8] focus:ring-1 focus:ring-[#0057B8]/20"
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
                className="flex-[2] bg-[#0057B8] text-white font-bold text-sm rounded-xl py-3 active:bg-[#003F8A] disabled:opacity-50 transition-colors"
              >
                {loading ? "Criando…" : "Criar e Coletar"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
