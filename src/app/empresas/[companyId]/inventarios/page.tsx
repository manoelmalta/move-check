export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { getCompanyById } from "@/actions/company";
import { getSessions } from "@/actions/session";
import { NewSessionForm } from "@/app/sessoes/new-session-form";
import { SessionCard } from "@/app/sessoes/session-card";
import { MoveCheckLogo } from "@/components/move-check-logo";
import { BrandedBackground } from "@/components/branded-background";

export default async function InventariosPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  const company = await getCompanyById(companyId);
  if (!company) notFound();

  const sessions = await getSessions(companyId);
  const openCount = sessions.filter((s) => s.status === "open").length;

  return (
    <div className="min-h-dvh bg-[#f4f6f9] flex flex-col">
      {/* Header */}
      <div className="bg-[#0057B8] relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.14] pointer-events-none mix-blend-screen"
          style={{
            backgroundImage: "url('/branding/background-check.png')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="relative px-4 pt-4 pb-4">
          <div className="flex items-center gap-2.5">
            <Link href={`/empresas/${companyId}`} className="text-white/70 active:text-white transition-colors shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 5l-7 7 7 7" />
              </svg>
            </Link>
            <MoveCheckLogo size={30} className="shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] text-white/55 tracking-[0.25em] uppercase">MOVE CHECK · INVENTÁRIOS</div>
              <div className="font-bold text-sm text-white leading-tight truncate max-w-[220px]">{company.name}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 py-5 max-w-lg mx-auto w-full flex flex-col gap-4">
        <NewSessionForm companyId={companyId} />

        {sessions.length > 0 && (
          <div className="flex gap-3">
            <div className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-center shadow-sm">
              <div className="text-[10px] text-gray-400 tracking-wider uppercase">Total</div>
              <div className="text-lg font-bold text-gray-900">{sessions.length}</div>
            </div>
            <div className="flex-1 bg-green-50 border border-green-200 rounded-xl px-3 py-2.5 text-center">
              <div className="text-[10px] text-green-600 tracking-wider uppercase">Abertas</div>
              <div className="text-lg font-bold text-green-700">{openCount}</div>
            </div>
            <div className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-center shadow-sm">
              <div className="text-[10px] text-gray-400 tracking-wider uppercase">Fechadas</div>
              <div className="text-lg font-bold text-gray-500">{sessions.length - openCount}</div>
            </div>
          </div>
        )}

        {sessions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 px-4 py-10 text-center shadow-sm">
            <div className="text-3xl mb-2">📋</div>
            <div className="text-gray-400 text-sm">Nenhum inventário ainda</div>
            <div className="text-gray-300 text-xs mt-1">Crie um acima para começar</div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {sessions.map((session) => (
              <SessionCard key={session.id} session={session} companyId={companyId} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
