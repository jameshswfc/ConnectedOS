import { CustomerInvoiceStatus } from "@prisma/client";
import { AccessDenied } from "@/components/auth/access-denied";
import { JsonActionForm } from "@/components/forms/json-action-form";
import { AppShell } from "@/components/layout/app-shell";
import { prisma } from "@/lib/prisma";
import { getCrmPageContext } from "@/modules/crm/ui/crm-page-context";

export default async function NewInvoicePage() {
  const { context, userName } = await getCrmPageContext();
  if (!context.permissions.includes("finance.create_invoice") && !context.permissions.includes("finance.read_all") && context.permissionLevel !== "administrator") {
    return <AppShell title="Create Invoice" userName={userName}><AccessDenied /></AppShell>;
  }
  const [accounts, projects, quotes] = await Promise.all([
    prisma.account.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.project.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" }, select: { id: true, projectNumber: true, name: true } }),
    prisma.quote.findMany({ where: { deletedAt: null }, orderBy: { quoteNumber: "desc" }, select: { id: true, quoteNumber: true, title: true } })
  ]);
  return (
    <AppShell title="Create Invoice" userName={userName}>
      <JsonActionForm
        endpoint="/api/v1/customer-invoices"
        buttonLabel="Create Invoice"
        successHref="/finance/invoices/:id"
        fields={[
          { name: "accountId", label: "Account", type: "select", required: true, options: accounts.map((account) => ({ id: account.id, label: account.name })) },
          { name: "projectId", label: "Project", type: "select", options: projects.map((project) => ({ id: project.id, label: `${project.projectNumber} ${project.name}` })) },
          { name: "quoteId", label: "Quote", type: "select", options: quotes.map((quote) => ({ id: quote.id, label: `${quote.quoteNumber} ${quote.title}` })) },
          { name: "issueDate", label: "Issue date", type: "date" },
          { name: "dueDate", label: "Due date", type: "date" },
          { name: "amount", label: "Amount", type: "number", required: true },
          { name: "vatAmount", label: "VAT", type: "number" },
          { name: "currency", label: "Currency", defaultValue: "GBP" },
          { name: "status", label: "Status", type: "select", options: Object.values(CustomerInvoiceStatus).map((value) => ({ id: value, label: value.replaceAll("_", " ") })), defaultValue: CustomerInvoiceStatus.draft },
          { name: "notes", label: "Notes", type: "textarea" }
        ]}
      />
    </AppShell>
  );
}
