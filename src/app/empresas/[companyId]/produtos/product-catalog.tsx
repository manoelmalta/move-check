"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  createProduct,
  updateProduct,
  addBarcode,
  removeBarcode,
} from "@/actions/product";
import type { CatalogProduct } from "@/actions/product";
import { MoveCheckLogo } from "@/components/move-check-logo";

// ─── Types ────────────────────────────────────────────────────────────────────

type Panel =
  | { tag: "list" }
  | { tag: "create" }
  | { tag: "view"; product: CatalogProduct }
  | { tag: "edit"; product: CatalogProduct };

type FormState = {
  codigoInterno: string;
  descricao: string;
  unidadeMedida: string;
  observacao: string;
  hasFixedPicking: boolean;
  fixedPickingAddress: string;
  hasFixedAddress: boolean;
  fixedAddress: string;
};

type BarcodeForm = {
  code: string;
  codeType: "EAN" | "DUN" | "UNKNOWN";
  unitsPerPackage: string;
};

const EMPTY_FORM: FormState = {
  codigoInterno: "",
  descricao: "",
  unidadeMedida: "UN",
  observacao: "",
  hasFixedPicking: false,
  fixedPickingAddress: "",
  hasFixedAddress: false,
  fixedAddress: "",
};

const EMPTY_BARCODE: BarcodeForm = {
  code: "",
  codeType: "EAN",
  unitsPerPackage: "",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function autoDetectType(code: string): "EAN" | "DUN" | "UNKNOWN" {
  const d = code.replace(/\D/g, "");
  if (d.length === 13) return "EAN";
  if (d.length === 14) return "DUN";
  return "UNKNOWN";
}

function isComplete(p: CatalogProduct): boolean {
  return p.barcodes.length > 0;
}

function sortProducts(arr: CatalogProduct[]): CatalogProduct[] {
  return [...arr].sort((a, b) => a.descricao.localeCompare(b.descricao, "pt-BR"));
}

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  companyId: string;
  companyName: string;
  initialProducts: CatalogProduct[];
};

// ─── Component ────────────────────────────────────────────────────────────────

export function ProductCatalog({ companyId, companyName, initialProducts }: Props) {
  const [products, setProducts] = useState<CatalogProduct[]>(() => sortProducts(initialProducts));
  const [panel, setPanel] = useState<Panel>({ tag: "list" });
  const [search, setSearch] = useState("");

  // Form state
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  // Barcode state
  const [barcodeForm, setBarcodeForm] = useState<BarcodeForm>(EMPTY_BARCODE);
  const [barcodeError, setBarcodeError] = useState("");
  const [barcodeSuccess, setBarcodeSuccess] = useState("");
  const [barcodeSaving, setBarcodeSaving] = useState(false);

  // ── Filtering ────────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase();
    if (!t) return products;
    return products.filter(
      (p) =>
        p.codigoInterno.toLowerCase().includes(t) ||
        p.descricao.toLowerCase().includes(t) ||
        p.barcodes.some((b) => b.code.toLowerCase().includes(t))
    );
  }, [products, search]);

  // ── Navigation ───────────────────────────────────────────────────────────────

  const goList = useCallback(() => {
    setPanel({ tag: "list" });
    setFormError("");
    setBarcodeError("");
    setBarcodeSuccess("");
  }, []);

  const goCreate = useCallback(() => {
    setForm(EMPTY_FORM);
    setFormError("");
    setPanel({ tag: "create" });
  }, []);

  const goView = useCallback((product: CatalogProduct) => {
    setBarcodeForm(EMPTY_BARCODE);
    setBarcodeError("");
    setBarcodeSuccess("");
    setPanel({ tag: "view", product });
  }, []);

  const goEdit = useCallback((product: CatalogProduct) => {
    setForm({
      codigoInterno: product.codigoInterno,
      descricao: product.descricao,
      unidadeMedida: product.unidadeMedida,
      observacao: product.observacao ?? "",
      hasFixedPicking: product.hasFixedPicking,
      fixedPickingAddress: product.fixedPickingAddress ?? "",
      hasFixedAddress: product.hasFixedAddress,
      fixedAddress: product.fixedAddress ?? "",
    });
    setFormError("");
    setPanel({ tag: "edit", product });
  }, []);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleCreate = useCallback(async () => {
    if (!form.codigoInterno.trim() || !form.descricao.trim()) return;
    setSaving(true);
    setFormError("");

    const result = await createProduct(companyId, {
      codigoInterno: form.codigoInterno.trim(),
      descricao: form.descricao.trim(),
      unidadeMedida: form.unidadeMedida.trim() || "UN",
      observacao: form.observacao.trim() || null,
      hasFixedPicking: form.hasFixedPicking,
      fixedPickingAddress: form.hasFixedPicking ? (form.fixedPickingAddress.trim() || null) : null,
      hasFixedAddress: form.hasFixedAddress,
      fixedAddress: form.hasFixedAddress ? (form.fixedAddress.trim() || null) : null,
    });

    setSaving(false);
    if (!result.ok) { setFormError(result.error); return; }

    const newP = result.product;
    setProducts((prev) => sortProducts([...prev, newP]));
    goView(newP);
  }, [form, companyId, goView]);

  const handleUpdate = useCallback(async () => {
    if (panel.tag !== "edit") return;
    if (!form.descricao.trim()) return;
    setSaving(true);
    setFormError("");

    const result = await updateProduct(companyId, panel.product.id, {
      descricao: form.descricao.trim(),
      unidadeMedida: form.unidadeMedida.trim() || "UN",
      observacao: form.observacao.trim() || null,
      hasFixedPicking: form.hasFixedPicking,
      fixedPickingAddress: form.hasFixedPicking ? (form.fixedPickingAddress.trim() || null) : null,
      hasFixedAddress: form.hasFixedAddress,
      fixedAddress: form.hasFixedAddress ? (form.fixedAddress.trim() || null) : null,
    });

    setSaving(false);
    if (!result.ok) { setFormError(result.error); return; }

    const updated: CatalogProduct = {
      ...panel.product,
      descricao: form.descricao.trim(),
      unidadeMedida: form.unidadeMedida.trim() || "UN",
      observacao: form.observacao.trim() || null,
      hasFixedPicking: form.hasFixedPicking,
      fixedPickingAddress: form.hasFixedPicking ? (form.fixedPickingAddress.trim() || null) : null,
      hasFixedAddress: form.hasFixedAddress,
      fixedAddress: form.hasFixedAddress ? (form.fixedAddress.trim() || null) : null,
    };
    setProducts((prev) => sortProducts(prev.map((p) => (p.id === updated.id ? updated : p))));
    goView(updated);
  }, [panel, form, companyId, goView]);

  const handleBarcodeCodeChange = useCallback((v: string) => {
    const detected = autoDetectType(v);
    const cleanLen = v.replace(/\D/g, "").length;
    setBarcodeForm((f) => ({
      ...f,
      code: v,
      codeType: cleanLen === 13 || cleanLen === 14 ? detected : f.codeType,
    }));
    setBarcodeError("");
    setBarcodeSuccess("");
  }, []);

  const handleAddBarcode = useCallback(async () => {
    if (panel.tag !== "view") return;
    const code = barcodeForm.code.replace(/\s/g, "");
    if (!code) { setBarcodeError("Informe o código a vincular"); return; }

    setBarcodeSaving(true);
    setBarcodeError("");
    setBarcodeSuccess("");

    const upk =
      (barcodeForm.codeType === "DUN" || barcodeForm.codeType === "UNKNOWN") &&
      barcodeForm.unitsPerPackage
        ? parseInt(barcodeForm.unitsPerPackage, 10) || null
        : null;

    const result = await addBarcode(companyId, panel.product.id, {
      code,
      codeType: barcodeForm.codeType,
      unitsPerPackage: upk,
    });

    setBarcodeSaving(false);
    if (!result.ok) { setBarcodeError(result.error); return; }

    const newBarcode = {
      code: result.code,
      codeType: result.codeType,
      unitsPerPackage: result.unitsPerPackage,
    };
    const updated: CatalogProduct = {
      ...panel.product,
      barcodes: [...panel.product.barcodes, newBarcode],
    };
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    setPanel({ tag: "view", product: updated });
    setBarcodeForm(EMPTY_BARCODE);
    setBarcodeSuccess("Código vinculado com sucesso!");
    setTimeout(() => setBarcodeSuccess(""), 3500);
  }, [panel, barcodeForm, companyId]);

  const handleRemoveBarcode = useCallback(async (code: string) => {
    if (panel.tag !== "view") return;
    const productId = panel.product.id;

    const result = await removeBarcode(companyId, productId, code);
    if (!result.ok) return;

    const updated: CatalogProduct = {
      ...panel.product,
      barcodes: panel.product.barcodes.filter((b) => b.code !== code),
    };
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    setPanel({ tag: "view", product: updated });
  }, [panel, companyId]);

  // ─── Render ───────────────────────────────────────────────────────────────────

  const headerTitle =
    panel.tag === "create"
      ? "Novo Produto"
      : panel.tag === "edit" && panel.tag === "edit"
      ? "Editar Produto"
      : "Cadastro de Produtos";

  return (
    <div className="min-h-dvh bg-[#f4f6f9] flex flex-col">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
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
          {panel.tag === "list" ? (
            <Link
              href={`/empresas/${companyId}`}
              className="text-white/70 active:text-white transition-colors shrink-0"
            >
              <BackArrow />
            </Link>
          ) : (
            <button
              onClick={goList}
              className="text-white/70 active:text-white transition-colors shrink-0"
            >
              <BackArrow />
            </button>
          )}
          <MoveCheckLogo size={28} className="shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="text-[10px] text-white/55 tracking-[0.25em] uppercase">
              MOVE CHECK · PRODUTOS
            </div>
            <div className="font-bold text-sm leading-none truncate">
              {companyName}
            </div>
          </div>
        </div>
        <div className="relative shrink-0">
          <div className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-center">
            <div className="text-white/50 text-[9px] tracking-wider uppercase">Produtos</div>
            <div className="text-white font-bold text-sm leading-none">{products.length}</div>
          </div>
        </div>
      </header>

      {/* ── Views ───────────────────────────────────────────────────────────── */}

      {panel.tag === "list" && (
        <ListView
          products={filtered}
          totalCount={products.length}
          search={search}
          onSearch={setSearch}
          onSelect={goView}
          onCreateNew={goCreate}
          companyId={companyId}
        />
      )}

      {(panel.tag === "create" || panel.tag === "edit") && (
        <FormView
          mode={panel.tag}
          form={form}
          onForm={setForm}
          error={formError}
          saving={saving}
          onSave={panel.tag === "create" ? handleCreate : handleUpdate}
          onCancel={panel.tag === "edit" ? () => goView(panel.product) : goList}
        />
      )}

      {panel.tag === "view" && (
        <DetailView
          product={panel.product}
          barcodeForm={barcodeForm}
          barcodeError={barcodeError}
          barcodeSuccess={barcodeSuccess}
          barcodeSaving={barcodeSaving}
          onEdit={() => goEdit(panel.product)}
          onBarcodeCodeChange={handleBarcodeCodeChange}
          onBarcodeFormChange={(field, value) =>
            setBarcodeForm((f) => ({ ...f, [field]: value }))
          }
          onAddBarcode={handleAddBarcode}
          onRemoveBarcode={handleRemoveBarcode}
        />
      )}
    </div>
  );
}

// ─── ListView ────────────────────────────────────────────────────────────────

function ListView({
  products,
  totalCount,
  search,
  onSearch,
  onSelect,
  onCreateNew,
  companyId,
}: {
  products: CatalogProduct[];
  totalCount: number;
  search: string;
  onSearch: (v: string) => void;
  onSelect: (p: CatalogProduct) => void;
  onCreateNew: () => void;
  companyId: string;
}) {
  return (
    <div className="flex-1 flex flex-col px-4 py-4 max-w-lg mx-auto w-full gap-3 overflow-y-auto pb-8">
      {/* Action bar */}
      <div className="flex gap-2">
        <button
          onClick={onCreateNew}
          className="flex-1 flex items-center justify-center gap-2 bg-[#0057B8] text-white font-bold rounded-2xl py-3.5 active:bg-[#003F8A] transition-colors shadow-md"
        >
          <span className="text-xl leading-none">+</span>
          Novo Produto
        </button>
        <Link
          href={`/empresas/${companyId}/importar`}
          className="flex items-center gap-1.5 bg-white border border-gray-200 text-gray-600 font-medium text-sm rounded-2xl px-4 py-3.5 active:bg-gray-50 shadow-sm"
        >
          <UploadIcon />
          Importar
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
          <SearchIcon />
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Buscar por código interno, descrição, EAN ou DUN"
          className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-4 py-3 text-sm outline-none focus:border-[#0057B8] focus:ring-1 focus:ring-[#0057B8]/20 shadow-sm"
        />
        {search && (
          <button
            onClick={() => onSearch("")}
            className="absolute inset-y-0 right-3 flex items-center text-gray-400 active:text-gray-600"
          >
            <span className="text-lg leading-none">×</span>
          </button>
        )}
      </div>

      {/* Product list */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <span className="text-xs text-gray-400 tracking-wider uppercase font-medium">
            {search ? `Resultados para "${search}"` : "Catálogo"}
          </span>
          <span className="text-xs text-gray-400">
            {products.length === totalCount
              ? `${totalCount} produto${totalCount !== 1 ? "s" : ""}`
              : `${products.length} de ${totalCount}`}
          </span>
        </div>

        {products.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <div className="text-4xl mb-3">📦</div>
            <div className="text-gray-500 text-sm font-medium">
              {search ? "Nenhum produto encontrado" : "Nenhum produto cadastrado"}
            </div>
            <div className="text-gray-300 text-xs mt-1">
              {search
                ? "Tente outro código, descrição ou EAN/DUN"
                : 'Clique em "Novo Produto" ou importe via CSV'}
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {products.map((p) => (
              <button
                key={p.id}
                onClick={() => onSelect(p)}
                className="w-full text-left px-4 py-3.5 active:bg-blue-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-sm text-gray-900 leading-snug truncate">
                      {p.descricao}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className="text-[11px] text-gray-500 font-mono">{p.codigoInterno}</span>
                      <span className="text-[10px] text-gray-300">·</span>
                      <span className="text-[11px] text-gray-400">{p.unidadeMedida}</span>
                      {p.observacao && (
                        <>
                          <span className="text-[10px] text-gray-300">·</span>
                          <span className="text-[11px] text-gray-400 truncate max-w-[140px]">
                            {p.observacao}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <CompletenessBadge complete={isComplete(p)} />
                    <span className="text-[10px] text-gray-300">›</span>
                  </div>
                </div>
                {p.barcodes.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {p.barcodes.slice(0, 4).map((b) => (
                      <BarcodePill key={b.code} barcode={b} />
                    ))}
                    {p.barcodes.length > 4 && (
                      <span className="text-[10px] text-gray-400 font-medium">
                        +{p.barcodes.length - 4}
                      </span>
                    )}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── FormView (create + edit) ─────────────────────────────────────────────────

function FormView({
  mode,
  form,
  onForm,
  error,
  saving,
  onSave,
  onCancel,
}: {
  mode: "create" | "edit";
  form: FormState;
  onForm: React.Dispatch<React.SetStateAction<FormState>>;
  error: string;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  const set = (field: keyof FormState) => (value: string | boolean) =>
    onForm((f) => ({ ...f, [field]: value }));

  const canSave = form.codigoInterno.trim() !== "" && form.descricao.trim() !== "";

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 max-w-lg mx-auto w-full pb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-base text-gray-900">
          {mode === "create" ? "Novo Produto" : "Editar Produto"}
        </h2>
        <button onClick={onCancel} className="text-gray-400 text-xl leading-none px-1 py-1">×</button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 mb-4">
          {error}
        </div>
      )}

      {/* Dados do produto */}
      <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-col gap-3 mb-3">
        <SectionLabel>Dados do produto</SectionLabel>

        <div className="grid grid-cols-2 gap-3">
          <FormField
            label="Código interno *"
            value={form.codigoInterno}
            onChange={set("codigoInterno") as (v: string) => void}
            placeholder="ex: 1001"
            mono
            required
            disabled={mode === "edit"}
          />
          <FormField
            label="Unidade de medida"
            value={form.unidadeMedida}
            onChange={set("unidadeMedida") as (v: string) => void}
            placeholder="UN"
          />
        </div>

        <FormField
          label="Descrição *"
          value={form.descricao}
          onChange={set("descricao") as (v: string) => void}
          placeholder="Nome completo do produto"
          required
        />

        <FormField
          label="Observação"
          value={form.observacao}
          onChange={set("observacao") as (v: string) => void}
          placeholder="Campo livre (opcional)"
        />
      </section>

      {/* Endereçamento */}
      <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-col gap-3 mb-4">
        <SectionLabel>Endereçamento</SectionLabel>

        <ToggleRow
          label="Picking fixo"
          checked={form.hasFixedPicking}
          onChange={set("hasFixedPicking") as (v: boolean) => void}
        />
        {form.hasFixedPicking && (
          <FormField
            label="Endereço de picking"
            value={form.fixedPickingAddress}
            onChange={set("fixedPickingAddress") as (v: string) => void}
            placeholder="ex: 01-01-01-001"
            mono
          />
        )}

        <div className="border-t border-gray-100 pt-3">
          <ToggleRow
            label="Endereço fixo"
            checked={form.hasFixedAddress}
            onChange={set("hasFixedAddress") as (v: boolean) => void}
          />
        </div>
        {form.hasFixedAddress && (
          <FormField
            label="Endereço fixo"
            value={form.fixedAddress}
            onChange={set("fixedAddress") as (v: string) => void}
            placeholder="ex: 01-02-03-001"
            mono
          />
        )}
      </section>

      <button
        onClick={onSave}
        disabled={!canSave || saving}
        className="w-full bg-[#0057B8] text-white font-bold rounded-2xl py-4 active:bg-[#003F8A] disabled:opacity-40 transition-colors shadow-md"
      >
        {saving ? "Salvando…" : "Salvar Cadastro"}
      </button>
    </div>
  );
}

// ─── DetailView ───────────────────────────────────────────────────────────────

function DetailView({
  product,
  barcodeForm,
  barcodeError,
  barcodeSuccess,
  barcodeSaving,
  onEdit,
  onBarcodeCodeChange,
  onBarcodeFormChange,
  onAddBarcode,
  onRemoveBarcode,
}: {
  product: CatalogProduct;
  barcodeForm: BarcodeForm;
  barcodeError: string;
  barcodeSuccess: string;
  barcodeSaving: boolean;
  onEdit: () => void;
  onBarcodeCodeChange: (v: string) => void;
  onBarcodeFormChange: (field: keyof BarcodeForm, value: string) => void;
  onAddBarcode: () => void;
  onRemoveBarcode: (code: string) => void;
}) {
  const complete = isComplete(product);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 max-w-lg mx-auto w-full pb-8 flex flex-col gap-3">

      {/* Product hero */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-4 py-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h2 className="font-bold text-lg text-gray-900 leading-snug">{product.descricao}</h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="font-mono text-xs text-gray-500">{product.codigoInterno}</span>
              <span className="text-gray-300 text-xs">·</span>
              <span className="text-xs text-gray-500">{product.unidadeMedida}</span>
            </div>
          </div>
          <CompletenessBadge complete={complete} />
        </div>

        {product.observacao && (
          <p className="text-xs text-gray-400 mt-2 italic">{product.observacao}</p>
        )}

        <button
          onClick={onEdit}
          className="mt-3 w-full bg-gray-100 text-gray-700 font-semibold text-sm rounded-xl py-2.5 active:bg-gray-200 transition-colors"
        >
          Editar produto
        </button>
      </div>

      {/* Endereçamento */}
      {(product.hasFixedPicking || product.hasFixedAddress) && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-4 py-4">
          <SectionLabel>Endereçamento</SectionLabel>
          <div className="mt-3 flex flex-col gap-2">
            {product.hasFixedPicking && (
              <InfoRow
                label="Picking fixo"
                value={product.fixedPickingAddress ?? "—"}
                mono={!!product.fixedPickingAddress}
              />
            )}
            {product.hasFixedAddress && (
              <InfoRow
                label="Endereço fixo"
                value={product.fixedAddress ?? "—"}
                mono={!!product.fixedAddress}
              />
            )}
          </div>
        </div>
      )}

      {/* Códigos vinculados */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <SectionLabel>Códigos vinculados</SectionLabel>
          <span className="text-xs text-gray-400">
            {product.barcodes.length} código{product.barcodes.length !== 1 ? "s" : ""}
          </span>
        </div>

        {product.barcodes.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <div className="text-2xl mb-1">🔗</div>
            <div className="text-xs text-gray-400">Nenhum código vinculado</div>
            <div className="text-[10px] text-gray-300 mt-0.5">
              Adicione um EAN, DUN ou código interno abaixo
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {product.barcodes.map((b) => (
              <div key={b.code} className="flex items-center justify-between px-4 py-3 gap-3">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <CodeTypeBadge type={b.codeType} />
                  <div className="min-w-0">
                    <div className="font-mono text-sm text-gray-900">{b.code}</div>
                    {b.unitsPerPackage && (
                      <div className="text-[10px] text-purple-600 font-medium">
                        {b.unitsPerPackage} un/emb
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => onRemoveBarcode(b.code)}
                  className="text-gray-300 active:text-red-500 transition-colors shrink-0 p-1"
                  title="Remover vínculo"
                >
                  <TrashIcon />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Vincular novo código */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-4 py-4 flex flex-col gap-3">
        <SectionLabel>Vincular código ao produto</SectionLabel>

        {barcodeSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-2.5 text-sm text-green-700 font-medium">
            ✓ {barcodeSuccess}
          </div>
        )}
        {barcodeError && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-sm text-red-700">
            {barcodeError}
          </div>
        )}

        {/* Code input + type selector */}
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-[10px] text-gray-400 tracking-wider uppercase font-medium block mb-1">
              Código
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={barcodeForm.code}
              onChange={(e) => onBarcodeCodeChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") onAddBarcode(); }}
              placeholder="EAN, DUN ou código"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono outline-none focus:border-[#0057B8] focus:ring-1 focus:ring-[#0057B8]/20 transition"
            />
          </div>
          <div className="shrink-0">
            <label className="text-[10px] text-gray-400 tracking-wider uppercase font-medium block mb-1">
              Tipo
            </label>
            <select
              value={barcodeForm.codeType}
              onChange={(e) =>
                onBarcodeFormChange("codeType", e.target.value)
              }
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0057B8] bg-white h-[42px]"
            >
              <option value="EAN">EAN</option>
              <option value="DUN">DUN</option>
              <option value="UNKNOWN">Outro</option>
            </select>
          </div>
        </div>

        {/* DUN: units per package */}
        {(barcodeForm.codeType === "DUN") && (
          <div>
            <label className="text-[10px] text-gray-400 tracking-wider uppercase font-medium block mb-1">
              Unidades por embalagem
            </label>
            <input
              type="number"
              inputMode="numeric"
              min="1"
              value={barcodeForm.unitsPerPackage}
              onChange={(e) => onBarcodeFormChange("unitsPerPackage", e.target.value)}
              placeholder="ex: 6"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono outline-none focus:border-[#0057B8] focus:ring-1 focus:ring-[#0057B8]/20 transition [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <div className="text-[10px] text-gray-300 mt-1">
              Quantidade de unidades dentro de cada embalagem fechada DUN.
            </div>
          </div>
        )}

        {/* Length hint */}
        {barcodeForm.code && (
          <div className="text-[10px] text-gray-400">
            {barcodeForm.code.replace(/\D/g, "").length} dígitos numéricos
            {barcodeForm.codeType === "EAN" && " · EAN padrão: 13"}
            {barcodeForm.codeType === "DUN" && " · DUN padrão: 14"}
          </div>
        )}

        <button
          onClick={onAddBarcode}
          disabled={!barcodeForm.code.trim() || barcodeSaving}
          className="w-full bg-[#0057B8] text-white font-bold text-sm rounded-xl py-3 active:bg-[#003F8A] disabled:opacity-40 transition-colors"
        >
          {barcodeSaving ? "Vinculando…" : "Vincular código"}
        </button>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-bold text-gray-400 tracking-widest uppercase">
      {children}
    </div>
  );
}

function FormField({
  label,
  value,
  onChange,
  placeholder,
  required,
  mono,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  mono?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] text-gray-400 tracking-wider uppercase font-medium">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className={`border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none transition
          focus:border-[#0057B8] focus:ring-1 focus:ring-[#0057B8]/20
          disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed
          ${mono ? "font-mono" : ""}`}
      />
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-700 font-medium">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none ${
          checked ? "bg-[#0057B8]" : "bg-gray-200"
        }`}
        role="switch"
        aria-checked={checked}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

function InfoRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-gray-500">{label}</span>
      <span className={`text-xs text-gray-900 font-medium ${mono ? "font-mono" : ""}`}>
        {value}
      </span>
    </div>
  );
}

function BarcodePill({
  barcode,
}: {
  barcode: { code: string; codeType: string; unitsPerPackage: number | null };
}) {
  const cls =
    barcode.codeType === "EAN"
      ? "bg-blue-50 border-blue-200 text-blue-700"
      : barcode.codeType === "DUN"
      ? "bg-purple-50 border-purple-200 text-purple-700"
      : "bg-gray-50 border-gray-200 text-gray-600";

  return (
    <span
      className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${cls}`}
    >
      {barcode.codeType} {barcode.code}
      {barcode.unitsPerPackage ? ` · ${barcode.unitsPerPackage}un/emb` : ""}
    </span>
  );
}

function CompletenessBadge({ complete }: { complete: boolean }) {
  return complete ? (
    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200 shrink-0 whitespace-nowrap">
      Completo
    </span>
  ) : (
    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200 shrink-0 whitespace-nowrap">
      Incompleto
    </span>
  );
}

function CodeTypeBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    EAN: "bg-[#0057B8] text-white",
    DUN: "bg-purple-600 text-white",
    UNKNOWN: "bg-gray-400 text-white",
  };
  return (
    <span
      className={`text-[9px] font-bold px-1.5 py-0.5 rounded tracking-wider uppercase shrink-0 ${styles[type] ?? styles.UNKNOWN}`}
    >
      {type === "UNKNOWN" ? "OUT" : type}
    </span>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function BackArrow() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5M12 5l-7 7 7 7" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}
