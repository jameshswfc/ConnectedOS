import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { CrmCreateForm, activityTypeOptions } from "@/modules/crm/ui/crm-client-forms";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listActivities } from "@/modules/crm/activities/activity-service";
import { listAccounts } from "@/modules/crm/accounts/account-service";
import { listContacts } from "@/modules/crm/contacts/contact-service";
import { listLeads } from "@/modules/crm/leads/lead-service";
import { listOpportunities } from "@/modules/crm/opportunities/opportunity-service";
import { formatDate, labelFromValue } from "@/modules/crm/ui/crm-format";
import { getCrmPageContext } from "@/modules/crm/ui/crm-page-context";

export default async function ActivitiesPage() {
  const { context, userName } = await getCrmPageContext();
  const [activities, accounts, contacts, leads, opportunities] = await Promise.all([
    listActivities(context),
    listAccounts(context),
    listContacts(context),
    listLeads(context),
    listOpportunities(context)
  ]);
  const openActivities = activities.filter((activity) => !activity.completedAt);
  const completedActivities = activities.filter((activity) => activity.completedAt);
  return (
    <AppShell title="Activities" userName={userName}>
      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <div className="space-y-5">
          <ActivityTable title="Open Activities" activities={openActivities} />
          <ActivityTable title="Completed Activities" activities={completedActivities} />
        </div>
        <CrmCreateForm action="/api/v1/activities" redirectTo="/crm/activities" submitLabel="Create Activity" fields={[{ name: "accountId", label: "Account", type: "select", options: accounts.map((account) => ({ value: account.id, label: account.name })) }, { name: "opportunityId", label: "Opportunity", type: "select", options: opportunities.map((opportunity) => ({ value: opportunity.id, label: opportunity.opportunityName })) }, { name: "leadId", label: "Lead", type: "select", options: leads.map((lead) => ({ value: lead.id, label: lead.accountName ?? lead.contactName ?? lead.email ?? "Lead" })) }, { name: "contactId", label: "Contact", type: "select", options: contacts.map((contact) => ({ value: contact.id, label: `${contact.firstName} ${contact.lastName}` })) }, { name: "activityType", label: "Type", type: "select", required: true, options: activityTypeOptions }, { name: "subject", label: "Subject", required: true }, { name: "description", label: "Description", type: "textarea" }, { name: "dueDate", label: "Due date", type: "date" }]} />
      </div>
    </AppShell>
  );
}

type ActivityTableProps = {
  title: string;
  activities: Awaited<ReturnType<typeof listActivities>>;
};

function ActivityTable({ title, activities }: ActivityTableProps) {
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold text-slate-900">{title}</h2>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Subject</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Account</TableHead>
              <TableHead>Salesperson</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activities.length > 0 ? activities.map((activity) => (
              <TableRow key={activity.id}>
                <TableCell><Link href={`/crm/activities/${activity.id}`} className="font-medium text-brand-700">{activity.subject}</Link></TableCell>
                <TableCell>{labelFromValue(activity.activityType)}</TableCell>
                <TableCell>{activity.account?.name ?? activity.lead?.accountName ?? "-"}</TableCell>
                <TableCell>{activity.owner.displayName}</TableCell>
                <TableCell>{formatDate(activity.dueDate)}</TableCell>
                <TableCell>{activity.completedAt ? "Complete" : "Open"}</TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={6} className="text-sm text-slate-500">No activities.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
