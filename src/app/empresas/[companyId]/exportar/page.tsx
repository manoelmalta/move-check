import Link from "next/link";
import { notFound } from "next/navigation";
import { getCompanyById } from "@/actions/company";
import { getSessions } from "@/actions/session";
import { ExportPanel } from "@/app/exportar/export-panel";
import { MoveCheckLogo } from "@/components/move-check-logo";

export default async function ExportarCompanyPage({
  params,
  searchParams,
}: {
  params: Promise<{ companyId: string }>;
  searchParams: Promise<{ sessionId?: string }>;
}) {
  const { companyId } = await params;
  const { sessionId } = await searchParams;

  const company = await getCompanyById(companyId);
  if (!company) notFound();

  const sessions = await getSessions(companyId);

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
              <div className="text-[10px] text-white/55 tracking-[0.25em] uppercase">MOVE CHECK · EXPORTAR</div>
              <div className="font-bold text-sm text-white leading-tight truncate max-w-[220px]">{company.name}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 py-5 max-w-lg mx-auto w-full flex flex-col gap-4">
        <ExportPanel
          companyId={companyId}
          sessions={sessions.map((s) => ({
            id: s.id,
            name: s.name,
            status: s.status,
            totalEntries: s.totalEntries,
            pendenteCount: s.pendenteCount,
          }))}
          preSelectedId={sessionId}
        />
      </div>
    </div>
  );
}
