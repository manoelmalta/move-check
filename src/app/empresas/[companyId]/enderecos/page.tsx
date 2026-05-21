export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { getCompanyById } from "@/actions/company";
import { listAddresses } from "@/actions/address";
import { MoveCheckLogo } from "@/components/move-check-logo";
import { AddressForm } from "./address-form";
import { AddressActions } from "./address-actions";

export default async function EnderecosPage({
  params,
  searchParams,
}: {
  params: Promise<{ companyId: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { companyId } = await params;
  const { q } = await searchParams;
  const company = await getCompanyById(companyId);
  if (!company) notFound();

  const addresses = await listAddresses(companyId, q);
  const activeCount = addresses.filter((a) => a.isActive).length;

  return (
    <div className="min-h-dvh bg-[#f4f6f9] flex flex-col">
      {/* Header */}
      <div className="bg-[#0F766E] relative overflow-hidden">
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
              <div className="text-[10px] text-white/55 tracking-[0.25em] uppercase">MOVE CHECK · ENDEREÇOS</div>
              <div className="font-bold text-sm text-white leading-tight truncate max-w-[220px]">{company.name}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 py-5 max-w-lg mx-auto w-full flex flex-col gap-4">
        <AddressForm companyId={companyId} />

        {addresses.length > 0 && (
          <div className="flex gap-3">
            <div className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-center shadow-sm">
              <div className="text-[10px] text-gray-400 tracking-wider uppercase">Total</div>
              <div className="text-lg font-bold text-gray-900">{addresses.length}</div>
            </div>
            <div className="flex-1 bg-teal-50 border border-teal-200 rounded-xl px-3 py-2.5 text-center">
              <div className="text-[10px] text-teal-600 tracking-wider uppercase">Ativos</div>
              <div className="text-lg font-bold text-teal-700">{activeCount}</div>
            </div>
            <div className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-center shadow-sm">
              <div className="text-[10px] text-gray-400 tracking-wider uppercase">Inativos</div>
              <div className="text-lg font-bold text-gray-500">{addresses.length - activeCount}</div>
            </div>
          </div>
        )}

        {addresses.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 px-4 py-10 text-center shadow-sm">
            <div className="text-3xl mb-2">📍</div>
            <div className="text-gray-400 text-sm">Nenhum endereço cadastrado</div>
            <div className="text-gray-300 text-xs mt-1">Cadastre acima para iniciar a malha</div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm divide-y divide-gray-100">
            {addresses.map((a) => (
              <div key={a.id} className="px-4 py-3 flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-gray-900">{a.code}</span>
                    {!a.isActive && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-400 uppercase tracking-wider">inativo</span>
                    )}
                  </div>
                  {a.description && (
                    <div className="text-xs text-gray-500 truncate mt-0.5">{a.description}</div>
                  )}
                  <div className="flex gap-2 mt-1 text-[10px] text-gray-400">
                    {a.area && <span>Área: {a.area}</span>}
                    <span>Rua {a.rua} · Préd {a.predio} · Nív {a.nivel} · Apto {a.apto}</span>
                  </div>
                </div>
                <AddressActions companyId={companyId} addressId={a.id} isActive={a.isActive} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
