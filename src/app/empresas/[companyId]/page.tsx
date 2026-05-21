import { notFound } from "next/navigation";
import Link from "next/link";
import { getCompanyById } from "@/actions/company";
import { getSessions } from "@/actions/session";
import { listPendingItems } from "@/actions/pending";
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

  const [sessions, pendingItems] = await Promise.all([
    getSessions(companyId),
    listPendingItems(companyId, "PENDENTE"),
  ]);
  const openCount = sessions.filter((s) => s.status === "open").length;
  const totalInventoryEntries = sessions.reduce((a, s) => a + s.totalEntries, 0);
  const pendingCount = pendingItems.length;

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
          <StatCard label="Invent. abertos" value={openCount} accent />
          <StatCard label="Total leituras" value={totalInventoryEntries} />
          <StatCard label="Pendências" value={pendingCount} accent={pendingCount > 0} amber={pendingCount > 0} />
        </div>
      </div>

      {/* Module cards */}
      <div className="relative z-10 flex-1 px-4 pb-8 flex flex-col gap-3 max-w-lg mx-auto w-full">

        <ModuleCard
          href={`/empresas/${companyId}/inventarios`}
          title="Inventários / Ondas"
          subtitle={openCount > 0 ? `${openCount} aberto${openCount > 1 ? "s" : ""}` : "Contagens físicas de estoque"}
          iconBg="#0057B8"
          icon={<BarIcon />}
        />

        <ModuleCard
          href={`/empresas/${companyId}/pendencias`}
          title="Pendências"
          subtitle={pendingCount > 0 ? `${pendingCount} item${pendingCount > 1 ? "s" : ""} a tratar` : "Itens não cadastrados do inventário"}
          iconBg={pendingCount > 0 ? "#D97706" : "#6B7280"}
          icon={<AlertIcon />}
        />

        <ModuleCard
          href={`/empresas/${companyId}/produtos`}
          title="Cadastro de Produtos"
          subtitle="Catálogo, EAN, DUN, picking, endereço fixo"
          iconBg="#1F2937"
          icon={<BoxIcon />}
        />

        <ModuleCard
          href={`/empresas/${companyId}/enderecos`}
          title="Cadastro de Endereços"
          subtitle="Malha de endereçamento do galpão"
          iconBg="#0F766E"
          icon={<MapPinIcon />}
        />

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

      </div>
    </div>
  );
}

function ModuleCard({
  href,
  title,
  subtitle,
  iconBg,
  icon,
}: {
  href: string;
  title: string;
  subtitle: string;
  iconBg: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="bg-white rounded-2xl shadow-xl px-5 py-4 flex items-center gap-4 active:bg-gray-50 transition-colors"
    >
      <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: iconBg }}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-bold text-gray-900">{title}</div>
        <div className="text-xs text-gray-400 mt-0.5">{subtitle}</div>
      </div>
      <ChevronRight />
    </Link>
  );
}

function StatCard({
  label,
  value,
  accent = false,
  amber = false,
}: {
  label: string;
  value: number;
  accent?: boolean;
  amber?: boolean;
}) {
  const valueColor = accent && value > 0 ? (amber ? "text-amber-300" : "text-green-300") : "text-white";
  return (
    <div className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-3 text-center">
      <div className="text-white/50 text-[10px] tracking-wider uppercase leading-tight">{label}</div>
      <div className={`font-bold text-lg mt-0.5 ${valueColor}`}>{value}</div>
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

function BoxIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
      <polyline points="3.27,6.96 12,12.01 20.73,6.96"/>
      <line x1="12" y1="22.08" x2="12" y2="12"/>
    </svg>
  );
}

function MapPinIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
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

function ChevronRight() {
  return (
    <svg className="text-gray-300 ml-auto shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18l6-6-6-6"/>
    </svg>
  );
}
