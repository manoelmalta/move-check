"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { lookupCode, searchProductByText } from "@/actions/scan";
import type { ProductWithBarcodes } from "@/actions/scan";
import { searchProducts } from "@/actions/product";
import type { ProductResult } from "@/actions/product";
import { linkBarcodeOnly, logAlreadyLinked } from "@/actions/registration";
import type { RegLogEntry } from "@/actions/registration";
import { detectCodeType } from "@/lib/barcode";
import { CameraScanner } from "./camera-scanner";
import { MoveCheckLogo } from "@/components/move-check-logo";

// ─── Types ────────────────────────────────────────────────────────────────────

type RegState =
  | { phase: "idle" }
  | { phase: "looking"; code: string; codeType: string }
  | { phase: "searching"; term: string }
  | {
      phase: "already_linked";
      code: string;
      codeType: string;
      barcodeId: string;
      product: { id: string; codigoInterno: string; descricao: string; unidadeMedida: string };
      unitsPerPackage: number | null;
    }
  | { phase: "not_found_barcode"; code: string; codeType: string }
  | { phase: "not_found_text"; term: string }
  | {
      phase: "product_preview";
      term: string;
      product: {
        id: string;
        codigoInterno: string;
        descricao: string;
        unidadeMedida: string;
        barcodes: Array<{ code: string; codeType: string }>;
      };
    }
  | {
      // Produto encontrado por texto — aguardando barcode para vincular
      phase: "awaiting_barcode";
      product: {
        id: string;
        codigoInterno: string;
        descricao: string;
        unidadeMedida: string;
        barcodes: Array<{ code: string; codeType: string }>;
      };
    }
  | {
      phase: "select_product";
      term: string;
      products: ProductWithBarcodes[];
    }
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
  | { phase: "linked"; code: string; codeType: string; productName: string }
  | { phase: "error"; message: string };

type Props = {
  session: { id: string; name: string };
  initialLogs: RegLogEntry[];
};

// ─── Component ────────────────────────────────────────────────────────────────

export function RegistrationCockpit({ session, initialLogs }: Props) {
  const [input, setInput] = useState("");
  const [state, setState] = useState<RegState>({ phase: "idle" });
  const [logs, setLogs] = useState<RegLogEntry[]>(initialLogs);
  const [cameraOpen, setCameraOpen] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const stateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Holds product data when phase === "awaiting_barcode" (avoids stale closure)
  const awaitingProductRef = useRef<RegState & { phase: "awaiting_barcode" } | null>(null);

  const statePhaseRef = useRef(state.phase);
  statePhaseRef.current = state.phase;

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
    awaitingProductRef.current = null;
    setState({ phase: "idle" });
    refocus();
  }, [refocus]);

  // ─── Search ───────────────────────────────────────────────────────────────────

  const handleSearch = useCallback(
    async (rawTerm: string) => {
      const term = rawTerm.trim();
      if (!term) return;

      const digitsOnly = term.replace(/\D/g, "");
      const isPureNumeric = term.replace(/\s/g, "") === digitsOnly;
      const isBarcode = isPureNumeric && (digitsOnly.length === 13 || digitsOnly.length === 14);

      // ── Produto já selecionado, esperando barcode para vincular ───────────
      if (statePhaseRef.current === "awaiting_barcode") {
        if (!isBarcode) return; // só aceita barcodes neste estado
        const awaiting = awaitingProductRef.current;
        if (!awaiting) { resetToIdle(); return; }

        setState({ phase: "looking", code: digitsOnly, codeType: detectCodeType(digitsOnly) });
        const result = await lookupCode(digitsOnly);

        if (result.status === "found") {
          setState({
            phase: "already_linked",
            code: digitsOnly,
            codeType: result.codeType,
            barcodeId: result.barcodeId,
            product: result.product,
            unitsPerPackage: result.unitsPerPackage,
          });
          logAlreadyLinked({
            sessionId: session.id,
            code: digitsOnly,
            productId: result.product.id,
            barcodeId: result.barcodeId,
          }).catch(() => {});
        } else if (result.status === "not_found") {
          // Barcode livre + produto já selecionado → ir direto para confirmar vínculo
          setState({
            phase: "confirm_link",
            code: digitsOnly,
            codeType: detectCodeType(digitsOnly),
            product: {
              id: awaiting.product.id,
              codigoInterno: awaiting.product.codigoInterno,
              descricao: awaiting.product.descricao,
              unidadeMedida: awaiting.product.unidadeMedida,
              observacao: null,
            },
            unitsPerPackage: "",
          });
        } else {
          setState({ phase: "error", message: result.message });
          clearStateAfter(3000);
          refocus();
        }
        return;
      }

      // ── Caminho barcode ───────────────────────────────────────────────────
      if (isBarcode) {
        const codeType = detectCodeType(digitsOnly);
        setState({ phase: "looking", code: digitsOnly, codeType });

        const result = await lookupCode(digitsOnly);

        if (result.status === "found") {
          setState({
            phase: "already_linked",
            code: digitsOnly,
            codeType: result.codeType,
            barcodeId: result.barcodeId,
            product: result.product,
            unitsPerPackage: result.unitsPerPackage,
          });
          logAlreadyLinked({
            sessionId: session.id,
            code: digitsOnly,
            productId: result.product.id,
            barcodeId: result.barcodeId,
          }).catch(() => {});
        } else if (result.status === "not_found") {
          setState({ phase: "not_found_barcode", code: digitsOnly, codeType: result.codeType });
        } else {
          setState({ phase: "error", message: result.message });
          clearStateAfter(3000);
          refocus();
        }
        return;
      }

      // ── Caminho texto ─────────────────────────────────────────────────────
      setState({ phase: "searching", term });
      const result = await searchProductByText(term);

      if (result.status === "error") {
        setState({ phase: "error", message: result.message });
        clearStateAfter(3000);
        refocus();
        return;
      }
      if (result.status === "not_found") {
        setState({ phase: "not_found_text", term });
        return;
      }

      if (result.products.length === 1) {
        const p = result.products[0];
        setState({
          phase: "product_preview",
          term,
          product: {
            id: p.id,
            codigoInterno: p.codigoInterno,
            descricao: p.descricao,
            unidadeMedida: p.unidadeMedida,
            barcodes: p.barcodes,
          },
        });
      } else {
        setState({ phase: "select_product", term, products: result.products });
      }
    },
    [session.id, clearStateAfter, refocus, resetToIdle]
  );

  // ─── Camera ───────────────────────────────────────────────────────────────────

  const handleCameraDetect = useCallback(
    (code: string) => {
      const phase = statePhaseRef.current;
      if (
        phase !== "idle" &&
        phase !== "linked" &&
        phase !== "already_linked" &&
        phase !== "error" &&
        phase !== "awaiting_barcode"
      )
        return;
      const clean = code.replace(/\D/g, "");
      if (!clean) return;
      setInput(clean);
      handleSearch(clean);
    },
    [handleSearch]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && input.trim()) {
      e.preventDefault();
      handleSearch(input);
    }
    if (e.key === "Escape") resetToIdle();
  };

  // ─── Entrar no modo "produto primeiro → aguardando barcode" ───────────────────

  const enterAwaitingBarcode = useCallback(() => {
    if (state.phase !== "product_preview") return;
    const awaitingState = {
      phase: "awaiting_barcode" as const,
      product: state.product,
    };
    awaitingProductRef.current = awaitingState;
    setState(awaitingState);
    setInput("");
    setTimeout(() => inputRef.current?.focus(), 80);
  }, [state]);

  // ─── Select from product list (text search) ───────────────────────────────────

  const handleSelectFromList = useCallback(
    (product: ProductWithBarcodes) => {
      if (state.phase !== "select_product") return;
      setState({
        phase: "product_preview",
        term: state.term,
        product: {
          id: product.id,
          codigoInterno: product.codigoInterno,
          descricao: product.descricao,
          unidadeMedida: product.unidadeMedida,
          barcodes: product.barcodes,
        },
      });
    },
    [state]
  );

  // ─── Linking flow (barcode first → search product) ────────────────────────────

  const enterLinking = useCallback(() => {
    if (state.phase !== "not_found_barcode") return;
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
        prev.phase === "linking"
          ? { ...prev, searchQuery: query, searching: query.length >= 2 }
          : prev
      );

      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
      if (query.length < 2) {
        setState((prev) =>
          prev.phase === "linking"
            ? { ...prev, searchResults: [], searching: false }
            : prev
        );
        return;
      }

      searchTimerRef.current = setTimeout(async () => {
        const results = await searchProducts(query);
        setState((prev) =>
          prev.phase === "linking"
            ? { ...prev, searchResults: results, searching: false }
            : prev
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

  // ─── Confirm link ─────────────────────────────────────────────────────────────

  const handleConfirmLink = useCallback(async () => {
    if (state.phase !== "confirm_link") return;
    const units = state.unitsPerPackage ? parseInt(state.unitsPerPackage, 10) : undefined;

    const result = await linkBarcodeOnly({
      sessionId: session.id,
      code: state.code,
      productId: state.product.id,
      unitsPerPackage: units && units > 0 ? units : undefined,
    });

    if (!result.ok) {
      setState({ phase: "error", message: result.error });
      clearStateAfter(3500);
      refocus();
      return;
    }

    const newLog: RegLogEntry = {
      id: result.logId,
      code: state.code,
      codeType: state.codeType,
      action: "BARCODE_LINKED",
      createdAt: new Date(),
      product: { codigoInterno: state.product.codigoInterno, descricao: state.product.descricao },
      unitsPerPackage: units && units > 0 ? units : null,
    };
    setLogs((prev) => [newLog, ...prev.slice(0, 19)]);

    setState({
      phase: "linked",
      code: state.code,
      codeType: state.codeType,
      productName: state.product.descricao,
    });
    setInput("");
    awaitingProductRef.current = null;
    clearStateAfter(2500);
    refocus();
  }, [state, session.id, clearStateAfter, refocus]);

  // ─── UI helpers ───────────────────────────────────────────────────────────────

  const digitsOnlyInput = input.replace(/\D/g, "");
  const inputIsBarcode =
    input.trim().replace(/\s/g, "") === digitsOnlyInput &&
    (digitsOnlyInput.length === 13 || digitsOnlyInput.length === 14);
  const isBusy = state.phase === "looking" || state.phase === "searching";
  const isBlocked =
    state.phase === "confirm_link" ||
    state.phase === "linking" ||
    state.phase === "select_product" ||
    state.phase === "product_preview" ||
    state.phase === "not_found_barcode";
  // "awaiting_barcode" não está bloqueado — input deve ficar ativo

  const feedbackConfig = (() => {
    switch (state.phase) {
      case "already_linked":
        return { bg: "#dcfce7", border: "#16a34a", text: "#15803d", label: "JÁ VINCULADO" };
      case "awaiting_barcode":
        return { bg: "#f0fdf4", border: "#0d9488", text: "#0f766e", label: "PRODUTO SELECIONADO" };
      case "not_found_barcode":
        return { bg: "#fefce8", border: "#ca8a04", text: "#92400e", label: "NÃO VINCULADO" };
      case "not_found_text":
        return { bg: "#fefce8", border: "#ca8a04", text: "#92400e", label: "NÃO LOCALIZADO" };
      case "product_preview":
        return { bg: "#f0fdf4", border: "#0d9488", text: "#0f766e", label: "PRODUTO ENCONTRADO" };
      case "confirm_link":
        return { bg: "#f0f9ff", border: "#0057B8", text: "#0057B8", label: "CONFIRMAR VÍNCULO" };
      case "linked":
        return { bg: "#dbeafe", border: "#0057B8", text: "#1e40af", label: "CÓDIGO VINCULADO" };
      case "error":
        return { bg: "#fee2e2", border: "#dc2626", text: "#b91c1c", label: "ERRO" };
      case "looking":
      case "searching":
        return { bg: "#f0f9ff", border: "#0057B8", text: "#0057B8", label: "BUSCANDO…" };
      default:
        return null;
    }
  })();

  const showFeedback =
    feedbackConfig !== null &&
    state.phase !== "select_product" &&
    state.phase !== "linking";

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-dvh bg-[#f4f6f9] flex flex-col">

      {/* Header */}
      <header className="bg-teal-700 text-white px-4 pt-4 pb-3 flex items-center justify-between shrink-0 relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.12] pointer-events-none mix-blend-screen"
          style={{
            backgroundImage: "url('/branding/background-check.png')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="relative flex items-center gap-2.5 min-w-0 flex-1">
          <Link href="/coletar" className="text-white/70 active:text-white transition-colors shrink-0">
            <ArrowLeft />
          </Link>
          <MoveCheckLogo size={28} className="shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="text-[10px] text-white/55 tracking-[0.25em] uppercase">MOVE CHECK · CADASTRO</div>
            <div className="font-bold text-sm leading-none truncate">{session.name}</div>
          </div>
        </div>
        <div className="relative flex items-center gap-2 shrink-0">
          <Link
            href="/sessoes"
            className="text-white/60 text-[11px] font-medium border border-white/20 rounded-lg px-2.5 py-1.5 active:bg-white/10 transition-colors"
          >
            Trocar
          </Link>
          <div className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-center">
            <div className="text-white/50 text-[9px] tracking-wider uppercase">Vínculos</div>
            <div className="text-white font-bold text-sm leading-none">
              {logs.filter((l) => l.action === "BARCODE_LINKED").length}
            </div>
          </div>
        </div>
      </header>

      {/* Main area */}
      <div className="flex-1 flex flex-col px-4 py-4 gap-3 max-w-lg mx-auto w-full overflow-y-auto">

        {/* ── Scanner frame ──────────────────────────────────────────────────── */}
        <div className="relative bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="absolute top-3 left-3 w-5 h-5 border-t-2 border-l-2 border-teal-600 rounded-tl-sm z-10" />
          <div className="absolute top-3 right-3 w-5 h-5 border-t-2 border-r-2 border-teal-600 rounded-tr-sm z-10" />
          <div className="absolute bottom-3 left-3 w-5 h-5 border-b-2 border-l-2 border-teal-600 rounded-bl-sm z-10" />
          <div className="absolute bottom-3 right-3 w-5 h-5 border-b-2 border-r-2 border-teal-600 rounded-br-sm z-10" />

          <div className="px-8 pt-6 pb-5">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] text-gray-400 tracking-[0.25em] uppercase">
                {state.phase === "awaiting_barcode"
                  ? "Código de barras a vincular"
                  : state.phase === "idle"
                  ? "Leia ou busque o produto"
                  : "Identificação"}
              </div>
              {input && inputIsBarcode && <CodeTypeBadge type={detectCodeType(digitsOnlyInput)} />}
            </div>

            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                state.phase === "awaiting_barcode"
                  ? "EAN (13 dígitos) ou DUN (14 dígitos)"
                  : "EAN · DUN · código interno · descrição"
              }
              disabled={isBusy || isBlocked}
              className="w-full text-center text-2xl font-mono font-bold tracking-widest bg-transparent outline-none placeholder:text-gray-200 placeholder:text-sm placeholder:tracking-normal text-gray-800 py-1"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />

            {(state.phase === "idle" || state.phase === "awaiting_barcode") && (
              <div className="mt-2 h-px bg-gradient-to-r from-transparent via-teal-500/30 to-transparent" />
            )}
          </div>
        </div>

        {/* ── Camera panel ───────────────────────────────────────────────────── */}
        {cameraOpen && (
          <CameraScanner onDetected={handleCameraDetect} onClose={() => setCameraOpen(false)} />
        )}

        {/* ── Feedback panel ─────────────────────────────────────────────────── */}
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

            {state.phase === "already_linked" && (
              <>
                <div className="font-bold text-gray-900 text-base">{state.product.descricao}</div>
                <div className="text-xs text-gray-500 font-mono mt-0.5 flex items-center gap-2 flex-wrap">
                  <span>{state.product.codigoInterno}</span>
                  {state.unitsPerPackage && (
                    <span className="text-purple-600">{state.unitsPerPackage} un/emb</span>
                  )}
                  <CodeTypeBadge type={state.codeType} small />
                </div>
                <div className="text-xs text-green-700 mt-1.5">
                  Este código já está vinculado ao produto.
                </div>
              </>
            )}

            {state.phase === "awaiting_barcode" && (
              <>
                <div className="font-bold text-gray-900 text-base">{state.product.descricao}</div>
                <div className="text-xs text-gray-500 font-mono mt-0.5">
                  {state.product.codigoInterno} · {state.product.unidadeMedida}
                </div>
                {state.product.barcodes.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {state.product.barcodes.map((b) => (
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
                      </span>
                    ))}
                  </div>
                )}
                <div className="text-xs text-teal-700 font-medium mt-2">
                  Leia ou digite o código de barras para vincular a este produto.
                </div>
              </>
            )}

            {state.phase === "not_found_barcode" && (
              <div className="text-sm text-gray-700">
                Código <span className="font-mono font-bold">{state.code}</span> não está vinculado a nenhum produto.
              </div>
            )}

            {state.phase === "not_found_text" && (
              <div className="text-sm text-gray-700">
                Produto não localizado para{" "}
                <span className="font-mono font-bold">"{state.term}"</span>.
              </div>
            )}

            {state.phase === "product_preview" && (
              <>
                <div className="font-bold text-gray-900 text-base">{state.product.descricao}</div>
                <div className="text-xs text-gray-500 font-mono mt-0.5">
                  {state.product.codigoInterno} · {state.product.unidadeMedida}
                </div>
                {state.product.barcodes.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {state.product.barcodes.map((b) => (
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
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-gray-400 mt-1">Nenhum código de barras vinculado.</div>
                )}
              </>
            )}

            {state.phase === "confirm_link" && (
              <>
                <div className="font-bold text-gray-900">{state.product.descricao}</div>
                <div className="text-xs text-gray-400 font-mono mt-0.5">{state.product.codigoInterno}</div>
              </>
            )}

            {state.phase === "linked" && (
              <div className="text-sm text-gray-700">
                <span className="font-bold">{state.productName}</span> — código{" "}
                <span className="font-mono">{state.code}</span> vinculado.
              </div>
            )}

            {state.phase === "error" && (
              <div className="text-sm text-gray-700">{state.message}</div>
            )}
          </div>
        )}

        {/* ── DUN hint (confirm_link) ──────────────────────────────────────── */}
        {state.phase === "confirm_link" && state.codeType === "DUN" && (
          <div className="bg-purple-50 border-2 border-purple-200 rounded-xl px-4 py-3 slide-up">
            <div className="text-[10px] font-bold text-purple-700 tracking-[0.2em] uppercase mb-1">
              Código DUN — Embalagem fechada
            </div>
            <div className="text-sm text-purple-700">
              Informe quantas unidades existem dentro desta embalagem fechada.
            </div>
          </div>
        )}

        {/* ── Units per package ───────────────────────────────────────────── */}
        {state.phase === "confirm_link" && state.codeType === "DUN" && (
          <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 slide-up">
            <label className="text-[10px] text-gray-400 tracking-wider uppercase block mb-1.5">
              Unidades por embalagem — opcional
            </label>
            <input
              type="number"
              min="1"
              value={state.unitsPerPackage}
              onChange={(e) =>
                setState((prev) =>
                  prev.phase === "confirm_link"
                    ? { ...prev, unitsPerPackage: e.target.value }
                    : prev
                )
              }
              placeholder="ex: 6"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono outline-none focus:border-teal-500"
              inputMode="numeric"
            />
          </div>
        )}

        {/* ── LINKING — busca de produto ─────────────────────────────────── */}
        {state.phase === "linking" && (
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
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20"
                  autoComplete="off"
                />
                {state.searching && (
                  <div className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin shrink-0" />
                )}
              </div>
            </div>

            {state.searchResults.length > 0 && (
              <div className="divide-y divide-gray-100 max-h-52 overflow-y-auto">
                {state.searchResults.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleSelectProduct(p)}
                    className="w-full text-left px-4 py-3 active:bg-teal-50 transition-colors"
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

        {/* ── SELECT_PRODUCT ─────────────────────────────────────────────── */}
        {state.phase === "select_product" && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden slide-up">
            <div className="px-4 pt-3 pb-2 border-b border-gray-100">
              <div className="text-[10px] text-gray-400 tracking-wider uppercase">
                {state.products.length} produtos encontrados
              </div>
              <div className="text-xs text-gray-500 mt-0.5 font-mono truncate">"{state.term}"</div>
            </div>
            <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
              {state.products.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleSelectFromList(p)}
                  className="w-full text-left px-4 py-3 active:bg-teal-50 transition-colors"
                >
                  <div className="font-medium text-sm text-gray-900">{p.descricao}</div>
                  <div className="text-[11px] text-gray-400 font-mono mt-0.5">
                    {p.codigoInterno} · {p.unidadeMedida}
                  </div>
                  {p.barcodes.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {p.barcodes.slice(0, 3).map((b) => (
                        <span
                          key={b.code}
                          className="font-mono text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded"
                        >
                          {b.code}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── ACTIONS ────────────────────────────────────────────────────── */}

        {/* Idle / Looking / Searching */}
        {(state.phase === "idle" || state.phase === "looking" || state.phase === "searching") && (
          <div className="flex flex-col gap-2">
            <button
              onClick={() => input.trim() && handleSearch(input)}
              disabled={!input.trim() || isBusy}
              className="w-full bg-teal-600 text-white font-bold text-lg rounded-2xl py-5 active:bg-teal-700 disabled:opacity-30 transition-colors shadow-md"
            >
              {isBusy
                ? "Buscando…"
                : inputIsBarcode
                ? "Verificar Código"
                : "Buscar Produto"}
            </button>
            {state.phase === "idle" && (
              <button
                onClick={() => setCameraOpen((v) => !v)}
                className="w-full flex items-center justify-center gap-2 bg-white border-2 border-gray-200 text-gray-600 font-semibold text-sm rounded-2xl py-3.5 active:bg-gray-50 transition-colors"
              >
                <CameraIcon />
                {cameraOpen ? "Fechar câmera" : "Abrir câmera"}
              </button>
            )}
          </div>
        )}

        {/* Awaiting barcode (product already selected) */}
        {state.phase === "awaiting_barcode" && (
          <div className="flex flex-col gap-2 slide-up">
            <button
              onClick={() => input.trim() && handleSearch(input)}
              disabled={!input.trim() || isBusy}
              className="w-full bg-teal-600 text-white font-bold text-base rounded-2xl py-4 active:bg-teal-700 disabled:opacity-30 transition-colors shadow-md"
            >
              {isBusy ? "Verificando…" : "Verificar Código"}
            </button>
            <button
              onClick={() =>
                setState({
                  phase: "product_preview",
                  term: state.product.codigoInterno,
                  product: state.product,
                })
              }
              className="w-full bg-white border-2 border-gray-200 text-gray-500 font-medium text-sm rounded-xl py-3 active:bg-gray-50"
            >
              ← Voltar ao produto
            </button>
          </div>
        )}

        {/* Already linked */}
        {state.phase === "already_linked" && (
          <button
            onClick={resetToIdle}
            className="w-full bg-white border-2 border-green-200 text-green-700 font-bold text-base rounded-2xl py-4 active:bg-green-50 slide-up"
          >
            Ler próximo
          </button>
        )}

        {/* Not found barcode */}
        {state.phase === "not_found_barcode" && (
          <div className="flex flex-col gap-2 slide-up">
            <button
              onClick={enterLinking}
              className="w-full bg-teal-600 text-white font-bold text-base rounded-2xl py-4 active:bg-teal-700 shadow-md"
            >
              Vincular código ao produto
            </button>
            <button
              onClick={resetToIdle}
              className="w-full bg-white border-2 border-gray-200 text-gray-500 font-medium text-sm rounded-xl py-3 active:bg-gray-50"
            >
              Descartar
            </button>
          </div>
        )}

        {/* Not found text */}
        {state.phase === "not_found_text" && (
          <button
            onClick={resetToIdle}
            className="w-full bg-white border-2 border-gray-200 text-gray-600 font-semibold text-sm rounded-2xl py-3.5 active:bg-gray-50 slide-up"
          >
            Tentar novamente
          </button>
        )}

        {/* Product preview */}
        {state.phase === "product_preview" && (
          <div className="flex flex-col gap-2 slide-up">
            <button
              onClick={enterAwaitingBarcode}
              className="w-full bg-teal-600 text-white font-bold text-base rounded-2xl py-4 active:bg-teal-700 shadow-md"
            >
              Adicionar código de barras
            </button>
            <button
              onClick={resetToIdle}
              className="w-full bg-white border-2 border-teal-200 text-teal-700 font-medium text-sm rounded-xl py-3 active:bg-teal-50"
            >
              Ler próximo
            </button>
          </div>
        )}

        {/* Select product — cancel */}
        {state.phase === "select_product" && (
          <button
            onClick={resetToIdle}
            className="w-full bg-white border-2 border-gray-200 text-gray-500 font-medium text-sm rounded-xl py-3 active:bg-gray-50 slide-up"
          >
            Cancelar
          </button>
        )}

        {/* Linking */}
        {state.phase === "linking" && (
          <button
            onClick={() =>
              setState({
                phase: "not_found_barcode",
                code: state.code,
                codeType: state.codeType,
              })
            }
            className="w-full bg-white border-2 border-gray-200 text-gray-500 font-medium text-sm rounded-xl py-3 active:bg-gray-50 slide-up"
          >
            ← Voltar
          </button>
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
              className="flex-[2] bg-teal-600 text-white font-bold text-base rounded-2xl py-4 active:bg-teal-700 shadow-md"
            >
              Vincular código ao produto ✓
            </button>
          </div>
        )}

        {/* Linked */}
        {state.phase === "linked" && (
          <button
            onClick={resetToIdle}
            className="w-full bg-white border-2 border-blue-200 text-[#0057B8] font-bold text-base rounded-2xl py-4 active:bg-blue-50 slide-up"
          >
            Ler próximo
          </button>
        )}
      </div>

      {/* Recent log strip */}
      {logs.length > 0 && (
        <div className="bg-white border-t border-gray-200 px-4 pt-3 pb-4 max-w-lg mx-auto w-full shrink-0">
          <div className="text-[10px] text-gray-400 tracking-[0.25em] uppercase mb-2">
            Histórico de cadastro
          </div>
          <div className="flex flex-col gap-1 max-h-36 overflow-y-auto">
            {logs.slice(0, 6).map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between gap-2 py-1.5 border-b border-gray-100 last:border-0"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <CodeTypeBadge type={entry.codeType} small />
                  <div className="min-w-0">
                    <div className="font-mono text-xs text-gray-700 truncate">{entry.code}</div>
                    {entry.product && (
                      <div className="text-[10px] text-gray-400 truncate">
                        {entry.product.descricao}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className={`text-[9px] font-bold px-1 py-0.5 rounded ${
                      entry.action === "BARCODE_LINKED"
                        ? "text-teal-700 bg-teal-50 border border-teal-200"
                        : "text-amber-600 bg-amber-50 border border-amber-200"
                    }`}
                  >
                    {entry.action === "BARCODE_LINKED" ? "VINC." : "EXIST."}
                  </span>
                  <span className="text-[10px] text-gray-300 font-mono">
                    {new Date(entry.createdAt).toLocaleTimeString("pt-BR", {
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

function CameraIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function ArrowLeft() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5M12 5l-7 7 7 7" />
    </svg>
  );
}
