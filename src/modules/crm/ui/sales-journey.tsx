import Link from "next/link";
import { ArrowRight, CheckCircle2, Circle } from "lucide-react";
import { labelFromValue } from "@/modules/crm/ui/crm-format";

type RecordLink = { id: string; label: string; status: string; href: string };
export type SalesJourneyStep = { title: string; records: RecordLink[]; emptyLabel: string; action?: { label: string; href: string } };

export function SalesJourney({ steps }: { steps: SalesJourneyStep[] }) {
  return <section aria-label="Sales to project journey" className="mb-6 border-y border-brand-100 py-5">
    <h2 className="mb-4 text-lg font-semibold text-brand-900">Sales to Project</h2>
    <ol className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
      {steps.map((step, index) => <li key={step.title} className="min-w-0">
        <h3 className="mb-2 flex items-center gap-2 font-semibold text-slate-900"><span className="text-brand-700">{index + 1}.</span>{step.title}</h3>
        {step.records.length ? <ul className="space-y-2">{step.records.map((record) => <li key={record.id} className="text-sm">
          <Link href={record.href} className="break-words font-medium text-brand-700 hover:underline">{record.label}</Link>
          <span className="mt-1 flex items-center gap-1 text-xs text-slate-600">{["complete", "completed", "accepted", "closed", "converted"].includes(record.status) ? <CheckCircle2 aria-hidden="true" className="h-3 w-3 text-green-700" /> : <Circle aria-hidden="true" className="h-3 w-3" />}{labelFromValue(record.status)}</span>
        </li>)}</ul> : <p className="text-sm text-slate-500">{step.emptyLabel}</p>}
        {step.action ? <Link href={step.action.href} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline">{step.action.label}<ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" /></Link> : null}
      </li>)}
    </ol>
  </section>;
}
