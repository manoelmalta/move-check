"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { lookupCode, saveLinkedScan, linkAndSave, savePendingScan } from "@/actions/scan";
import type { LookupResult } from "@/actions/scan";
import { searchProducts } from "@/actions/product";
import type { ProductResult } from "@/actions/product";
import { detectCodeType } from "@/lib/barcode";

// ─── Types ────────────────────────────────────────────────────────────────────

type Entry = {
  id: string;
  code: string;
  codeType: string;
  quantity: number;
  status: string;
  scannedAt: Date;
  product: { codigoInterno: string; descricao: string } | null;
};

type ScanState =
  | { phase: "idle" }
  | { phase: "looking"; code: string; codeType: string }
  | {
      phase: "found";
      code: string;
      codeType: string;
      product: { id: string; codigoInterno: string; descricao: string; unidadeMedida: string };
      unitsPerPackage: number | null;
    }
  | { phase: "not_found"; code: string; codeType: string }
  | {
      phase: "linking";
      code: string;
      codeType: string;
      searchQuery: string;
      searchResults: ProductResult[];
      searching: boolean;
    }
  | {
      phase: "confirm_link";
      code: string;
      codeType: string;
      product: ProductResult;
      unitsPerPackage: string;
    }
  | { phase: "saved"; code: string; productName: string | null; status: string }
  | { phase: "error"; message: string }
  | { phase: "duplicate"; code: string };

type Props = {
  session: { id: string; name: string };
  initialEntries: Entry[];
};

// ─── Component ────────────────────────────────────────────────────────────────

export function ScannerCockpit({ session, initialEntries }: Props) {
  const [input, setInput] = useState("");
  const [state, setState] = useState<ScanState>({ phase: "idle" });
  const [entries, setEntries] = useState<Entry[]>(initialEntries);
  const [quantity, setQuantity] = useState(1);

  const inputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const stateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refocus = useCallback(() => {
    setTimeout(() => inputRef.current?.focus(), 80);
  }, []);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const clearStateAfter = useCallback((ms: number) => {
    if (stateTimerRef.current) clearTimeout(stateTimerRef.current);
    stateTimerRef.current = setTimeout(() => setState({ phase: "idle" }), ms);
  }, []);

  const resetToIdle = useCallback(() => {
    setInput("");
    setQuantity(1);
    setState({ phase: "idle" });
    refocus();
  }, [refocus]);

  // ─── Lookup ─────────────────────────────────────────────────────────────────

  const handleLookup = useCallback(
    async (code: string) => {
      const clean = code.trim().replace(/\D/g, "");
      if (!clean) return;
      const codeType = detectCodeType(clean);
      setState({ phase: "looking", code: clean, codeType });

      const result: LookupResult = await lookupCode(clean);

      if (result.status === "found") {
        setState({
          phase: "found",
          code: clean,
          codeType,
          product: result.product,
          unitsPerPackage: result.unitsPerPackage,
        });
      } else if (result.status === "not_found") {
        setState({ phase: "not_found", code: clean, codeType });
      } else {
        setState({ phase: "error", message: result.message });
        clearStateAfter(3000);
        refocus();
      }
    },
    [clearStateAfter, refocus]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && input.trim()) {
      e.preventDefault();
      handleLookup(input);
    }
    if (e.key === "Escape") resetToIdle();
  };

  // ─── Save — código found ─────────────────────────────────────────────────

  const handleSaveFound = useCallback(async () => {
    if (state.phase !== "found") return;
    const result = await saveLinkedScan({
      sessionId: session.id,
      code: state.code,
      quantity,
      productId: state.product.id,
      unitsPerPackage: state.unitsPerPackage ?? undefined,
    });
    handleSaveResult(result, state.code, state.product.descricao, "VINCULADO");
  }, [state, session.id, quantity]); // eslint-disable-line

  // ─── Link flow ──────────────────────────────────────────────────────────────

  const enterLinking = useCallback(() => {
    if (state.phase !== "not_found") return;
    setState({
      phase: "linking",
      code: state.code,
      codeType: state.codeType,
      searchQuery: "",
      searchResults: [],
      searching: false,
    });
    setTimeout(() => searchRef.current?.focus(), 100);
  }, [state]);

  const handleSearchInput = useCallback(
    (query: string) => {
      if (state.phase !== "linking") return;
      setState((prev) =>
        prev.phase === "linking" ? { ...prev, searchQuery: query, searching: query.length >= 2 } : prev
      );

      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
      if (query.length < 2) {
        setState((prev) =>
          prev.phase === "linking" ? { ...prev, searchResults: [], searching: false } : prev
        );
        return;
      }

      searchTimerRef.current = setTimeout(async () => {
        const results = await searchProducts(query);
        setState((prev) =>
          prev.phase === "linking" ? { ...prev, searchResults: results, searching: false } : prev
        );
      }, 300);
    },
    [state.phase]
  );

  const handleSelectProduct = useCallback(
    (product: ProductResult) => {
      if (state.phase !== "linking") return;
      setState({
        phase: "confirm_link",
        code: state.code,
        codeType: state.codeType,
        product,
        unitsPerPackage: "",
      });
    },
    [state]
  );

  const handleConfirmLink = useCallback(async () => {
    if (state.phase !== "confirm_link") return;
    const units = state.unitsPerPackage ? parseInt(state.unitsPerPackage, 10) : undefined;
    const result = await linkAndSave({
      sessionId: session.id,
      code: state.code,
      quantity,
      productId: state.product.id,
      unitsPerPackage: units && units > 0 ? units : undefined,
    });
    handleSaveResult(result, state.code, state.product.descricao, "VINCULADO");
  }, [state, session.id, quantity]); // eslint-disable-line

  // ─── Save pending ────────────────────────────────────────────────────────────

  const handleSavePending = useCallback(async () => {
    if (state.phase !== "not_found" && state.phase !== "linking") return;
    const result = await savePendingScan({
      sessionId: session.id,
      code: state.code,
      quantity,
    });
    handleSaveResult(result, state.code, null, "PENDENTE_DE_VINCULO");
  }, [state, session.id, quantity]); // eslint-disable-line

  // ─── Result handler ──────────────────────────────────────────────────────────

  const handleSaveResult = useCallback(
    (
      result: { ok: boolean; entryId?: string; error?: string },
      code: string,
      productName: string | null,
      status: string
    ) => {
      if (!result.ok) {
        const error = (result as { error: string }).error;
        if (error.includes("já registrado")) {
          setState({ phase: "duplicate", code });
          clearStateAfter(3500);
        } else {
          setState({ phase: "error", message: error });
          clearStateAfter(3500);
        }
        refocus();
        return;
      }

      setState({ phase: "saved", code, productName, status });
      setInput("");
      setQuantity(1);

      const newEntry: Entry = {
        id: (result as { entryId: string }).entryId,
        code,
        codeType: detectCodeType(code),
        quantity,
        status,
        scannedAt: new Date(),
        product: productName ? { codigoInterno: "", descricao: productName } : null,
      };
      setEntries((prev) => [newEntry, ...prev.slice(0, 19)]);

      clearStateAfter(2000);
      refocus();
    },
    [clearStateAfter, refocus, quantity]
  );

  // ─── UI helpers ──────────────────────────────────────────────────────────────

  const isConfirming = state.phase === "found" || state.phase === "confirm_link";
  const isDunWithUnits =
    (state.phase === "found" && state.codeType === "DUN") ||
    (state.phase === "confirm_link" && state.codeType === "DUN");

  const feedbackConfig = (() => {
    switch (state.phase) {
      case "found":
        return { bg: "#dcfce7", border: "#16a34a", text: "#15803d", label: "PRODUTO ENCONTRADO" };
      case "not_found":
        return { bg: "#fefce8", border: "#ca8a04", text: "#92400e", label: "NÃO CADASTRADO" };
      case "linking":
        return { bg: "#fefce8", border: "#ca8a04", text: "#92400e", label: "BUSCAR PRODUTO" };
      case "confirm_link":
        return { bg: "#f0f9ff", border: "#0057B8", text: "#0057B8", label: "CONFIRMAR VÍNCULO" };
      case "saved":
        return state.status === "VINCULADO"
          ? { bg: "#dbeafe", border: "#0057B8", text: "#1e40af", label: "SALVO" }
          : { bg: "#fef3c7", border: "#d97706", text: "#92400e", label: "SALVO COMO PENDENTE" };
      case "error":
        return { bg: "#fee2e2", border: "#dc2626", text: "#b91c1c", label: "ERRO" };
      case "duplicate":
        return { bg: "#fef3c7", border: "#d97706", text: "#92400e", label: "DUPLICADO" };
      case "looking":
        return { bg: "#f0f9ff", border: "#0057B8", text: "#0057B8", label: "BUSCANDO…" };
      default:
        return null;
    }
  })();

  const showFeedback = feedbackConfig !== null;

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-dvh bg-[#f4f6f9] flex flex-col">

      {/* Header */}
      <header className="bg-[#0057B8] text-white px-4 pt-4 pb-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-white/70 active:text-white transition-colors">
            <ArrowLeft />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] text-white/50 tracking-[0.25em] uppercase">MOVE CHECK · SESSÃO</div>
            <div className="font-bold text-sm leading-none truncate">{session.name}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/sessoes"
            className="text-white/60 text-[11px] font-medium border border-white/20 rounded-lg px-2.5 py-1.5 active:bg-white/10 transition-colors"
          >
            Trocar
          </Link>
          <div className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-center">
            <div className="text-white/50 text-[9px] tracking-wider uppercase">Lidos</div>
            <div className="text-white font-bold text-sm leading-none">{entries.length}</div>
          </div>
        </div>
      </header>

      {/* Main area */}
      <div className="flex-1 flex flex-col px-4 py-4 gap-3 max-w-lg mx-auto w-full overflow-y-auto">

        {/* Scanner frame */}
        <div className="relative bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Corners */}
          <div className="absolute top-3 left-3 w-5 h-5 border-t-2 border-l-2 border-[#0057B8] rounded-tl-sm z-10" />
          <div className="absolute top-3 right-3 w-5 h-5 border-t-2 border-r-2 border-[#0057B8] rounded-tr-sm z-10" />
          <div className="absolute bottom-3 left-3 w-5 h-5 border-b-2 border-l-2 border-[#0057B8] rounded-bl-sm z-10" />
          <div className="absolute bottom-3 right-3 w-5 h-5 border-b-2 border-r-2 border-[#0057B8] rounded-br-sm z-10" />

          <div className="px-8 pt-6 pb-5">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] text-gray-400 tracking-[0.25em] uppercase">
                {state.phase === "idle" ? "Aguardando leitura" : "Código"}
              </div>
              {input && <CodeTypeBadge type={detectCodeType(input)} />}
            </div>

            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="000000000000"
              disabled={state.phase === "looking" || isConfirming || state.phase === "linking"}
              className="w-full text-center text-3xl font-mono font-bold tracking-widest bg-transparent outline-none placeholder:text-gray-200 text-gray-800 py-1"
              inputMode="numeric"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />

            {state.phase === "idle" && (
              <div className="mt-2 h-px bg-gradient-to-r from-transparent via-[#0057B8]/30 to-transparent" />
            )}
          </div>
        </div>

        {/* Feedback panel */}
        {showFeedback && feedbackConfig && (
          <div
            className="rounded-xl border-2 px-4 py-3 slide-up"
            style={{ background: feedbackConfig.bg, borderColor: feedbackConfig.border }}
          >
            <div
              className="text-[10px] font-bold tracking-[0.25em] uppercase mb-1.5"
              style={{ color: feedbackConfig.text }}
            >
              {feedbackConfig.label}
            </div>

            {state.phase === "found" && (
              <>
                <div className="font-bold text-gray-900 text-base">{state.product.descricao}</div>
                <div className="text-xs text-gray-500 font-mono mt-0.5">
                  {state.product.codigoInterno}
                  {state.unitsPerPackage && (
                    <span className="ml-2 text-purple-600">{state.unitsPerPackage} un/emb</span>
                  )}
                </div>
              </>
            )}
            {state.phase === "not_found" && (
              <div className="text-sm text-gray-700">
                Código <span className="font-mono font-bold">{state.code}</span> não está vinculado a nenhum produto.
              </div>
            )}
            {state.phase === "saved" && (
              <div className="text-sm text-gray-700">
                {state.productName ? (
                  <><span className="font-bold">{state.productName}</span> registrado.</>
                ) : (
                  <>Código <span className="font-mono font-bold">{state.code}</span> salvo como pendente.</>
                )}
              </div>
            )}
            {state.phase === "error" && (
              <div className="text-sm text-gray-700">{state.message}</div>
            )}
            {state.phase === "duplicate" && (
              <div className="text-sm text-gray-700">
                Código <span className="font-mono font-bold">{state.code}</span> já foi lido nesta sessão.
              </div>
            )}
          </div>
        )}

        {/* Qty selector — visible when confirming */}
        {isConfirming && (
          <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-4 py-3 slide-up">
            <span className="text-sm text-gray-500 font-medium">Quantidade</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-700 font-bold active:bg-gray-200"
              >−</button>
              <span className="text-xl font-bold text-gray-900 w-8 text-center">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => q + 1)}
                className="w-8 h-8 rounded-lg bg-[#0057B8] flex items-center justify-center text-white font-bold active:bg-[#003F8A]"
              >+</button>
            </div>
          </div>
        )}

        {/* DUN units per package */}
        {isDunWithUnits && state.phase === "confirm_link" && (
          <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 slide-up">
            <label className="text-[10px] text-gray-400 tracking-wider uppercase block mb-1.5">
              Qtd por embalagem (DUN) — opcional
            </label>
            <input
              type="number"
              min="1"
              value={state.unitsPerPackage}
              onChange={(e) =>
                setState((prev) =>
                  prev.phase === "confirm_link" ? { ...prev, unitsPerPackage: e.target.value } : prev
                )
              }
              placeholder="ex: 6"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono outline-none focus:border-[#0057B8]"
              inputMode="numeric"
            />
          </div>
        )}

        {/* ── LINKING — busca de produto ─────────────────────────────────────── */}
        {(state.phase === "linking") && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden slide-up">
            <div className="px-4 pt-3 pb-2 border-b border-gray-100">
              <div className="text-[10px] text-gray-400 tracking-wider uppercase mb-1.5">
                Buscar produto para vincular
              </div>
              <div className="flex items-center gap-2">
                <input
                  ref={searchRef}
                  type="text"
                  value={state.searchQuery}
                  onChange={(e) => handleSearchInput(e.target.value)}
                  placeholder="Código interno ou descrição…"
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#0057B8] focus:ring-1 focus:ring-[#0057B8]/20"
                  autoComplete="off"
                />
                {state.searching && (
                  <div className="w-4 h-4 border-2 border-[#0057B8] border-t-transparent rounded-full animate-spin shrink-0" />
                )}
              </div>
            </div>

            {state.searchResults.length > 0 && (
              <div className="divide-y divide-gray-100 max-h-52 overflow-y-auto">
                {state.searchResults.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleSelectProduct(p)}
                    className="w-full text-left px-4 py-3 active:bg-blue-50 transition-colors"
                  >
                    <div className="font-medium text-sm text-gray-900">{p.descricao}</div>
                    <div className="text-[11px] text-gray-400 font-mono mt-0.5">
                      {p.codigoInterno} · {p.unidadeMedida}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {state.searchQuery.length >= 2 && !state.searching && state.searchResults.length === 0 && (
              <div className="px-4 py-4 text-sm text-gray-400 text-center">
                Nenhum produto encontrado
              </div>
            )}
          </div>
        )}

        {/* ── CONFIRM_LINK — produto selecionado ─────────────────────────────── */}
        {state.phase === "confirm_link" && (
          <div className="bg-white rounded-2xl border-2 border-[#0057B8]/30 px-4 py-3 slide-up">
            <div className="text-[10px] text-[#0057B8] tracking-wider uppercase mb-1">
              Produto selecionado
            </div>
            <div className="font-bold text-gray-900">{state.product.descricao}</div>
            <div className="text-xs text-gray-400 font-mono mt-0.5">{state.product.codigoInterno}</div>
          </div>
        )}

        {/* ── ACTIONS ─────────────────────────────────────────────────────────── */}

        {/* Idle / Looking */}
        {(state.phase === "idle" || state.phase === "looking") && (
          <button
            onClick={() => input.trim() && handleLookup(input)}
            disabled={!input.trim() || state.phase === "looking"}
            className="w-full bg-[#0057B8] text-white font-bold text-lg rounded-2xl py-5 active:bg-[#003F8A] disabled:opacity-30 transition-colors shadow-md"
          >
            {state.phase === "looking" ? "Buscando…" : "Verificar Código"}
          </button>
        )}

        {/* Found */}
        {state.phase === "found" && (
          <div className="flex gap-3 slide-up">
            <button
              onClick={resetToIdle}
              className="flex-1 bg-white border-2 border-gray-200 text-gray-600 font-bold text-base rounded-2xl py-4 active:bg-gray-50"
            >
              Descartar
            </button>
            <button
              onClick={handleSaveFound}
              className="flex-[2] bg-[#0057B8] text-white font-bold text-base rounded-2xl py-4 active:bg-[#003F8A] shadow-md"
            >
              Salvar ✓
            </button>
          </div>
        )}

        {/* Not found */}
        {state.phase === "not_found" && (
          <div className="flex flex-col gap-2 slide-up">
            <button
              onClick={enterLinking}
              className="w-full bg-[#0057B8] text-white font-bold text-base rounded-2xl py-4.5 active:bg-[#003F8A] shadow-md"
            >
              Buscar e Vincular Produto
            </button>
            <div className="flex gap-2">
              <button
                onClick={resetToIdle}
                className="flex-1 bg-white border-2 border-gray-200 text-gray-500 font-medium text-sm rounded-xl py-3 active:bg-gray-50"
              >
                Descartar
              </button>
              <button
                onClick={handleSavePending}
                className="flex-1 bg-amber-50 border-2 border-amber-200 text-amber-700 font-medium text-sm rounded-xl py-3 active:bg-amber-100"
              >
                Salvar pendente
              </button>
            </div>
          </div>
        )}

        {/* Linking */}
        {state.phase === "linking" && (
          <div className="flex gap-2 slide-up">
            <button
              onClick={() =>
                setState({ phase: "not_found", code: state.code, codeType: state.codeType })
              }
              className="flex-1 bg-white border-2 border-gray-200 text-gray-500 font-medium text-sm rounded-xl py-3 active:bg-gray-50"
            >
              ← Voltar
            </button>
            <button
              onClick={handleSavePending}
              className="flex-1 bg-amber-50 border-2 border-amber-200 text-amber-700 font-medium text-sm rounded-xl py-3 active:bg-amber-100"
            >
              Salvar pendente
            </button>
          </div>
        )}

        {/* Confirm link */}
        {state.phase === "confirm_link" && (
          <div className="flex gap-3 slide-up">
            <button
              onClick={() =>
                setState({
                  phase: "linking",
                  code: state.code,
                  codeType: state.codeType,
                  searchQuery: "",
                  searchResults: [],
                  searching: false,
                })
              }
              className="flex-1 bg-white border-2 border-gray-200 text-gray-600 font-bold text-base rounded-2xl py-4 active:bg-gray-50"
            >
              ← Trocar
            </button>
            <button
              onClick={handleConfirmLink}
              className="flex-[2] bg-[#0057B8] text-white font-bold text-base rounded-2xl py-4 active:bg-[#003F8A] shadow-md"
            >
              Vincular e Salvar ✓
            </button>
          </div>
        )}
      </div>

      {/* Recent reads strip */}
      {entries.length > 0 && (
        <div className="bg-white border-t border-gray-200 px-4 pt-3 pb-4 max-w-lg mx-auto w-full shrink-0">
          <div className="text-[10px] text-gray-400 tracking-[0.25em] uppercase mb-2">
            Últimas leituras
          </div>
          <div className="flex flex-col gap-1 max-h-36 overflow-y-auto">
            {entries.slice(0, 6).map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between gap-2 py-1.5 border-b border-gray-100 last:border-0"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <CodeTypeBadge type={entry.codeType as "EAN" | "DUN" | "UNKNOWN"} small />
                  <div className="min-w-0">
                    <div className="font-mono text-xs text-gray-700 truncate">{entry.code}</div>
                    {entry.product && (
                      <div className="text-[10px] text-gray-400 truncate">{entry.product.descricao}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {entry.status === "PENDENTE_DE_VINCULO" && (
                    <span className="text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1 py-0.5 rounded">
                      PEND
                    </span>
                  )}
                  {entry.quantity > 1 && (
                    <span className="text-[11px] font-bold text-[#0057B8] bg-blue-50 px-1.5 py-0.5 rounded">
                      ×{entry.quantity}
                    </span>
                  )}
                  <span className="text-[10px] text-gray-300 font-mono">
                    {new Date(entry.scannedAt).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CodeTypeBadge({ type, small = false }: { type: string; small?: boolean }) {
  const styles: Record<string, string> = {
    EAN: "bg-[#0057B8] text-white",
    DUN: "bg-purple-600 text-white",
    UNKNOWN: "bg-gray-400 text-white",
  };
  return (
    <span
      className={`font-bold rounded tracking-wider uppercase ${
        small ? "text-[9px] px-1.5 py-0.5" : "text-[10px] px-2 py-1"
      } ${styles[type] ?? styles.UNKNOWN}`}
    >
      {type}
    </span>
  );
}

function ArrowLeft() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 12H5M12 5l-7 7 7 7" />
    </svg>
  );
}
