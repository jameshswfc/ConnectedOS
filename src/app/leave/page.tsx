import Link from "next/link";
import { AccessDenied } from "@/components/auth/access-denied";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCrmPageContext } from "@/modules/crm/ui/crm-page-context";
import { listLeaveRequests } from "@/modules/leave/leave-service";
import { ModuleMetricCard, ModuleStatusBadge, formatModuleDate, formatModuleLabel, formatModuleNumber } from "@/modules/operations/ui/module-ui";

export default async function LeavePage() {
  const { context, userName } = await getCrmPageContext();
  let requests: Awaited<ReturnType<typeof listLeaveRequests>> | null = null;
  try {
    requests = await listLeaveRequests(context);
  } catch (error) {
    if (!(error instanceof Error) || !error.message.startsWith("Missing permission")) throw error;
  }
  if (!requests) return <AppShell title="Leave" userName={userName}><AccessDenied /></AppShell>;
  const approved = requests.filter((request) => request.status === "approved");
  const submitted = requests.filter((request) => request.status === "submitted");
  return (
    <AppShell title="Leave" userName={userName}>
      <div className="mb-4 flex flex-wrap justify-between gap-2">
        <div className="flex gap-2">
          <Link href="/leave/new"><Button>Request Leave</Button></Link>
          <Link href="/leave/calendar"><Button variant="secondary">Calendar</Button></Link>
          <Link href="/leave/approvals"><Button variant="secondary">Approvals</Button></Link>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <ModuleMetricCard title="Total requests" value={requests.length} />
        <ModuleMetricCard title="Pending approval" value={submitted.length} />
        <ModuleMetricCard title="Approved leave" value={approved.length} />
        <ModuleMetricCard title="Approved days" value={formatModuleNumber(approved.reduce((sum, request) => sum + Number(request.workingDays), 0))} />
      </div>
      <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <Table><TableHeader><TableRow><TableHead>User</TableHead><TableHead>Type</TableHead><TableHead>Dates</TableHead><TableHead>Working Days</TableHead><TableHead>Status</TableHead><TableHead>Approver</TableHead></TableRow></TableHeader><TableBody>
          {requests.map((request) => <TableRow key={request.id}><TableCell>{request.user.displayName}</TableCell><TableCell>{formatModuleLabel(request.leaveType)}</TableCell><TableCell><Link href={`/leave/${request.id}`} className="font-medium text-brand-700">{formatModuleDate(request.startDate)} - {formatModuleDate(request.endDate)}</Link></TableCell><TableCell>{formatModuleNumber(request.workingDays)}</TableCell><TableCell><ModuleStatusBadge value={request.status} /></TableCell><TableCell>{request.approver?.displayName ?? "-"}</TableCell></TableRow>)}
        </TableBody></Table>
      </div>
    </AppShell>
  );
}
