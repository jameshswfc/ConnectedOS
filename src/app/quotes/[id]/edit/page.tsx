import { AppShell } from "@/components/layout/app-shell";
import { getCrmPageContext } from "@/modules/crm/ui/crm-page-context";
import { getQuote } from "@/modules/quoting/quotes/quote-service";
import { QuotingJsonForm } from "@/modules/quoting/ui/quoting-client-forms";

type PageProps = { params: Promise<{ id: string }> };

export default async function EditQuotePage({ params }: PageProps) {
  const { context, userName } = await getCrmPageContext();
  const { id } = await params;
  const quote = await getQuote(context, id);
  return (
    <AppShell title={`Edit ${quote.quoteNumber}`} userName={userName}>
      <QuotingJsonForm
        action={`/api/v1/quotes/${quote.id}`}
        redirectTo={`/quotes/${quote.id}`}
        method="PATCH"
        submitLabel="Save Quote"
        defaultValues={{
          title: quote.title,
          projectName: quote.projectName,
          preparedDate: quote.preparedDate ? quote.preparedDate.toISOString().slice(0, 10) : undefined,
          highLevelScope: quote.highLevelScope
        }}
        fields={[
          { name: "title", label: "Title", required: true },
          { name: "projectName", label: "Project Name" },
          { name: "preparedDate", label: "Prepared Date", type: "date" },
          { name: "highLevelScope", label: "High Level Scope", type: "textarea", required: true }
        ]}
      />
    </AppShell>
  );
}
