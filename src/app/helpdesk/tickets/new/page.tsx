import { AccessDenied } from "@/components/auth/access-denied";
import { AppShell } from "@/components/layout/app-shell";
import { prisma } from "@/lib/prisma";
import { getCrmPageContext } from "@/modules/crm/ui/crm-page-context";
import { listHelpdeskQueues } from "@/modules/helpdesk/helpdesk-service";
import { HelpdeskTicketForm } from "@/modules/helpdesk/ui/helpdesk-ticket-form";
import { listUsers } from "@/services/users/user-service";

export default async function NewHelpdeskTicketPage() {
  const { context, userName } = await getCrmPageContext();
  if (!context.permissions.includes("helpdesk.create") && context.permissionLevel !== "administrator") {
    return <AppShell title="New Ticket" userName={userName}><AccessDenied /></AppShell>;
  }
  const [accounts, contacts, projects, assets, queues, users] = await Promise.all([
    prisma.account.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.contact.findMany({ where: { deletedAt: null }, orderBy: { firstName: "asc" }, select: { id: true, accountId: true, firstName: true, lastName: true } }),
    prisma.project.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" }, select: { id: true, accountId: true, projectNumber: true, name: true } }),
    prisma.asset.findMany({ where: { deletedAt: null }, orderBy: { assetNumber: "desc" }, take: 100, select: { id: true, accountId: true, assetNumber: true, description: true } }),
    listHelpdeskQueues(context),
    listUsers(false)
  ]);
  return (
    <AppShell title="New Ticket" userName={userName}>
      <HelpdeskTicketForm
        accounts={accounts.map((account) => ({ id: account.id, label: account.name }))}
        contacts={contacts.map((contact) => ({ id: contact.id, label: `${contact.firstName} ${contact.lastName}`.trim(), accountId: contact.accountId }))}
        projects={projects.map((project) => ({ id: project.id, label: `${project.projectNumber} ${project.name}`, accountId: project.accountId }))}
        assets={assets.map((asset) => ({ id: asset.id, label: `${asset.assetNumber} ${asset.description ?? ""}`.trim(), accountId: asset.accountId }))}
        queues={queues.map((queue) => ({ id: queue.id, label: queue.name }))}
        users={users.map((user) => ({ id: user.id, label: user.displayName }))}
      />
    </AppShell>
  );
}
