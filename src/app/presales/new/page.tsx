import { AppShell } from "@/components/layout/app-shell";
import { getCrmPageContext } from "@/modules/crm/ui/crm-page-context";
import { getPresalesCreateOptions } from "@/modules/presales/presales-service";
import { PresalesCreateForm } from "@/modules/presales/ui/presales-create-form";

type PageProps = { searchParams: Promise<{ opportunityId?: string; quoteId?: string }> };

export default async function NewPresalesRequestPage({ searchParams }: PageProps) {
  const { context, userName } = await getCrmPageContext();
  const params = await searchParams;
  const options = await getPresalesCreateOptions(context);
  return (
    <AppShell title="New Pre-Sales Request" userName={userName}>
      <div className="mb-4 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
        Create the request first, then upload files from the request detail page.
      </div>
      <PresalesCreateForm {...options} selectedOpportunityId={params.opportunityId} selectedQuoteId={params.quoteId} />
    </AppShell>
  );
}
