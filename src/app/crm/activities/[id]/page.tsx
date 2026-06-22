import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActivityCompletionForm } from "@/modules/crm/activities/activity-completion-form";
import { getActivity } from "@/modules/crm/activities/activity-service";
import { formatDate, labelFromValue } from "@/modules/crm/ui/crm-format";
import { getCrmPageContext } from "@/modules/crm/ui/crm-page-context";

type PageProps = { params: Promise<{ id: string }> };

export default async function ActivityDetailPage({ params }: PageProps) {
  const { context, userName } = await getCrmPageContext();
  const { id } = await params;
  const activity = await getActivity(context, id);

  return (
    <AppShell title={activity.subject} userName={userName}>
      <Card>
        <CardHeader><CardTitle>Activity Detail</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-700">
          <p>Type: {labelFromValue(activity.activityType)}</p>
          <p>Due: {formatDate(activity.dueDate)}</p>
          <p>Status: {activity.completedAt ? "Complete" : "Open"}</p>
          <p>Owner: {activity.owner.displayName}</p>
          <p>Account: {activity.account ? <Link href={`/crm/accounts/${activity.account.id}`} className="font-medium text-brand-700">{activity.account.name}</Link> : "-"}</p>
          <p>Opportunity: {activity.opportunity ? <Link href={`/crm/opportunities/${activity.opportunity.id}`} className="font-medium text-brand-700">{activity.opportunity.opportunityName}</Link> : "-"}</p>
          <p>Lead: {activity.lead ? <Link href={`/crm/leads/${activity.lead.id}`} className="font-medium text-brand-700">{activity.lead.accountName ?? activity.lead.contactName ?? activity.lead.email ?? "Lead"}</Link> : "-"}</p>
          <p>Contact: {activity.contact ? <Link href={`/crm/contacts/${activity.contact.id}`} className="font-medium text-brand-700">{activity.contact.firstName} {activity.contact.lastName}</Link> : "-"}</p>
          <p>Description: {activity.description ?? "-"}</p>
          <p>Outcome: {activity.outcome ?? "-"}</p>
        </CardContent>
      </Card>
      {!activity.completedAt ? (
        <Card className="mt-5">
          <CardHeader><CardTitle>Complete Activity</CardTitle></CardHeader>
          <CardContent>
            <ActivityCompletionForm activityId={activity.id} />
          </CardContent>
        </Card>
      ) : null}
    </AppShell>
  );
}
