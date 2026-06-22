import path from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";

export const PRESALES_ALLOWED_FILE_EXTENSIONS = [".pdf", ".docx", ".xlsx", ".pptx", ".png", ".jpg", ".jpeg", ".csv", ".txt"] as const;
export const PRESALES_MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
export const PRESALES_STORAGE_ROOT = "storage/presales";

const allowedExtensions = new Set<string>(PRESALES_ALLOWED_FILE_EXTENSIONS);
const sharePointPrefix = "sharepoint://ConnectedHospitality/";

export type PresalesStoredFilePath = {
  absolutePath: string;
  relativePath: string;
  fileName: string;
};

export function sanitizePresalesFileName(fileName: string) {
  const trimmed = fileName.trim();
  if (trimmed.includes("..") || trimmed.includes("/") || trimmed.includes("\\")) {
    throw new Error("Invalid file name");
  }
  const baseName = path.basename(trimmed);
  const sanitized = baseName.replace(/[^\w.\- ()]/g, "_").replace(/\s+/g, " ").trim();
  if (!sanitized || sanitized === "." || sanitized === "..") {
    throw new Error("Invalid file name");
  }
  assertAllowedPresalesExtension(sanitized);
  return sanitized;
}

export function assertAllowedPresalesFile(fileName: string, sizeBytes: number) {
  sanitizePresalesFileName(fileName);
  if (sizeBytes > PRESALES_MAX_FILE_SIZE_BYTES) {
    throw new Error("File exceeds the 25MB upload limit");
  }
}

export function buildPresalesStoredFilePath(input: { requestNumber: string; fileName: string; year?: number; storageRoot?: string }) {
  const fileName = sanitizePresalesFileName(input.fileName);
  const year = input.year ?? yearFromRequestNumber(input.requestNumber);
  const root = input.storageRoot ?? process.cwd();
  const relativePath = path.join(PRESALES_STORAGE_ROOT, String(year), input.requestNumber, fileName);
  const absolutePath = path.resolve(root, relativePath);
  const allowedRoot = path.resolve(root, PRESALES_STORAGE_ROOT);
  if (!absolutePath.startsWith(allowedRoot + path.sep)) {
    throw new Error("Invalid file storage path");
  }
  return { absolutePath, relativePath, fileName };
}

export async function savePresalesUploadBuffer(input: { requestNumber: string; fileName: string; buffer: Buffer; year?: number; storageRoot?: string }) {
  assertAllowedPresalesFile(input.fileName, input.buffer.byteLength);
  const target = buildPresalesStoredFilePath(input);
  await mkdir(path.dirname(target.absolutePath), { recursive: true });
  await writeFile(target.absolutePath, input.buffer);
  return target;
}

export async function readPresalesStoredFile(relativePath: string, storageRoot = process.cwd()) {
  const absolutePath = resolvePresalesStoredFilePath(relativePath, storageRoot);
  return readFile(absolutePath);
}

export function resolvePresalesStoredFilePath(relativePath: string, storageRoot = process.cwd()) {
  const normalized = path.normalize(relativePath);
  if (path.isAbsolute(normalized) || normalized.startsWith("..") || normalized.includes(`${path.sep}..${path.sep}`)) {
    throw new Error("Invalid stored file path");
  }
  const absolutePath = path.resolve(storageRoot, normalized);
  const allowedRoot = path.resolve(storageRoot, PRESALES_STORAGE_ROOT);
  if (!absolutePath.startsWith(allowedRoot + path.sep)) {
    throw new Error("Invalid stored file path");
  }
  return absolutePath;
}

export function buildPresalesSharePointTargetPath(input: { sharePointFolderUrl?: string | null; requestNumber: string; fileName: string; year?: number }) {
  const fileName = sanitizePresalesFileName(input.fileName);
  const year = input.year ?? yearFromRequestNumber(input.requestNumber);
  const folderPath = input.sharePointFolderUrl?.startsWith(sharePointPrefix)
    ? input.sharePointFolderUrl.slice(sharePointPrefix.length)
    : `PreSales/${year}/${input.requestNumber}`;
  return `${folderPath.replace(/\/+$/, "")}/${fileName}`;
}

export function presalesUploadNote() {
  return `Allowed file types: ${PRESALES_ALLOWED_FILE_EXTENSIONS.join(", ")}. Maximum file size: 25MB.`;
}

function assertAllowedPresalesExtension(fileName: string) {
  const extension = path.extname(fileName).toLowerCase();
  if (!allowedExtensions.has(extension)) {
    throw new Error(`Unsupported file type: ${extension || "unknown"}`);
  }
}

function yearFromRequestNumber(requestNumber: string) {
  const match = requestNumber.match(/^PS-(\d{4})-/);
  return match ? Number(match[1]) : new Date().getFullYear();
}
