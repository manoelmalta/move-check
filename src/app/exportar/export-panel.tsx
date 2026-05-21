"use client";

import { useState } from "react";

type Session = {
  id: string;
  name: string;
  status: string;
  totalEntries: number;
  pendenteCount: number;
};

type Props = {
  sessions: Session[];
  preSelectedId?: string;
};

export function ExportPanel({ sessions, preSelectedId }: Props) {
  const defaultId =
    preSelectedId ??
    sessions.find((s) => s.status === "open")?.id ??
    sessions[0]?.id ??
    "";

  const [selected, setSelected] = useState<string>(defaultId);
  const [loading, setLoading] = useState(false);

  const selectedSession = sessions.find((s) => s.id === selected);

  const handleExport = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/export?sessionId=${selected}`);
      if (!res.ok) throw new Error("Falha ao exportar");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `move-check-${selectedSession?.name.replace(/\s+/g, "-") ?? selected}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Erro ao exportar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  if (sessions.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 px-4 py-10 text-center">
        <div className="text-3xl mb-2">📄</div>
        <div className="text-gray-400 text-sm">Nenhuma sessão para exportar</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm flex flex-col gap-4">
        {/* Session picker */}
        <div>
          <label className="text-[10px] text-gray-400 tracking-wider uppercase font-medium block mb-1.5">
            Selecionar sessão
          </label>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm text-gray-900 outline-none focus:border-[#0057B8] bg-white"
          >
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.status === "open" ? "🟢" : "⚫"} {s.name} — {s.totalEntries} leituras
              </option>
            ))}
          </select>
        </div>

        {/* Selected session info */}
        {selectedSession && (
          <div className="bg-gray-50 rounded-xl p-3 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wider uppercase ${
                  selectedSession.status === "open"
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                {selectedSession.status === "open" ? "Aberta" : "Fechada"}
              </span>
              <span className="text-xs text-gray-500 font-medium">{selectedSession.name}</span>
            </div>
            <div className="flex gap-3 text-xs text-gray-500">
              <span><strong className="text-gray-700">{selectedSession.totalEntries}</strong> leituras</span>
              {selectedSession.pendenteCount > 0 && (
                <span className="text-amber-600">
                  <strong>{selectedSession.pendenteCount}</strong> pendentes
                </span>
              )}
            </div>
            <div className="text-[11px] text-gray-400">
              Exporta: sessao · data_hora · codigo · tipo · produto · quantidade · units_per_package · status
            </div>
          </div>
        )}

        <button
          onClick={handleExport}
          disabled={!selected || loading}
          className="w-full bg-[#0057B8] text-white font-bold text-base rounded-xl py-4 active:bg-[#003F8A] disabled:opacity-40 transition-colors shadow-md"
        >
          {loading ? "Exportando…" : "Exportar CSV"}
        </button>
      </div>
    </div>
  );
}
