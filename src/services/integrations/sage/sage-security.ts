import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import type { CrmAccessContext } from "@/modules/crm/types/crm-context";

export function canReadSage(context: CrmAccessContext) {
  return context.permissionLevel === "administrator" || context.permissions.includes("admin.users") || context.permissions.includes("finance.read_all");
}
export function canManageSage(context: CrmAccessContext) {
  return context.permissionLevel === "administrator" || context.permissions.includes("admin.integrations");
}
export function assertSageAccess(context: CrmAccessContext, manage = false) {
  if (!(manage ? canManageSage(context) : canReadSage(context))) throw new Error("Missing permission: Sage Accounting");
}
export function sageConfig() {
  const { SAGE_ENABLED, SAGE_CLIENT_ID, SAGE_CLIENT_SECRET, SAGE_REDIRECT_URI, SAGE_BUSINESS_ID, SAGE_TOKEN_ENCRYPTION_KEY } = process.env;
  if (SAGE_ENABLED !== "true" || !SAGE_CLIENT_ID || !SAGE_CLIENT_SECRET || !SAGE_REDIRECT_URI || !SAGE_BUSINESS_ID || !SAGE_TOKEN_ENCRYPTION_KEY) throw new Error("Unable to connect Sage. An administrator must complete the secure integration configuration.");
  const redirect = new URL(SAGE_REDIRECT_URI);
  if (redirect.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && redirect.protocol === "http:" && ["localhost", "127.0.0.1"].includes(redirect.hostname))) throw new Error("Invalid Sage callback URL.");
  if (!/^[a-f\d]{64}$/i.test(SAGE_TOKEN_ENCRYPTION_KEY)) throw new Error("Invalid Sage encryption configuration.");
  return { clientId: SAGE_CLIENT_ID, clientSecret: SAGE_CLIENT_SECRET, redirectUri: redirect.toString(), businessId: SAGE_BUSINESS_ID, key: Buffer.from(SAGE_TOKEN_ENCRYPTION_KEY, "hex") };
}
export function sageConfigured() { try { sageConfig(); return true; } catch { return false; } }
export function sageInvoiceCreationEnabled() { return process.env.SAGE_ALLOW_INVOICE_CREATE === "true"; }
export function sageRequestedScope() { return sageInvoiceCreationEnabled() ? "full_access" : "readonly"; }
export function sealSageSecret(value: unknown, key = sageConfig().key) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString("base64url")).join(".");
}
export function openSageSecret(value: string, key = sageConfig().key): unknown {
  const [iv, tag, encrypted] = value.split(".").map((part) => Buffer.from(part, "base64url"));
  const cipher = createDecipheriv("aes-256-gcm", key, iv);
  cipher.setAuthTag(tag);
  return JSON.parse(Buffer.concat([cipher.update(encrypted), cipher.final()]).toString("utf8"));
}
export function sageStateHash(value: string) { return createHash("sha256").update(value).digest("hex"); }
export function sageAuthorisation(state: string, verifier: string, config = sageConfig()) {
  const url = new URL("https://www.sageone.com/oauth2/auth/central");
  url.search = new URLSearchParams({ filter: "apiv3.1", country: "gb", locale: "en-GB", response_type: "code", scope: sageRequestedScope(), client_id: config.clientId, redirect_uri: config.redirectUri, state, code_challenge: createHash("sha256").update(verifier).digest("base64url"), code_challenge_method: "S256" }).toString();
  return url.toString();
}
