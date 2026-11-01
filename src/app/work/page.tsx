import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { AccessDenied } from "@/components/auth/access-denied";
import { getCrmPageContext } from "@/modules/crm/ui/crm-page-context";
import { labelFromValue } from "@/modules/crm/ui/crm-format";
import { canViewWork, getWorkQueue, prioritiseWork, workAreas, workUrgency } from "@/modules/work/work-queue-service";

export default async function WorkPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { context, userName } = await getCrmPageContext();
  if (!canViewWork(context)) return <AppShell title="Work Queue" userName={userName}><AccessDenied /></AppShell>;
  const params = await searchParams;
  const scope = params.scope === "visible" ? "visible" : "mine";
  const filter = typeof params.area === "string" ? params.area : "all";
  const data = await getWorkQueue(context, scope);
  const items = prioritiseWork(data.items, filter);
  return <AppShell title="Work Queue" userName={userName}>
    <form className="mb-5 flex flex-wrap items-end gap-3">
      <label className="text-sm font-medium">Owner<select name="scope" defaultValue={scope} className="mt-1 block rounded border border-slate-300 bg-white p-2"><option value="mine">Assigned to me</option><option value="visible">All permitted work</option></select></label>
      <label className="text-sm font-medium">View<select name="area" defaultValue={filter} className="mt-1 block rounded border border-slate-300 bg-white p-2"><option value="all">All work</option><option value="attention">Needs attention</option>{Object.entries(workAreas).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
      <button className="rounded bg-brand-700 px-4 py-2 text-sm font-medium text-white">Apply</button>
      <span className="py-2 text-sm text-slate-600">{items.length} items in this view</span>
    </form>
    {data.limitedAreas.length > 0 ? <p className="mb-4 text-sm text-amber-800">Showing the earliest 50 items per area: {data.limitedAreas.join(", ")}. Open the module for the full list.</p> : null}
    <div className="overflow-x-auto border-y border-slate-200 bg-white"><table className="w-full min-w-[820px] text-left text-sm"><thead className="bg-slate-50 text-slate-600"><tr>{["Priority", "Work", "Customer", "Owner", "Due", "Next action"].map((label) => <th key={label} className="p-3 font-medium">{label}</th>)}</tr></thead><tbody>
      {items.map((item) => <tr key={`${item.area}-${item.id}`} className="border-t border-slate-100 align-top"><td className="p-3"><span className={item.blocked || workUrgency(item) === "Overdue" ? "font-medium text-red-700" : "text-slate-600"}>{workUrgency(item)}</span></td><td className="max-w-xs p-3"><Link className="font-semibold text-brand-700 hover:underline" href={item.href}>{item.title}</Link><p className="mt-1 text-xs text-slate-500">{workAreas[item.area]} · {labelFromValue(item.status)}</p></td><td className="p-3">{item.customer}</td><td className="p-3">{item.owner}</td><td className="whitespace-nowrap p-3">{item.due ? new Date(item.due).toLocaleDateString("en-GB", { timeZone: "UTC" }) : "Not set"}</td><td className="max-w-xs p-3"><Link href={item.href} className="inline-flex items-start gap-2 text-brand-700">{item.nextAction}<ArrowRight className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /></Link></td></tr>)}
      {!items.length ? <tr><td colSpan={6} className="p-8 text-center text-slate-500">No open work matches this view.</td></tr> : null}
    </tbody></table></div>
  </AppShell>;
}
