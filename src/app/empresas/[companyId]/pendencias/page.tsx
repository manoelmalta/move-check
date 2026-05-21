export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { getCompanyById } from "@/actions/company";
import { listPendingItems } from "@/actions/pending";
import { MoveCheckLogo } from "@/components/move-check-logo";
import { PendingActions } from "./pending-actions";

export default async function PendenciasPage({
  params,
  searchParams,
}: {
  params: Promise<{ companyId: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { companyId } = await params;
  const { status } = await searchParams;
  const company = await getCompanyById(companyId);
  if (!company) notFound();

  const filterStatus =
    status === "RESOLVIDO" ? "RESOLVIDO" : status === "DESCARTADO" ? "DESCARTADO" : "PENDENTE";

  const items = await listPendingItems(companyId, filterStatus);

  return (
    <div className="min-h-dvh bg-[#f4f6f9] flex flex-col">
      {/* Header */}
      <div className="bg-[#D97706] relative overflow-hidden">
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
              <div className="text-[10px] text-white/55 tracking-[0.25em] uppercase">MOVE CHECK · PENDÊNCIAS</div>
              <div className="font-bold text-sm text-white leading-tight truncate max-w-[220px]">{company.name}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 py-5 max-w-lg mx-auto w-full flex flex-col gap-4">
        {/* Filter tabs */}
        <div className="bg-white rounded-2xl border border-gray-200 p-1 flex gap-1 shadow-sm">
          <TabLink href={`/empresas/${companyId}/pendencias`} active={filterStatus === "PENDENTE"} label="Pendentes" />
          <TabLink href={`/empresas/${companyId}/pendencias?status=RESOLVIDO`} active={filterStatus === "RESOLVIDO"} label="Resolvidas" />
          <TabLink href={`/empresas/${companyId}/pendencias?status=DESCARTADO`} active={filterStatus === "DESCARTADO"} label="Descartadas" />
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-xs text-amber-800">
          <strong>Pendências de cadastro</strong> são códigos lidos durante inventário que ainda não estão cadastrados.
          O tratamento cadastral deve ser feito no módulo Cadastro de Produtos.
        </div>

        {items.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 px-4 py-10 text-center shadow-sm">
            <div className="text-3xl mb-2">✓</div>
            <div className="text-gray-400 text-sm">Nenhuma pendência {filterStatus.toLowerCase()}</div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {items.map((item) => (
              <div key={item.id} className="bg-white rounded-2xl border border-gray-200 px-4 py-3 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    {item.code && (
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-gray-900">{item.code}</span>
                        {item.codeType && (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              item.codeType === "EAN"
                                ? "bg-blue-50 text-blue-700"
                                : item.codeType === "DUN"
                                ? "bg-purple-50 text-purple-700"
                                : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {item.codeType}
                          </span>
                        )}
                      </div>
                    )}
                    {item.description && (
                      <div className="text-xs text-gray-600 mt-0.5">{item.description}</div>
                    )}
                    <div className="text-[10px] text-gray-400 mt-1 flex gap-2 flex-wrap">
                      <span>Origem: {originLabel(item.origin)}</span>
                      {item.sessionName && <span>· Inv.: {item.sessionName}</span>}
                      <span>· {item.createdAt.toLocaleString("pt-BR")}</span>
                    </div>
                  </div>
                  {filterStatus === "PENDENTE" && (
                    <PendingActions companyId={companyId} pendingId={item.id} />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TabLink({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      className={`flex-1 text-center text-xs font-bold py-2 rounded-xl transition-colors ${
        active ? "bg-[#D97706] text-white" : "text-gray-500 active:bg-gray-50"
      }`}
    >
      {label}
    </Link>
  );
}

function originLabel(origin: string): string {
  switch (origin) {
    case "INVENTORY_PENDING_SCAN":
      return "Inventário (código não cadastrado)";
    default:
      return origin;
  }
}
