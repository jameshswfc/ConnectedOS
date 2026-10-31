import { z } from "zod";
import { sageInvoiceCreationEnabled } from "./sage-security";
import type { SageTokens } from "./sage-client";

const customerSchema = z.object({ id: z.string(), displayed_as: z.string(), contact_types: z.array(z.object({ id: z.string() })), is_active: z.boolean().optional(), deleted_at: z.string().nullish(), currency: z.object({ id: z.string() }).nullish() });
export async function fetchSageCustomers(token: string, businessId: string, transport: typeof fetch = fetch) {
  const customers: { id: string; name: string }[] = [];
  for (let page = 1; page <= 10; page++) {
    const url = `https://api.accounting.sage.com/v3.1/contacts?contact_type_id=CUSTOMER&exclude_system=true&filter_inactive_contacts=true&items_per_page=200&page=${page}&attributes=contact_types,is_active,deleted_at,currency`;
    const response = await transport(url, { headers: { Authorization: `Bearer ${token}`, "X-Business": businessId }, redirect: "error", cache: "no-store", signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error("Unable to load Sage customers. Please check the connection.");
    const body = await response.json();
    const rows = z.array(customerSchema).safeParse(Array.isArray(body) ? body : body.$items);
    if (!rows.success) throw new Error("Unable to validate Sage customers.");
    customers.push(...rows.data.filter((r) => r.is_active !== false && !r.deleted_at && (!r.currency || r.currency.id === "GBP") && r.contact_types.some((t) => t.id === "CUSTOMER")).map((r) => ({ id: r.id, name: r.displayed_as })));
    if (rows.data.length < 200 || (!Array.isArray(body) && body.$next === null)) return customers;
  }
  throw new Error("Unable to load all Sage customers within the safety limit. Please contact an administrator.");
}

export type SageInvoicePayload = { sales_invoice: { contact_id: string; date: string; due_date: string; reference: string; notes: string; currency_id: "GBP"; invoice_lines: { description: string; ledger_account_id: string; quantity: 1; unit_price: number; tax_rate_id: string; tax_amount: number }[] } };
export function invoicePostingCodes(taxRate: string) {
  const ledger = process.env.SAGE_SALES_LEDGER_ACCOUNT_ID;
  const tax = Number(taxRate) === 0 ? process.env.SAGE_ZERO_TAX_RATE_ID : process.env.SAGE_STANDARD_TAX_RATE_ID;
  if (!ledger || !tax) throw new Error("Unable to approve: Sage sales ledger and tax codes must be configured and verified first.");
  return { ledger, tax };
}

export async function validateInvoicePostingCodes(token: string, businessId: string, codes: { ledger: string; tax: string }, taxRate: string, date: string, transport: typeof fetch = fetch) {
  const get = async (path: string) => {
    const response = await transport(`https://api.accounting.sage.com/v3.1/${path}`, { headers: { Authorization: `Bearer ${token}`, "X-Business": businessId }, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error("Unable to verify Sage ledger and VAT configuration. No invoice was created.");
    return response.json();
  };
  const ledger = z.object({ id: z.string(), visible_in_sales: z.boolean(), included_in_chart: z.boolean() }).safeParse(await get(`ledger_accounts/${encodeURIComponent(codes.ledger)}?attributes=visible_in_sales,included_in_chart`));
  const tax = z.object({ id: z.string(), percentage: z.coerce.number().finite(), is_visible: z.boolean() }).safeParse(await get(`tax_rates/${encodeURIComponent(codes.tax)}?date=${encodeURIComponent(date)}&attributes=percentage,is_visible`));
  if (!ledger.success || ledger.data.id !== codes.ledger || !ledger.data.visible_in_sales || !ledger.data.included_in_chart || !tax.success || tax.data.id !== codes.tax || !tax.data.is_visible || tax.data.percentage !== Number(taxRate)) throw new Error("Invalid Sage ledger or VAT code for this invoice. Please review the configuration before approval.");
}

// Exactly one POST. Timeouts, malformed responses and failures require human reconciliation.
export async function postApprovedSageInvoice(tokens: SageTokens, businessId: string, payload: SageInvoicePayload, transport: typeof fetch = fetch) {
  if (!sageInvoiceCreationEnabled() || tokens.scope !== "full_access") throw new Error("Unable to create an invoice: Sage invoice creation is disabled or write consent is missing.");
  const response = await transport("https://api.accounting.sage.com/v3.1/sales_invoices", { method: "POST", headers: { Authorization: `Bearer ${tokens.access_token}`, "X-Business": businessId, "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(payload), cache: "no-store", redirect: "error", signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error("Unable to confirm Sage invoice creation. Reconcile in Sage before any further attempt.");
  const result = z.object({ id: z.string().min(1), invoice_number: z.string().min(1) }).safeParse(await response.json());
  if (!result.success) throw new Error("Unable to confirm the Sage invoice reference. Reconcile in Sage before any further attempt.");
  return result.data;
}
