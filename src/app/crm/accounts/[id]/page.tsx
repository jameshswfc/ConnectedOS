import Link from "next/link";
import { AuditPanel } from "@/components/audit/audit-panel";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAccount } from "@/modules/crm/accounts/account-service";
import { formatDate, formatMoney, labelFromValue } from "@/modules/crm/ui/crm-format";
import { getCrmPageContext } from "@/modules/crm/ui/crm-page-context";
import { QuoteStatusBadge } from "@/modules/quoting/ui/quote-status-badge";
import { formatPresalesDate, PresalesRagBadge, PresalesStatusBadge, presalesTypeLabel } from "@/modules/presales/ui/presales-format";

type PageProps = { params: Promise<{ id: string }> };

export default async function AccountDetailPage({ params }: PageProps) {
  const { context, userName } = await getCrmPageContext();
  const { id } = await params;
  const account = await getAccount(context, id);

  return (
    <AppShell title={account.name} userName={userName}>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Overview</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-700">
            <p>Type: {labelFromValue(account.accountType)}</p>
            <p>Status: {labelFromValue(account.status)}</p>
            <p>Owner: {account.owner.displayName}</p>
            <p>Industry: {account.industry ?? "-"}</p>
            <p>Last updated: {formatDate(account.updatedAt)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Key Contacts</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {account.contacts.map((contact) => (
              <p key={contact.id}>
                <Link href={`/crm/contacts/${contact.id}`} className="font-medium text-brand-700">{contact.firstName} {contact.lastName}</Link>
                {contact.isPrimary ? <span className="ml-2 text-xs text-slate-500">Primary</span> : null}
              </p>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Open Opportunities</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {account.opportunities.map((opportunity) => (
              <p key={opportunity.id}>
                <Link href={`/crm/opportunities/${opportunity.id}`} className="font-medium text-brand-700">{opportunity.opportunityName}</Link>: {formatMoney(opportunity.value)}
              </p>
            ))}
          </CardContent>
        </Card>
      </div>
      <Card className="mt-4">
        <CardHeader><CardTitle>Quotes</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-700">
          {account.quotes.length > 0 ? account.quotes.map((quote) => {
            const approvalStatus = quote.approvalRequests[0]?.status ?? "none";
            const latestVersion = quote.versions[0]?.versionNumber ?? quote.currentVersionNumber;
            return (
              <p key={quote.id}>
                <Link href={`/quotes/${quote.id}`} className="font-medium text-brand-700">{quote.quoteNumber}</Link>
                <span className="ml-2"><QuoteStatusBadge status={quote.status} /></span>
                <span className="ml-2 text-slate-500">Approval: {labelFromValue(approvalStatus)}</span>
                <span className="ml-2 text-slate-500">Version {latestVersion}</span>
                <span className="ml-2">{formatMoney(quote.sellTotal)}</span>
              </p>
            );
          }) : "No linked quotes."}
        </CardContent>
      </Card>
      <Card className="mt-4">
        <CardHeader><CardTitle>Pre-Sales Requests</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-700">
          {account.presalesRequests.length > 0 ? account.presalesRequests.map((request) => (
            <p key={request.id}>
              <Link href={`/presales/${request.id}`} className="font-medium text-brand-700">{request.requestNumber}</Link>
              <span className="ml-2">{presalesTypeLabel(request.requestType)}</span>
              <span className="ml-2"><PresalesStatusBadge status={request.status} /></span>
              <span className="ml-2"><PresalesRagBadge status={request.ragStatus} /></span>
              <span className="ml-2 text-slate-500">Due {formatPresalesDate(request.internalDeadline)}</span>
            </p>
          )) : "No linked pre-sales requests."}
        </CardContent>
      </Card>
      <Card className="mt-4">
        <CardHeader><CardTitle>Recent Activities</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-700">
          {account.salesActivities.length > 0 ? account.salesActivities.map((activity) => (
            <p key={activity.id}>
              <Link href={`/crm/activities/${activity.id}`} className="font-medium text-brand-700">{activity.subject}</Link>
              <span className="ml-2 text-slate-500">{labelFromValue(activity.activityType)}</span>
            </p>
          )) : "No recent activities."}
        </CardContent>
      </Card>
      <Card className="mt-4">
        <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
        <CardContent className="text-sm text-slate-700">{account.notes ?? "No notes recorded."}</CardContent>
      </Card>
      <AuditPanel module="crm" entityType="Account" entityId={account.id} />
    </AppShell>
  );
}
