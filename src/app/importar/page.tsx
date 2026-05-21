import { PageHeader } from "@/components/ui/page-header";
import { ImportForm } from "./import-form";

export default function ImportarPage() {
  return (
    <div className="min-h-dvh bg-[#f4f6f9] flex flex-col">
      <PageHeader title="Importar Produtos" subtitle="MOVE CHECK" />

      <div className="flex-1 px-4 py-5 max-w-lg mx-auto w-full flex flex-col gap-4">

        {/* Template guide */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-[#0057B8]/5 border-b border-[#0057B8]/10">
            <div className="text-[10px] text-[#0057B8] tracking-wider uppercase font-bold">
              Modelo de arquivo
            </div>
          </div>
          <div className="p-4 flex flex-col gap-3">
            <div className="font-mono text-xs bg-gray-50 rounded-lg p-3 border border-gray-200 overflow-x-auto">
              <div className="text-gray-400 mb-1">codigo_interno,descricao,unidade_medida,observacao</div>
              <div className="text-gray-700">1001,DETERGENTE NEUTRO 5L,UN,</div>
              <div className="text-gray-700">1002,ÁGUA SANITÁRIA 2L,UN,</div>
              <div className="text-gray-700">1003,AMACIANTE CONC 2L,L,Concentrado</div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                { field: "codigo_interno", req: true, desc: "Identificador único do produto" },
                { field: "descricao", req: true, desc: "Nome/descrição do produto" },
                { field: "unidade_medida", req: false, desc: "UN, KG, L, CX… (padrão: UN)" },
                { field: "observacao", req: false, desc: "Campo livre, pode ficar vazio" },
              ].map((f) => (
                <div key={f.field} className="bg-gray-50 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="font-mono text-[11px] text-gray-700 font-bold">{f.field}</span>
                    {f.req ? (
                      <span className="text-[9px] text-red-600 font-bold uppercase tracking-wider">obrig.</span>
                    ) : (
                      <span className="text-[9px] text-gray-400 uppercase tracking-wider">opcional</span>
                    )}
                  </div>
                  <div className="text-[10px] text-gray-400">{f.desc}</div>
                </div>
              ))}
            </div>

            <div className="text-[11px] text-gray-400 bg-blue-50 rounded-lg px-3 py-2 border border-blue-100">
              <span className="font-bold text-[#0057B8]">Upsert ativo:</span> produtos com mesmo{" "}
              <span className="font-mono">codigo_interno</span> serão <strong>atualizados</strong>, não duplicados.
            </div>
          </div>
        </div>

        <ImportForm />
      </div>
    </div>
  );
}
