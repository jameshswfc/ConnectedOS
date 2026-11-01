import { createHash } from "node:crypto";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ files: vi.fn(), update: vi.fn(), latest: vi.fn(), request: vi.fn(), document: vi.fn(), audit: vi.fn(), lock: vi.fn(), transaction: vi.fn(), scan: vi.fn(), read: vi.fn(), save: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { partnerAttachment: { findMany: mocks.files, update: mocks.update }, $transaction: mocks.transaction } }));
vi.mock("@/modules/presales/partner-intake-storage", () => ({ quarantinePath: (key: string) => `/quarantine/${key}`, scanQuarantinedFile: mocks.scan }));
vi.mock("@/modules/presales/presales-file-storage", () => ({ savePresalesUploadBuffer: mocks.save }));
vi.mock("node:fs/promises", () => ({ readFile: mocks.read }));
import { processPartnerAttachments } from "@/modules/presales/partner-intake-worker";

const bytes = Buffer.from("XTEST test hotel scope");
const file = { id: "attachment", storageKey: "key", sha256: createHash("sha256").update(bytes).digest("hex"), fileName: "scope.txt", sizeBytes: bytes.length, submissionId: "submission", submission: { presalesRequestId: "request" } };
describe("partner document processing", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.files.mockResolvedValue([file]); mocks.scan.mockResolvedValue("clean"); mocks.read.mockResolvedValue(bytes);
    mocks.latest.mockResolvedValue({ documentId: null, scanStatus: "clean" });
    mocks.request.mockResolvedValue({ id: "request", requestNumber: "PS-TEST" });
    mocks.save.mockResolvedValue({ relativePath: "storage/presales/test/scope.txt" });
    mocks.document.mockResolvedValue({ id: "document" });
    mocks.transaction.mockImplementation((fn) => fn({ $executeRaw: mocks.lock, partnerAttachment: { findUniqueOrThrow: mocks.latest, update: mocks.update }, presalesRequest: { findFirst: mocks.request }, document: { create: mocks.document }, auditLog: { create: mocks.audit } }));
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());
  it("promotes a reviewed clean file with metadata, one link and audit", async () => {
    expect(await processPartnerAttachments()).toMatchObject({ inspected: 1, clean: 1, promoted: 1, failed: 0 });
    expect(mocks.document).toHaveBeenCalledWith({ data: expect.objectContaining({ entityType: "PresalesRequest", entityId: "request", externalId: "storage/presales/test/scope.txt" }) });
    expect(mocks.update).toHaveBeenCalledWith({ where: { id: "attachment" }, data: { documentId: "document" } });
    expect(mocks.audit).toHaveBeenCalledOnce();
  });
  it("does not repeatedly scan clean unreviewed attachments or block new ones behind them", async () => {
    mocks.files.mockResolvedValue([]);
    await processPartnerAttachments();
    expect(mocks.files.mock.calls[0][0].where).toEqual({ documentId: null, OR: [{ scanStatus: "quarantined" }, { scanStatus: "clean", submission: { presalesRequestId: { not: null } } }] });
  });
  it("continues with other files after a missing file or scan failure", async () => {
    mocks.files.mockResolvedValue([{ ...file, id: "missing" }, file]);
    mocks.scan.mockRejectedValueOnce(new Error("Private provider message"));
    expect(await processPartnerAttachments()).toMatchObject({ inspected: 2, failed: 1, promoted: 1 });
    expect(console.error).toHaveBeenCalledWith("Partner attachment processing failed", { attachmentId: "missing", submissionId: "submission", errorType: "Error" });
  });
  it("keeps pending and rejected files out of pre-sales documents", async () => {
    for (const status of ["quarantined", "rejected"]) {
      mocks.scan.mockResolvedValue(status);
      expect(await processPartnerAttachments()).toMatchObject({ promoted: 0 });
    }
    expect(mocks.save).not.toHaveBeenCalled(); expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it("keeps clean files in intake until staff review", async () => {
    mocks.files.mockResolvedValue([{ ...file, submission: { presalesRequestId: null } }]);
    expect(await processPartnerAttachments()).toMatchObject({ clean: 1, promoted: 0 });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it("does not promote a second document on retry", async () => {
    mocks.latest.mockResolvedValue({ documentId: "already-promoted", scanStatus: "clean" });
    expect(await processPartnerAttachments()).toMatchObject({ promoted: 0 });
    expect(mocks.document).not.toHaveBeenCalled();
  });
  it("rejects content changed after scanning", async () => {
    mocks.read.mockResolvedValue(Buffer.from("changed"));
    expect(await processPartnerAttachments()).toMatchObject({ promoted: 0 });
    expect(mocks.update).toHaveBeenLastCalledWith({ where: { id: "attachment" }, data: { scanStatus: "rejected" } });
    expect(mocks.document).not.toHaveBeenCalled();
  });
  it("counts promotion only after a committed transaction", async () => {
    mocks.transaction.mockRejectedValueOnce(new Error("Commit failed"));
    expect(await processPartnerAttachments()).toMatchObject({ promoted: 0, failed: 1 });
  });
});
