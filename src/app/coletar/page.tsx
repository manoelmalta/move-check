import Link from "next/link";
import { getSessionById } from "@/actions/session";
import { getSessionEntries } from "@/actions/scan";
import { getRegistrationLogs } from "@/actions/registration";
import { ScannerCockpit } from "./scanner-cockpit";
import { RegistrationCockpit } from "./registration-cockpit";
import { ClosedSession } from "./closed-session";
import { BrandedBackground } from "@/components/branded-background";
import { MoveCheckLogo } from "@/components/move-check-logo";

export default async function ColetarPage({
  searchParams,
}: {
  searchParams: Promise<{ sessionId?: string }>;
}) {
  const { sessionId } = await searchParams;

  // ── Backward-compat: ?sessionId= renders the right cockpit directly ──────
  if (sessionId) {
    const session = await getSessionById(sessionId);

    if (!session) return <Hub />;

    if (session.status === "closed") {
      return <ClosedSession session={session} />;
    }

    if (session.operationType === "PRODUCT_REGISTRATION") {
      const initialLogs = await getRegistrationLogs(session.id);
      return <RegistrationCockpit session={session} initialLogs={initialLogs} />;
    }

    const recentEntries = await getSessionEntries(session.id);
    return (
      <ScannerCockpit
        session={session}
        initialEntries={recentEntries.map((e) => ({
          id: e.id,
          code: e.code,
          codeType: e.codeType,
          quantity: e.quantity,
          status: e.status,
          scannedAt: e.scannedAt,
          product: e.product
            ? { codigoInterno: e.product.codigoInterno, descricao: e.product.descricao }
            : null,
        }))}
      />
    );
  }

  return <Hub />;
}

// ── Hub ───────────────────────────────────────────────────────────────────────

function Hub() {
  return (
    <div className="min-h-dvh flex flex-col relative overflow-hidden">
      <BrandedBackground variant="hero" />

      <header className="relative z-10 px-4 pt-4 pb-3">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-white/70 active:text-white transition-colors shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </Link>
          <MoveCheckLogo size={36} priority />
          <div className="min-w-0">
            <div className="text-[10px] text-white/55 tracking-[0.25em] uppercase">MOVE CHECK</div>
            <div className="font-bold text-sm text-white leading-tight">Coletar</div>
          </div>
        </div>
      </header>

      <div className="relative z-10 flex-1 flex flex-col justify-center px-4 gap-4 max-w-sm mx-auto w-full py-8">
        <p className="text-[11px] text-white/60 tracking-[0.25em] uppercase text-center mb-2">
          O que você quer fazer?
        </p>

        <Link
          href="/inventario-produto"
          className="group bg-white rounded-2xl border border-white/40 shadow-xl px-5 py-5 flex items-start gap-4 active:bg-blue-50 transition-colors"
        >
          <div className="w-12 h-12 rounded-xl bg-[#0057B8] flex items-center justify-center shrink-0">
            <BarcodeIcon color="white" />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-gray-900 text-base">Inventário de Produto</div>
            <div className="text-sm text-gray-500 mt-0.5 leading-snug">
              Leia códigos e registre quantidades para contagem de estoque.
            </div>
          </div>
        </Link>

        <Link
          href="/cadastro-produto"
          className="group bg-white rounded-2xl border border-white/40 shadow-xl px-5 py-5 flex items-start gap-4 active:bg-teal-50 transition-colors"
        >
          <div className="w-12 h-12 rounded-xl bg-teal-600 flex items-center justify-center shrink-0">
            <LinkIcon color="white" />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-gray-900 text-base">Cadastro de Produto</div>
            <div className="text-sm text-gray-500 mt-0.5 leading-snug">
              Vincule códigos de barras (EAN/DUN) a produtos cadastrados no sistema.
            </div>
          </div>
        </Link>

        <Link
          href="/sessoes"
          className="mt-2 text-center text-sm text-white font-medium py-1 active:text-white/70"
        >
          Gerenciar sessões →
        </Link>
      </div>
    </div>
  );
}

function BarcodeIcon({ color }: { color: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="6" width="3" height="12" rx="0.5" fill={color} />
      <rect x="8" y="6" width="1.5" height="12" rx="0.5" fill={color} />
      <rect x="11.5" y="6" width="2.5" height="12" rx="0.5" fill={color} />
      <rect x="16" y="6" width="1.5" height="12" rx="0.5" fill={color} />
      <rect x="19.5" y="6" width="1.5" height="12" rx="0.5" fill={color} />
    </svg>
  );
}

function LinkIcon({ color }: { color: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}
