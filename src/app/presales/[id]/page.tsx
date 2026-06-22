import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCrmPageContext } from "@/modules/crm/ui/crm-page-context";
import { getPresalesRequest, listPresalesEngineers } from "@/modules/presales/presales-service";
import { isPresalesComplete } from "@/modules/presales/presales-status";
import { isBomDeliverableTitle } from "@/modules/presales/presales-deliverable-templates";
import { PresalesAssignForm, PresalesCommentForm, PresalesDeliverableForm, PresalesDeliverableStatusButton, PresalesDocumentForm, PresalesStatusForm } from "@/modules/presales/ui/presales-actions";
import { formatPresalesDate, formatPresalesMoney, PresalesRagBadge, PresalesSlaBadge, PresalesStatusBadge, presalesCategoryLabel, presalesCommercialPriorityLabel, presalesPriorityLabel, presalesTypeLabel } from "@/modules/presales/ui/presales-format";

type PageProps = { params: Promise<{ id: string }> };

export default async function PresalesDetailPage({ params }: PageProps) {
  const { context, userName } = await getCrmPageContext();
  const { id } = await params;
  const [request, engineers] = await Promise.all([getPresalesRequest(context, id), listPresalesEngineers()]);
  const engineerOptions = engineers.map((engineer) => ({ id: engineer.id, name: engineer.displayName }));
  const readOnly = isPresalesComplete(request.status);
  return (
    <AppShell title={`${request.requestNumber} - ${request.account.name}`} userName={userName}>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card><CardHeader><CardTitle>Summary</CardTitle></CardHeader><CardContent className="space-y-2 text-sm"><p>Account: <Link href={`/crm/accounts/${request.account.id}`} className="font-medium text-brand-700">{request.account.name}</Link></p><p>Opportunity: {request.opportunity ? <Link href={`/crm/opportunities/${request.opportunity.id}`} className="font-medium text-brand-700">{request.opportunity.opportunityName}</Link> : "-"}</p><p>Quote: {request.quote ? <Link href={`/quotes/${request.quote.id}`} className="font-medium text-brand-700">{request.quote.quoteNumber}</Link> : "-"}</p><p>Category: {presalesCategoryLabel(request.requestCategory)}</p><p>Type: {presalesTypeLabel(request.requestType)}</p><p>Priority: {presalesPriorityLabel(request.priority)}</p><p>Commercial Priority: {presalesCommercialPriorityLabel(request.commercialPriority)}</p></CardContent></Card>
        <Card><CardHeader><CardTitle>Status</CardTitle></CardHeader><CardContent className="space-y-2 text-sm"><p>Status: <PresalesStatusBadge status={request.status} /></p><p>SLA: <PresalesSlaBadge status={request.slaStatus} /></p><p>RAG: <PresalesRagBadge status={request.ragStatus} /></p><p>Assigned: {request.assignedTo?.displayName ?? "Unassigned"}</p><p>Internal deadline: {formatPresalesDate(request.internalDeadline)}</p><p>Completed: {formatPresalesDate(request.completedAt)}</p></CardContent></Card>
        <Card><CardHeader><CardTitle>Commercial Context</CardTitle></CardHeader><CardContent className="space-y-2 text-sm"><p>Quote value snapshot: {formatPresalesMoney(request.quoteValueSnapshot)}</p><p>Quote version snapshot: {request.quoteVersionSnapshot ?? "-"}</p><p>Estimated hours: {request.estimatedHours ? String(request.estimatedHours) : "-"}</p><p>Actual hours: {request.actualHours ? String(request.actualHours) : "-"}</p><p>SharePoint design URL: {request.sharePointFolderUrl ?? "-"}</p></CardContent></Card>
      </div>
      <Card className="mt-4"><CardHeader><CardTitle>Description</CardTitle></CardHeader><CardContent className="whitespace-pre-wrap text-sm text-slate-700">{request.description}</CardContent></Card>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card><CardHeader><CardTitle>Assignment</CardTitle></CardHeader><CardContent><PresalesAssignForm requestId={request.id} engineers={engineerOptions} currentAssignedToId={request.assignedToId} /></CardContent></Card>
        <Card><CardHeader><CardTitle>Status Workflow</CardTitle></CardHeader><CardContent><PresalesStatusForm requestId={request.id} currentStatus={request.status} /></CardContent></Card>
      </div>
      <Card className="mt-4">
        <CardHeader><CardTitle>Deliverables</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium text-slate-900">Progress: {request.deliverableProgress.complete} / {request.deliverableProgress.required} complete</span>
              <span className="text-slate-500">{request.deliverableProgress.percent}%</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-slate-200">
              <div className="h-2 rounded-full bg-brand-700" style={{ width: `${request.deliverableProgress.percent}%` }} />
            </div>
          </div>
          {readOnly && request.deliverableProgress.complete < request.deliverableProgress.required ? <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">Not all expected deliverables have been uploaded.</p> : null}
          {request.deliverables.length > 0 ? request.deliverables.map((deliverable) => (
            <div key={deliverable.id} className="rounded-md border border-slate-200 p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">{deliverable.title}</p>
                  <p className="text-xs text-slate-500">{deliverable.deliverableType} - {formatDeliverableStatus(deliverable.status)}</p>
                  {deliverable.description ? <p className="mt-1 whitespace-pre-wrap text-xs text-slate-600">{deliverable.description}</p> : null}
                  {deliverable.assignedTo ? <p className="mt-1 text-xs text-slate-500">Assigned: {deliverable.assignedTo.displayName}</p> : null}
                  {deliverable.dueDate ? <p className="mt-1 text-xs text-slate-500">Due: {formatPresalesDate(deliverable.dueDate)}</p> : null}
                  {deliverable.document ? <p className="mt-1 text-xs text-slate-500">Uploaded: {deliverable.document.fileName} by {deliverable.uploadedBy?.displayName ?? "Unknown"} on {formatPresalesDate(deliverable.uploadedAt)}</p> : <p className="mt-1 text-xs text-amber-700">Awaiting upload</p>}
                  {isBomDeliverableTitle(deliverable.title) ? <p className="mt-2 text-sm">{request.quote ? <Link href={`/quotes/${request.quote.id}`} className="font-medium text-brand-700">Open Quote Builder</Link> : request.opportunity ? <Link href={`/quotes/new?opportunityId=${request.opportunity.id}`} className="font-medium text-brand-700">Create Quote</Link> : null}</p> : null}
                </div>
                <div className="space-y-2">
                  {deliverable.document ? <Link href={`/api/v1/presales-requests/${request.id}/files/${deliverable.document.id}/download`} className="block font-medium text-brand-700">Download</Link> : null}
                  {deliverable.status === "complete" ? <PresalesDeliverableStatusButton deliverableId={deliverable.id} status="open" disabled={readOnly} /> : <PresalesDeliverableStatusButton deliverableId={deliverable.id} status="complete" disabled={readOnly} />}
                  <PresalesDeliverableForm requestId={request.id} deliverableType={deliverable.deliverableType} title={deliverable.title} disabled={readOnly} />
                </div>
              </div>
            </div>
          )) : <p className="text-slate-500">No expected deliverables are defined for this request type.</p>}
        </CardContent>
      </Card>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Documents</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <PresalesDocumentForm requestId={request.id} />
            {readOnly && request.documents.length === 0 ? <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">No deliverable files have been attached.</p> : null}
            {request.documents.length ? request.documents.map((document) => (
              <div key={document.id} className="rounded-md border border-slate-200 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-900">{document.fileName}</p>
                    <p className="text-xs text-slate-500">{document.fileType ?? "Unknown type"}{document.sizeBytes ? ` - ${formatBytes(document.sizeBytes)}` : ""}</p>
                  </div>
                  <Link href={`/api/v1/presales-requests/${request.id}/files/${document.id}/download`} className="font-medium text-brand-700">Download</Link>
                </div>
                <p className="mt-2 text-xs text-slate-500">Uploaded by {document.uploadedBy?.displayName ?? "Unknown"} on {formatPresalesDate(document.uploadedAt)}</p>
                <p className="mt-1 break-all text-xs text-slate-500">SharePoint target path: {document.sharePointTargetPath}</p>
              </div>
            )) : <p>No documents linked.</p>}
          </CardContent>
        </Card>
        <Card><CardHeader><CardTitle>Comments</CardTitle></CardHeader><CardContent className="space-y-3 text-sm"><PresalesCommentForm requestId={request.id} />{request.comments.length ? request.comments.map((comment) => <p key={comment.id}><span className="font-medium">{comment.createdBy?.displayName ?? "User"}:</span> {comment.body}</p>) : <p>No comments yet.</p>}</CardContent></Card>
      </div>
      <Card className="mt-4"><CardHeader><CardTitle>Audit History</CardTitle></CardHeader><CardContent className="space-y-2 text-sm text-slate-700">{request.auditLogs.length ? request.auditLogs.map((log) => <p key={log.id}>{formatPresalesDate(log.timestamp)} - {log.action}</p>) : "No audit records."}</CardContent></Card>
    </AppShell>
  );
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDeliverableStatus(status: string) {
  return status.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}
