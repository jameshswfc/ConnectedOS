import { z } from "zod";
import { sageConfig } from "./sage-security";

export const sageTokensSchema = z.object({ access_token: z.string().min(1), refresh_token: z.string().min(1), scope: z.enum(["readonly", "full_access"]), expiresAt: z.number() });
export type SageTokens = z.infer<typeof sageTokensSchema>;
const tokenResponse = z.object({ access_token: z.string().min(1), refresh_token: z.string().min(1), scope: z.enum(["readonly", "full_access"]), expires_in: z.number().positive() });
const money = z.union([z.string().regex(/^-?\d+(\.\d+)?$/), z.number().finite()]).transform(String);
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((s) => Number.isFinite(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s);
export const sageInvoiceSchema = z.object({
  id: z.string().min(1), invoice_number: z.string().min(1), date: day, due_date: day.nullish(),
  contact: z.object({ displayed_as: z.string() }), status: z.object({ id: z.string(), displayed_as: z.string().optional() }),
  currency: z.object({ id: z.string().regex(/^[A-Z]{3}$/) }), total_amount: money, outstanding_amount: money,
  deleted_at: z.string().nullish()
});
export type SageInvoice = z.infer<typeof sageInvoiceSchema>;

export async function exchangeSageToken(fields: Record<string, string>, transport: typeof fetch = fetch) {
  const config = sageConfig();
  const response = await transport("https://oauth.accounting.sage.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" }, body: new URLSearchParams({ client_id: config.clientId, client_secret: config.clientSecret, ...fields }), signal: AbortSignal.timeout(15000), redirect: "error", cache: "no-store" });
  if (!response.ok) throw new Error("Unable to authorise Sage. Please reconnect the account.");
  const parsed = tokenResponse.safeParse(await response.json());
  if (!parsed.success) throw new Error("Unable to verify Sage authorisation.");
  return { ...parsed.data, expiresAt: Date.now() + parsed.data.expires_in * 1000 };
}

// Only this fixed GET endpoint is exposed; no accounting mutation or arbitrary next-URL requests.
export async function fetchSageInvoices(getToken: () => Promise<string>, businessId: string, transport: typeof fetch = fetch) {
  if (!businessId) throw new Error("Invalid Sage business selection.");
  const invoices = new Map<string, SageInvoice>();
  const started = Date.now();
  for (let page = 1; page <= 50; page++) {
    if (Date.now() - started > 120000) throw new Error("Unable to finish Sage refresh in time. Previous data has been retained.");
    const url = new URL("https://api.accounting.sage.com/v3.1/sales_invoices");
    url.search = new URLSearchParams({ items_per_page: "200", page: String(page), attributes: "invoice_number,date,due_date,contact,status,currency,total_amount,outstanding_amount,deleted_at", sort: "created_at:asc" }).toString();
    const response = await transport(url.toString(), { method: "GET", headers: { Authorization: `Bearer ${await getToken()}`, "X-Business": businessId, Accept: "application/json" }, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(response.status === 429 ? "Unable to refresh Sage: its request limit was reached. Please try again later." : "Unable to read Sage invoices. Check the connection and selected business.");
    const body: unknown = await response.json();
    const envelope = z.object({ $items: z.array(z.unknown()), $next: z.string().nullable().optional() }).safeParse(body);
    const raw = Array.isArray(body) ? body : envelope.success ? envelope.data.$items : null;
    if (!raw) throw new Error("Unable to read the Sage invoice response. Previous data has been retained.");
    for (const row of raw) {
      const parsed = sageInvoiceSchema.safeParse(row);
      if (!parsed.success) throw new Error("Unable to validate a Sage invoice. Previous data has been retained.");
      if (!parsed.data.deleted_at) invoices.set(parsed.data.id, parsed.data);
    }
    const hasNext = envelope.success && envelope.data.$next !== undefined ? Boolean(envelope.data.$next) : raw.length === 200;
    if (!hasNext) return [...invoices.values()];
  }
  throw new Error("Unable to finish the Sage refresh within the safety limit. Previous data has been retained.");
}
