export const dynamic = "force-dynamic";

import Link from "next/link";
import { getSessions } from "@/actions/session";
import { BrandedBackground } from "@/components/branded-background";
import { MoveCheckLogo } from "@/components/move-check-logo";

export default async function Home() {
  const sessions = await getSessions();
  const openSession = sessions.find((s) => s.status === "open");
  const totalEntries = sessions.reduce((acc, s) => acc + s.totalEntries, 0);

  return (
    <main className="min-h-dvh flex flex-col relative overflow-hidden">
      <BrandedBackground variant="hero" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 pt-7 pb-4">
        <div className="flex items-center gap-3">
          <MoveCheckLogo size={52} priority />
          <div className="leading-none">
            <div className="text-white font-bold text-xl tracking-[0.18em] uppercase">
              MOVE
            </div>
            <div className="text-white/55 text-[10px] tracking-[0.35em] uppercase mt-1">
              CHECK
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-white/40 text-[10px] tracking-widest uppercase">Sistema</div>
          <div className="text-white/70 text-xs font-mono">v1.0 MVP</div>
        </div>
      </header>

      {/* Hero */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-6 gap-8">
        <div className="text-center">
          <div className="text-white/50 text-[11px] tracking-[0.4em] uppercase mb-3">
            Operational Scan Cockpit
          </div>
          <h1 className="text-white text-4xl font-bold tracking-tight leading-tight">
            Controle de
            <br />
            <span className="text-white/70">Inventário</span>
          </h1>
        </div>

        {/* Stats */}
        <div className="flex gap-3 w-full max-w-sm">
          <div className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-3 text-center">
            <div className="text-white/50 text-[10px] tracking-wider uppercase">Sessão</div>
            <div className={`font-bold text-base mt-0.5 ${openSession ? "text-green-300" : "text-white/50"}`}>
              {openSession ? "Aberta" : "—"}
            </div>
          </div>
          <div className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-3 text-center">
            <div className="text-white/50 text-[10px] tracking-wider uppercase">Leituras</div>
            <div className="text-white font-bold text-base mt-0.5">{totalEntries}</div>
          </div>
          <div className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-3 text-center">
            <div className="text-white/50 text-[10px] tracking-wider uppercase">Sessões</div>
            <div className="text-white font-bold text-base mt-0.5">{sessions.length}</div>
          </div>
        </div>

        {/* Primary CTA */}
        <Link
          href="/coletar"
          className="w-full max-w-sm flex items-center justify-center gap-3 bg-white text-[#0057B8] font-bold text-xl rounded-2xl px-6 py-5 shadow-2xl active:scale-[0.97] transition-transform"
        >
          <BarcodeIcon />
          Iniciar Coleta
        </Link>

        {/* Secondary nav */}
        <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
          <NavCard href="/produtos" emoji="📦" label="Produtos" />
          <NavCard href="/importar" emoji="⬆️" label="Importar" />
          <NavCard href="/exportar" emoji="📄" label="Exportar" />
          <NavCard href="/sessoes" emoji="📋" label="Sessões" />
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 px-6 pb-8 text-center">
        <div className="text-white/25 text-[10px] tracking-[0.3em] uppercase">
          MOVE · Logística Inteligente
        </div>
      </div>
    </main>
  );
}

function NavCard({ href, emoji, label }: { href: string; emoji: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 bg-white/10 border border-white/20 rounded-xl px-4 py-3.5 text-white active:bg-white/20 transition-colors"
    >
      <span className="text-lg">{emoji}</span>
      <span className="font-medium text-sm">{label}</span>
    </Link>
  );
}

function BarcodeIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="6" width="3" height="12" rx="0.5" />
      <rect x="8" y="6" width="1.5" height="12" rx="0.5" />
      <rect x="11.5" y="6" width="2.5" height="12" rx="0.5" />
      <rect x="16" y="6" width="1.5" height="12" rx="0.5" />
      <rect x="19.5" y="6" width="1.5" height="12" rx="0.5" />
    </svg>
  );
}
