import { afterEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ upload: vi.fn(), audit: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { auditLog: { create: mocks.audit } } }));
vi.mock("@/services/documents/sharepoint-document-service", () => ({ uploadFileToSharePointStub: mocks.upload }));
import { captureGeneratedDocument } from "@/services/documents/capture-generated-document";
const input = { entityType: "Quote" as const, entityId: "quote", userId: "user", filename: "quote.pdf", buffer: Buffer.from("document") };
describe("generated document capture", () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.resetAllMocks(); });
  it("does not change exports until explicitly enabled", async () => {
    vi.stubEnv("SHAREPOINT_CAPTURE_EXPORTS", "false"); await captureGeneratedDocument(input); expect(mocks.upload).not.toHaveBeenCalled();
  });
  it("retains the local original with record and author metadata for later SharePoint copying", async () => {
    vi.stubEnv("SHAREPOINT_CAPTURE_EXPORTS", "true"); mocks.upload.mockResolvedValue({ id: "document" });
    await captureGeneratedDocument(input);
    expect(mocks.upload).toHaveBeenCalledWith(expect.objectContaining({ entityId: "quote", uploadedById: "user", buffer: input.buffer }));
    expect(mocks.audit).toHaveBeenCalledOnce();
  });
  it("returns a friendly failure rather than claiming a failed save succeeded", async () => {
    vi.stubEnv("SHAREPOINT_CAPTURE_EXPORTS", "true"); mocks.upload.mockRejectedValue(new Error("private path"));
    await expect(captureGeneratedDocument(input)).rejects.toThrow("Unable to save the generated document.");
  });
});
