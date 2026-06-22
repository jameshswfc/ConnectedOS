import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCrmPageContext } from "@/modules/crm/ui/crm-page-context";
import { listPriceImports } from "@/modules/quoting/price-imports/price-import-service";
import { labelFromQuoteValue } from "@/modules/quoting/ui/quote-format";
import { PriceImportForm } from "@/modules/quoting/ui/price-import-form";

type ImportSummary = {
  skippedRows?: number;
  firstErrors?: string[];
  errorsTruncated?: boolean;
  notes?: string[];
};

export default async function PriceImportsPage() {
  const { context, userName } = await getCrmPageContext();
  const imports = await listPriceImports(context);
  return (
    <AppShell title="Price Imports" userName={userName}>
      <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
        <PriceImportForm />
        <div className="space-y-4">
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white"><Table><TableHeader><TableRow><TableHead>Filename</TableHead><TableHead>Supplier</TableHead><TableHead>Status</TableHead><TableHead>Rows</TableHead><TableHead>Success</TableHead><TableHead>Failed</TableHead><TableHead>Uploaded By</TableHead></TableRow></TableHeader><TableBody>{imports.map((item) => <TableRow key={item.id}><TableCell>{item.filename}</TableCell><TableCell>{item.supplier ?? "-"}</TableCell><TableCell>{labelFromQuoteValue(item.status)}</TableCell><TableCell>{item.rowCount}</TableCell><TableCell>{item.successfulRows}</TableCell><TableCell>{item.failedRows}</TableCell><TableCell>{item.uploadedBy.displayName}</TableCell></TableRow>)}</TableBody></Table></div>
          <Card><CardHeader><CardTitle>Import Summary</CardTitle></CardHeader><CardContent className="space-y-4 text-sm text-slate-700">{imports.some((item) => item.errorSummary) ? imports.filter((item) => item.errorSummary).map((item) => {
            const summary = item.errorSummary as ImportSummary | null;
            return (
              <div key={item.id} className="rounded-md border border-slate-200 p-3">
                <p className="font-medium">{item.filename}</p>
                <p className="mt-1">Total rows read: {item.rowCount} | Imported: {item.successfulRows} | Skipped: {summary?.skippedRows ?? 0} | Failed: {item.failedRows}</p>
                {summary?.notes?.length ? <div className="mt-2 rounded bg-amber-50 p-2 text-amber-800">{summary.notes.map((note) => <p key={note}>{note}</p>)}</div> : null}
                {summary?.firstErrors?.length ? <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">{summary.firstErrors.map((error) => <li key={error}>{error}</li>)}</ul> : null}
                {summary?.errorsTruncated ? <p className="mt-2 text-xs text-slate-500">Showing first 20 errors. Full error details are stored in import history.</p> : null}
              </div>
            );
          }) : "No import errors recorded."}</CardContent></Card>
        </div>
      </div>
    </AppShell>
  );
}
