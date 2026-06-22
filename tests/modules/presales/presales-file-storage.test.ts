import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  assertAllowedPresalesFile,
  buildPresalesSharePointTargetPath,
  buildPresalesStoredFilePath,
  PRESALES_MAX_FILE_SIZE_BYTES,
  savePresalesUploadBuffer,
  sanitizePresalesFileName
} from "@/modules/presales/presales-file-storage";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("pre-sales file storage", () => {
  it("sanitizes safe file names and keeps supported extensions", () => {
    expect(sanitizePresalesFileName(" Floor Plan (Level 1).PDF ")).toBe("Floor Plan (Level 1).PDF");
  });

  it("rejects unsupported extensions", () => {
    expect(() => assertAllowedPresalesFile("floorplan.exe", 1200)).toThrow("Unsupported file type");
  });

  it("rejects path traversal file names", () => {
    expect(() => sanitizePresalesFileName("../secret.pdf")).toThrow("Invalid file name");
    expect(() => sanitizePresalesFileName("nested/secret.pdf")).toThrow("Invalid file name");
  });

  it("rejects files over the 25MB limit", () => {
    expect(() => assertAllowedPresalesFile("floorplan.pdf", PRESALES_MAX_FILE_SIZE_BYTES + 1)).toThrow("25MB");
  });

  it("builds local storage paths under storage/presales", () => {
    const target = buildPresalesStoredFilePath({ requestNumber: "PS-2026-0007", fileName: "survey.pdf" });

    expect(target.relativePath).toBe(path.join("storage/presales", "2026", "PS-2026-0007", "survey.pdf"));
    expect(target.absolutePath).toContain(path.join("storage/presales", "2026", "PS-2026-0007", "survey.pdf"));
  });

  it("saves uploaded buffers to local pre-sales storage", async () => {
    const storageRoot = await mkdtemp(path.join(tmpdir(), "presales-upload-"));
    tempDirs.push(storageRoot);

    const saved = await savePresalesUploadBuffer({
      requestNumber: "PS-2026-0010",
      fileName: "requirements.txt",
      buffer: Buffer.from("customer requirements"),
      storageRoot
    });

    await expect(readFile(saved.absolutePath, "utf8")).resolves.toBe("customer requirements");
  });

  it("derives SharePoint target paths from the request folder stub", () => {
    expect(buildPresalesSharePointTargetPath({
      sharePointFolderUrl: "sharepoint://ConnectedHospitality/PreSales/2026/PS-2026-0001 Hilton WiFi",
      requestNumber: "PS-2026-0001",
      fileName: "floorplan.pdf"
    })).toBe("PreSales/2026/PS-2026-0001 Hilton WiFi/floorplan.pdf");
  });
});
