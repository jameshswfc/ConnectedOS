import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCrmPageContext } from "@/modules/crm/ui/crm-page-context";
import { evaluateQuoteVersionApprovalRules } from "@/modules/quoting/quotes/quote-approval-service";
import { getQuoteVersion } from "@/modules/quoting/quotes/quote-service";
import { formatQuoteMoney, formatQuotePercent, formatQuoteQuantity, labelFromQuoteValue } from "@/modules/quoting/ui/quote-format";
import { QuoteLineActions } from "@/modules/quoting/ui/quote-line-actions";
import { QuoteLineBuilder } from "@/modules/quoting/ui/quote-line-builder";
import { QuoteExportButtons } from "@/modules/quoting/ui/quote-export-buttons";
import { QuoteTermsEditor } from "@/modules/quoting/ui/quote-terms-editor";

type PageProps = { params: Promise<{ id: string; versionId: string }> };

export default async function QuoteVersionBuilderPage({ params }: PageProps) {
  const { context, userName } = await getCrmPageContext();
  const { id, versionId } = await params;
  const [version, triggeredRules] = await Promise.all([getQuoteVersion(context, versionId), evaluateQuoteVersionApprovalRules(versionId)]);
  return (
    <AppShell title={`${version.quote.quoteNumber} Version ${version.versionNumber}`} userName={userName}>
      <div className="mb-4"><Link href={`/quotes/${version.quoteId}`} className="font-medium text-brand-700">Back to quote</Link></div>
      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <div className="space-y-5">
          <Card><CardHeader><CardTitle>Totals</CardTitle></CardHeader><CardContent className="grid gap-3 text-sm md:grid-cols-4"><p>Cost: {formatQuoteMoney(version.costTotal)}</p><p>Sell: {formatQuoteMoney(version.sellTotal)}</p><p>Margin: {formatQuoteMoney(version.marginTotal)}</p><p>Margin %: {formatQuotePercent(version.marginPercent)}</p></CardContent></Card>
          <Card><CardHeader><CardTitle>Approval and Exports</CardTitle></CardHeader><CardContent className="space-y-3 text-sm">{version.isLocked ? <p className="font-medium text-slate-700">This approved version is locked. Create a new version to make changes.</p> : null}{triggeredRules.length ? <ul className="list-disc pl-4 text-amber-800">{triggeredRules.map((rule) => <li key={rule.ruleType}>{rule.label}</li>)}</ul> : <p>No approval rules currently triggered.</p>}<div className="space-y-2"><p className="font-medium text-slate-700">Exports</p><QuoteExportButtons quoteId={id} versionId={version.id} /></div></CardContent></Card>
          {version.isLocked ? null : <QuoteTermsEditor versionId={version.id} terms={version.terms} />}
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white"><Table><TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Description</TableHead><TableHead>Qty</TableHead><TableHead>Unit Cost</TableHead><TableHead>Unit Sell</TableHead><TableHead>Sell Total</TableHead><TableHead>Margin</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader><TableBody>{version.lines.map((line) => <TableRow key={line.id}><TableCell>{labelFromQuoteValue(line.lineType)}</TableCell><TableCell>{line.description}</TableCell><TableCell>{formatQuoteQuantity(line.quantity)}</TableCell><TableCell>{formatQuoteMoney(line.unitCost)}</TableCell><TableCell>{formatQuoteMoney(line.unitSell)}</TableCell><TableCell>{formatQuoteMoney(line.sellTotal)}</TableCell><TableCell>{formatQuotePercent(line.marginPercent)}</TableCell><TableCell>{version.isLocked ? "-" : <QuoteLineActions line={{ id: line.id, description: line.description, quantity: Number(line.quantity), unitCost: Number(line.unitCost), unitSell: Number(line.unitSell) }} />}</TableCell></TableRow>)}</TableBody></Table></div>
        </div>
        {version.isLocked ? null : <QuoteLineBuilder versionId={version.id} />}
      </div>
    </AppShell>
  );
}
