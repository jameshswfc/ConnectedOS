import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCrmPageContext } from "@/modules/crm/ui/crm-page-context";
import { getPresalesMyWork } from "@/modules/presales/presales-service";
import { formatPresalesDate, PresalesRagBadge, PresalesStatusBadge, presalesPriorityLabel, presalesTypeLabel } from "@/modules/presales/ui/presales-format";

export default async function PresalesMyWorkPage() {
  const { context, userName } = await getCrmPageContext();
  const dashboard = await getPresalesMyWork(context);
  return (
    <AppShell title="My Pre-Sales Work" userName={userName}>
      <div className="grid gap-4 md:grid-cols-4">
        <Metric title="Assigned To Me" value={dashboard.assignedToMe} />
        <Metric title="Due Today" value={dashboard.dueToday} />
        <Metric title="Due This Week" value={dashboard.dueThisWeek} />
        <Metric title="Overdue" value={dashboard.overdue} />
      </div>
      <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <Table>
          <TableHeader><TableRow><TableHead>Request</TableHead><TableHead>Account</TableHead><TableHead>Type</TableHead><TableHead>Priority</TableHead><TableHead>Status</TableHead><TableHead>Deadline</TableHead><TableHead>RAG</TableHead></TableRow></TableHeader>
          <TableBody>{dashboard.requests.map((request) => <TableRow key={request.id}><TableCell><Link href={`/presales/${request.id}`} className="font-medium text-brand-700">{request.requestNumber}</Link></TableCell><TableCell>{request.account.name}</TableCell><TableCell>{presalesTypeLabel(request.requestType)}</TableCell><TableCell>{presalesPriorityLabel(request.priority)}</TableCell><TableCell><PresalesStatusBadge status={request.status} /></TableCell><TableCell>{formatPresalesDate(request.internalDeadline)}</TableCell><TableCell><PresalesRagBadge status={request.ragStatus} /></TableCell></TableRow>)}</TableBody>
        </Table>
      </div>
    </AppShell>
  );
}

function Metric({ title, value }: { title: string; value: number }) {
  return <Card><CardHeader><CardTitle className="text-sm">{title}</CardTitle></CardHeader><CardContent className="text-2xl font-semibold text-brand-900">{value}</CardContent></Card>;
}

