import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type CreateAuditLogInput = {
  userId?: string | null;
  module: string;
  entityType: string;
  entityId: string;
  action: string;
  previousValue?: unknown;
  newValue?: unknown;
  ipAddress?: string;
  userAgent?: string;
};

export async function createAuditLog(input: CreateAuditLogInput) {
  return prisma.auditLog.create({
    data: {
      userId: input.userId ?? null,
      module: input.module,
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      previousValue: serializeAuditValue(input.previousValue),
      newValue: serializeAuditValue(input.newValue),
      ipAddress: input.ipAddress,
      userAgent: input.userAgent
    }
  });
}

export type AuditLogFilters = {
  userId?: string;
  module?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
  take?: number;
};

export async function listAuditLogs(filters: AuditLogFilters = {}) {
  return prisma.auditLog.findMany({
    where: {
      ...(filters.userId ? { userId: filters.userId } : {}),
      ...(filters.module ? { module: filters.module } : {}),
      ...(filters.action ? { action: filters.action } : {}),
      ...(filters.entityType ? { entityType: filters.entityType } : {}),
      ...(filters.entityId ? { entityId: filters.entityId } : {}),
      ...(filters.search
        ? {
            OR: [
              { module: { contains: filters.search, mode: "insensitive" } },
              { action: { contains: filters.search, mode: "insensitive" } },
              { entityType: { contains: filters.search, mode: "insensitive" } },
              { entityId: { contains: filters.search, mode: "insensitive" } }
            ]
          }
        : {}),
      ...(filters.dateFrom || filters.dateTo
        ? {
            timestamp: {
              ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
              ...(filters.dateTo ? { lte: filters.dateTo } : {})
            }
          }
        : {})
    },
    include: {
      user: {
        select: {
          id: true,
          displayName: true,
          email: true
        }
      }
    },
    orderBy: {
      timestamp: "desc"
    },
    take: filters.take ?? 100
  });
}

export async function listAuditLogsForEntity(entityType: string, entityId: string, module?: string) {
  return listAuditLogs({
    entityType,
    entityId,
    module,
    take: 50
  });
}

export function summarizeAuditValue(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, fieldValue]) => fieldValue !== null && fieldValue !== undefined && fieldValue !== "")
    .slice(0, 6)
    .map(([key, fieldValue]) => `${key}: ${auditValueText(fieldValue)}`);
  return entries.length ? entries.join(" | ") : null;
}

function auditValueText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return `${value.length} item${value.length === 1 ? "" : "s"}`;
  if (typeof value === "object") return "{...}";
  return String(value);
}

export function serializeAuditValue(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined {
  if (value === undefined) return undefined;
  if (value === null) return Prisma.JsonNull;
  if (typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : String(value);
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(value)) return value.toString("base64");
  if (isDecimalLike(value)) return decimalToNumber(value);
  if (Array.isArray(value)) {
    return value.map((item) => {
      const serialized = serializeAuditValue(item);
      return serialized === undefined ? null : serialized;
    }) as Prisma.InputJsonArray;
  }
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .map(([key, entryValue]) => [key, serializeAuditValue(entryValue)])
        .filter(([, entryValue]) => entryValue !== undefined)
    ) as Prisma.InputJsonObject;
  }
  return String(value);
}

type DecimalLike = {
  toNumber?: () => number;
  toFixed?: (digits?: number) => string;
  toJSON?: () => unknown;
  constructor?: { name?: string };
};

function isDecimalLike(value: unknown): value is DecimalLike {
  if (!value || typeof value !== "object") return false;
  const candidate = value as DecimalLike;
  return candidate.constructor?.name === "Decimal"
    || typeof candidate.toNumber === "function"
    || typeof candidate.toFixed === "function";
}

function decimalToNumber(value: DecimalLike) {
  if (typeof value.toNumber === "function") return value.toNumber();
  if (typeof value.toJSON === "function") return Number(value.toJSON());
  if (typeof value.toFixed === "function") return Number(value.toFixed(2));
  return Number(value);
}
