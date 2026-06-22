import { AccessDenied } from "@/components/auth/access-denied";
import { JsonActionButton } from "@/components/forms/json-action-form";
import { AppShell } from "@/components/layout/app-shell";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCrmPageContext } from "@/modules/crm/ui/crm-page-context";
import { listLeaveRequests } from "@/modules/leave/leave-service";
import { LeaveRejectAction } from "@/modules/leave/ui/leave-reject-action";
import { ModuleStatusBadge, formatModuleDate, formatModuleLabel, formatModuleNumber } from "@/modules/operations/ui/module-ui";

export default async function LeaveApprovalsPage() {
  const { context, userName } = await getCrmPageContext();
  let requests: Awaited<ReturnType<typeof listLeaveRequests>> | null = null;
  try {
    requests = await listLeaveRequests(context);
  } catch (error) {
    if (!(error instanceof Error) || !error.message.startsWith("Missing permission")) throw error;
  }
  if (!requests) return <AppShell title="Leave Approvals" userName={userName}><AccessDenied /></AppShell>;
  const pending = requests.filter((request) => request.status === "submitted");
  return (
    <AppShell title="Leave Approvals" userName={userName}>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <Table><TableHeader><TableRow><TableHead>User</TableHead><TableHead>Type</TableHead><TableHead>Dates</TableHead><TableHead>Days</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader><TableBody>
          {pending.map((request) => <TableRow id={request.id} key={request.id}><TableCell>{request.user.displayName}</TableCell><TableCell>{formatModuleLabel(request.leaveType)}</TableCell><TableCell>{formatModuleDate(request.startDate)} - {formatModuleDate(request.endDate)}</TableCell><TableCell>{formatModuleNumber(request.workingDays)}</TableCell><TableCell><ModuleStatusBadge value={request.status} /></TableCell><TableCell><div className="flex flex-wrap gap-2"><JsonActionButton endpoint={`/api/v1/leave-requests/${request.id}/approve`} method="POST" label="Approve" /><LeaveRejectAction requestId={request.id} compact /></div></TableCell></TableRow>)}
        </TableBody></Table>
      </div>
    </AppShell>
  );
}
