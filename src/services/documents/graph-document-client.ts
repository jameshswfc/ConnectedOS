import { z } from "zod";

const itemSchema = z.object({ id: z.string(), name: z.string(), webUrl: z.string().url(), eTag: z.string().optional(), folder: z.unknown().optional(), parentReference: z.object({ id: z.string().optional(), driveId: z.string().optional() }).optional() });
export type DriveItem = z.infer<typeof itemSchema>;
export class GraphDocumentError extends Error {
  constructor(public status: number) { super(`SharePoint request failed (${status}). Check the document integration configuration.`); }
}

export function documentGraphConfig() {
  return z.object({ tenant: z.string().uuid(), client: z.string().uuid(), secret: z.string().min(1), drive: z.string().min(1), roots: z.array(z.string().min(1)).min(1) }).parse({
    tenant: process.env.SHAREPOINT_TENANT_ID, client: process.env.SHAREPOINT_CLIENT_ID,
    secret: process.env.SHAREPOINT_CLIENT_SECRET, drive: process.env.SHAREPOINT_DRIVE_ID,
    roots: process.env.SHAREPOINT_ALLOWED_ROOT_IDS?.split(",").map((id) => id.trim()).filter(Boolean)
  });
}

export class GraphDocumentClient {
  private token?: string;
  constructor(private config = documentGraphConfig(), private fetcher: typeof fetch = fetch) {}
  private async request(path: string, init: RequestInit = {}) {
    if (!this.token) {
      const response = await this.fetcher(`https://login.microsoftonline.com/${this.config.tenant}/oauth2/v2.0/token`, {
        method: "POST", body: new URLSearchParams({ client_id: this.config.client, client_secret: this.config.secret, scope: "https://graph.microsoft.com/.default", grant_type: "client_credentials" }),
        signal: AbortSignal.timeout(15000), redirect: "error"
      });
      if (!response.ok) throw new GraphDocumentError(response.status);
      this.token = z.object({ access_token: z.string() }).parse(await response.json()).access_token;
    }
    const response = await this.fetcher(`https://graph.microsoft.com/v1.0/drives/${encodeURIComponent(this.config.drive)}/${path}`, {
      ...init, headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json", ...init.headers },
      signal: AbortSignal.timeout(25000), redirect: "error"
    });
    if (!response.ok) throw new GraphDocumentError(response.status);
    return itemSchema.parse(await response.json());
  }
  getItem(id: string) { return this.request(`items/${encodeURIComponent(id)}`); }
  async assertAllowedFolder(id: string) {
    let item = await this.getItem(id);
    if (item.folder === undefined) throw new Error("Selected SharePoint item is not a folder.");
    const original = item;
    for (let depth = 0; depth < 32; depth++) {
      if (this.config.roots.includes(item.id)) return original;
      if (!item.parentReference?.id || (item.parentReference.driveId && item.parentReference.driveId !== this.config.drive)) break;
      item = await this.getItem(item.parentReference.id);
    }
    throw new Error("Selected folder is outside the approved SharePoint locations.");
  }
  async ensureFolder(parentId: string, name: string) {
    await this.assertAllowedFolder(parentId);
    try {
      return await this.request(`items/${encodeURIComponent(parentId)}/children`, { method: "POST", body: JSON.stringify({ name, folder: {}, "@microsoft.graph.conflictBehavior": "fail" }) });
    } catch (error) {
      if (!(error instanceof GraphDocumentError) || error.status !== 409) throw error;
      const item = await this.request(`items/${encodeURIComponent(parentId)}:/${encodeURIComponent(name)}`);
      if (item.folder === undefined) throw new Error("Selected folder name is occupied by a file.");
      return item;
    }
  }
  async archiveFolder(id: string, sourceParentId: string, destinationId: string) {
    await this.assertAllowedFolder(destinationId);
    const item = await this.assertAllowedFolder(id);
    if (item.parentReference?.id === destinationId) return item;
    if (item.parentReference?.id !== sourceParentId) throw new Error("Selected project folder has moved. Review its location before archival.");
    if (!item.eTag) throw new Error("Unable to verify the project folder version before archival.");
    return this.request(`items/${encodeURIComponent(id)}`, { method: "PATCH", headers: { "If-Match": item.eTag }, body: JSON.stringify({ parentReference: { id: destinationId }, "@microsoft.graph.conflictBehavior": "fail" }) });
  }
  async upload(folderId: string, name: string, buffer: Buffer) {
    await this.assertAllowedFolder(folderId);
    return this.request(`items/${encodeURIComponent(folderId)}:/${encodeURIComponent(name)}:/content`, { method: "PUT", headers: { "Content-Type": "application/octet-stream" }, body: new Uint8Array(buffer) });
  }
}
