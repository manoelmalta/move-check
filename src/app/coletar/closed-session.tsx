"use client";

import Link from "next/link";
import { reopenSession } from "@/actions/session";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MoveCheckLogo } from "@/components/move-check-logo";

type Props = {
  session: { id: string; name: string; status: string };
};

export function ClosedSession({ session }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleReopen = async () => {
    setLoading(true);
    await reopenSession(session.id);
    router.refresh();
  };

  return (
    <div className="min-h-dvh bg-[#f4f6f9] flex flex-col">
      {/* Header */}
      <header className="bg-[#0057B8] text-white px-4 pt-4 pb-4 relative overflow-hidden">
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
          <Link href="/coletar" className="text-white/70 active:text-white transition-colors shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </Link>
          <MoveCheckLogo size={30} className="shrink-0" />
          <div className="min-w-0">
            <div className="text-[10px] text-white/55 tracking-[0.25em] uppercase">MOVE CHECK</div>
            <div className="font-bold text-sm truncate max-w-[200px]">{session.name}</div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6 max-w-sm mx-auto w-full">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h2 className="text-gray-900 font-bold text-xl mb-1">Sessão fechada</h2>
          <p className="text-gray-500 text-sm mb-1">
            <span className="font-medium text-gray-700">{session.name}</span>
          </p>
          <p className="text-gray-400 text-sm">
            Esta sessão está fechada. Novas leituras não podem ser adicionadas.
          </p>
        </div>

        <div className="w-full flex flex-col gap-3">
          <button
            onClick={handleReopen}
            disabled={loading}
            className="w-full bg-[#0057B8] text-white font-bold text-base rounded-2xl py-4.5 active:bg-[#003F8A] disabled:opacity-50 transition-colors shadow-md"
          >
            {loading ? "Reabrindo…" : "Reabrir esta sessão"}
          </button>
          <Link
            href="/sessoes"
            className="w-full flex items-center justify-center bg-white border-2 border-gray-200 text-gray-600 font-medium text-sm rounded-2xl py-4 active:bg-gray-50 transition-colors"
          >
            Escolher outra sessão
          </Link>
          <Link
            href="/coletar"
            className="text-center text-sm text-[#0057B8] font-medium py-1"
          >
            Usar sessão aberta mais recente
          </Link>
        </div>
      </div>
    </div>
  );
}
