import { LeaveStatus, LeaveType } from "@prisma/client";
import { AccessDenied } from "@/components/auth/access-denied";
import { JsonActionForm } from "@/components/forms/json-action-form";
import { AppShell } from "@/components/layout/app-shell";
import { getCrmPageContext } from "@/modules/crm/ui/crm-page-context";
import { listUsers } from "@/services/users/user-service";

export default async function NewLeaveRequestPage() {
  const { context, userName } = await getCrmPageContext();
  if (!context.permissions.includes("leave.request") && !context.permissions.includes("leave.approve") && context.permissionLevel !== "administrator") {
    return <AppShell title="Request Leave" userName={userName}><AccessDenied /></AppShell>;
  }
  const users = context.permissions.includes("leave.approve") || context.permissionLevel === "administrator" ? await listUsers(false) : [];
  return (
    <AppShell title="Request Leave" userName={userName}>
      <JsonActionForm
        endpoint="/api/v1/leave-requests"
        buttonLabel="Create Leave Request"
        successHref="/leave"
        errorMessage="Unable to create leave request. Please check the dates and try again."
        fields={[
          ...(users.length > 0 ? [{ name: "userId", label: "User", type: "select" as const, options: users.map((user) => ({ id: user.id, label: user.displayName })) }] : []),
          { name: "leaveType", label: "Leave type", type: "select", required: true, options: Object.values(LeaveType).map((value) => ({ id: value, label: value.replaceAll("_", " ") })) },
          { name: "status", label: "Status", type: "select", options: Object.values(LeaveStatus).map((value) => ({ id: value, label: value.replaceAll("_", " ") })), defaultValue: LeaveStatus.draft },
          { name: "startDate", label: "Start date", type: "date", required: true },
          { name: "endDate", label: "End date", type: "date", required: true },
          { name: "reason", label: "Reason", type: "textarea" }
        ]}
      />
    </AppShell>
  );
}
