"use client";

import { PurchaseOrderStatus } from "@prisma/client";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

type SupplierOption = {
  id: string;
  name: string;
  address?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
};

type ProjectOption = {
  id: string;
  label: string;
  deliveryAddress?: string | null;
};

type ChangeRequestOption = {
  id: string;
  label: string;
};

type QuoteLineOption = {
  id: string;
  productId?: string | null;
  supplierId?: string | null;
  supplierName?: string | null;
  lineType: string;
  itemType?: string | null;
  sku?: string | null;
  manufacturer?: string | null;
  description: string;
  quantity: number;
  unitCost: number;
};

type QuoteOption = {
  id: string;
  label: string;
  lines: QuoteLineOption[];
};

type PurchaseOrderLineDraft = {
  key: string;
  productId?: string | null;
  sku: string;
  manufacturer: string;
  description: string;
  quantity: string;
  unitCost: string;
  taxRate: string;
};

export function PurchaseOrderForm({
  suppliers,
  projects,
  quotes,
  changeRequests,
  defaultProjectId,
  defaultQuoteId,
  defaultChangeRequestId
}: {
  suppliers: SupplierOption[];
  projects: ProjectOption[];
  quotes: QuoteOption[];
  changeRequests: ChangeRequestOption[];
  defaultProjectId?: string;
  defaultQuoteId?: string;
  defaultChangeRequestId?: string;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [supplierId, setSupplierId] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [supplierAddress, setSupplierAddress] = useState("");
  const [supplierContactName, setSupplierContactName] = useState("");
  const [supplierContactEmail, setSupplierContactEmail] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [projectId, setProjectId] = useState(defaultProjectId ?? "");
  const [quoteId, setQuoteId] = useState(defaultQuoteId ?? "");
  const [changeRequestId, setChangeRequestId] = useState(defaultChangeRequestId ?? "");
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<PurchaseOrderStatus>(PurchaseOrderStatus.draft);
  const [showNonProductQuoteLines, setShowNonProductQuoteLines] = useState(false);
  const [selectedQuoteLineIds, setSelectedQuoteLineIds] = useState<string[]>([]);
  const [lines, setLines] = useState<PurchaseOrderLineDraft[]>([
    { key: crypto.randomUUID(), sku: "", manufacturer: "", description: "", quantity: "1", unitCost: "0", taxRate: "20" }
  ]);

  const selectedSupplier = useMemo(() => suppliers.find((supplier) => supplier.id === supplierId) ?? null, [supplierId, suppliers]);
  const selectedQuote = useMemo(() => quotes.find((quote) => quote.id === quoteId) ?? null, [quoteId, quotes]);

  const visibleQuoteLines = useMemo(() => {
    if (!selectedQuote) return [];
    return selectedQuote.lines.filter((line) => {
      if (showNonProductQuoteLines) return true;
      return line.lineType === "product" || line.itemType === "product";
    });
  }, [selectedQuote, showNonProductQuoteLines]);

  const totals = useMemo(() => {
    return lines.reduce((sum, line) => {
      const quantity = Number(line.quantity || 0);
      const unitCost = Number(line.unitCost || 0);
      const taxRate = Number(line.taxRate || 20);
      const lineTotal = quantity * unitCost;
      const taxAmount = lineTotal * (taxRate / 100);
      return {
        subtotal: sum.subtotal + lineTotal,
        taxTotal: sum.taxTotal + taxAmount,
        total: sum.total + lineTotal + taxAmount
      };
    }, { subtotal: 0, taxTotal: 0, total: 0 });
  }, [lines]);

  function handleSupplierChange(nextSupplierId: string) {
    setSupplierId(nextSupplierId);
    const supplier = suppliers.find((item) => item.id === nextSupplierId);
    if (!supplier) return;
    setSupplierName(supplier.name);
    setSupplierAddress(supplier.address ?? "");
    setSupplierContactName(supplier.contactName ?? "");
    setSupplierContactEmail(supplier.contactEmail ?? "");
  }

  function handleProjectChange(nextProjectId: string) {
    setProjectId(nextProjectId);
    const project = projects.find((item) => item.id === nextProjectId);
    if (project && !deliveryAddress.trim()) {
      setDeliveryAddress(project.deliveryAddress ?? "");
    }
  }

  function handleQuoteChange(nextQuoteId: string) {
    setQuoteId(nextQuoteId);
    setSelectedQuoteLineIds([]);
    if (supplierId) return;
    const quote = quotes.find((item) => item.id === nextQuoteId);
    if (!quote) return;
    const supplierSuggestions = [...new Set(
      quote.lines
        .filter((line) => line.lineType === "product" || line.itemType === "product")
        .map((line) => line.supplierId)
        .filter(Boolean)
    )];
    if (supplierSuggestions.length === 1) {
      handleSupplierChange(String(supplierSuggestions[0]));
    }
  }

  function updateLine(key: string, field: keyof PurchaseOrderLineDraft, value: string) {
    setLines((current) => current.map((line) => line.key === key ? { ...line, [field]: value } : line));
  }

  function addLine() {
    setLines((current) => [...current, { key: crypto.randomUUID(), sku: "", manufacturer: "", description: "", quantity: "1", unitCost: "0", taxRate: "20" }]);
  }

  function removeLine(key: string) {
    setLines((current) => current.length === 1 ? current : current.filter((line) => line.key !== key));
  }

  function toggleQuoteLine(id: string) {
    setSelectedQuoteLineIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  }

  function importSelectedQuoteLines() {
    if (!selectedQuoteLineIds.length || !selectedQuote) return;
    const supplierSuggestions = [...new Set(
      selectedQuote.lines
        .filter((line) => selectedQuoteLineIds.includes(line.id))
        .map((line) => line.supplierId)
        .filter(Boolean)
    )];
    if (!supplierId && supplierSuggestions.length === 1) {
      handleSupplierChange(String(supplierSuggestions[0]));
    }
    const nextLines = selectedQuote.lines
      .filter((line) => selectedQuoteLineIds.includes(line.id))
      .map((line) => ({
        key: crypto.randomUUID(),
        productId: line.productId,
        sku: line.sku ?? "",
        manufacturer: line.manufacturer ?? "",
        description: line.description,
        quantity: String(line.quantity),
        unitCost: String(line.unitCost),
        taxRate: "20"
      }));
    setLines((current) => {
      const dedupe = new Set(current.map((line) => `${line.productId ?? ""}:${line.sku}:${line.description}`));
      const appended = nextLines.filter((line) => !dedupe.has(`${line.productId ?? ""}:${line.sku}:${line.description}`));
      return current[0] && !current[0].description && current.length === 1 ? appended.length ? appended : current : [...current, ...appended];
    });
    setSelectedQuoteLineIds([]);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId,
          supplierName,
          supplierAddress,
          supplierContactName,
          supplierContactEmail,
          deliveryAddress,
          projectId: projectId || undefined,
          quoteId: quoteId || undefined,
          changeRequestId: changeRequestId || undefined,
          expectedDeliveryDate: expectedDeliveryDate || undefined,
          status,
          notes,
          lines: lines.map((line) => ({
            productId: line.productId || undefined,
            sku: line.sku || undefined,
            manufacturer: line.manufacturer || undefined,
            description: line.description,
            quantity: line.quantity,
            unitCost: line.unitCost,
            taxRate: line.taxRate
          }))
        })
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload?.errors?.[0]?.message ?? "Unable to create purchase order. Please check supplier and line items.");
        return;
      }
      window.location.href = `/procurement/purchase-orders/${payload.data.id}`;
    } catch {
      setError("Unable to create purchase order. Please check supplier and line items.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 md:grid-cols-2">
        <h2 className="md:col-span-2 text-lg font-semibold text-slate-900">Purchase Order Header</h2>
        <SelectField label="Supplier" value={supplierId} onChange={handleSupplierChange} required options={suppliers.map((supplier) => ({ id: supplier.id, label: supplier.name }))} />
        <InputField label="Supplier name" value={supplierName} onChange={setSupplierName} required />
        <TextAreaField label="Supplier address" value={supplierAddress} onChange={setSupplierAddress} />
        <InputField label="Supplier contact name" value={supplierContactName} onChange={setSupplierContactName} />
        <InputField label="Supplier contact email" value={supplierContactEmail} onChange={setSupplierContactEmail} type="email" />
        <TextAreaField label="Delivery address" value={deliveryAddress} onChange={setDeliveryAddress} />
        <SelectField label="Project link" value={projectId} onChange={handleProjectChange} options={projects.map((project) => ({ id: project.id, label: project.label }))} />
        <SelectField label="Quote link" value={quoteId} onChange={handleQuoteChange} options={quotes.map((quote) => ({ id: quote.id, label: quote.label }))} />
        <SelectField label="Change request link" value={changeRequestId} onChange={setChangeRequestId} options={changeRequests.map((changeRequest) => ({ id: changeRequest.id, label: changeRequest.label }))} />
        <InputField label="Delivery date" value={expectedDeliveryDate} onChange={setExpectedDeliveryDate} type="date" />
        <SelectField label="Status" value={status} onChange={(value) => setStatus(value as PurchaseOrderStatus)} options={Object.values(PurchaseOrderStatus).map((value) => ({ id: value, label: value.replaceAll("_", " ") }))} />
        <TextAreaField label="Notes" value={notes} onChange={setNotes} />
        {selectedSupplier ? <p className="md:col-span-2 text-xs text-slate-500">Supplier defaults loaded from {selectedSupplier.name}. You can override any header fields before saving.</p> : null}
        {!selectedSupplier && selectedQuote?.lines.some((line) => line.supplierId) ? <p className="md:col-span-2 text-xs text-slate-500">ConnectedOS will suggest a supplier from linked product master data where one is available.</p> : null}
      </section>

      <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">PO Lines</h2>
            <p className="text-sm text-slate-500">Add hardware/product lines directly or import product-cost lines from a linked quote.</p>
          </div>
          <Button type="button" variant="secondary" onClick={addLine}>Add Line</Button>
        </div>

        {selectedQuote ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-slate-900">Quote Line Import</h3>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={showNonProductQuoteLines} onChange={(event) => setShowNonProductQuoteLines(event.target.checked)} />
                Show labour/service lines
              </label>
            </div>
            <div className="space-y-2">
              {visibleQuoteLines.map((line) => (
                <label key={line.id} className="flex items-start gap-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">
                  <input type="checkbox" checked={selectedQuoteLineIds.includes(line.id)} onChange={() => toggleQuoteLine(line.id)} />
                  <div>
                    <p className="font-medium text-slate-900">{line.sku ?? "No SKU"} | {line.description}</p>
                    <p className="text-slate-500">{line.manufacturer ?? "Unknown manufacturer"} | Qty {line.quantity} | Cost {formatMoney(line.unitCost)}</p>
                  </div>
                </label>
              ))}
              {!visibleQuoteLines.length ? <p className="text-sm text-slate-500">No quote lines available for import.</p> : null}
            </div>
            <div className="mt-3">
              <Button type="button" variant="secondary" onClick={importSelectedQuoteLines}>Import Selected Quote Lines</Button>
            </div>
          </div>
        ) : null}

        <div className="space-y-4">
          {lines.map((line, index) => {
            const quantity = Number(line.quantity || 0);
            const unitCost = Number(line.unitCost || 0);
            const taxRate = Number(line.taxRate || 20);
            const lineTotal = quantity * unitCost;
            const taxAmount = lineTotal * (taxRate / 100);
            const totalIncludingTax = lineTotal + taxAmount;
            return (
              <div key={line.key} className="rounded-lg border border-slate-200 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900">Line {index + 1}</h3>
                  <Button type="button" variant="ghost" onClick={() => removeLine(line.key)}>Remove</Button>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <InputField label="SKU / part code" value={line.sku} onChange={(value) => updateLine(line.key, "sku", value)} />
                  <InputField label="Manufacturer" value={line.manufacturer} onChange={(value) => updateLine(line.key, "manufacturer", value)} />
                  <InputField label="Quantity" value={line.quantity} onChange={(value) => updateLine(line.key, "quantity", value)} type="number" />
                  <TextAreaField label="Description" value={line.description} onChange={(value) => updateLine(line.key, "description", value)} />
                  <InputField label="Unit cost" value={line.unitCost} onChange={(value) => updateLine(line.key, "unitCost", value)} type="number" />
                  <InputField label="Tax rate %" value={line.taxRate} onChange={(value) => updateLine(line.key, "taxRate", value)} type="number" />
                </div>
                <div className="mt-3 grid gap-3 text-sm md:grid-cols-3">
                  <SummaryMetric label="Line total" value={formatMoney(lineTotal)} />
                  <SummaryMetric label="Tax amount" value={formatMoney(taxAmount)} />
                  <SummaryMetric label="Total incl. tax" value={formatMoney(totalIncludingTax)} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid gap-3 rounded-lg border border-brand-100 bg-brand-50 p-4 text-sm md:grid-cols-3">
          <SummaryMetric label="Subtotal excluding tax" value={formatMoney(totals.subtotal)} />
          <SummaryMetric label="Tax total" value={formatMoney(totals.taxTotal)} />
          <SummaryMetric label="Total including tax" value={formatMoney(totals.total)} />
        </div>
      </section>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <Button type="submit" disabled={submitting}>{submitting ? "Creating..." : "Create Purchase Order"}</Button>
    </form>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  required = false
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ id: string; label: string }>;
  required?: boolean;
}) {
  return (
    <label className="text-sm font-medium text-slate-700">
      {label}
      <select value={value} required={required} onChange={(event) => onChange(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3">
        <option value="">Select</option>
        {options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
      </select>
    </label>
  );
}

function InputField({
  label,
  value,
  onChange,
  type = "text",
  required = false
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="text-sm font-medium text-slate-700">
      {label}
      <input value={value} type={type} required={required} step={type === "number" ? "0.01" : undefined} onChange={(event) => onChange(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3" />
    </label>
  );
}

function TextAreaField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="text-sm font-medium text-slate-700 md:col-span-2">
      {label}
      <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={3} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
    </label>
  );
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(value || 0);
}
