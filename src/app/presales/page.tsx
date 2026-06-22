import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCrmPageContext } from "@/modules/crm/ui/crm-page-context";
import { getPresalesDashboard } from "@/modules/presales/presales-service";
import {
  formatPresalesDate,
  PresalesRagBadge,
  PresalesSlaBadge,
  PresalesStatusBadge,
  presalesCategoryLabel,
  presalesCommercialPriorityLabel,
  presalesPriorityLabel,
  presalesTypeLabel
} from "@/modules/presales/ui/presales-format";

export default async function PresalesPage() {
  const { context, userName } = await getCrmPageContext();
  const dashboard = await getPresalesDashboard(context);
  return (
    <AppShell title="Pre-Sales" userName={userName}>
      <div className="mb-4 flex flex-wrap justify-end gap-2"><Link href="/presales/my-work"><Button variant="secondary">My Work</Button></Link><Link href="/presales/new"><Button>New Request</Button></Link></div>
      <div className="grid gap-4 md:grid-cols-5">
        <Metric title="Assigned Requests" value={dashboard.assignedRequests} />
        <Metric title="Unassigned Requests" value={dashboard.unassignedRequests} />
        <Metric title="Open Requests" value={dashboard.openRequests} />
        <Metric title="Due This Week" value={dashboard.dueThisWeek} />
        <Metric title="Overdue" value={dashboard.overdue} />
        <Metric title="Awaiting Customer" value={dashboard.awaitingCustomer} />
        <Metric title="Internal Review" value={dashboard.internalReview} />
        <Metric title="Completed This Month" value={dashboard.completedThisMonth} />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Requests by Engineer</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {dashboard.requestsByEngineer.map((item) => <p key={item.engineerId} className="flex justify-between rounded-md border border-slate-200 px-3 py-2"><span>{item.engineer}</span><span>{item.total} total</span></p>)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Workload by Engineer</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {dashboard.requestsByEngineer.map((item) => <p key={item.engineerId} className="flex justify-between rounded-md border border-slate-200 px-3 py-2"><span>{item.engineer}</span><span>{item.open} open</span></p>)}
          </CardContent>
        </Card>
      </div>
      <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <Table>
          <TableHeader><TableRow><TableHead>Request</TableHead><TableHead>Account</TableHead><TableHead>Opportunity</TableHead><TableHead>Quote</TableHead><TableHead>Category</TableHead><TableHead>Type</TableHead><TableHead>Priority</TableHead><TableHead>Commercial</TableHead><TableHead>Status</TableHead><TableHead>Engineer</TableHead><TableHead>Deadline</TableHead><TableHead>RAG</TableHead></TableRow></TableHeader>
          <TableBody>{dashboard.requests.map((request) => <TableRow key={request.id}><TableCell><Link href={`/presales/${request.id}`} className="font-medium text-brand-700">{request.requestNumber}</Link></TableCell><TableCell>{request.account.name}</TableCell><TableCell>{request.opportunity?.opportunityName ?? "-"}</TableCell><TableCell>{request.quote?.quoteNumber ?? "-"}</TableCell><TableCell>{presalesCategoryLabel(request.requestCategory)}</TableCell><TableCell>{presalesTypeLabel(request.requestType)}</TableCell><TableCell>{presalesPriorityLabel(request.priority)}</TableCell><TableCell>{presalesCommercialPriorityLabel(request.commercialPriority)}</TableCell><TableCell><PresalesStatusBadge status={request.status} /></TableCell><TableCell>{request.assignedTo?.displayName ?? "Unassigned"}</TableCell><TableCell><PresalesSlaBadge status={request.slaStatus} /> <span className="ml-1">{formatPresalesDate(request.internalDeadline)}</span></TableCell><TableCell><PresalesRagBadge status={request.ragStatus} /></TableCell></TableRow>)}</TableBody>
        </Table>
      </div>
    </AppShell>
  );
}

function Metric({ title, value }: { title: string; value: number }) {
  return <Card><CardHeader><CardTitle className="text-sm">{title}</CardTitle></CardHeader><CardContent className="text-2xl font-semibold text-brand-900">{value}</CardContent></Card>;
}
