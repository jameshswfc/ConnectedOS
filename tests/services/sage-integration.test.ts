import { afterEach, describe, expect, it, vi } from "vitest";
import { openSageSecret, sealSageSecret, sageAuthorisation, canReadSage, canManageSage } from "@/services/integrations/sage/sage-security";
import { fetchSageInvoices } from "@/services/integrations/sage/sage-client";
import { fetchSageCustomers, validateInvoicePostingCodes, postApprovedSageInvoice, type SageInvoicePayload } from "@/services/integrations/sage/sage-invoice-writer";

afterEach(() => vi.unstubAllEnvs());
const config = { clientId: "client", clientSecret: "secret", businessId: "business", redirectUri: "https://example.com/callback", key: Buffer.alloc(32, 3) };
const row = { id: "invoice", invoice_number: "SI-1", date: "2026-10-31", due_date: "2026-11-30", contact: { displayed_as: "Hotel" }, status: { id: "UNPAID" }, currency: { id: "GBP" }, total_amount: "120.00", outstanding_amount: "120.00" };
const payload: SageInvoicePayload = { sales_invoice: { contact_id: "customer", date: "2026-10-31", due_date: "2026-11-30", reference: "COS-request", notes: "PRJ-2026-1", currency_id: "GBP", invoice_lines: [{ description: "Completed stage", ledger_account_id: "ledger", quantity: 1, unit_price: 100, tax_rate_id: "tax", tax_amount: 20 }] } };
describe("Sage connector safety", () => {
  it("only offers active GBP customer contacts for approval", async () => {
    const customer = { id: "customer", displayed_as: "Hotel", contact_types: [{ id: "CUSTOMER" }], currency: { id: "GBP" }, is_active: true };
    const fetcher = vi.fn().mockResolvedValue(Response.json({ $items: [customer, { ...customer, id: "inactive", is_active: false }, { ...customer, id: "supplier", contact_types: [{ id: "VENDOR" }] }, { ...customer, id: "foreign", currency: { id: "USD" } }, { ...customer, id: "deleted", deleted_at: "2026-10-31" }], $next: null }));
    expect(await fetchSageCustomers("token", "business", fetcher)).toEqual([{ id: "customer", name: "Hotel" }]);
    expect(fetcher.mock.calls[0][1].headers["X-Business"]).toBe("business");
  });
  it("verifies the ledger and VAT percentage for the invoice date before posting", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(Response.json({ id: "ledger", visible_in_sales: true, included_in_chart: true })).mockResolvedValueOnce(Response.json({ id: "tax", percentage: "20.0", is_visible: true }));
    await validateInvoicePostingCodes("token", "business", { ledger: "ledger", tax: "tax" }, "20", "2026-10-31", fetcher);
    expect(fetcher.mock.calls[1][0]).toContain("date=2026-10-31");
  });
  it("rejects a mismatched VAT code before any invoice can be posted", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(Response.json({ id: "ledger", visible_in_sales: true, included_in_chart: true })).mockResolvedValueOnce(Response.json({ id: "tax", percentage: "0", is_visible: true }));
    await expect(validateInvoicePostingCodes("token", "business", { ledger: "ledger", tax: "tax" }, "20", "2026-10-31", fetcher)).rejects.toThrow("Invalid Sage ledger or VAT");
  });
  it("encrypts tokens and rejects tampering", () => {
    const sealed = sealSageSecret({ token: "private-token" }, config.key);
    expect(sealed).not.toContain("private-token");
    expect(openSageSecret(sealed, config.key)).toEqual({ token: "private-token" });
    expect(() => openSageSecret(sealed, Buffer.alloc(32, 4))).toThrow();
  });
  it("requests readonly consent by default with state and PKCE", () => {
    vi.stubEnv("SAGE_ALLOW_INVOICE_CREATE", "false");
    const url = new URL(sageAuthorisation("state", "verifier", config));
    expect(url.searchParams.get("scope")).toBe("readonly");
    expect(url.searchParams.get("state")).toBe("state");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.toString()).not.toContain("secret");
  });
  it("requires explicit configuration to request write consent", () => {
    vi.stubEnv("SAGE_ALLOW_INVOICE_CREATE", "true");
    expect(new URL(sageAuthorisation("state", "verifier", config)).searchParams.get("scope")).toBe("full_access");
  });
  it("keeps finance reads and integration management separate", () => {
    const finance = { userId: "f", permissions: ["finance.read_all"] };
    expect(canReadSage(finance)).toBe(true); expect(canManageSage(finance)).toBe(false);
    expect(canReadSage({ userId: "s", permissions: ["projects.read_assigned"] })).toBe(false);
  });
  it("reads paginated invoices using a fixed business and never follows foreign next URLs", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(Response.json({ $items: [row], $next: "https://untrusted.invalid/collect" })).mockResolvedValueOnce(Response.json({ $items: [{ ...row, id: "second" }], $next: null }));
    expect(await fetchSageInvoices(async () => "token", "business", fetcher)).toHaveLength(2);
    expect(fetcher.mock.calls[1][0]).toContain("https://api.accounting.sage.com/v3.1/sales_invoices");
    expect(fetcher.mock.calls[1][1].headers["X-Business"]).toBe("business");
    expect(fetcher.mock.calls.every((call) => call[1].method === "GET")).toBe(true);
  });
  it("refuses malformed or impossible dates instead of accepting a partial cache", async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json([row, { ...row, date: "2026-02-31" }]));
    await expect(fetchSageInvoices(async () => "token", "business", fetcher)).rejects.toThrow("validate");
  });
  it("does not post when creation is disabled or token is readonly", async () => {
    const fetcher = vi.fn(); const tokens = { access_token: "a", refresh_token: "r", scope: "readonly" as const, expiresAt: Date.now() + 300000 };
    await expect(postApprovedSageInvoice(tokens, "business", payload, fetcher)).rejects.toThrow("disabled");
    vi.stubEnv("SAGE_ALLOW_INVOICE_CREATE", "true");
    await expect(postApprovedSageInvoice(tokens, "business", payload, fetcher)).rejects.toThrow("consent");
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("posts one approved invoice with stable reference and does not email the customer", async () => {
    vi.stubEnv("SAGE_ALLOW_INVOICE_CREATE", "true");
    const fetcher = vi.fn().mockResolvedValue(Response.json({ id: "sage-id", invoice_number: "SI-2" }));
    await postApprovedSageInvoice({ access_token: "a", refresh_token: "r", scope: "full_access", expiresAt: Date.now() + 300000 }, "business", payload, fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual(payload);
    expect(payload.sales_invoice).not.toHaveProperty("sent");
  });
  it("never automatically retries an uncertain invoice POST", async () => {
    vi.stubEnv("SAGE_ALLOW_INVOICE_CREATE", "true");
    const fetcher = vi.fn().mockRejectedValue(new Error("timeout"));
    await expect(postApprovedSageInvoice({ access_token: "a", refresh_token: "r", scope: "full_access", expiresAt: 1 }, "business", payload, fetcher)).rejects.toThrow();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
