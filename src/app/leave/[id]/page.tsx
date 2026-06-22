import { AuditPanel } from "@/components/audit/audit-panel";
import { AccessDenied } from "@/components/auth/access-denied";
import { JsonActionButton } from "@/components/forms/json-action-form";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCrmPageContext } from "@/modules/crm/ui/crm-page-context";
import { getLeaveRequest } from "@/modules/leave/leave-service";
import { LeaveRejectAction } from "@/modules/leave/ui/leave-reject-action";
import { ModuleDetailGrid, ModuleStatusBadge, formatModuleDate, formatModuleLabel, formatModuleNumber } from "@/modules/operations/ui/module-ui";

type Params = { params: Promise<{ id: string }> };

export default async function LeaveRequestDetailPage({ params }: Params) {
  const { context, userName } = await getCrmPageContext();
  const { id } = await params;
  let request: Awaited<ReturnType<typeof getLeaveRequest>> | null = null;
  try {
    request = await getLeaveRequest(context, id);
  } catch (error) {
    if (!(error instanceof Error) || !error.message.startsWith("Missing permission")) throw error;
  }
  if (!request) return <AppShell title="Leave Request" userName={userName}><AccessDenied /></AppShell>;

  return (
    <AppShell title="Leave Request" userName={userName}>
      <Card>
        <CardHeader><CardTitle>{request.user.displayName}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <ModuleDetailGrid items={[
            { label: "Type", value: formatModuleLabel(request.leaveType) },
            { label: "Start", value: formatModuleDate(request.startDate) },
            { label: "End", value: formatModuleDate(request.endDate) },
            { label: "Working days", value: formatModuleNumber(request.workingDays) },
            { label: "Approver", value: request.approver?.displayName ?? "-" },
            { label: "Reason", value: request.reason ?? "-" }
          ]} />
          <div className="flex flex-wrap gap-2">
            <ModuleStatusBadge value={request.status} />
            {request.status === "draft" ? <JsonActionButton endpoint={`/api/v1/leave-requests/${request.id}/submit`} method="POST" label="Submit Leave" errorMessage="Unable to submit leave request. Please refresh and try again." /> : null}
            {request.status === "submitted" ? <JsonActionButton endpoint={`/api/v1/leave-requests/${request.id}/approve`} method="POST" label="Approve" errorMessage="Unable to approve leave request. Please refresh and try again." /> : null}
            {request.status === "submitted" ? <LeaveRejectAction requestId={request.id} /> : null}
          </div>
        </CardContent>
      </Card>
      <AuditPanel module="leave" entityType="LeaveRequest" entityId={request.id} />
    </AppShell>
  );
}
