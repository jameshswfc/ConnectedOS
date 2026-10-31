import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

async function main() {
  const url = new URL(process.env.DATABASE_URL ?? "");
  if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) {
    throw new Error("This check only runs against a local database, never production.");
  }
  const schema = `journey_check_${randomUUID().replaceAll("-", "")}`;
  const admin = new PrismaClient();
  let created = false;
  let disconnect: (() => Promise<void>) | undefined;
  try {
    // Only this freshly generated schema can be created or removed by this check.
    await admin.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
    created = true;
    url.searchParams.set("schema", schema);
    process.env.DATABASE_URL = url.toString();
    process.env.EMAIL_PROVIDER = "disabled";
    execFileSync(process.execPath, ["node_modules/prisma/build/index.js", "db", "push", "--skip-generate"], { env: process.env, stdio: "pipe" });
    const { prisma } = await import("../src/lib/prisma");
    disconnect = () => prisma.$disconnect();
    const { convertLead } = await import("../src/modules/crm/leads/lead-conversion-service");
    const { createPresalesRequest, changePresalesStatus } = await import("../src/modules/presales/presales-service");
    const { presalesRequestCreateSchema } = await import("../src/modules/presales/schemas/presales-schemas");
    const { createQuote, createQuoteLine } = await import("../src/modules/quoting/quotes/quote-service");
    const { quoteCreateSchema, quoteLineCreateSchema } = await import("../src/modules/quoting/schemas/quoting-schemas");
    const { submitQuoteForApproval, approveQuote, changeQuoteStatus } = await import("../src/modules/quoting/quotes/quote-approval-service");
    const role = await prisma.role.create({ data: { name: "Administrator" } });
    const owner = await prisma.user.create({ data: { roleId: role.id, displayName: "Journey owner", email: "owner@example.invalid", permissionLevel: "administrator" } });
    const approver = await prisma.user.create({ data: { roleId: role.id, displayName: "Journey approver", email: "approver@example.invalid", permissionLevel: "administrator" } });
    const context = { userId: owner.id, role: "Administrator", permissionLevel: "administrator" as const, permissions: ["admin.users"] };
    const lead = await prisma.lead.create({ data: { ownerId: owner.id, accountName: "Journey Test Hotel", estimatedValue: 5000 } });
    const conversionInput = { opportunityName: "Hotel guest Wi-Fi", opportunityType: "guest_wifi", firstName: "Test", lastName: "Contact", email: "contact@example.invalid" };
    const converted = await convertLead(context, lead.id, conversionInput);
    assert.equal((await convertLead(context, lead.id, conversionInput)).opportunityId, converted.opportunityId);
    assert.ok(converted.contactId);
    const presales = await createPresalesRequest(context, presalesRequestCreateSchema.parse({
      accountId: converted.accountId, opportunityId: converted.opportunityId, assignedToId: owner.id,
      requestCategory: "wi_fi", requestType: "wifi_design", internalDeadline: "2027-01-10", description: "Review network design and deliver the BoM."
    }));
    assert.equal((await prisma.opportunity.findUniqueOrThrow({ where: { id: converted.opportunityId } })).stage, "pre_sales_solution_design");
    await changePresalesStatus(context, presales.id, { status: "in_progress" });
    await changePresalesStatus(context, presales.id, { status: "internal_review" });
    await changePresalesStatus(context, presales.id, { status: "complete", actualHours: 4 });
    const quote = await createQuote(context, quoteCreateSchema.parse({ opportunityId: converted.opportunityId, contactId: converted.contactId, title: "Guest Wi-Fi proposal", highLevelScope: "Guest Wi-Fi design and deployment." }));
    assert.equal(quote.ownerId, owner.id);
    const version = await prisma.quoteVersion.findFirstOrThrow({ where: { quoteId: quote.id } });
    const product = await prisma.product.create({ data: { sku: "LAB-ENG-DAY", manufacturer: "Connected Hospitality", supplier: "Internal", category: "Labour", itemType: "labour", description: "Engineering day", costPrice: 200, defaultSellPrice: 500 } });
    await createQuoteLine(context, version.id, quoteLineCreateSchema.parse({ lineType: "labour", productId: product.id, quantity: 5, unitCost: 200, unitSell: 500 }));
    await assert.rejects(() => changeQuoteStatus(context, quote.id, "approved"));
    await submitQuoteForApproval(context, quote.id);
    await approveQuote({ ...context, userId: approver.id }, quote.id);
    await changeQuoteStatus(context, quote.id, "sent");
    assert.equal((await prisma.opportunity.findUniqueOrThrow({ where: { id: converted.opportunityId } })).stage, "proposal_sent");
    await changeQuoteStatus(context, quote.id, "accepted");
    await changeQuoteStatus(context, quote.id, "accepted");
    const projects = await prisma.project.findMany({ where: { quoteId: quote.id }, include: { tasks: true } });
    assert.equal(projects.length, 1);
    const project = projects[0];
    assert.equal(project.accountId, converted.accountId);
    assert.equal(project.opportunityId, converted.opportunityId);
    assert.equal(project.quoteVersionId, version.id);
    assert.equal(project.presalesRequestId, presales.id);
    assert.equal(project.scopeSummary, "Guest Wi-Fi design and deployment.");
    assert.equal(project.projectType, "guest_wifi");
    assert.equal(Number(project.totalResourceDaysBudget), 5);
    assert.equal(Number(project.commercialValue), 2500);
    assert.ok(project.tasks.length >= 11);
    assert.equal((await prisma.opportunity.findUniqueOrThrow({ where: { id: converted.opportunityId } })).stage, "closed_won_po_received");
    assert.equal(await prisma.presalesRequest.count(), 1);
    assert.ok(await prisma.auditLog.count() > 0);
    assert.ok(await prisma.notification.count() > 0);
    console.log("PASS: lead -> opportunity -> pre-sales -> reviewed quote -> sent -> accepted -> single linked project; ownership, scope, budget, tasks, history and notifications verified.");
  } finally {
    await disconnect?.();
    if (created) await admin.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
    await admin.$disconnect();
  }
}

main().catch((error) => {
  console.error("Sales journey check failed:", error instanceof Error ? error.message : "Unknown failure");
  process.exitCode = 1;
});
