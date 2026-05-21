export const dynamic = "force-dynamic";

import Link from "next/link";
import { getCompanies } from "@/actions/company";
import { CreateCompanyForm } from "./create-company-form";
import { BrandedBackground } from "@/components/branded-background";
import { MoveCheckLogo } from "@/components/move-check-logo";

export default async function EmpresasPage() {
  const companies = await getCompanies();

  return (
    <div className="min-h-dvh flex flex-col relative overflow-hidden">
      <BrandedBackground variant="hero" />

      <header className="relative z-10 px-5 pt-7 pb-5">
        <div className="flex items-center gap-3 mb-1">
          <MoveCheckLogo size={44} priority />
          <div>
            <div className="text-white font-bold text-xl tracking-[0.15em] uppercase leading-none">MOVE</div>
            <div className="text-white/55 text-[10px] tracking-[0.35em] uppercase mt-1">CHECK</div>
          </div>
        </div>
        <p className="text-white/50 text-[11px] tracking-[0.25em] uppercase mt-3">
          Selecione o ambiente
        </p>
      </header>

      <div className="relative z-10 flex-1 px-4 pb-8 max-w-lg mx-auto w-full flex flex-col gap-4">

        {companies.length === 0 ? (
          <div className="bg-white/10 border border-white/20 rounded-2xl px-5 py-8 text-center">
            <div className="text-white/60 text-sm">Nenhuma empresa cadastrada ainda.</div>
            <div className="text-white/40 text-xs mt-1">Crie abaixo para começar.</div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {companies.map((company) => (
              <Link
                key={company.id}
                href={`/empresas/${company.id}`}
                className="group bg-white rounded-2xl shadow-xl px-5 py-4 flex items-center justify-between gap-3 active:bg-blue-50 transition-colors"
              >
                <div className="min-w-0">
                  <div className="font-bold text-gray-900 text-base leading-tight truncate">
                    {company.name}
                  </div>
                  {company.document && (
                    <div className="text-xs text-gray-400 font-mono mt-0.5">{company.document}</div>
                  )}
                  {company.notes && (
                    <div className="text-xs text-gray-400 mt-0.5 truncate">{company.notes}</div>
                  )}
                  <div className="text-[10px] text-gray-300 mt-1">
                    Criada em {company.createdAt.toLocaleDateString("pt-BR")}
                  </div>
                </div>
                <svg className="text-[#0057B8] shrink-0 group-active:text-[#003F8A]" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
        )}

        <CreateCompanyForm />
      </div>
    </div>
  );
}
