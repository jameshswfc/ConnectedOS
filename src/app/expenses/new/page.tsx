import { AccessDenied } from "@/components/auth/access-denied";
import { JsonActionForm } from "@/components/forms/json-action-form";
import { AppShell } from "@/components/layout/app-shell";
import { prisma } from "@/lib/prisma";
import { getCrmPageContext } from "@/modules/crm/ui/crm-page-context";
import { listUsers } from "@/services/users/user-service";

export default async function NewExpenseClaimPage() {
  const { context, userName } = await getCrmPageContext();
  if (!context.permissions.includes("expenses.create") && !context.permissions.includes("expenses.view_all") && !context.permissions.includes("expenses.approve") && context.permissionLevel !== "administrator") {
    return <AppShell title="New Expense Claim" userName={userName}><AccessDenied /></AppShell>;
  }
  const [projects, accounts, bookings, users] = await Promise.all([
    prisma.project.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true, projectNumber: true } }),
    prisma.account.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.resourceBooking.findMany({ where: { deletedAt: null }, orderBy: { startDate: "desc" }, take: 100, include: { resource: true } }),
    context.permissions.includes("expenses.view_all") || context.permissions.includes("expenses.approve") || context.permissionLevel === "administrator" ? listUsers(false) : Promise.resolve([])
  ]);
  return (
    <AppShell title="New Expense Claim" userName={userName}>
      <JsonActionForm
        endpoint="/api/v1/expense-claims"
        buttonLabel="Create Claim"
        successHref="/expenses/:id"
        errorMessage="Unable to submit expense claim. Please check the required fields and try again."
        fields={[
          ...(users.length > 0 ? [{ name: "userId", label: "Claimant", type: "select" as const, options: users.map((user) => ({ id: user.id, label: user.displayName })) }] : []),
          { name: "projectId", label: "Project", type: "select", options: projects.map((project) => ({ id: project.id, label: `${project.projectNumber} ${project.name}` })) },
          { name: "accountId", label: "Account", type: "select", options: accounts.map((account) => ({ id: account.id, label: account.name })) },
          { name: "resourceBookingId", label: "Resource booking", type: "select", options: bookings.map((booking) => ({ id: booking.id, label: `${booking.title} (${booking.resource.displayName})` })) },
          { name: "currency", label: "Currency", defaultValue: "GBP" },
          { name: "notes", label: "Notes", type: "textarea" }
        ]}
      />
    </AppShell>
  );
}
