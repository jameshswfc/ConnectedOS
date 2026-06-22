import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getLead } from "@/modules/crm/leads/lead-service";
import { formatDate, formatMoney, labelFromValue } from "@/modules/crm/ui/crm-format";
import { getCrmPageContext } from "@/modules/crm/ui/crm-page-context";

type PageProps = { params: Promise<{ id: string }> };

export default async function LeadDetailPage({ params }: PageProps) {
  const { context, userName } = await getCrmPageContext();
  const { id } = await params;
  const lead = await getLead(context, id);
  const title = lead.accountName ?? lead.contactName ?? lead.email ?? "Lead";

  return (
    <AppShell title={title} userName={userName}>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Lead Detail</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-700">
            <p>Account: {lead.accountName ?? lead.account?.name ?? "-"}</p>
            <p>Contact: {lead.contactName ?? lead.contact?.firstName ?? "-"}</p>
            <p>Email: {lead.email ?? "-"}</p>
            <p>Phone: {lead.phone ?? "-"}</p>
            <p>Source: {lead.source ?? "-"}</p>
            <p>Status: {labelFromValue(lead.status)}</p>
            <p>Salesperson: {lead.owner.displayName}</p>
            <p>Estimated value: {formatMoney(lead.estimatedValue)}</p>
            <p>Next action: {formatDate(lead.nextActionDate)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Linked Activities</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {lead.salesActivities.length > 0 ? lead.salesActivities.map((activity) => (
              <p key={activity.id}>
                <Link href={`/crm/activities/${activity.id}`} className="font-medium text-brand-700">{activity.subject}</Link>
                <span className="ml-2 text-slate-500">{labelFromValue(activity.activityType)}</span>
              </p>
            )) : "No linked activities."}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
