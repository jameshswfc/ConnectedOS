import Link from "next/link";
import { z } from "zod";
import { AppShell } from "@/components/layout/app-shell";
import { AccessDenied } from "@/components/auth/access-denied";
import { getCrmPageContext } from "@/modules/crm/ui/crm-page-context";
import { getInvoiceRequestProject } from "@/modules/finance/invoice-request-service";
import { invoiceTriggerOptions } from "@/modules/finance/invoice-request-rules";
import { InvoiceRequestForm } from "@/modules/finance/ui/invoice-request-form";

export default async function NewInvoiceRequest({ searchParams }: { searchParams: Promise<{ projectId?: string }> }) {
  const { context, userName } = await getCrmPageContext();
  const id = z.string().uuid().safeParse((await searchParams).projectId);
  if (!id.success) return <AppShell title="Request invoice" userName={userName}><p>Select a project first.</p><Link className="text-brand-700 underline" href="/projects">Back to Projects</Link></AppShell>;
  let project;
  try { project = await getInvoiceRequestProject(context, id.data); }
  catch (e) { if (e instanceof Error && e.message.startsWith("Missing permission")) return <AppShell title="Request invoice" userName={userName}><AccessDenied /></AppShell>; throw e; }
  const triggers = invoiceTriggerOptions(project);
  return <AppShell title="Request invoice" userName={userName}><h2 className="mb-2 text-xl font-semibold">{project.projectNumber} · {project.name}</h2><p className="mb-6 text-sm text-slate-600">{project.account.name} · Contract value GBP {project.commercialValue.toFixed(2)}</p>{!triggers.length ? <p className="mb-4 text-sm text-amber-800">No completed project stages or milestones are available for invoicing.</p> : null}<InvoiceRequestForm projectId={project.id} triggers={triggers} /></AppShell>;
}
