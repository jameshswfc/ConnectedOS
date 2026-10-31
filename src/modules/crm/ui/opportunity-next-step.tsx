import Link from "next/link";
import { CheckCircle2, CircleAlert } from "lucide-react";
import { opportunityGuidance } from "@/modules/work/work-queue-service";

type Readiness = { primaryContactId: string | null; expectedCloseDate: Date | null; nextActionDate: Date | null; stage: string; status: string };
export function opportunityReadiness(opportunity: Readiness) {
  return [
    { label: "Customer contact", ready: Boolean(opportunity.primaryContactId) },
    { label: "Expected decision date", ready: Boolean(opportunity.expectedCloseDate) },
    { label: "Next follow-up", ready: Boolean(opportunity.nextActionDate) }
  ];
}
export function OpportunityNextStep({ opportunity, canEdit }: { opportunity: Readiness & { id: string }; canEdit: boolean }) {
  return <section aria-label="Opportunity next step" className="mb-5 border-l-4 border-gold-500 bg-white p-4">
    <h2 className="text-base font-semibold text-brand-900">Next step</h2>
    <p className="mt-1 text-sm text-slate-700">{opportunityGuidance(opportunity.stage)}</p>
    {opportunity.status === "open" ? <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2">{opportunityReadiness(opportunity).map((item) => <li key={item.label} className="flex items-center gap-2 text-sm">{item.ready ? <CheckCircle2 className="h-4 w-4 text-green-700" aria-hidden="true" /> : <CircleAlert className="h-4 w-4 text-amber-700" aria-hidden="true" />}{item.label}: {item.ready ? "Recorded" : "Needed"}</li>)}</ul> : null}
    {canEdit && opportunity.status === "open" ? <Link href={`/crm/opportunities/${opportunity.id}/edit`} className="mt-3 inline-block text-sm font-semibold text-brand-700 hover:underline">Update qualification and follow-up</Link> : null}
  </section>;
}
