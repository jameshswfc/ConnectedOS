import path from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { prisma } from "@/lib/prisma";

const LOCAL_STORAGE_ROOT = "storage/sharepoint-fallback";
const SHAREPOINT_PREFIX = "sharepoint://ConnectedOS/";
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
const DEFAULT_ALLOWED_EXTENSIONS = [".pdf", ".docx", ".xlsx", ".pptx", ".png", ".jpg", ".jpeg", ".csv", ".txt"] as const;

export type StoredUploadInput = {
  folderPath: string;
  fileName: string;
  fileType?: string | null;
  buffer: Buffer;
  entityType?: string;
  entityId?: string;
  uploadedById?: string | null;
  allowedExtensions?: readonly string[];
};

export function sanitizeStoredFileName(fileName: string) {
  const trimmed = fileName.trim();
  if (!trimmed || trimmed.includes("..") || trimmed.includes("/") || trimmed.includes("\\")) {
    throw new Error("Invalid file name");
  }
  return path.basename(trimmed).replace(/[^\w.\- ()]/g, "_").replace(/\s+/g, " ").trim();
}

export function normalizeSharePointFolderPath(folderPath: string) {
  const normalized = folderPath
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment) => segment.replace(/[^\w\- ()&]/g, "_"));
  if (!normalized.length) {
    throw new Error("Invalid SharePoint folder path");
  }
  return normalized.join("/");
}

export function buildSharePointStyleUrl(folderPath: string) {
  return `${SHAREPOINT_PREFIX}${normalizeSharePointFolderPath(folderPath)}`;
}

function assertAllowedExtension(fileName: string, allowedExtensions: readonly string[]) {
  const extension = path.extname(fileName).toLowerCase();
  if (!allowedExtensions.includes(extension as (typeof DEFAULT_ALLOWED_EXTENSIONS)[number])) {
    throw new Error(`Unsupported file type: ${extension || "unknown"}`);
  }
}

function resolveStoragePath(folderPath: string, fileName: string, storageRoot = process.cwd()) {
  const safeFolderPath = normalizeSharePointFolderPath(folderPath);
  const safeFileName = sanitizeStoredFileName(fileName);
  const relativePath = path.join(LOCAL_STORAGE_ROOT, safeFolderPath, safeFileName);
  const absolutePath = path.resolve(storageRoot, relativePath);
  const allowedRoot = path.resolve(storageRoot, LOCAL_STORAGE_ROOT);
  if (!absolutePath.startsWith(allowedRoot + path.sep)) {
    throw new Error("Invalid storage path");
  }
  return { safeFolderPath, safeFileName, relativePath, absolutePath };
}

export async function createFolder(folderPath: string) {
  const normalized = normalizeSharePointFolderPath(folderPath);
  const { absolutePath } = resolveStoragePath(normalized, ".keep");
  await mkdir(path.dirname(absolutePath), { recursive: true });
  return {
    folderPath: normalized,
    webUrl: buildSharePointStyleUrl(normalized)
  };
}

export async function uploadFileToSharePointStub(input: StoredUploadInput) {
  if (input.buffer.byteLength > MAX_UPLOAD_BYTES) {
    throw new Error("File exceeds the 25MB upload limit");
  }
  const fileName = sanitizeStoredFileName(input.fileName);
  assertAllowedExtension(fileName, input.allowedExtensions ?? DEFAULT_ALLOWED_EXTENSIONS);
  const { safeFolderPath, relativePath, absolutePath } = resolveStoragePath(input.folderPath, fileName);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, input.buffer);

  return prisma.document.create({
    data: {
      storageProvider: "sharepoint",
      externalId: relativePath,
      webUrl: buildSharePointStyleUrl(`${safeFolderPath}/${fileName}`),
      folderPath: safeFolderPath,
      storagePath: relativePath,
      versionLabel: "v1",
      fileName,
      fileType: input.fileType ?? undefined,
      sizeBytes: input.buffer.byteLength,
      entityType: input.entityType,
      entityId: input.entityId,
      uploadedById: input.uploadedById ?? undefined
    }
  });
}

export async function readStoredDocument(documentId: string, userId?: string) {
  const document = await prisma.document.findFirst({
    where: { id: documentId, deletedAt: null }
  });
  if (!document?.storagePath) {
    throw new Error("Document file not found");
  }
  const absolutePath = path.resolve(process.cwd(), document.storagePath);
  const allowedRoot = path.resolve(process.cwd(), LOCAL_STORAGE_ROOT);
  if (!absolutePath.startsWith(allowedRoot + path.sep)) {
    throw new Error("Invalid stored document path");
  }
  return {
    document,
    buffer: await readFile(absolutePath),
    userId
  };
}

export function ensureAccountFolder(accountName: string) {
  return normalizeSharePointFolderPath(`ConnectedOS/Accounts/${accountName}`);
}

export function ensureQuoteFolder(quoteNumber: string, accountName: string) {
  return normalizeSharePointFolderPath(`ConnectedOS/Quotes/${quoteNumber} ${accountName}`);
}

export function ensurePresalesFolder(requestNumber: string, accountName: string, shortDescription: string) {
  return normalizeSharePointFolderPath(`ConnectedOS/PreSales/${requestNumber} ${accountName} ${shortDescription}`);
}

export function ensureProjectFolder(projectNumber: string, accountName: string, projectName: string) {
  return normalizeSharePointFolderPath(`ConnectedOS/Projects/${projectNumber} ${accountName} ${projectName}`);
}

export function ensureHelpdeskFolder(ticketNumber: string, accountName: string) {
  return normalizeSharePointFolderPath(`ConnectedOS/Helpdesk/${ticketNumber} ${accountName}`);
}

export function ensureExpenseFolder(claimNumber: string, userName: string) {
  return normalizeSharePointFolderPath(`ConnectedOS/Expenses/${claimNumber} ${userName}`);
}

export function ensureProcurementFolder(poNumber: string, supplierName: string) {
  return normalizeSharePointFolderPath(`ConnectedOS/Procurement/${poNumber} ${supplierName}`);
}

export function sharePointAvailabilityMessage() {
  return "SharePoint not configured. Files are stored locally using the SharePoint-style fallback.";
}
