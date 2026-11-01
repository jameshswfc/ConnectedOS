import { randomUUID, createHash } from "node:crypto";
import { mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";

const execute = promisify(execFile);
export const INTAKE_MAX_BYTES = 12 * 1024 * 1024;
export const INTAKE_FILE_BYTES = 5 * 1024 * 1024;
export const INTAKE_MAX_FILES = 5;
export const INTAKE_ACCEPT = ".pdf,.png,.jpg,.jpeg,.txt";

export function intakeScanTimeoutMs() {
  const configured = process.env.PARTNER_INTAKE_SCAN_TIMEOUT_SECONDS;
  if (!configured) return 120000;
  const seconds = Number(configured);
  if (!Number.isInteger(seconds) || seconds < 30 || seconds > 300) throw new Error("Partner attachment scan timeout must be between 30 and 300 seconds.");
  return seconds * 1000;
}

export function validateIntakeFile(fileName: string, bytes: Buffer) {
  if (!fileName || fileName.length > 150 || /[/\\\x00-\x1f]/.test(fileName)) throw new Error("Invalid attachment name.");
  if (!bytes.length || bytes.length > INTAKE_FILE_BYTES) throw new Error("Each attachment must be between 1 byte and 5 MB.");
  const extension = path.extname(fileName).toLowerCase();
  const valid = extension === ".pdf" ? bytes.subarray(0, 5).toString() === "%PDF-"
    : extension === ".png" ? bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
    : [".jpg", ".jpeg"].includes(extension) ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
    : extension === ".txt" ? !bytes.includes(0) && !bytes.toString("utf8").includes("\uFFFD") : false;
  if (!valid) throw new Error("Use a valid PDF, PNG, JPEG or plain text attachment. Office and macro-enabled files are not enabled for this pilot.");
}
export function quarantinePath(key: string) {
  if (!/^[0-9a-f-]{36}$/.test(key)) throw new Error("Invalid attachment storage key.");
  return path.join(process.cwd(), "storage/partner-quarantine", key);
}
export async function quarantineFile(fileName: string, buffer: Buffer) {
  validateIntakeFile(fileName, buffer);
  const storageKey = randomUUID();
  await mkdir(path.dirname(quarantinePath(storageKey)), { recursive: true, mode: 0o700 });
  await writeFile(quarantinePath(storageKey), buffer, { mode: 0o600, flag: "wx" });
  return { storageKey, fileName, sizeBytes: buffer.length, sha256: createHash("sha256").update(buffer).digest("hex") };
}
export async function removeQuarantinedFile(key: string) { await rm(quarantinePath(key), { force: true }); }
export async function scanQuarantinedFile(key: string, expectedHash: string): Promise<"clean" | "rejected" | "quarantined"> {
  const buffer = await readFile(quarantinePath(key));
  if (createHash("sha256").update(buffer).digest("hex") !== expectedHash) return "rejected";
  // An absolute, operator-controlled ClamAV binary only. No shell, flags or user paths are accepted.
  const scanner = process.env.PARTNER_INTAKE_SCANNER_PATH;
  if (!scanner?.startsWith("/")) return "quarantined";
  try {
    await execute(scanner, ["--no-summary", "--", quarantinePath(key)], { timeout: intakeScanTimeoutMs(), killSignal: "SIGKILL", maxBuffer: 8192 });
    return "clean";
  } catch (error) {
    return (error as { code?: unknown }).code === 1 ? "rejected" : "quarantined";
  }
}

export async function limitedRequestBody(request: Request, limit = INTAKE_MAX_BYTES) {
  if (Number(request.headers.get("content-length")) > limit) throw new Error("Submission exceeds the 12 MB limit.");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Submission body is missing.");
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) { await reader.cancel(); throw new Error("Submission exceeds the 12 MB limit."); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks);
}
