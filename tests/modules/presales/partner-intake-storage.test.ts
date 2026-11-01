import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ execute: vi.fn(), read: vi.fn() }));
vi.mock("node:child_process", () => ({ execFile: mocks.execute }));
vi.mock("node:fs/promises", async (importOriginal) => ({ ...await importOriginal<typeof import("node:fs/promises")>(), readFile: mocks.read }));
import { intakeScanTimeoutMs, scanQuarantinedFile } from "@/modules/presales/partner-intake-storage";

const key = "00000000-0000-4000-8000-000000000001";
const bytes = Buffer.from("Synthetic hotel test document");
const hash = createHash("sha256").update(bytes).digest("hex");

describe("partner attachment scanner", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("PARTNER_INTAKE_SCANNER_PATH", "/usr/bin/clamscan");
    vi.stubEnv("PARTNER_INTAKE_SCAN_TIMEOUT_SECONDS", "");
    mocks.read.mockResolvedValue(bytes);
    mocks.execute.mockImplementation((_file, _args, _options, callback) => callback(null, "", ""));
  });
  afterEach(() => vi.unstubAllEnvs());
  it("allows cold-start headroom and kills timed-out scans without a shell", async () => {
    expect(await scanQuarantinedFile(key, hash)).toBe("clean");
    expect(mocks.execute).toHaveBeenCalledWith("/usr/bin/clamscan", ["--no-summary", "--", expect.stringContaining(key)],
      { timeout: 120000, killSignal: "SIGKILL", maxBuffer: 8192 }, expect.any(Function));
  });
  it("supports a bounded operator override", () => {
    vi.stubEnv("PARTNER_INTAKE_SCAN_TIMEOUT_SECONDS", "180");
    expect(intakeScanTimeoutMs()).toBe(180000);
    for (const value of ["0", "29", "301", "NaN", "Infinity", "30.5"]) {
      vi.stubEnv("PARTNER_INTAKE_SCAN_TIMEOUT_SECONDS", value);
      expect(() => intakeScanTimeoutMs()).toThrow("between 30 and 300");
    }
  });
  it("keeps files quarantined on timeout, unavailable scanner or invalid configuration", async () => {
    mocks.execute.mockImplementation((_file, _args, _options, callback) => callback(Object.assign(new Error("Timed out"), { code: null, killed: true })));
    expect(await scanQuarantinedFile(key, hash)).toBe("quarantined");
    vi.stubEnv("PARTNER_INTAKE_SCANNER_PATH", "");
    expect(await scanQuarantinedFile(key, hash)).toBe("quarantined");
    vi.stubEnv("PARTNER_INTAKE_SCANNER_PATH", "/usr/bin/clamscan");
    vi.stubEnv("PARTNER_INTAKE_SCAN_TIMEOUT_SECONDS", "unbounded");
    expect(await scanQuarantinedFile(key, hash)).toBe("quarantined");
  });
  it("rejects infected content", async () => {
    mocks.execute.mockImplementation((_file, _args, _options, callback) => callback(Object.assign(new Error("Virus found"), { code: 1 })));
    expect(await scanQuarantinedFile(key, hash)).toBe("rejected");
  });
  it("rejects changed bytes before invoking the scanner", async () => {
    mocks.read.mockResolvedValue(Buffer.from("changed"));
    expect(await scanQuarantinedFile(key, hash)).toBe("rejected");
    expect(mocks.execute).not.toHaveBeenCalled();
  });
});
