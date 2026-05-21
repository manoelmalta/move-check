import { notFound } from "next/navigation";
import Link from "next/link";
import { getCompanyById } from "@/actions/company";
import { getSessions } from "@/actions/session";
import { BrandedBackground } from "@/components/branded-background";
import { MoveCheckLogo } from "@/components/move-check-logo";

export const dynamic = "force-dynamic";

export default async function CompanyHomePage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  const company = await getCompanyById(companyId);
  if (!company) notFound();

  const sessions = await getSessions(companyId);
  const openCount = sessions.filter((s) => s.status === "open").length;
  const totalInventoryEntries = sessions.reduce((a, s) => a + s.totalEntries, 0);

  return (
    <div className="min-h-dvh flex flex-col relative overflow-hidden">
      <BrandedBackground variant="hero" />

      {/* Header */}
      <header className="relative z-10 px-4 pt-4 pb-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Link href="/empresas" className="text-white/70 active:text-white transition-colors shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 5l-7 7 7 7" />
              </svg>
            </Link>
            <MoveCheckLogo size={32} />
            <div className="min-w-0">
              <div className="text-[10px] text-white/55 tracking-[0.2em] uppercase">MOVE CHECK</div>
              <div className="font-bold text-sm text-white leading-tight truncate max-w-[200px]">
                {company.name}
              </div>
            </div>
          </div>
          <Link
            href="/empresas"
            className="text-white/60 text-[11px] font-medium border border-white/20 rounded-lg px-2.5 py-1.5 active:bg-white/10 transition-colors shrink-0"
          >
            Trocar
          </Link>
        </div>
      </header>

      {/* Company banner */}
      <div className="relative z-10 mx-4 mb-3">
        <div className="bg-white/15 border border-white/25 rounded-2xl px-4 py-3 backdrop-blur-sm">
          <div className="text-[10px] text-white/50 tracking-[0.25em] uppercase mb-0.5">Ambiente ativo</div>
          <div className="text-white font-bold text-lg leading-tight">{company.name}</div>
          {company.document && (
            <div className="text-white/50 text-xs font-mono mt-0.5">{company.document}</div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="relative z-10 px-4 mb-4">
        <div className="flex gap-3">
          <StatCard label="Sessões abertas" value={openCount} accent />
          <StatCard label="Total leituras" value={totalInventoryEntries} />
          <StatCard label="Sessões" value={sessions.length} />
        </div>
      </div>

      {/* Module cards */}
      <div className="relative z-10 flex-1 px-4 pb-8 flex flex-col gap-3 max-w-lg mx-auto w-full">

        <Link
          href={`/empresas/${companyId}/inventarios`}
          className="bg-white rounded-2xl shadow-xl px-5 py-4 flex items-center gap-4 active:bg-blue-50 transition-colors"
        >
          <div className="w-11 h-11 rounded-xl bg-[#0057B8] flex items-center justify-center shrink-0">
            <BarIcon />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-gray-900">Inventários / Ondas</div>
            <div className="text-xs text-gray-400 mt-0.5">
              {openCount > 0 ? `${openCount} sessão${openCount > 1 ? "ões" : ""} aberta${openCount > 1 ? "s" : ""}` : "Gerenciar sessões de contagem"}
            </div>
          </div>
          <ChevronRight />
        </Link>

        <Link
          href={`/empresas/${companyId}/coletar`}
          className="bg-white rounded-2xl shadow-xl px-5 py-4 flex items-center gap-4 active:bg-blue-50 transition-colors"
        >
          <div className="w-11 h-11 rounded-xl bg-[#0057B8] flex items-center justify-center shrink-0">
            <ScanIcon />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-gray-900">Coletar</div>
            <div className="text-xs text-gray-400 mt-0.5">Inventário ou Cadastro de Produto</div>
          </div>
          <ChevronRight />
        </Link>

        <Link
          href={`/empresas/${companyId}/produtos`}
          className="bg-white rounded-2xl shadow-xl px-5 py-4 flex items-center gap-4 active:bg-gray-50 transition-colors"
        >
          <div className="w-11 h-11 rounded-xl bg-gray-700 flex items-center justify-center shrink-0">
            <BoxIcon />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-gray-900">Produtos</div>
            <div className="text-xs text-gray-400 mt-0.5">Catálogo e códigos de barras</div>
          </div>
          <ChevronRight />
        </Link>

        <div className="grid grid-cols-2 gap-3">
          <Link
            href={`/empresas/${companyId}/importar`}
            className="bg-white rounded-2xl shadow-xl px-4 py-4 flex items-center gap-3 active:bg-gray-50 transition-colors"
          >
            <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
              <UploadIcon />
            </div>
            <span className="font-semibold text-gray-900 text-sm">Importar</span>
          </Link>
          <Link
            href={`/empresas/${companyId}/exportar`}
            className="bg-white rounded-2xl shadow-xl px-4 py-4 flex items-center gap-3 active:bg-gray-50 transition-colors"
          >
            <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
              <DownloadIcon />
            </div>
            <span className="font-semibold text-gray-900 text-sm">Exportar</span>
          </Link>
        </div>

        {/* Coming soon */}
        <div className="bg-white/10 border border-white/20 rounded-2xl px-4 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
            <MapPinIcon />
          </div>
          <div>
            <div className="text-white/60 font-semibold text-sm">Endereços</div>
            <div className="text-white/30 text-xs">Em breve</div>
          </div>
        </div>

      </div>
    </div>
  );
}

function StatCard({ label, value, accent = false }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-3 text-center">
      <div className="text-white/50 text-[10px] tracking-wider uppercase leading-tight">{label}</div>
      <div className={`font-bold text-lg mt-0.5 ${accent && value > 0 ? "text-green-300" : "text-white"}`}>
        {value}
      </div>
    </div>
  );
}

function BarIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="6" width="3" height="12" rx="0.5" fill="white"/>
      <rect x="8" y="6" width="1.5" height="12" rx="0.5" fill="white"/>
      <rect x="11.5" y="6" width="2.5" height="12" rx="0.5" fill="white"/>
      <rect x="16" y="6" width="1.5" height="12" rx="0.5" fill="white"/>
      <rect x="19.5" y="6" width="1.5" height="12" rx="0.5" fill="white"/>
    </svg>
  );
}

function ScanIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23,6 23,2 19,2"/>
      <polyline points="1,6 1,2 5,2"/>
      <polyline points="23,18 23,22 19,22"/>
      <polyline points="1,18 1,22 5,22"/>
      <line x1="7" y1="12" x2="17" y2="12"/>
    </svg>
  );
}

function BoxIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
      <polyline points="3.27,6.96 12,12.01 20.73,6.96"/>
      <line x1="12" y1="22.08" x2="12" y2="12"/>
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="17,8 12,3 7,8"/>
      <line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7,10 12,15 17,10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  );
}

function MapPinIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg className="text-gray-300 ml-auto shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18l6-6-6-6"/>
    </svg>
  );
}
