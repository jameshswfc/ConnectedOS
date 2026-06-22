import { AccessDenied } from "@/components/auth/access-denied";
import { AppShell } from "@/components/layout/app-shell";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCrmPageContext } from "@/modules/crm/ui/crm-page-context";
import { listBillingSchedules } from "@/modules/finance/finance-service";
import { ModuleStatusBadge, formatModuleDate, formatModuleMoney, formatModuleLabel } from "@/modules/operations/ui/module-ui";

export default async function BillingSchedulesPage() {
  const { context, userName } = await getCrmPageContext();
  let schedules: Awaited<ReturnType<typeof listBillingSchedules>> | null = null;
  try {
    schedules = await listBillingSchedules(context);
  } catch (error) {
    if (!(error instanceof Error) || !error.message.startsWith("Missing permission")) throw error;
  }
  if (!schedules) return <AppShell title="Billing Schedules" userName={userName}><AccessDenied /></AppShell>;
  return (
    <AppShell title="Billing Schedules" userName={userName}>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <Table><TableHeader><TableRow><TableHead>Project</TableHead><TableHead>Description</TableHead><TableHead>Trigger</TableHead><TableHead>Amount</TableHead><TableHead>Due</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>
          {schedules.map((schedule) => <TableRow key={schedule.id}><TableCell>{schedule.project.name}</TableCell><TableCell>{schedule.description}</TableCell><TableCell>{formatModuleLabel(schedule.trigger)}</TableCell><TableCell>{formatModuleMoney(schedule.amount)}</TableCell><TableCell>{formatModuleDate(schedule.dueDate)}</TableCell><TableCell><ModuleStatusBadge value={schedule.status} /></TableCell></TableRow>)}
        </TableBody></Table>
      </div>
    </AppShell>
  );
}
