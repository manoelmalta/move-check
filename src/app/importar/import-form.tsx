"use client";

import { useState, useRef } from "react";
import { previewImport, executeImport } from "@/actions/product";
import type { ImportRow, ImportPreview } from "@/actions/product";
import { useRouter } from "next/navigation";

function parseCsv(text: string): { rows: ImportRow[]; parseError?: string } {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return { rows: [], parseError: "Arquivo sem linhas de dados." };

  const rawHeader = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/[^a-z_]/g, ""));
  const codigoIdx = rawHeader.indexOf("codigo_interno");
  const descricaoIdx = rawHeader.indexOf("descricao");
  const unidadeIdx = rawHeader.indexOf("unidade_medida");
  const obsIdx = rawHeader.indexOf("observacao");

  if (codigoIdx === -1) return { rows: [], parseError: "Coluna codigo_interno não encontrada." };
  if (descricaoIdx === -1) return { rows: [], parseError: "Coluna descricao não encontrada." };

  const rows: ImportRow[] = lines.slice(1).map((line) => {
    const cols = line.split(",");
    return {
      codigoInterno: cols[codigoIdx]?.trim() ?? "",
      descricao: cols[descricaoIdx]?.trim() ?? "",
      unidadeMedida: unidadeIdx >= 0 ? cols[unidadeIdx]?.trim() || "UN" : "UN",
      observacao: obsIdx >= 0 ? cols[obsIdx]?.trim() || undefined : undefined,
    };
  });

  return { rows };
}

type Step = "idle" | "parsed" | "previewing" | "previewed" | "importing" | "done";

export function ImportForm() {
  const [step, setStep] = useState<Step>("idle");
  const [parseError, setParseError] = useState("");
  const [rawRows, setRawRows] = useState<ImportRow[]>([]);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [result, setResult] = useState<{ created: number; updated: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const reset = () => {
    setStep("idle");
    setParseError("");
    setRawRows([]);
    setPreview(null);
    setResult(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    reset();
    setStep("parsed"); // optimistically show loading

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const { rows, parseError: err } = parseCsv(text);
      if (err) {
        setParseError(err);
        setStep("idle");
        return;
      }
      setRawRows(rows);
      setStep("parsed");
    };
    reader.readAsText(file, "utf-8");
  };

  const handlePreview = async () => {
    setStep("previewing");
    const p = await previewImport(rawRows);
    setPreview(p);
    setStep("previewed");
  };

  const handleImport = async () => {
    if (!preview) return;
    setStep("importing");
    const validRows = [...preview.newRows, ...preview.updateRows];
    const res = await executeImport(validRows);
    setResult(res);
    setStep("done");
    router.refresh();
  };

  const totalLines = rawRows.length;

  return (
    <div className="flex flex-col gap-3">

      {/* File picker */}
      <label className="flex flex-col items-center justify-center gap-2 bg-white border-2 border-dashed border-gray-300 rounded-2xl py-7 px-4 cursor-pointer active:border-[#0057B8] transition-colors">
        <span className="text-3xl">📁</span>
        <div className="text-center">
          <div className="font-semibold text-gray-700 text-sm">
            {step === "idle" ? "Selecionar arquivo CSV" : "Trocar arquivo"}
          </div>
          <div className="text-gray-400 text-xs mt-0.5">Toque para escolher</div>
        </div>
        <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
      </label>

      {parseError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          {parseError}
        </div>
      )}

      {/* File loaded — show count */}
      {(step === "parsed" || step === "previewing") && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden slide-up">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-400 tracking-wider uppercase font-medium">Arquivo carregado</span>
            <span className="text-xs font-bold text-gray-700">{totalLines} linhas de dados</span>
          </div>
          <div className="px-4 py-3">
            <button
              onClick={handlePreview}
              disabled={step === "previewing"}
              className="w-full bg-[#0057B8] text-white font-bold text-base rounded-xl py-3.5 active:bg-[#003F8A] disabled:opacity-50 transition-colors"
            >
              {step === "previewing" ? "Analisando…" : "Analisar arquivo"}
            </button>
          </div>
        </div>
      )}

      {/* Preview */}
      {(step === "previewed" || step === "importing") && preview && (
        <div className="flex flex-col gap-3 slide-up">
          {/* Summary counts */}
          <div className="grid grid-cols-3 gap-2">
            <SummaryCard
              value={preview.newRows.length}
              label="Novos"
              color="green"
            />
            <SummaryCard
              value={preview.updateRows.length}
              label="Atualizar"
              color="blue"
            />
            <SummaryCard
              value={preview.errorRows.length}
              label="Com erro"
              color="red"
            />
          </div>

          {/* Error details */}
          {preview.errorRows.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl overflow-hidden">
              <div className="px-4 py-2 bg-red-100 border-b border-red-200">
                <span className="text-[10px] text-red-700 tracking-wider uppercase font-bold">
                  Linhas ignoradas
                </span>
              </div>
              <div className="divide-y divide-red-100 max-h-36 overflow-y-auto">
                {preview.errorRows.map((err, i) => (
                  <div key={i} className="px-4 py-2 flex items-center gap-3">
                    <span className="text-[10px] text-red-400 font-mono shrink-0">L{err.line}</span>
                    <div className="min-w-0">
                      {err.codigoInterno && (
                        <span className="text-[11px] font-mono text-red-600 mr-1">{err.codigoInterno}</span>
                      )}
                      <span className="text-[11px] text-red-700">{err.reason}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Confirm or no valid rows */}
          {preview.newRows.length + preview.updateRows.length > 0 ? (
            <button
              onClick={handleImport}
              disabled={step === "importing"}
              className="w-full bg-[#0057B8] text-white font-bold text-base rounded-2xl py-4.5 active:bg-[#003F8A] disabled:opacity-50 transition-colors shadow-md"
            >
              {step === "importing"
                ? "Importando…"
                : `Confirmar — ${preview.newRows.length + preview.updateRows.length} produtos`}
            </button>
          ) : (
            <div className="text-center text-sm text-gray-400 py-2">
              Nenhuma linha válida para importar.
            </div>
          )}

          <button onClick={reset} className="text-sm text-gray-400 underline text-center py-1">
            Cancelar
          </button>
        </div>
      )}

      {/* Done */}
      {step === "done" && result && (
        <div className="bg-green-50 border border-green-200 rounded-2xl px-4 py-4 slide-up">
          <div className="text-[10px] text-green-700 tracking-wider uppercase font-bold mb-1.5">
            Importação concluída
          </div>
          <div className="flex gap-4">
            <div>
              <div className="text-2xl font-bold text-green-800">{result.created}</div>
              <div className="text-xs text-green-600">criados</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-700">{result.updated}</div>
              <div className="text-xs text-blue-500">atualizados</div>
            </div>
          </div>
          <button
            onClick={reset}
            className="mt-3 text-sm text-[#0057B8] font-medium underline"
          >
            Importar outro arquivo
          </button>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  value,
  label,
  color,
}: {
  value: number;
  label: string;
  color: "green" | "blue" | "red";
}) {
  const styles = {
    green: "bg-green-50 border-green-200 text-green-800",
    blue: "bg-blue-50 border-blue-200 text-blue-800",
    red: "bg-red-50 border-red-200 text-red-700",
  };
  return (
    <div className={`rounded-xl border px-3 py-3 text-center ${styles[color]}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-[10px] tracking-wider uppercase font-medium mt-0.5">{label}</div>
    </div>
  );
}
