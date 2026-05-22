"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import {
  lookupCode,
  saveInventoryCount,
  savePendingScan,
  searchProductByText,
} from "@/actions/scan";
import type { ProductWithBarcodes } from "@/actions/scan";
import { detectCodeType } from "@/lib/barcode";
import { CameraScanner } from "./camera-scanner";
import { MoveCheckLogo } from "@/components/move-check-logo";

// ─── Types ────────────────────────────────────────────────────────────────────

type IdentMethod = "EAN" | "DUN" | "CODIGO_INTERNO" | "DESCRICAO";

type FoundProduct = {
  id: string;
  codigoInterno: string;
  descricao: string;
  unidadeMedida: string;
  unitsPerPackage: number | null;
};

type Entry = {
  id: string;
  code: string;
  codeType: string;
  quantity: number;
  productName: string | null;
  savedAt: Date;
};

type Phase =
  | { tag: "idle" }
  | { tag: "searching" }
  | { tag: "found"; product: FoundProduct; method: IdentMethod; scannedCode: string }
  | { tag: "select"; results: ProductWithBarcodes[]; by: "CODIGO_INTERNO" | "DESCRICAO"; term: string }
  | { tag: "not_found"; term: string; codeType: string }
  | { tag: "saved"; productName: string }
  | { tag: "pending_saved"; code: string }
  | { tag: "duplicate"; code: string }
  | { tag: "error"; message: string };

type Props = {
  session: { id: string; name: string };
  companyId: string;
  initialEntries: Array<{
    id: string; code: string; codeType: string; quantity: number;
    status: string; scannedAt: Date; product: { codigoInterno: string; descricao: string } | null;
  }>;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function ScannerCockpit({ session, companyId, initialEntries }: Props) {
  // ── Identification inputs ──
  const [eanInput, setEanInput] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [descInput, setDescInput] = useState("");

  // ── Counting inputs ──
  const [qtyStr, setQtyStr] = useState("");
  const [countType, setCountType] = useState<"unidade" | "embalagem" | null>(null);
  const [tempUpk, setTempUpk] = useState(""); // temporary units/embalagem

  // ── Flow state ──
  const [phase, setPhase] = useState<Phase>({ tag: "idle" });
  const [saving, setSaving] = useState(false);
  const [qtyError, setQtyError] = useState("");

  // ── Camera ──
  const [cameraOpen, setCameraOpen] = useState(false);

  // ── Recent entries ──
  const [entries, setEntries] = useState<Entry[]>(
    initialEntries.map((e) => ({
      id: e.id,
      code: e.code,
      codeType: e.codeType,
      quantity: e.quantity,
      productName: e.product?.descricao ?? null,
      savedAt: e.scannedAt,
    }))
  );

  const eanRef = useRef<HTMLInputElement>(null);
  const codeRef = useRef<HTMLInputElement>(null);
  const qtyRef = useRef<HTMLInputElement>(null);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const autoResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Focus EAN field on mount
  useEffect(() => { eanRef.current?.focus(); }, []);

  // Auto-focus qty when product is found
  useEffect(() => {
    if (phase.tag === "found") {
      const isDun = phase.method === "DUN";
      const needsCountType = (phase.method === "CODIGO_INTERNO" || phase.method === "DESCRICAO") && countType === null;
      if (!needsCountType && (isDun || countType !== null || phase.method === "EAN")) {
        setTimeout(() => qtyRef.current?.focus(), 100);
      }
    }
  }, [phase.tag, countType]); // eslint-disable-line

  const clearAutoReset = () => {
    if (autoResetTimer.current) clearTimeout(autoResetTimer.current);
  };

  const scheduleReset = (ms: number) => {
    clearAutoReset();
    autoResetTimer.current = setTimeout(() => resetAll(), ms);
  };

  // ── Full reset ────────────────────────────────────────────────────────────────

  const resetAll = useCallback(() => {
    setEanInput("");
    setCodeInput("");
    setDescInput("");
    setQtyStr("");
    setCountType(null);
    setTempUpk("");
    setQtyError("");
    setPhase({ tag: "idle" });
    setSaving(false);
    clearAutoReset();
    setTimeout(() => eanRef.current?.focus(), 80);
  }, []); // eslint-disable-line

  // ── Search — EAN / DUN ────────────────────────────────────────────────────────

  const searchByEan = useCallback(async (raw: string) => {
    const code = raw.replace(/\D/g, "");
    if (code.length !== 13 && code.length !== 14) return;
    setPhase({ tag: "searching" });

    const result = await lookupCode(companyId, code);
    if (result.status === "error") {
      setPhase({ tag: "error", message: result.message });
      scheduleReset(4000);
      return;
    }
    if (result.status === "not_found") {
      setPhase({ tag: "not_found", term: code, codeType: result.codeType });
      return;
    }
    setPhase({
      tag: "found",
      method: result.codeType as "EAN" | "DUN",
      scannedCode: code,
      product: {
        id: result.product.id,
        codigoInterno: result.product.codigoInterno,
        descricao: result.product.descricao,
        unidadeMedida: result.product.unidadeMedida,
        unitsPerPackage: result.unitsPerPackage,
      },
    });
  }, [companyId]); // eslint-disable-line

  // ── Search — Código Interno ───────────────────────────────────────────────────

  const searchByCode = useCallback(async () => {
    const term = codeInput.trim();
    if (!term) return;
    setPhase({ tag: "searching" });

    const result = await searchProductByText(companyId, term);
    if (result.status === "error") { setPhase({ tag: "error", message: result.message }); scheduleReset(4000); return; }
    if (result.status === "not_found") { setPhase({ tag: "not_found", term, codeType: "UNKNOWN" }); return; }
    if (result.products.length === 1) {
      const p = result.products[0];
      setPhase({ tag: "found", method: "CODIGO_INTERNO", scannedCode: p.codigoInterno, product: { id: p.id, codigoInterno: p.codigoInterno, descricao: p.descricao, unidadeMedida: p.unidadeMedida, unitsPerPackage: p.unitsPerPackage } });
    } else {
      setPhase({ tag: "select", results: result.products, by: "CODIGO_INTERNO", term });
    }
  }, [companyId, codeInput]); // eslint-disable-line

  // ── Search — Descrição ────────────────────────────────────────────────────────

  const searchByDesc = useCallback(async () => {
    const term = descInput.trim();
    if (!term) return;
    setPhase({ tag: "searching" });

    const result = await searchProductByText(companyId, term);
    if (result.status === "error") { setPhase({ tag: "error", message: result.message }); scheduleReset(4000); return; }
    if (result.status === "not_found") { setPhase({ tag: "not_found", term, codeType: "UNKNOWN" }); return; }
    if (result.products.length === 1) {
      const p = result.products[0];
      setPhase({ tag: "found", method: "DESCRICAO", scannedCode: p.codigoInterno, product: { id: p.id, codigoInterno: p.codigoInterno, descricao: p.descricao, unidadeMedida: p.unidadeMedida, unitsPerPackage: p.unitsPerPackage } });
    } else {
      setPhase({ tag: "select", results: result.products, by: "DESCRICAO", term });
    }
  }, [companyId, descInput]); // eslint-disable-line

  // ── Select from list ──────────────────────────────────────────────────────────

  const handleSelectProduct = (p: ProductWithBarcodes, by: "CODIGO_INTERNO" | "DESCRICAO") => {
    setPhase({
      tag: "found",
      method: by,
      scannedCode: p.codigoInterno,
      product: { id: p.id, codigoInterno: p.codigoInterno, descricao: p.descricao, unidadeMedida: p.unidadeMedida, unitsPerPackage: p.unitsPerPackage },
    });
  };

  // ── Camera detect ─────────────────────────────────────────────────────────────

  const handleCameraDetect = useCallback((code: string) => {
    const ph = phaseRef.current.tag;
    if (ph !== "idle" && ph !== "saved" && ph !== "error" && ph !== "pending_saved") return;
    const clean = code.replace(/\D/g, "");
    if (!clean) return;
    setEanInput(clean);
    searchByEan(clean);
  }, [searchByEan]);

  // ── Save count ────────────────────────────────────────────────────────────────

  const handleSaveCount = useCallback(async () => {
    if (phase.tag !== "found") return;

    // Validate quantity
    const qty = parseInt(qtyStr, 10);
    if (!qtyStr || isNaN(qty) || qty <= 0) {
      setQtyError("Informe a quantidade contada antes de gravar.");
      qtyRef.current?.focus();
      return;
    }
    setQtyError("");

    // For text identification, count type must be chosen
    const isText = phase.method === "CODIGO_INTERNO" || phase.method === "DESCRICAO";
    if (isText && countType === null) return;

    // Determine codeType for DB
    const dbCodeType: "EAN" | "DUN" | "UNKNOWN" =
      phase.method === "EAN" ? "EAN" :
      phase.method === "DUN" ? "DUN" : "UNKNOWN";

    // units_per_package: registered catalog value or user-entered for embalagem
    let upk: number | undefined;
    if (phase.method === "DUN" && phase.product.unitsPerPackage) {
      upk = phase.product.unitsPerPackage;
    } else if (countType === "embalagem" && tempUpk) {
      const n = parseInt(tempUpk, 10);
      if (n > 0) upk = n;
    }

    setSaving(true);
    const result = await saveInventoryCount({
      companyId,
      sessionId: session.id,
      code: phase.scannedCode,
      codeType: dbCodeType,
      quantity: qty,
      productId: phase.product.id,
      unitsPerPackage: upk,
    });
    setSaving(false);

    if (!result.ok) {
      if (result.error.includes("já foi contado")) {
        setPhase({ tag: "duplicate", code: phase.scannedCode });
        scheduleReset(4000);
      } else {
        setPhase({ tag: "error", message: result.error });
        scheduleReset(4000);
      }
      return;
    }

    // Success — add to entries list
    const newEntry: Entry = {
      id: result.entryId,
      code: phase.scannedCode,
      codeType: dbCodeType,
      quantity: qty,
      productName: phase.product.descricao,
      savedAt: new Date(),
    };
    setEntries((prev) => [newEntry, ...prev.slice(0, 19)]);
    setPhase({ tag: "saved", productName: phase.product.descricao });
    scheduleReset(2500);
  }, [phase, qtyStr, countType, tempUpk, companyId, session.id]); // eslint-disable-line

  // ── Save pending ──────────────────────────────────────────────────────────────

  const handleSavePending = useCallback(async () => {
    if (phase.tag !== "not_found") return;
    setSaving(true);
    const result = await savePendingScan({
      companyId,
      sessionId: session.id,
      code: phase.term,
      quantity: 1,
    });
    setSaving(false);
    if (!result.ok) {
      setPhase({ tag: "error", message: result.error });
      scheduleReset(4000);
      return;
    }
    setPhase({ tag: "pending_saved", code: phase.term });
    scheduleReset(3000);
  }, [phase, companyId, session.id]); // eslint-disable-line

  // ── Derived UI state ──────────────────────────────────────────────────────────

  const isFound = phase.tag === "found";
  const isDun = isFound && phase.method === "DUN";
  const isText = isFound && (phase.method === "CODIGO_INTERNO" || phase.method === "DESCRICAO");
  const needsCountType = isText && countType === null;
  const showQty = isFound && !needsCountType;
  const qtyLabel = isDun || countType === "embalagem"
    ? "Quantidade de embalagens fechadas"
    : "Quantidade contada";

  const inventariosHref = `/empresas/${companyId}/inventarios`;

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-dvh bg-[#f4f6f9] flex flex-col">

      {/* Header */}
      <header className="bg-[#0057B8] text-white px-4 pt-4 pb-3 flex items-center justify-between shrink-0 relative overflow-hidden">
        <div aria-hidden className="absolute inset-0 opacity-[0.12] pointer-events-none mix-blend-screen" style={{ backgroundImage: "url('/branding/background-check.png')", backgroundSize: "cover", backgroundPosition: "center" }} />
        <div className="relative flex items-center gap-2.5 min-w-0 flex-1">
          <Link href={inventariosHref} className="text-white/70 active:text-white transition-colors shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          </Link>
          <MoveCheckLogo size={28} className="shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="text-[10px] text-white/55 tracking-[0.25em] uppercase">MOVE CHECK · INVENTÁRIO</div>
            <div className="font-bold text-sm leading-none truncate">{session.name}</div>
          </div>
        </div>
        <div className="relative flex items-center gap-2 shrink-0">
          <Link href={inventariosHref} className="text-white/60 text-[11px] font-medium border border-white/20 rounded-lg px-2.5 py-1.5 active:bg-white/10 transition-colors">Trocar</Link>
          <div className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-center">
            <div className="text-white/50 text-[9px] tracking-wider uppercase">Lidos</div>
            <div className="text-white font-bold text-sm leading-none">{entries.length}</div>
          </div>
        </div>
      </header>

      <div className="flex-1 px-4 py-4 max-w-lg mx-auto w-full flex flex-col gap-3 overflow-y-auto pb-8">

        {/* ── Status feedback ───────────────────────────────────────────────────── */}
        {phase.tag === "saved" && (
          <div className="bg-green-50 border-2 border-green-400 rounded-xl px-4 py-3">
            <div className="text-[10px] font-bold text-green-700 tracking-widest uppercase mb-0.5">✓ Contagem gravada</div>
            <div className="text-sm text-green-800 font-medium">{phase.productName}</div>
          </div>
        )}
        {phase.tag === "pending_saved" && (
          <div className="bg-amber-50 border-2 border-amber-400 rounded-xl px-4 py-3">
            <div className="text-[10px] font-bold text-amber-700 tracking-widest uppercase mb-0.5">Pendência gerada</div>
            <div className="text-sm text-amber-800">Código <span className="font-mono font-bold">{phase.code}</span> enviado para tratamento cadastral.</div>
          </div>
        )}
        {phase.tag === "duplicate" && (
          <div className="bg-amber-50 border-2 border-amber-300 rounded-xl px-4 py-3">
            <div className="text-[10px] font-bold text-amber-700 tracking-widest uppercase mb-0.5">Já contado</div>
            <div className="text-sm text-amber-800">Este produto já foi contado neste inventário.</div>
          </div>
        )}
        {phase.tag === "error" && (
          <div className="bg-red-50 border-2 border-red-400 rounded-xl px-4 py-3">
            <div className="text-[10px] font-bold text-red-700 tracking-widest uppercase mb-0.5">Erro</div>
            <div className="text-sm text-red-800">{phase.message}</div>
          </div>
        )}

        {/* ── Identification panel ──────────────────────────────────────────────── */}
        {(phase.tag === "idle" || phase.tag === "searching") && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-col gap-4">
            <div className="text-[10px] text-gray-400 tracking-widest uppercase font-medium">Identificação do produto</div>

            {/* EAN / DUN */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-gray-400 tracking-wider uppercase font-medium">EAN / DUN</label>
              <div className="flex gap-2">
                <input
                  ref={eanRef}
                  inputMode="numeric"
                  pattern="\d*"
                  type="text"
                  value={eanInput}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "");
                    setEanInput(v);
                    if (v.length === 13 || v.length === 14) searchByEan(v);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && eanInput.trim()) searchByEan(eanInput);
                  }}
                  placeholder="13 ou 14 dígitos"
                  maxLength={14}
                  disabled={phase.tag === "searching"}
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-3 text-sm font-mono outline-none focus:border-[#0057B8] focus:ring-1 focus:ring-[#0057B8]/20 transition"
                />
                <button
                  type="button"
                  onClick={() => setCameraOpen((v) => !v)}
                  className={`px-3 rounded-xl border-2 transition-colors ${cameraOpen ? "bg-[#0057B8] border-[#0057B8] text-white" : "border-gray-200 text-gray-500 bg-white active:bg-gray-50"}`}
                  title="Câmera"
                >
                  <CameraIcon />
                </button>
              </div>
            </div>

            {/* Código Interno */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-gray-400 tracking-wider uppercase font-medium">Código interno</label>
              <div className="flex gap-2">
                <input
                  ref={codeRef}
                  type="text"
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") searchByCode(); }}
                  placeholder="ex: INT-001"
                  disabled={phase.tag === "searching"}
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-3 text-sm font-mono outline-none focus:border-[#0057B8] focus:ring-1 focus:ring-[#0057B8]/20 transition"
                />
                <button
                  type="button"
                  onClick={searchByCode}
                  disabled={!codeInput.trim() || phase.tag === "searching"}
                  className="px-4 bg-gray-100 text-gray-600 font-bold text-sm rounded-xl border border-gray-200 active:bg-gray-200 disabled:opacity-40 transition"
                >
                  {phase.tag === "searching" ? "…" : "Buscar"}
                </button>
              </div>
            </div>

            {/* Descrição */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-gray-400 tracking-wider uppercase font-medium">Descrição do produto</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={descInput}
                  onChange={(e) => setDescInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") searchByDesc(); }}
                  placeholder="ex: Detergente líquido 500ml"
                  disabled={phase.tag === "searching"}
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-3 text-sm outline-none focus:border-[#0057B8] focus:ring-1 focus:ring-[#0057B8]/20 transition"
                />
                <button
                  type="button"
                  onClick={searchByDesc}
                  disabled={!descInput.trim() || phase.tag === "searching"}
                  className="px-4 bg-gray-100 text-gray-600 font-bold text-sm rounded-xl border border-gray-200 active:bg-gray-200 disabled:opacity-40 transition"
                >
                  {phase.tag === "searching" ? "…" : "Buscar"}
                </button>
              </div>
            </div>

            {phase.tag === "searching" && (
              <div className="text-center text-xs text-gray-400 py-1">Buscando produto…</div>
            )}
          </div>
        )}

        {/* ── Camera ────────────────────────────────────────────────────────────── */}
        {cameraOpen && (
          <CameraScanner onDetected={handleCameraDetect} onClose={() => setCameraOpen(false)} />
        )}

        {/* ── Product found ─────────────────────────────────────────────────────── */}
        {isFound && (
          <div className="bg-green-50 border-2 border-green-400 rounded-2xl px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <MethodBadge method={phase.method} />
              <span className="text-[10px] font-bold text-green-700 tracking-widest uppercase">Produto encontrado</span>
            </div>
            <div className="font-bold text-gray-900 text-base leading-tight">{phase.product.descricao}</div>
            <div className="text-xs text-gray-500 font-mono mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
              <span>{phase.product.codigoInterno}</span>
              <span>{phase.product.unidadeMedida}</span>
              {phase.product.unitsPerPackage && (
                <span className="text-purple-600 font-semibold">{phase.product.unitsPerPackage} un/emb</span>
              )}
            </div>
          </div>
        )}

        {/* ── DUN warning ───────────────────────────────────────────────────────── */}
        {isDun && (
          <div className="bg-purple-50 border-2 border-purple-300 rounded-xl px-4 py-3">
            <div className="text-[10px] font-bold text-purple-700 tracking-widest uppercase mb-1">⚠ Embalagem fechada (DUN)</div>
            <div className="text-sm text-purple-800">
              Conte as embalagens fechadas.
              {phase.product.unitsPerPackage
                ? <> Cada embalagem contém <strong>{phase.product.unitsPerPackage} unidades</strong>.</>
                : <> Não há registro de unidades por embalagem no cadastro.</>
              }{" "}Digite a quantidade de embalagens encontradas.
            </div>
          </div>
        )}

        {/* ── Como está contando? (texto) ───────────────────────────────────────── */}
        {needsCountType && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-4 py-4">
            <div className="text-[10px] text-gray-400 tracking-widest uppercase mb-3">Como você está contando?</div>
            <div className="flex gap-3">
              <button
                onClick={() => setCountType("unidade")}
                className="flex-1 border-2 border-gray-200 text-gray-700 font-semibold text-sm rounded-xl py-3.5 active:bg-gray-50 transition-colors"
              >
                Unidade
              </button>
              <button
                onClick={() => setCountType("embalagem")}
                className="flex-1 bg-[#0057B8] text-white font-semibold text-sm rounded-xl py-3.5 active:bg-[#003F8A] shadow-sm transition-colors"
              >
                Embalagem fechada
              </button>
            </div>
          </div>
        )}

        {/* ── Units per package for embalagem (text path) ───────────────────────── */}
        {isText && countType === "embalagem" && !phase.product.unitsPerPackage && (
          <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
            <label className="text-[10px] text-gray-400 tracking-wider uppercase block mb-1.5">Unidades por embalagem (opcional)</label>
            <input
              type="number"
              inputMode="numeric"
              min="1"
              value={tempUpk}
              onChange={(e) => setTempUpk(e.target.value)}
              placeholder="ex: 6"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono outline-none focus:border-[#0057B8]"
            />
            <div className="text-[10px] text-gray-300 mt-1">Não altera o cadastro — apenas referência para este inventário.</div>
          </div>
        )}

        {/* ── Quantity ──────────────────────────────────────────────────────────── */}
        {showQty && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-4 pt-4 pb-3">
            <label className="text-[10px] text-gray-400 tracking-widest uppercase block text-center mb-3">
              {qtyLabel}
            </label>

            {/* [-] [input] [+] */}
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  const cur = parseInt(qtyStr, 10);
                  const n = cur > 1 ? cur - 1 : 1;
                  setQtyStr(String(n));
                  setQtyError("");
                }}
                className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-gray-700 font-bold text-2xl shrink-0 active:bg-gray-200 transition select-none"
                aria-label="Diminuir"
              >−</button>

              <input
                ref={qtyRef}
                type="number"
                inputMode="numeric"
                min="1"
                value={qtyStr}
                onChange={(e) => {
                  setQtyStr(e.target.value);
                  setQtyError("");
                }}
                onKeyDown={(e) => { if (e.key === "Enter") handleSaveCount(); }}
                placeholder="0"
                className="w-32 text-center text-4xl font-bold text-gray-900 border-2 border-gray-200 rounded-xl py-3 outline-none focus:border-[#0057B8] focus:ring-2 focus:ring-[#0057B8]/20 transition [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />

              <button
                type="button"
                onClick={() => {
                  const n = (parseInt(qtyStr, 10) || 0) + 1;
                  setQtyStr(String(n));
                  setQtyError("");
                }}
                className="w-12 h-12 rounded-xl bg-[#0057B8] flex items-center justify-center text-white font-bold text-2xl shrink-0 active:bg-[#003F8A] transition select-none"
                aria-label="Aumentar"
              >+</button>
            </div>

            {/* DUN calculator */}
            {isDun && phase.product.unitsPerPackage && qtyStr && parseInt(qtyStr, 10) > 0 && (
              <div className="mt-3 text-center text-xs text-purple-600 font-medium">
                {parseInt(qtyStr, 10)} emb × {phase.product.unitsPerPackage} un = <strong>{parseInt(qtyStr, 10) * phase.product.unitsPerPackage} unidades</strong>
              </div>
            )}
            {countType === "embalagem" && tempUpk && qtyStr && parseInt(qtyStr, 10) > 0 && parseInt(tempUpk, 10) > 0 && (
              <div className="mt-3 text-center text-xs text-purple-600 font-medium">
                {parseInt(qtyStr, 10)} emb × {parseInt(tempUpk, 10)} un = <strong>{parseInt(qtyStr, 10) * parseInt(tempUpk, 10)} unidades</strong>
              </div>
            )}

            {qtyError && (
              <div className="mt-2 text-xs text-red-600 text-center font-medium">{qtyError}</div>
            )}
          </div>
        )}

        {/* ── Not found ─────────────────────────────────────────────────────────── */}
        {phase.tag === "not_found" && (
          <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl px-4 py-4">
            <div className="text-[10px] font-bold text-amber-700 tracking-widest uppercase mb-1">Não encontrado</div>
            <div className="text-sm text-amber-800 mb-3">
              Código/produto <span className="font-mono font-bold">"{phase.term}"</span> não está cadastrado.
              Gere uma pendência para tratamento cadastral.
            </div>
            <div className="flex gap-2">
              <button onClick={resetAll} className="flex-1 bg-white border border-gray-200 text-gray-600 text-sm font-medium rounded-xl py-3 active:bg-gray-50">Cancelar</button>
              <button
                onClick={handleSavePending}
                disabled={saving}
                className="flex-[2] bg-amber-500 text-white font-bold text-sm rounded-xl py-3 active:bg-amber-600 shadow-sm disabled:opacity-50"
              >
                {saving ? "Gerando…" : "Gerar pendência de cadastro"}
              </button>
            </div>
          </div>
        )}

        {/* ── Multiple results ──────────────────────────────────────────────────── */}
        {phase.tag === "select" && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="text-[10px] text-gray-400 tracking-wider uppercase font-medium">{phase.results.length} produtos encontrados — selecione</div>
              <div className="text-xs text-gray-500 font-mono mt-0.5 truncate">"{phase.term}"</div>
            </div>
            <div className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
              {phase.results.map((p) => (
                <button key={p.id} onClick={() => handleSelectProduct(p, phase.by)} className="w-full text-left px-4 py-3 active:bg-blue-50 transition-colors">
                  <div className="font-medium text-sm text-gray-900">{p.descricao}</div>
                  <div className="text-[11px] text-gray-400 font-mono mt-0.5">{p.codigoInterno} · {p.unidadeMedida}</div>
                  {p.barcodes.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {p.barcodes.slice(0, 4).map((b) => (
                        <span key={b.code} className="font-mono text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{b.code}</span>
                      ))}
                    </div>
                  )}
                </button>
              ))}
            </div>
            <div className="px-4 py-3 border-t border-gray-100">
              <button onClick={resetAll} className="w-full text-sm text-gray-500 font-medium py-2 active:text-gray-700">Cancelar</button>
            </div>
          </div>
        )}

        {/* ── Action buttons ────────────────────────────────────────────────────── */}
        {isFound && (
          <div className="flex gap-3">
            <button
              onClick={resetAll}
              disabled={saving}
              className="flex-1 bg-white border-2 border-gray-200 text-gray-600 font-bold text-base rounded-2xl py-4 active:bg-gray-50 disabled:opacity-40"
            >
              Nova contagem
            </button>
            <button
              onClick={handleSaveCount}
              disabled={saving || needsCountType}
              className="flex-[2] bg-[#0057B8] text-white font-bold text-base rounded-2xl py-4 active:bg-[#003F8A] shadow-md disabled:opacity-40 transition-colors"
            >
              {saving ? "Gravando…" : "Gravar Contagem ✓"}
            </button>
          </div>
        )}
      </div>

      {/* ── Recent entries strip ──────────────────────────────────────────────── */}
      {entries.length > 0 && (
        <div className="bg-white border-t border-gray-200 px-4 pt-3 pb-4 max-w-lg mx-auto w-full shrink-0">
          <div className="text-[10px] text-gray-400 tracking-widest uppercase mb-2">Últimas contagens</div>
          <div className="flex flex-col gap-1 max-h-36 overflow-y-auto">
            {entries.slice(0, 6).map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-2 py-1.5 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-2 min-w-0">
                  <CodeTypeBadge type={e.codeType} small />
                  <div className="min-w-0">
                    <div className="font-mono text-xs text-gray-700 truncate">{e.code}</div>
                    {e.productName && <div className="text-[10px] text-gray-400 truncate">{e.productName}</div>}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[11px] font-bold text-[#0057B8] bg-blue-50 px-1.5 py-0.5 rounded">×{e.quantity}</span>
                  <span className="text-[10px] text-gray-300 font-mono">
                    {new Date(e.savedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
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

function MethodBadge({ method }: { method: IdentMethod }) {
  const map: Record<IdentMethod, { label: string; cls: string }> = {
    EAN:  { label: "EAN",  cls: "bg-[#0057B8] text-white" },
    DUN:  { label: "DUN",  cls: "bg-purple-600 text-white" },
    CODIGO_INTERNO: { label: "Cód. interno", cls: "bg-teal-600 text-white" },
    DESCRICAO:      { label: "Descrição",    cls: "bg-gray-600 text-white" },
  };
  const { label, cls } = map[method];
  return <span className={`text-[9px] font-bold px-2 py-0.5 rounded tracking-wider uppercase ${cls}`}>{label}</span>;
}

function CodeTypeBadge({ type, small = false }: { type: string; small?: boolean }) {
  const styles: Record<string, string> = {
    EAN: "bg-[#0057B8] text-white",
    DUN: "bg-purple-600 text-white",
    UNKNOWN: "bg-gray-400 text-white",
  };
  return (
    <span className={`font-bold rounded tracking-wider uppercase shrink-0 ${small ? "text-[9px] px-1.5 py-0.5" : "text-[10px] px-2 py-1"} ${styles[type] ?? styles.UNKNOWN}`}>
      {type === "UNKNOWN" ? "INT" : type}
    </span>
  );
}

function CameraIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
      <circle cx="12" cy="13" r="4"/>
    </svg>
  );
}
