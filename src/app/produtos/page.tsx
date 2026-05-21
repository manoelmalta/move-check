import { getProducts } from "@/actions/product";
import { PageHeader } from "@/components/ui/page-header";
import { AddProductForm } from "./add-product-form";
import { ProductSearch } from "./product-search";

export default async function ProdutosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const products = await getProducts(q);

  return (
    <div className="min-h-dvh bg-[#f4f6f9] flex flex-col">
      <PageHeader title="Produtos" subtitle="MOVE CHECK" />

      <div className="flex-1 px-4 py-5 max-w-lg mx-auto w-full flex flex-col gap-4">
        <AddProductForm />
        <ProductSearch initialQuery={q ?? ""} />

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
                      <div className="font-medium text-sm text-gray-900 truncate">
                        {p.descricao}
                      </div>
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

                  {/* Barcodes vinculados */}
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
