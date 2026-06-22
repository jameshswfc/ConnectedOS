import Link from "next/link";
import { AuditPanel } from "@/components/audit/audit-panel";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCrmPageContext } from "@/modules/crm/ui/crm-page-context";
import { canApproveQuoteRequest, getApprovalStatus } from "@/modules/quoting/quotes/quote-approval-service";
import { getQuote } from "@/modules/quoting/quotes/quote-service";
import { CreateQuoteVersionButton } from "@/modules/quoting/ui/create-quote-version-button";
import { QuoteExportButtons } from "@/modules/quoting/ui/quote-export-buttons";
import { formatQuoteMoney, formatQuotePercent, labelFromQuoteValue } from "@/modules/quoting/ui/quote-format";
import { QuoteStatusBadge } from "@/modules/quoting/ui/quote-status-badge";
import { QuoteWorkflowActions } from "@/modules/quoting/ui/quote-workflow-actions";
import { formatPresalesDate, PresalesRagBadge, PresalesStatusBadge, presalesTypeLabel } from "@/modules/presales/ui/presales-format";
import { CreateProjectFromQuoteButton } from "@/modules/projects/ui/project-actions";

type PageProps = { params: Promise<{ id: string }> };

export default async function QuoteDetailPage({ params }: PageProps) {
  const { context, userName } = await getCrmPageContext();
  const { id } = await params;
  const [quote, approvalStatus] = await Promise.all([getQuote(context, id), getApprovalStatus(context, id)]);
  const currentVersion = quote.versions.find((version) => version.versionNumber === quote.currentVersionNumber) ?? quote.versions[0];
  const pendingApproval = quote.approvalRequests.find((request) => request.status === "pending");
  const canApprove = context.permissions.includes("quotes.approve") && canApproveQuoteRequest(context, quote.ownerId, pendingApproval?.requestedById);
  return (
    <AppShell title={`${quote.quoteNumber} - ${quote.title}`} userName={userName}>
      <div className="mb-4 flex flex-wrap justify-end gap-2"><Link href={`/presales/new?quoteId=${quote.id}`}><Button>Pre-Sales Request</Button></Link><CreateProjectFromQuoteButton quoteId={quote.id} disabled={!["approved", "sent", "accepted"].includes(quote.status)} /><CreateQuoteVersionButton quoteId={quote.id} /><Link href={`/quotes/${quote.id}/edit`}><Button variant="secondary">Edit Quote</Button></Link></div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card><CardHeader><CardTitle>Summary</CardTitle></CardHeader><CardContent className="space-y-2 text-sm"><p>Account: {quote.account.name}</p><p>Opportunity: {quote.opportunity ? <Link href={`/crm/opportunities/${quote.opportunity.id}`} className="font-medium text-brand-700">{quote.opportunity.opportunityName}</Link> : "-"}</p><p>Contact: {quote.contact ? `${quote.contact.firstName} ${quote.contact.lastName}` : "-"}</p><p>Status: <QuoteStatusBadge status={quote.status} /></p><p>Owner: {quote.owner.displayName}</p><p>Project: {quote.projectName ?? quote.title}</p></CardContent></Card>
        <Card><CardHeader><CardTitle>Totals</CardTitle></CardHeader><CardContent className="space-y-2 text-sm"><p>Cost: {formatQuoteMoney(quote.costTotal)}</p><p>Sell: {formatQuoteMoney(quote.sellTotal)}</p><p>Margin: {formatQuoteMoney(quote.marginTotal)}</p><p>Margin %: {formatQuotePercent(quote.marginPercent)}</p></CardContent></Card>
        <Card><CardHeader><CardTitle>Workflow</CardTitle></CardHeader><CardContent className="space-y-3 text-sm"><QuoteWorkflowActions quoteId={quote.id} status={quote.status} canApprove={canApprove} />{approvalStatus.triggeredRules.length ? <div><p className="font-medium text-amber-800">Approval reason trigger</p><ul className="mt-1 list-disc pl-4 text-amber-800">{approvalStatus.triggeredRules.map((rule) => <li key={rule.ruleType}>{rule.label}</li>)}</ul></div> : <p className="text-slate-600">No approval rules currently triggered.</p>}</CardContent></Card>
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card><CardHeader><CardTitle>Approval Status</CardTitle></CardHeader><CardContent className="space-y-2 text-sm">{quote.approvalRequests.length ? quote.approvalRequests.map((request) => <p key={request.id}>{labelFromQuoteValue(request.status)} - {request.reason}</p>) : <p>No approval requests.</p>}</CardContent></Card>
        <Card><CardHeader><CardTitle>Export History</CardTitle></CardHeader><CardContent className="space-y-2 text-sm">{quote.exports.length ? quote.exports.map((quoteExport) => <p key={quoteExport.id}>{labelFromQuoteValue(quoteExport.exportType)} - {quoteExport.filename}</p>) : <p>No exports yet.</p>}</CardContent></Card>
      </div>
      <Card className="mt-6"><CardHeader><CardTitle>High Level Scope</CardTitle></CardHeader><CardContent className="whitespace-pre-wrap text-sm text-slate-700">{quote.highLevelScope}</CardContent></Card>
      <Card className="mt-6"><CardHeader><CardTitle>Project</CardTitle></CardHeader><CardContent className="space-y-2 text-sm text-slate-700">{quote.projects.length ? quote.projects.map((project) => <p key={project.id}><span className="font-medium text-emerald-700">Project created</span><span className="mx-2">{project.projectNumber}</span><Link href={`/projects/${project.id}`} className="font-medium text-brand-700">Open Project</Link></p>) : <p>No project has been created for this quote yet.</p>}</CardContent></Card>
      <Card className="mt-6"><CardHeader><CardTitle>Pre-Sales Requests</CardTitle></CardHeader><CardContent className="space-y-2 text-sm text-slate-700">{quote.presalesRequests.length ? quote.presalesRequests.map((request) => <p key={request.id}><Link href={`/presales/${request.id}`} className="font-medium text-brand-700">{request.requestNumber}</Link><span className="ml-2">{presalesTypeLabel(request.requestType)}</span><span className="ml-2"><PresalesStatusBadge status={request.status} /></span><span className="ml-2"><PresalesRagBadge status={request.ragStatus} /></span><span className="ml-2 text-slate-500">Due {formatPresalesDate(request.internalDeadline)}</span></p>) : "No linked pre-sales requests."}</CardContent></Card>
      <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white"><Table><TableHeader><TableRow><TableHead>Version</TableHead><TableHead>Status</TableHead><TableHead>Sell</TableHead><TableHead>Margin</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader><TableBody>{quote.versions.map((version) => <TableRow key={version.id}><TableCell>Version {version.versionNumber}</TableCell><TableCell><QuoteStatusBadge status={version.status} /></TableCell><TableCell>{formatQuoteMoney(version.sellTotal)}</TableCell><TableCell>{formatQuotePercent(version.marginPercent)}</TableCell><TableCell><Link href={`/quotes/${quote.id}/versions/${version.id}`} className="font-medium text-brand-700">Open Builder</Link></TableCell></TableRow>)}</TableBody></Table></div>
      {currentVersion ? <Card className="mt-6"><CardHeader><CardTitle>Exports</CardTitle></CardHeader><CardContent><QuoteExportButtons quoteId={quote.id} versionId={currentVersion.id} /></CardContent></Card> : null}
      <AuditPanel module="quoting" entityType="Quote" entityId={quote.id} />
    </AppShell>
  );
}
