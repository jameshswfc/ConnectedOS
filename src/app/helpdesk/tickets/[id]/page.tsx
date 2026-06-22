import Link from "next/link";
import { HelpdeskCommentVisibility, HelpdeskPriority, HelpdeskTicketStatus } from "@prisma/client";
import { AuditPanel } from "@/components/audit/audit-panel";
import { AccessDenied } from "@/components/auth/access-denied";
import { JsonActionButton, JsonActionForm } from "@/components/forms/json-action-form";
import { MultipartActionForm } from "@/components/forms/multipart-action-form";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCrmPageContext } from "@/modules/crm/ui/crm-page-context";
import { listHelpdeskAttachments, getHelpdeskTicket, listHelpdeskQueues } from "@/modules/helpdesk/helpdesk-service";
import { ModuleDetailGrid, ModuleStatusBadge, formatModuleDate, formatModuleLabel } from "@/modules/operations/ui/module-ui";
import { listUsers } from "@/services/users/user-service";

type Params = { params: Promise<{ id: string }> };
export default async function HelpdeskTicketDetailPage({ params }: Params) {
  const { context, userName } = await getCrmPageContext();
  const { id } = await params;
  let ticket: Awaited<ReturnType<typeof getHelpdeskTicket>> | null = null;
  let attachments: Awaited<ReturnType<typeof listHelpdeskAttachments>> = [];
  let queues: Awaited<ReturnType<typeof listHelpdeskQueues>> = [];
  let users: Awaited<ReturnType<typeof listUsers>> = [];
  try {
    const canManageTicket = context.permissionLevel === "administrator" || context.permissions.includes("helpdesk.update");
    [ticket, attachments, queues, users] = await Promise.all([
      getHelpdeskTicket(context, id),
      listHelpdeskAttachments(context, id),
      canManageTicket ? listHelpdeskQueues(context) : Promise.resolve([]),
      canManageTicket ? listUsers(false) : Promise.resolve([])
    ]);
  } catch (error) {
    if (!(error instanceof Error) || !error.message.startsWith("Missing permission")) throw error;
  }
  if (!ticket) return <AppShell title="Helpdesk Ticket" userName={userName}><AccessDenied /></AppShell>;
  const canManageTicket = context.permissionLevel === "administrator" || context.permissions.includes("helpdesk.update");
  return (
    <AppShell title={ticket.ticketNumber} userName={userName}>
      <Card>
        <CardHeader><CardTitle>{ticket.title}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <ModuleDetailGrid items={[
            { label: "Account", value: ticket.account?.name ?? "-" },
            { label: "Contact", value: ticket.contact ? `${ticket.contact.firstName} ${ticket.contact.lastName}` : "-" },
            { label: "Project", value: ticket.project?.name ?? "-" },
            { label: "Asset", value: ticket.asset?.assetNumber ?? "-" },
            { label: "Priority", value: formatModuleLabel(ticket.priority) },
            { label: "Queue", value: ticket.queue?.name ?? "-" },
            { label: "Assigned to", value: ticket.assignedTo?.displayName ?? "-" },
            { label: "SLA Status", value: formatModuleLabel(ticket.slaStatus) }
          ]} />
          <div className="flex flex-wrap gap-2">
            <ModuleStatusBadge value={ticket.status} />
            <ModuleStatusBadge value={ticket.slaStatus} />
          </div>
          <p className="text-sm leading-6 text-slate-700">{ticket.description}</p>
        </CardContent>
      </Card>
      {canManageTicket ? (
        <Card className="mt-4">
          <CardHeader><CardTitle>Update Status</CardTitle></CardHeader>
          <CardContent>
            <JsonActionForm
              endpoint={`/api/v1/helpdesk/tickets/${ticket.id}`}
              method="PATCH"
              buttonLabel="Save Ticket"
              fields={[
                { name: "status", label: "Status", type: "select", options: Object.values(HelpdeskTicketStatus).map((value) => ({ id: value, label: value.replaceAll("_", " ") })), defaultValue: ticket.status },
                { name: "priority", label: "Priority", type: "select", options: Object.values(HelpdeskPriority).map((value) => ({ id: value, label: formatModuleLabel(value) })), defaultValue: ticket.priority },
                { name: "queueId", label: "Queue", type: "select", options: queues.map((queue) => ({ id: queue.id, label: queue.name })), defaultValue: ticket.queueId ?? "" },
                { name: "assignedToId", label: "Assigned to", type: "select", options: users.map((user) => ({ id: user.id, label: user.displayName })), defaultValue: ticket.assignedToId ?? "" },
                { name: "title", label: "Title", defaultValue: ticket.title, required: true },
                { name: "description", label: "Description", type: "textarea", defaultValue: ticket.description, required: true }
              ]}
              errorMessage="You do not have permission to perform this action."
            />
            <div className="mt-4 flex flex-wrap gap-2">
              <div className="min-w-[320px] rounded-lg border border-slate-200 p-3">
                <p className="mb-2 text-sm font-medium text-slate-900">Resolve ticket</p>
                <JsonActionForm
                  endpoint={`/api/v1/helpdesk/tickets/${ticket.id}`}
                  method="PATCH"
                  buttonLabel="Resolve Ticket"
                  fixed={{ status: "resolved" }}
                  fields={[
                    {
                      name: "resolutionNote",
                      label: "Resolution note",
                      type: "textarea",
                      required: true,
                      placeholder: "Summarise what was fixed or confirmed."
                    }
                  ]}
                  errorMessage="Unable to resolve ticket. Please add a resolution note and try again."
                />
              </div>
              <JsonActionButton endpoint={`/api/v1/helpdesk/tickets/${ticket.id}`} method="PATCH" body={{ status: "closed" }} label="Close Ticket" variant="secondary" errorMessage="Unable to close ticket. Please refresh and try again." />
              <JsonActionButton endpoint={`/api/v1/helpdesk/tickets/${ticket.id}`} method="PATCH" body={{ status: "in_progress" }} label="Reopen Ticket" variant="secondary" errorMessage="Unable to reopen ticket. Please refresh and try again." />
              {ticket.projectId ? <JsonActionButton endpoint={`/api/v1/helpdesk/tickets/${ticket.id}/project-issue`} method="POST" label="Create Project Issue" variant="secondary" errorMessage="Unable to create project issue. Please try again or contact an administrator." /> : null}
              <Link href={`/field-services/bookings/new?helpdeskTicketId=${ticket.id}`} className="inline-flex h-10 items-center rounded-md bg-brand-700 px-4 text-sm font-medium text-white">Create Field Booking</Link>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Bookings created from this ticket inherit the linked account, project and ticket summary where available, then link back to this record automatically.
            </p>
          </CardContent>
        </Card>
      ) : null}
      <Card className="mt-4">
        <CardHeader><CardTitle>Add Comment</CardTitle></CardHeader>
        <CardContent>
          <JsonActionForm
            endpoint={`/api/v1/helpdesk/tickets/${ticket.id}/comments`}
            buttonLabel="Add Comment"
            fields={[
              { name: "visibility", label: "Visibility", type: "select", options: Object.values(HelpdeskCommentVisibility).map((value) => ({ id: value, label: value.replaceAll("_", " ") })), defaultValue: HelpdeskCommentVisibility.internal },
              { name: "body", label: "Comment", type: "textarea", required: true }
            ]}
            errorMessage="You do not have permission to perform this action."
          />
        </CardContent>
      </Card>
      <Card className="mt-4">
        <CardHeader><CardTitle>Attachments</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <MultipartActionForm
            endpoint={`/api/v1/helpdesk/tickets/${ticket.id}/attachments`}
            buttonLabel="Upload File"
            errorMessage="Unable to upload attachment. Please check the file type and size."
            fields={[{ name: "file", label: "Attachment", required: true, accept: ".pdf,.png,.jpg,.jpeg,.csv,.txt,.docx,.xlsx,.pptx" }]}
          />
          <div className="space-y-2 text-sm text-slate-700">
            {attachments.length ? attachments.map((attachment) => (
              <div key={attachment.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-900">{attachment.fileName}</p>
                    <p className="text-xs text-slate-500">{formatModuleDate(attachment.uploadedAt)} · {attachment.fileType ?? "File"}</p>
                  </div>
                  <a href={`/api/v1/helpdesk/tickets/${ticket.id}/attachments/${attachment.id}/download`} className="font-medium text-brand-700">Download</a>
                </div>
              </div>
            )) : <p>No attachments uploaded yet.</p>}
          </div>
        </CardContent>
      </Card>
      <Card className="mt-4">
        <CardHeader><CardTitle>Linked Records</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-700">
          <p>Account: {ticket.account ? <Link href={`/crm/accounts/${ticket.account.id}`} className="font-medium text-brand-700">{ticket.account.name}</Link> : "-"}</p>
          <p>Project: {ticket.project ? <Link href={`/projects/${ticket.project.id}`} className="font-medium text-brand-700">{ticket.project.projectNumber}</Link> : "-"}</p>
          <p>Asset: {ticket.asset ? <Link href={`/assets/${ticket.asset.id}`} className="font-medium text-brand-700">{ticket.asset.assetNumber}</Link> : "-"}</p>
          <p>Field bookings: {ticket.resourceBookings.length ? ticket.resourceBookings.map((booking) => <Link key={booking.id} href={`/field-services/bookings/${booking.id}`} className="mr-3 font-medium text-brand-700">{booking.title}</Link>) : "No linked bookings."}</p>
        </CardContent>
      </Card>
      <Card className="mt-4">
        <CardHeader><CardTitle>Activity</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {ticket.comments.map((comment) => <div key={comment.id} className="rounded-lg border border-slate-200 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><span className="text-sm font-medium text-slate-900">{comment.author?.displayName ?? "Unknown user"}</span><span className="text-xs text-slate-500">{formatModuleDate(comment.createdAt)} · {formatModuleLabel(comment.visibility)}</span></div><p className="mt-2 text-sm text-slate-700">{comment.body}</p></div>)}
        </CardContent>
      </Card>
      <AuditPanel module="helpdesk" entityType="HelpdeskTicket" entityId={ticket.id} />
    </AppShell>
  );
}
