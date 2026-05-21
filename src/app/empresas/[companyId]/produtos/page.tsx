export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { getCompanyById } from "@/actions/company";
import { getProducts } from "@/actions/product";
import { AddProductForm } from "@/app/produtos/add-product-form";
import { ProductSearch } from "@/app/produtos/product-search";
import { MoveCheckLogo } from "@/components/move-check-logo";

export default async function ProdutosCompanyPage({
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

  const products = await getProducts(companyId, q);
  const basePath = `/empresas/${companyId}/produtos`;

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
              <div className="text-[10px] text-white/55 tracking-[0.25em] uppercase">MOVE CHECK · PRODUTOS</div>
              <div className="font-bold text-sm text-white leading-tight truncate max-w-[220px]">{company.name}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 py-5 max-w-lg mx-auto w-full flex flex-col gap-4">
        <AddProductForm companyId={companyId} />
        <ProductSearch initialQuery={q ?? ""} basePath={basePath} />

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-400 tracking-wider uppercase font-medium">
              {q ? `Resultados para "${q}"` : "Catálogo"}
            </span>
            <span className="text-xs text-gray-400">{products.length} produtos</span>
          </div>

          {products.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <div className="text-3xl mb-2">📦</div>
              <div className="text-gray-400 text-sm">
                {q ? "Nenhum produto encontrado" : "Nenhum produto cadastrado"}
              </div>
              <div className="text-gray-300 text-xs mt-1">
                {q ? "Tente outro termo" : "Adicione acima ou importe via CSV"}
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {products.map((p) => (
                <div key={p.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm text-gray-900 truncate">{p.descricao}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-gray-400 font-mono">{p.codigoInterno}</span>
                        <span className="text-[10px] text-gray-300">·</span>
                        <span className="text-[10px] text-gray-400">{p.unidadeMedida}</span>
                        {p.observacao && (
                          <>
                            <span className="text-[10px] text-gray-300">·</span>
                            <span className="text-[10px] text-gray-400 truncate">{p.observacao}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {p.barcodes.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {p.barcodes.map((b) => (
                        <span
                          key={b.code}
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                            b.codeType === "EAN"
                              ? "bg-blue-50 border-blue-200 text-blue-700"
                              : b.codeType === "DUN"
                              ? "bg-purple-50 border-purple-200 text-purple-700"
                              : "bg-gray-50 border-gray-200 text-gray-600"
                          }`}
                        >
                          {b.codeType} {b.code}
                          {b.unitsPerPackage ? ` · ${b.unitsPerPackage}un/emb` : ""}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
