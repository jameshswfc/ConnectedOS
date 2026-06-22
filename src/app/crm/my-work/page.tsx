import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCrmMyWork } from "@/modules/crm/my-work/my-work-service";
import { getStageLabel } from "@/modules/crm/opportunities/opportunity-stages";
import { canSelectSalesperson, getActiveSalesUsers, resolveSalespersonScope } from "@/modules/crm/sales/salesperson-service";
import { SalespersonFilter } from "@/modules/crm/sales/salesperson-filter";
import { formatDate, formatMoney, labelFromValue } from "@/modules/crm/ui/crm-format";
import { getCrmPageContext } from "@/modules/crm/ui/crm-page-context";
import { QuoteStatusBadge } from "@/modules/quoting/ui/quote-status-badge";
import { PresalesStatusBadge } from "@/modules/presales/ui/presales-format";

type PageProps = { searchParams?: Promise<{ salespersonId?: string }> };

export default async function CrmMyWorkPage({ searchParams }: PageProps) {
  const { context, userName } = await getCrmPageContext();
  const resolvedSearchParams = await searchParams;
  const scope = resolveSalespersonScope(context, resolvedSearchParams?.salespersonId);
  const [myWork, salespeople] = await Promise.all([
    getCrmMyWork(context, scope.selectedSalespersonId),
    canSelectSalesperson(context) ? getActiveSalesUsers() : Promise.resolve([])
  ]);

  return (
    <AppShell title="CRM My Work" userName={userName}>
      <div className="space-y-5">
        {scope.canSelect ? <SalespersonFilter salespeople={salespeople} selectedSalespersonId={scope.selectedSalespersonId} /> : null}
        <div className="grid gap-4 md:grid-cols-5">
          <Metric title="My Leads" value={myWork.leads.length.toString()} />
          <Metric title="My Opportunities" value={myWork.opportunities.length.toString()} />
          <Metric title="My Quotes" value={myWork.quotes.length.toString()} />
          <Metric title="My Pre-Sales" value={myWork.presalesRequests.length.toString()} />
          <Metric title="Due Today" value={myWork.dueFollowUps.length.toString()} />
          <Metric title="Overdue" value={myWork.overdueFollowUps.length.toString()} tone="danger" />
        </div>
        <Card>
          <CardHeader><CardTitle>My Leads</CardTitle></CardHeader>
          <CardContent><LeadsTable leads={myWork.leads} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>My Opportunities</CardTitle></CardHeader>
          <CardContent><OpportunitiesTable opportunities={myWork.opportunities} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>My Activities</CardTitle></CardHeader>
          <CardContent><ActivitiesTable activities={myWork.activities} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>My Quotes</CardTitle></CardHeader>
          <CardContent><QuotesTable quotes={myWork.quotes} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>My Pre-Sales Requests</CardTitle></CardHeader>
          <CardContent><PresalesTable requests={myWork.presalesRequests} /></CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function Metric({ title, value, tone = "default" }: { title: string; value: string; tone?: "default" | "danger" }) {
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent className={tone === "danger" ? "text-2xl font-semibold text-red-700" : "text-2xl font-semibold"}>{value}</CardContent>
    </Card>
  );
}

type MyWork = Awaited<ReturnType<typeof getCrmMyWork>>;

function LeadsTable({ leads }: { leads: MyWork["leads"] }) {
  return (
    <Table>
      <TableHeader><TableRow><TableHead>Lead</TableHead><TableHead>Status</TableHead><TableHead>Salesperson</TableHead><TableHead>Next Action</TableHead></TableRow></TableHeader>
      <TableBody>{leads.length > 0 ? leads.map((lead) => (
        <TableRow key={lead.id}>
          <TableCell><Link href={`/crm/leads/${lead.id}`} className="font-medium text-brand-700">{lead.accountName ?? lead.contactName ?? lead.email ?? "Lead"}</Link></TableCell>
          <TableCell>{labelFromValue(lead.status)}</TableCell>
          <TableCell>{lead.owner.displayName}</TableCell>
          <TableCell>{formatDate(lead.nextActionDate)}</TableCell>
        </TableRow>
      )) : <EmptyRow columns={4} />}</TableBody>
    </Table>
  );
}

function OpportunitiesTable({ opportunities }: { opportunities: MyWork["opportunities"] }) {
  return (
    <Table>
      <TableHeader><TableRow><TableHead>Opportunity</TableHead><TableHead>Account</TableHead><TableHead>Stage</TableHead><TableHead>Value</TableHead><TableHead>Salesperson</TableHead><TableHead>Next Action</TableHead></TableRow></TableHeader>
      <TableBody>{opportunities.length > 0 ? opportunities.map((opportunity) => (
        <TableRow key={opportunity.id}>
          <TableCell><Link href={`/crm/opportunities/${opportunity.id}`} className="font-medium text-brand-700">{opportunity.opportunityName}</Link></TableCell>
          <TableCell>{opportunity.account.name}</TableCell>
          <TableCell>{getStageLabel(opportunity.stage)}</TableCell>
          <TableCell>{formatMoney(opportunity.value)}</TableCell>
          <TableCell>{opportunity.owner.displayName}</TableCell>
          <TableCell>{formatDate(opportunity.nextActionDate)}</TableCell>
        </TableRow>
      )) : <EmptyRow columns={6} />}</TableBody>
    </Table>
  );
}

function ActivitiesTable({ activities }: { activities: MyWork["activities"] }) {
  return (
    <Table>
      <TableHeader><TableRow><TableHead>Activity</TableHead><TableHead>Related</TableHead><TableHead>Salesperson</TableHead><TableHead>Due</TableHead></TableRow></TableHeader>
      <TableBody>{activities.length > 0 ? activities.map((activity) => (
        <TableRow key={activity.id}>
          <TableCell><Link href={`/crm/activities/${activity.id}`} className="font-medium text-brand-700">{activity.subject}</Link></TableCell>
          <TableCell>{activity.account?.name ?? activity.opportunity?.opportunityName ?? activity.lead?.accountName ?? activity.lead?.contactName ?? "-"}</TableCell>
          <TableCell>{activity.owner.displayName}</TableCell>
          <TableCell>{formatDate(activity.dueDate)}</TableCell>
        </TableRow>
      )) : <EmptyRow columns={4} />}</TableBody>
    </Table>
  );
}

function QuotesTable({ quotes }: { quotes: MyWork["quotes"] }) {
  return (
    <Table>
      <TableHeader><TableRow><TableHead>Quote</TableHead><TableHead>Account</TableHead><TableHead>Opportunity</TableHead><TableHead>Value</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
      <TableBody>{quotes.length > 0 ? quotes.map((quote) => (
        <TableRow key={quote.id}>
          <TableCell><Link href={`/quotes/${quote.id}`} className="font-medium text-brand-700">{quote.quoteNumber}</Link></TableCell>
          <TableCell>{quote.account.name}</TableCell>
          <TableCell>{quote.opportunity?.opportunityName ?? "-"}</TableCell>
          <TableCell>{formatMoney(quote.sellTotal)}</TableCell>
          <TableCell><QuoteStatusBadge status={quote.status} /></TableCell>
        </TableRow>
      )) : <EmptyRow columns={5} />}</TableBody>
    </Table>
  );
}

function PresalesTable({ requests }: { requests: MyWork["presalesRequests"] }) {
  return (
    <Table>
      <TableHeader><TableRow><TableHead>Request</TableHead><TableHead>Account</TableHead><TableHead>Opportunity</TableHead><TableHead>Engineer</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
      <TableBody>{requests.length > 0 ? requests.map((request) => (
        <TableRow key={request.id}>
          <TableCell><Link href={`/presales/${request.id}`} className="font-medium text-brand-700">{request.requestNumber}</Link></TableCell>
          <TableCell>{request.account.name}</TableCell>
          <TableCell>{request.opportunity?.opportunityName ?? "-"}</TableCell>
          <TableCell>{request.assignedTo?.displayName ?? "Unassigned"}</TableCell>
          <TableCell><PresalesStatusBadge status={request.status} /></TableCell>
        </TableRow>
      )) : <EmptyRow columns={5} />}</TableBody>
    </Table>
  );
}

function EmptyRow({ columns }: { columns: number }) {
  return (
    <TableRow>
      <TableCell colSpan={columns} className="text-sm text-slate-500">No records.</TableCell>
    </TableRow>
  );
}
