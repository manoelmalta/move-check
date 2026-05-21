"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  lookupCode,
  saveLinkedScan,
  linkAndSave,
  savePendingScan,
  searchProductByText,
  saveProductScan,
} from "@/actions/scan";
import type { LookupResult, ProductWithBarcodes } from "@/actions/scan";
import { searchProducts } from "@/actions/product";
import type { ProductResult } from "@/actions/product";
import { detectCodeType } from "@/lib/barcode";
import { CameraScanner } from "./camera-scanner";
import { MoveCheckLogo } from "@/components/move-check-logo";

// ─── Types ────────────────────────────────────────────────────────────────────

type IdentifiedBy = "EAN" | "DUN" | "codigo_interno" | "descricao";

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
  | { phase: "searching"; term: string }
  | {
      phase: "found";
      identifiedBy: IdentifiedBy;
      code: string;
      codeType: string;
      product: { id: string; codigoInterno: string; descricao: string; unidadeMedida: string };
      unitsPerPackage: number | null;
      /** null = yet to be chosen (only for non-barcode identifications) */
      countType: "unidade" | "embalagem" | null;
      customUnitsPerPackage: string;
    }
  | { phase: "not_found"; code: string; codeType: string }
  | { phase: "not_found_text"; term: string }
  | {
      phase: "select_product";
      term: string;
      identifiedBy: "codigo_interno" | "descricao";
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
  | { phase: "saved"; code: string; productName: string | null; status: string }
  | { phase: "error"; message: string }
  | { phase: "duplicate"; code: string };

type Props = {
  session: { id: string; name: string };
  companyId: string;
  initialEntries: Entry[];
};

// ─── Component ────────────────────────────────────────────────────────────────

export function ScannerCockpit({ session, companyId, initialEntries }: Props) {
  const [input, setInput] = useState("");
  const [state, setState] = useState<ScanState>({ phase: "idle" });
  const [entries, setEntries] = useState<Entry[]>(initialEntries);
  const [quantity, setQuantity] = useState(1);
  const [quantityStr, setQuantityStr] = useState("1");
  const [cameraOpen, setCameraOpen] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const stateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Always-current phase ref — lets camera callback read state without re-registering
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
    setQuantity(1);
    setQuantityStr("1");
    setState({ phase: "idle" });
    refocus();
  }, [refocus]);

  // ─── Universal search ────────────────────────────────────────────────────────

  const handleSearch = useCallback(
    async (rawTerm: string) => {
      const term = rawTerm.trim();
      if (!term) return;

      // Digits extracted from the term (ignoring spaces)
      const digitsOnly = term.replace(/\D/g, "");
      // "Pure numeric": all chars are digits (possibly separated by spaces)
      const isPureNumeric = term.replace(/\s/g, "") === digitsOnly;
      // EAN (13 digits) or DUN (14 digits) barcode path
      const isBarcode = isPureNumeric && (digitsOnly.length === 13 || digitsOnly.length === 14);

      if (isBarcode) {
        const codeType = detectCodeType(digitsOnly);
        setState({ phase: "looking", code: digitsOnly, codeType });

        const result: LookupResult = await lookupCode(companyId, digitsOnly);
        if (result.status === "found") {
          setState({
            phase: "found",
            identifiedBy: result.codeType as IdentifiedBy,
            code: digitsOnly,
            codeType: result.codeType,
            product: result.product,
            unitsPerPackage: result.unitsPerPackage,
            countType: null,
            customUnitsPerPackage: "",
          });
        } else if (result.status === "not_found") {
          setState({ phase: "not_found", code: digitsOnly, codeType: result.codeType });
        } else {
          setState({ phase: "error", message: result.message });
          clearStateAfter(3000);
          refocus();
        }
        return;
      }

      // Text / código interno path
      setState({ phase: "searching", term });
      const result = await searchProductByText(companyId, term);

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

      const identifiedBy: "codigo_interno" | "descricao" = isPureNumeric
        ? "codigo_interno"
        : "descricao";

      if (result.products.length === 1) {
        const p = result.products[0];
        setState({
          phase: "found",
          identifiedBy,
          code: p.codigoInterno,
          codeType: "CODIGO_INTERNO",
          product: {
            id: p.id,
            codigoInterno: p.codigoInterno,
            descricao: p.descricao,
            unidadeMedida: p.unidadeMedida,
          },
          unitsPerPackage: null,
          countType: null,
          customUnitsPerPackage: "",
        });
      } else {
        setState({ phase: "select_product", term, identifiedBy, products: result.products });
      }
    },
    [clearStateAfter, refocus]
  );

  // ─── Camera detection ─────────────────────────────────────────────────────────

  const handleCameraDetect = useCallback(
    (code: string) => {
      const phase = statePhaseRef.current;
      if (phase !== "idle" && phase !== "saved" && phase !== "error" && phase !== "duplicate") return;
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

  // ─── Select from product list ─────────────────────────────────────────────────

  const handleSelectFromList = useCallback(
    (product: ProductWithBarcodes) => {
      if (state.phase !== "select_product") return;
      setState({
        phase: "found",
        identifiedBy: state.identifiedBy,
        code: product.codigoInterno,
        codeType: "CODIGO_INTERNO",
        product: {
          id: product.id,
          codigoInterno: product.codigoInterno,
          descricao: product.descricao,
          unidadeMedida: product.unidadeMedida,
        },
        unitsPerPackage: null,
        countType: null,
        customUnitsPerPackage: "",
      });
    },
    [state]
  );

  // ─── Save — found (barcode EAN/DUN) or text-identified ───────────────────────

  const handleSaveConfirmed = useCallback(async () => {
    if (state.phase !== "found") return;

    if (state.identifiedBy === "EAN" || state.identifiedBy === "DUN") {
      // Barcode path — use existing saveLinkedScan
      const result = await saveLinkedScan({
        companyId,
        sessionId: session.id,
        code: state.code,
        quantity,
        productId: state.product.id,
        unitsPerPackage: state.unitsPerPackage ?? undefined,
      });
      handleSaveResult(result, state.code, state.product.descricao, "VINCULADO");
    } else {
      // Text-identified path — code_type será UNKNOWN, identification_method = método usado
      if (state.countType === null) return;
      const upk =
        state.countType === "embalagem" && state.customUnitsPerPackage
          ? parseInt(state.customUnitsPerPackage, 10)
          : undefined;
      const identificationMethod =
        state.identifiedBy === "codigo_interno" ? "CODIGO_INTERNO" : "DESCRICAO";
      const result = await saveProductScan({
        companyId,
        sessionId: session.id,
        code: state.code,
        identificationMethod,
        quantity,
        productId: state.product.id,
        unitsPerPackage: upk && upk > 0 ? upk : undefined,
      });
      handleSaveResult(result, state.code, state.product.descricao, "VINCULADO");
    }
  }, [state, session.id, quantity]); // eslint-disable-line

  // ─── Link flow ───────────────────────────────────────────────────────────────

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
        const results = await searchProducts(companyId, query);
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

  const handleConfirmLink = useCallback(async () => {
    if (state.phase !== "confirm_link") return;
    const units = state.unitsPerPackage ? parseInt(state.unitsPerPackage, 10) : undefined;
    const result = await linkAndSave({
      companyId,
      sessionId: session.id,
      code: state.code,
      quantity,
      productId: state.product.id,
      unitsPerPackage: units && units > 0 ? units : undefined,
    });
    handleSaveResult(result, state.code, state.product.descricao, "VINCULADO");
  }, [state, session.id, quantity]); // eslint-disable-line

  // ─── Save pending ─────────────────────────────────────────────────────────────

  const handleSavePending = useCallback(async () => {
    if (state.phase !== "not_found" && state.phase !== "linking") return;
    const result = await savePendingScan({
      companyId,
      sessionId: session.id,
      code: state.code,
      quantity,
    });
    handleSaveResult(result, state.code, null, "PENDENTE_DE_VINCULO");
  }, [state, session.id, quantity]); // eslint-disable-line

  // ─── Result handler ───────────────────────────────────────────────────────────

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
      setQuantityStr("1");

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

  // ─── UI helpers ───────────────────────────────────────────────────────────────

  const isBarcodeFound =
    state.phase === "found" &&
    (state.identifiedBy === "EAN" || state.identifiedBy === "DUN");

  const isTextFound =
    state.phase === "found" &&
    (state.identifiedBy === "codigo_interno" || state.identifiedBy === "descricao");

  const needsCountType = isTextFound && state.phase === "found" && state.countType === null;

  const isConfirming =
    (isBarcodeFound) ||
    (isTextFound && state.phase === "found" && state.countType !== null) ||
    state.phase === "confirm_link";

  const isDunBarcode = state.phase === "found" && state.codeType === "DUN";

  const isTextEmbalagem =
    isTextFound && state.phase === "found" && state.countType === "embalagem";

  const feedbackConfig = (() => {
    switch (state.phase) {
      case "found":
        return { bg: "#dcfce7", border: "#16a34a", text: "#15803d", label: "PRODUTO ENCONTRADO" };
      case "not_found":
        return { bg: "#fefce8", border: "#ca8a04", text: "#92400e", label: "NÃO CADASTRADO" };
      case "not_found_text":
        return { bg: "#fefce8", border: "#ca8a04", text: "#92400e", label: "NÃO LOCALIZADO" };
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
      case "searching":
        return { bg: "#f0f9ff", border: "#0057B8", text: "#0057B8", label: "BUSCANDO…" };
      default:
        return null;
    }
  })();

  const showFeedback = feedbackConfig !== null && state.phase !== "select_product";

  // Dynamic button label
  const digitsOnlyInput = input.replace(/\D/g, "");
  const inputIsBarcode =
    input.trim().replace(/\s/g, "") === digitsOnlyInput &&
    (digitsOnlyInput.length === 13 || digitsOnlyInput.length === 14);
  const isBusy = state.phase === "looking" || state.phase === "searching";

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-dvh bg-[#f4f6f9] flex flex-col">

      {/* Header */}
      <header className="bg-[#0057B8] text-white px-4 pt-4 pb-3 flex items-center justify-between shrink-0 relative overflow-hidden">
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
            <div className="text-[10px] text-white/55 tracking-[0.25em] uppercase">MOVE CHECK · INVENTÁRIO</div>
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
            <div className="text-white/50 text-[9px] tracking-wider uppercase">Lidos</div>
            <div className="text-white font-bold text-sm leading-none">{entries.length}</div>
          </div>
        </div>
      </header>

      {/* Main area */}
      <div className="flex-1 flex flex-col px-4 py-4 gap-3 max-w-lg mx-auto w-full overflow-y-auto">

        {/* ── Scanner frame ──────────────────────────────────────────────────── */}
        <div className="relative bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Corners */}
          <div className="absolute top-3 left-3 w-5 h-5 border-t-2 border-l-2 border-[#0057B8] rounded-tl-sm z-10" />
          <div className="absolute top-3 right-3 w-5 h-5 border-t-2 border-r-2 border-[#0057B8] rounded-tr-sm z-10" />
          <div className="absolute bottom-3 left-3 w-5 h-5 border-b-2 border-l-2 border-[#0057B8] rounded-bl-sm z-10" />
          <div className="absolute bottom-3 right-3 w-5 h-5 border-b-2 border-r-2 border-[#0057B8] rounded-br-sm z-10" />

          <div className="px-8 pt-6 pb-5">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] text-gray-400 tracking-[0.25em] uppercase">
                {state.phase === "idle" ? "Aguardando leitura" : "Identificação"}
              </div>
              {input && inputIsBarcode && <CodeTypeBadge type={detectCodeType(digitsOnlyInput)} />}
            </div>

            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="EAN · DUN · código interno · descrição"
              disabled={isBusy || isConfirming || state.phase === "linking" || state.phase === "select_product"}
              className="w-full text-center text-2xl font-mono font-bold tracking-widest bg-transparent outline-none placeholder:text-gray-200 placeholder:text-sm placeholder:tracking-normal text-gray-800 py-1"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />

            {state.phase === "idle" && (
              <div className="mt-2 h-px bg-gradient-to-r from-transparent via-[#0057B8]/30 to-transparent" />
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

            {state.phase === "found" && (
              <>
                <div className="font-bold text-gray-900 text-base">{state.product.descricao}</div>
                <div className="text-xs text-gray-500 font-mono mt-0.5 flex items-center gap-2 flex-wrap">
                  <span>{state.product.codigoInterno}</span>
                  {state.unitsPerPackage && (
                    <span className="text-purple-600">{state.unitsPerPackage} un/emb</span>
                  )}
                  <IdentifiedByBadge identifiedBy={state.identifiedBy} />
                </div>
              </>
            )}
            {state.phase === "not_found" && (
              <div className="text-sm text-gray-700">
                Código <span className="font-mono font-bold">{state.code}</span> não está vinculado a nenhum produto.
              </div>
            )}
            {state.phase === "not_found_text" && (
              <div className="text-sm text-gray-700">
                Produto não localizado para <span className="font-mono font-bold">"{state.term}"</span>.
                Tente buscar por código interno, descrição, EAN ou DUN.
              </div>
            )}
            {state.phase === "saved" && (
              <div className="text-sm text-gray-700">
                {state.productName ? (
                  <><span className="font-bold">{state.productName}</span> registrado.</>
                ) : (
                  <>Código <span className="font-mono font-bold">{state.code}</span> enviado para tratamento cadastral.</>
                )}
              </div>
            )}
            {state.phase === "error" && (
              <div className="text-sm text-gray-700">{state.message}</div>
            )}
            {state.phase === "duplicate" && (
              <div className="text-sm text-gray-700">
                Este item já foi contado nesta sessão.{" "}
                <span className="font-mono text-xs text-gray-400">{state.code}</span>
              </div>
            )}
          </div>
        )}

        {/* ── DUN warning ────────────────────────────────────────────────────── */}
        {isDunBarcode && (
          <div className="bg-purple-50 border-2 border-purple-200 rounded-xl px-4 py-3 slide-up">
            <div className="text-[10px] font-bold text-purple-700 tracking-[0.2em] uppercase mb-1">
              ⚠ Embalagem fechada (DUN)
            </div>
            <div className="text-sm text-purple-700">
              Conte as embalagens fechadas.
              {state.phase === "found" && state.unitsPerPackage ? (
                <> Certifique-se de que cada embalagem contém <strong>{state.unitsPerPackage}</strong> unidades.</>
              ) : null}
              {" "}Digite a quantidade de embalagens fechadas encontradas.
            </div>
          </div>
        )}

        {/* ── Como você está contando? ────────────────────────────────────────── */}
        {needsCountType && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-4 py-4 slide-up">
            <div className="text-[10px] text-gray-400 tracking-[0.25em] uppercase mb-3">
              Como você está contando?
            </div>
            <div className="flex gap-3">
              <button
                onClick={() =>
                  setState((prev) =>
                    prev.phase === "found" ? { ...prev, countType: "unidade" } : prev
                  )
                }
                className="flex-1 bg-white border-2 border-gray-200 text-gray-700 font-semibold text-sm rounded-xl py-3.5 active:bg-gray-50 transition-colors"
              >
                Unidade
              </button>
              <button
                onClick={() =>
                  setState((prev) =>
                    prev.phase === "found" ? { ...prev, countType: "embalagem" } : prev
                  )
                }
                className="flex-1 bg-[#0057B8] text-white font-semibold text-sm rounded-xl py-3.5 active:bg-[#003F8A] transition-colors shadow-sm"
              >
                Embalagem fechada
              </button>
            </div>
          </div>
        )}

        {/* ── Embalagem — units per package (text path) ───────────────────────── */}
        {isTextEmbalagem && state.phase === "found" && (
          <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 slide-up">
            <label className="text-[10px] text-gray-400 tracking-wider uppercase block mb-1.5">
              Qtd por embalagem — opcional
            </label>
            <input
              type="number"
              min="1"
              value={state.customUnitsPerPackage}
              onChange={(e) =>
                setState((prev) =>
                  prev.phase === "found"
                    ? { ...prev, customUnitsPerPackage: e.target.value }
                    : prev
                )
              }
              placeholder="ex: 6"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono outline-none focus:border-[#0057B8]"
              inputMode="numeric"
            />
          </div>
        )}

        {/* ── Qty selector (confirming) ───────────────────────────────────────── */}
        {isConfirming && (
          <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-4 py-3 slide-up">
            <span className="text-sm text-gray-500 font-medium">
              {isDunBarcode || isTextEmbalagem ? "Embalagens fechadas" : "Quantidade"}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { const n = Math.max(1, quantity - 1); setQuantity(n); setQuantityStr(String(n)); }}
                className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-700 font-bold active:bg-gray-200"
              >−</button>
              <input
                type="number"
                inputMode="numeric"
                min="1"
                value={quantityStr}
                onChange={(e) => {
                  setQuantityStr(e.target.value);
                  const n = parseInt(e.target.value, 10);
                  if (!isNaN(n) && n >= 1) setQuantity(n);
                }}
                onBlur={() => {
                  const n = parseInt(quantityStr, 10);
                  if (isNaN(n) || n < 1) { setQuantityStr("1"); setQuantity(1); }
                  else { setQuantityStr(String(n)); setQuantity(n); }
                }}
                className="w-16 text-center text-xl font-bold text-gray-900 border border-gray-200 rounded-lg py-1 outline-none focus:border-[#0057B8]"
              />
              <button
                onClick={() => { const n = quantity + 1; setQuantity(n); setQuantityStr(String(n)); }}
                className="w-8 h-8 rounded-lg bg-[#0057B8] flex items-center justify-center text-white font-bold active:bg-[#003F8A]"
              >+</button>
            </div>
          </div>
        )}

        {/* ── DUN — units per package (confirm_link path) ────────────────────── */}
        {state.phase === "confirm_link" && state.codeType === "DUN" && (
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

        {/* ── SELECT_PRODUCT — múltiplos resultados ──────────────────────────── */}
        {state.phase === "select_product" && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden slide-up">
            <div className="px-4 pt-3 pb-2 border-b border-gray-100">
              <div className="text-[10px] text-gray-400 tracking-wider uppercase">
                {state.products.length} produtos encontrados — selecione o correto
              </div>
              <div className="text-xs text-gray-500 mt-0.5 font-mono truncate">"{state.term}"</div>
            </div>
            <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
              {state.products.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleSelectFromList(p)}
                  className="w-full text-left px-4 py-3 active:bg-blue-50 transition-colors"
                >
                  <div className="font-medium text-sm text-gray-900">{p.descricao}</div>
                  <div className="text-[11px] text-gray-400 font-mono mt-0.5">
                    {p.codigoInterno} · {p.unidadeMedida}
                  </div>
                  {p.barcodes.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {p.barcodes.slice(0, 4).map((b) => (
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

        {/* ── ACTIONS ─────────────────────────────────────────────────────────── */}

        {/* Idle / Looking / Searching */}
        {(state.phase === "idle" || state.phase === "looking" || state.phase === "searching") && (
          <div className="flex flex-col gap-2">
            <button
              onClick={() => input.trim() && handleSearch(input)}
              disabled={!input.trim() || isBusy}
              className="w-full bg-[#0057B8] text-white font-bold text-lg rounded-2xl py-5 active:bg-[#003F8A] disabled:opacity-30 transition-colors shadow-md"
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

        {/* Found — barcode (EAN/DUN) */}
        {isBarcodeFound && (
          <div className="flex gap-3 slide-up">
            <button
              onClick={resetToIdle}
              className="flex-1 bg-white border-2 border-gray-200 text-gray-600 font-bold text-base rounded-2xl py-4 active:bg-gray-50"
            >
              Descartar
            </button>
            <button
              onClick={handleSaveConfirmed}
              className="flex-[2] bg-[#0057B8] text-white font-bold text-base rounded-2xl py-4 active:bg-[#003F8A] shadow-md"
            >
              Salvar ✓
            </button>
          </div>
        )}

        {/* Found — text identified, countType not yet chosen */}
        {needsCountType && (
          <button
            onClick={resetToIdle}
            className="w-full bg-white border-2 border-gray-200 text-gray-500 font-medium text-sm rounded-xl py-3 active:bg-gray-50 slide-up"
          >
            Descartar
          </button>
        )}

        {/* Found — text identified, countType chosen */}
        {isTextFound && !needsCountType && state.phase === "found" && (
          <div className="flex gap-3 slide-up">
            <button
              onClick={resetToIdle}
              className="flex-1 bg-white border-2 border-gray-200 text-gray-600 font-bold text-base rounded-2xl py-4 active:bg-gray-50"
            >
              Descartar
            </button>
            <button
              onClick={handleSaveConfirmed}
              className="flex-[2] bg-[#0057B8] text-white font-bold text-base rounded-2xl py-4 active:bg-[#003F8A] shadow-md"
            >
              Salvar ✓
            </button>
          </div>
        )}

        {/* Not found (barcode — can save pending / link) */}
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
                Gerar pendência
              </button>
            </div>
          </div>
        )}

        {/* Not found (text — no barcode to save as pending) */}
        {state.phase === "not_found_text" && (
          <button
            onClick={resetToIdle}
            className="w-full bg-white border-2 border-gray-200 text-gray-600 font-semibold text-sm rounded-2xl py-3.5 active:bg-gray-50 slide-up"
          >
            Tentar novamente
          </button>
        )}

        {/* Duplicate — dismiss explicitly */}
        {state.phase === "duplicate" && (
          <button
            onClick={resetToIdle}
            className="w-full bg-white border-2 border-amber-200 text-amber-700 font-semibold text-sm rounded-2xl py-3.5 active:bg-amber-50 slide-up"
          >
            Cancelar
          </button>
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
              Gerar pendência
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
                  <CodeTypeBadge type={entry.codeType} small />
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
    CODIGO_INTERNO: "bg-teal-600 text-white",
    UNKNOWN: "bg-gray-400 text-white",
  };
  const labels: Record<string, string> = {
    CODIGO_INTERNO: "INT",
  };
  return (
    <span
      className={`font-bold rounded tracking-wider uppercase ${
        small ? "text-[9px] px-1.5 py-0.5" : "text-[10px] px-2 py-1"
      } ${styles[type] ?? styles.UNKNOWN}`}
    >
      {labels[type] ?? type}
    </span>
  );
}

function IdentifiedByBadge({ identifiedBy }: { identifiedBy: IdentifiedBy }) {
  const map: Record<IdentifiedBy, { label: string; cls: string }> = {
    EAN: { label: "EAN", cls: "bg-blue-100 text-blue-700" },
    DUN: { label: "DUN", cls: "bg-purple-100 text-purple-700" },
    codigo_interno: { label: "Cód. interno", cls: "bg-teal-100 text-teal-700" },
    descricao: { label: "Descrição", cls: "bg-gray-100 text-gray-600" },
  };
  const { label, cls } = map[identifiedBy] ?? map.EAN;
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${cls}`}>
      {label}
    </span>
  );
}

function CameraIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
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
