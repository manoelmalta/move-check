"use client";

import { useState } from "react";
import Link from "next/link";
import { closeSession, reopenSession } from "@/actions/session";
import { useRouter } from "next/navigation";
import type { SessionSummary } from "@/actions/session";

type Props = {
  session: SessionSummary;
  companyId: string;
};

type Confirm = "close" | "reopen" | null;

export function SessionCard({ session, companyId }: Props) {
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const isOpen = session.status === "open";
  const isRegistration = session.operationType === "PRODUCT_REGISTRATION";

  const handleClose = async () => {
    setLoading(true);
    await closeSession(companyId, session.id);
    setConfirm(null);
    setLoading(false);
    router.refresh();
  };

  const handleReopen = async () => {
    setLoading(true);
    await reopenSession(companyId, session.id);
    setConfirm(null);
    setLoading(false);
    router.refresh();
  };

  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${isOpen ? "border-green-200" : "border-gray-200"}`}>
      {/* Top bar */}
      <div className={`px-4 pt-3.5 pb-2 ${isOpen ? "border-b border-green-100" : "border-b border-gray-100"}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="font-bold text-sm text-gray-900 truncate">{session.name}</div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wider uppercase ${
                  isOpen ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"
                }`}
              >
                {isOpen ? "Aberto" : "Fechado"}
              </span>
              {/* Operation type badge */}
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wider uppercase ${
                  isRegistration
                    ? "bg-teal-100 text-teal-700"
                    : "bg-blue-100 text-[#0057B8]"
                }`}
              >
                {isRegistration ? "Cadastro" : "Inventário"}
              </span>
              <span className="text-[10px] text-gray-300 font-mono">
                {new Date(session.createdAt).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}{" "}
                {new Date(session.createdAt).toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="px-4 py-2.5 flex gap-4 border-b border-gray-100">
        {isRegistration ? (
          <>
            <Stat label="Leituras" value={session.totalLogs} />
            <Stat label="Vinculados" value={session.linkedCount} color="blue" />
            <Stat
              label="Já existiam"
              value={session.totalLogs - session.linkedCount}
              color={session.totalLogs - session.linkedCount > 0 ? "amber" : "gray"}
            />
          </>
        ) : (
          <>
            <Stat label="Total" value={session.totalEntries} />
            <Stat label="Vinculadas" value={session.vinculadoCount} color="blue" />
            <Stat
              label="Pendentes"
              value={session.pendenteCount}
              color={session.pendenteCount > 0 ? "amber" : "gray"}
            />
          </>
        )}
      </div>

      {/* Confirmation dialogs */}
      {confirm === "close" && (
        <div className="px-4 py-3 bg-red-50 border-b border-red-100">
          <div className="text-xs text-red-700 mb-2">
            <strong>Fechar inventário?</strong> Novas leituras não poderão ser adicionadas enquanto estiver fechado.
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirm(null)}
              className="flex-1 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg py-2 active:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleClose}
              disabled={loading}
              className="flex-1 text-xs font-bold text-white bg-red-500 rounded-lg py-2 active:bg-red-600 disabled:opacity-50"
            >
              {loading ? "Fechando…" : "Confirmar fechar"}
            </button>
          </div>
        </div>
      )}

      {confirm === "reopen" && (
        <div className="px-4 py-3 bg-blue-50 border-b border-blue-100">
          <div className="text-xs text-blue-700 mb-2">
            <strong>Reabrir inventário?</strong> Novas leituras poderão ser adicionadas novamente.
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirm(null)}
              className="flex-1 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg py-2 active:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleReopen}
              disabled={loading}
              className="flex-1 text-xs font-bold text-white bg-[#0057B8] rounded-lg py-2 active:bg-[#003F8A] disabled:opacity-50"
            >
              {loading ? "Reabrindo…" : "Confirmar reabrir"}
            </button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="px-4 py-2.5 flex flex-wrap gap-2">
        {isOpen && (
          <Link
            href={`/empresas/${companyId}/${isRegistration ? "cadastro-produto" : "inventario-produto"}?sessionId=${session.id}`}
            className={`flex items-center gap-1.5 text-white text-xs font-bold rounded-lg px-3 py-2 transition-colors ${
              isRegistration
                ? "bg-teal-600 active:bg-teal-700"
                : "bg-[#0057B8] active:bg-[#003F8A]"
            }`}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="3" y="6" width="3" height="12" rx="0.5" />
              <rect x="8" y="6" width="1.5" height="12" rx="0.5" />
              <rect x="11.5" y="6" width="2.5" height="12" rx="0.5" />
              <rect x="16" y="6" width="1.5" height="12" rx="0.5" />
              <rect x="19.5" y="6" width="1.5" height="12" rx="0.5" />
            </svg>
            {isRegistration ? "Cadastrar" : "Coletar"}
          </Link>
        )}

        <Link
          href={`/empresas/${companyId}/exportar?sessionId=${session.id}`}
          className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 text-gray-600 text-xs font-medium rounded-lg px-3 py-2 active:bg-gray-100 transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7,10 12,15 17,10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Exportar
        </Link>

        {isOpen && confirm !== "close" && (
          <button
            onClick={() => setConfirm("close")}
            className="flex items-center gap-1 bg-red-50 border border-red-200 text-red-600 text-xs font-medium rounded-lg px-3 py-2 active:bg-red-100 transition-colors ml-auto"
          >
            Fechar inventário
          </button>
        )}

        {!isOpen && confirm !== "reopen" && (
          <button
            onClick={() => setConfirm("reopen")}
            className="flex items-center gap-1 bg-blue-50 border border-blue-200 text-[#0057B8] text-xs font-medium rounded-lg px-3 py-2 active:bg-blue-100 transition-colors ml-auto"
          >
            Reabrir
          </button>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  color = "gray",
}: {
  label: string;
  value: number;
  color?: "gray" | "blue" | "amber";
}) {
  const textColor = {
    gray: "text-gray-500",
    blue: "text-[#0057B8]",
    amber: "text-amber-600",
  }[color];

  return (
    <div>
      <div className={`text-base font-bold ${textColor}`}>{value}</div>
      <div className="text-[10px] text-gray-400 tracking-wider uppercase">{label}</div>
    </div>
  );
}
