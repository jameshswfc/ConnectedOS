import Link from "next/link";
import { AuditPanel } from "@/components/audit/audit-panel";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getOpportunity } from "@/modules/crm/opportunities/opportunity-service";
import { getStageLabel } from "@/modules/crm/opportunities/opportunity-stages";
import { getOpportunityTypeLabel } from "@/modules/crm/opportunities/opportunity-types";
import { OpportunityHealthBadge } from "@/modules/crm/ui/opportunity-health-badge";
import { formatDate, formatMoney, labelFromValue } from "@/modules/crm/ui/crm-format";
import { getCrmPageContext } from "@/modules/crm/ui/crm-page-context";
import { QuoteStatusBadge } from "@/modules/quoting/ui/quote-status-badge";
import { formatPresalesDate, PresalesRagBadge, PresalesStatusBadge, presalesTypeLabel } from "@/modules/presales/ui/presales-format";

type PageProps = { params: Promise<{ id: string }> };

export default async function OpportunityDetailPage({ params }: PageProps) {
  const { context, userName } = await getCrmPageContext();
  const { id } = await params;
  const opportunity = await getOpportunity(context, id);
  return (
    <AppShell title={opportunity.opportunityName} userName={userName}>
      <div className="mb-4 flex justify-end gap-2">
        <Link href={`/presales/new?opportunityId=${opportunity.id}`}><Button>Pre-Sales Request</Button></Link>
        <Link href={`/quotes/new?opportunityId=${opportunity.id}`}><Button>Create Quote</Button></Link>
        <Link href={`/crm/opportunities/${opportunity.id}/edit`}><Button variant="secondary">Edit Opportunity</Button></Link>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card><CardHeader><CardTitle>Summary</CardTitle></CardHeader><CardContent className="space-y-2 text-sm"><p>Account: <Link href={`/crm/accounts/${opportunity.account.id}`} className="font-medium text-brand-700">{opportunity.account.name}</Link></p><p>Primary contact: {opportunity.primaryContact ? <Link href={`/crm/contacts/${opportunity.primaryContact.id}`} className="font-medium text-brand-700">{opportunity.primaryContact.firstName} {opportunity.primaryContact.lastName}</Link> : "-"}</p><p>Type: {getOpportunityTypeLabel(opportunity.opportunityType)}</p><p>Source: {labelFromValue(opportunity.source)}</p><p>Stage: {getStageLabel(opportunity.stage)}</p><p>Status: {labelFromValue(opportunity.status)}</p><p>Health: <OpportunityHealthBadge status={opportunity.healthStatus} /></p><p>Owner: {opportunity.owner.displayName}</p><p>Close date: {formatDate(opportunity.expectedCloseDate)}</p></CardContent></Card>
        <Card><CardHeader><CardTitle>Commercials</CardTitle></CardHeader><CardContent className="space-y-2 text-sm"><p>Value: {formatMoney(opportunity.value)}</p><p>Weighted: {formatMoney(opportunity.weightedValue)}</p><p>Probability: {opportunity.probabilityPercent}%</p><p>Margin: {opportunity.marginPercent ? `${opportunity.marginPercent}%` : "-"}</p></CardContent></Card>
        <Card><CardHeader><CardTitle>Activities</CardTitle></CardHeader><CardContent className="space-y-2 text-sm">{opportunity.salesActivities.length > 0 ? opportunity.salesActivities.map((activity) => <p key={activity.id}><Link href={`/crm/activities/${activity.id}`} className="font-medium text-brand-700">{activity.subject}</Link></p>) : "No linked activities."}</CardContent></Card>
        <Card><CardHeader><CardTitle>Quotes</CardTitle></CardHeader><CardContent className="space-y-2 text-sm">{opportunity.quotes.length > 0 ? opportunity.quotes.map((quote) => {
          const approvalStatus = quote.approvalRequests[0]?.status ?? "none";
          const latestVersion = quote.versions[0]?.versionNumber ?? quote.currentVersionNumber;
          return <p key={quote.id}><Link href={`/quotes/${quote.id}`} className="font-medium text-brand-700">{quote.quoteNumber}</Link><span className="ml-2"><QuoteStatusBadge status={quote.status} /></span><span className="ml-2 text-slate-500">Approval: {labelFromValue(approvalStatus)}</span><span className="ml-2 text-slate-500">Version {latestVersion}</span><span className="ml-2">{formatMoney(quote.sellTotal)}</span>{approvalStatus === "pending" ? <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">Pending approval</span> : null}</p>;
        }) : "No linked quotes."}</CardContent></Card>
        <Card><CardHeader><CardTitle>Pre-Sales Requests</CardTitle></CardHeader><CardContent className="space-y-2 text-sm">{opportunity.presalesRequests.length > 0 ? opportunity.presalesRequests.map((request) => <p key={request.id}><Link href={`/presales/${request.id}`} className="font-medium text-brand-700">{request.requestNumber}</Link><span className="ml-2">{presalesTypeLabel(request.requestType)}</span><span className="ml-2"><PresalesStatusBadge status={request.status} /></span><span className="ml-2"><PresalesRagBadge status={request.ragStatus} /></span><span className="ml-2 text-slate-500">Due {formatPresalesDate(request.internalDeadline)}</span></p>) : "No linked pre-sales requests."}</CardContent></Card>
      </div>
      <AuditPanel module="crm" entityType="Opportunity" entityId={opportunity.id} />
    </AppShell>
  );
}
