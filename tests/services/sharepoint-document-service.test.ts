import { describe, expect, it } from "vitest";
import {
  buildSharePointStyleUrl,
  ensureExpenseFolder,
  ensureProjectFolder,
  normalizeSharePointFolderPath,
  sanitizeStoredFileName,
  sharePointAvailabilityMessage
} from "@/services/documents/sharepoint-document-service";

describe("sharepoint document service", () => {
  it("sanitizes file names and rejects traversal", () => {
    expect(sanitizeStoredFileName("quote export.pdf")).toBe("quote export.pdf");
    expect(() => sanitizeStoredFileName("../secrets.txt")).toThrow("Invalid file name");
  });

  it("normalizes folder paths for sharepoint-style storage", () => {
    expect(normalizeSharePointFolderPath("ConnectedOS/Projects/PRJ-2026-0001 Hilton & Spa")).toBe("ConnectedOS/Projects/PRJ-2026-0001 Hilton & Spa");
    expect(ensureProjectFolder("PRJ-2026-0001", "Hilton Manchester", "WiFi Upgrade")).toContain("ConnectedOS/Projects");
    expect(ensureExpenseFolder("EXP-2026-0001", "James Harrison")).toContain("ConnectedOS/Expenses");
  });

  it("builds deterministic sharepoint-style urls", () => {
    expect(buildSharePointStyleUrl("ConnectedOS/Accounts/Hilton Manchester")).toBe("sharepoint://ConnectedOS/ConnectedOS/Accounts/Hilton Manchester");
    expect(sharePointAvailabilityMessage()).toContain("SharePoint not configured");
  });
});
