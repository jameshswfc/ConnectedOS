import { Prisma } from "@prisma/client";
import { z } from "zod";
import type { CrmAccessContext } from "@/modules/crm/types/crm-context";
import { hasRole } from "@/services/permissions/user-roles";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Please enter a valid date.").refine((s) => Number.isFinite(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s, "Please enter a valid date.");
export const invoiceRequestSchema = z.object({
  projectId: z.string().uuid(),
  triggerKey: z.string().regex(/^(project|milestone:[a-f\d-]{36}|stage:[a-f\d-]{36})$/),
  description: z.string().trim().min(5).max(500),
  netAmount: z.string().regex(/^\d{1,9}(\.\d{1,2})?$/, "Enter a positive amount with up to two decimal places.").refine((s) => Number(s) > 0),
  taxRate: z.enum(["0", "20"])
});
export const invoiceApprovalSchema = z.object({
  contactId: z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/),
  customerConfirmed: z.literal(true, { errorMap: () => ({ message: "Please confirm the Sage customer matches this project account." }) }),
  date,
  dueDate: date
}).refine((input) => input.dueDate >= input.date, { message: "Due date cannot be before the invoice date.", path: ["dueDate"] });

export function canRequestProjectInvoice(context: CrmAccessContext, project: { projectManagerId: string | null }) {
  return context.permissionLevel === "administrator" || context.permissions.includes("admin.users") ||
    (context.permissions.includes("projects.update") && (hasRole(context, "Business Operations") || (hasRole(context, "Project Manager") && project.projectManagerId === context.userId)));
}
export function invoiceAmounts(netAmount: string, taxRate: string) {
  const net = new Prisma.Decimal(netAmount).toDecimalPlaces(2);
  const tax = net.mul(taxRate).div(100).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
  return { netAmount: net, taxAmount: tax, totalAmount: net.plus(tax), taxRate: new Prisma.Decimal(taxRate) };
}
export function invoiceTriggerOptions(project: { status: string; milestones: { id: string; title: string; status: string }[]; stageGates: { id: string; stage: string; status: string }[] }) {
  return [
    ...(["completed", "closed"].includes(project.status) ? [{ key: "project", label: "Project completion" }] : []),
    ...project.milestones.filter((m) => m.status === "complete").map((m) => ({ key: `milestone:${m.id}`, label: m.title })),
    ...project.stageGates.filter((g) => g.status === "complete").map((g) => ({ key: `stage:${g.id}`, label: `${g.stage.replaceAll("_", " ")} stage` }))
  ];
}
