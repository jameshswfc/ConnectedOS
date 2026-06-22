"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type QuoteExportAction = {
  label: string;
  href: string;
};

export function getQuoteExportActions(quoteId: string, versionId: string): QuoteExportAction[] {
  return [
    { label: "Export Quote", href: `/api/v1/quotes/${quoteId}/versions/${versionId}/exports/pdf` },
    { label: "Export Proposal", href: `/api/v1/quotes/${quoteId}/versions/${versionId}/exports/long-proposal-pptx` },
    { label: "Export Quote Excel", href: `/api/v1/quotes/${quoteId}/versions/${versionId}/exports/excel-bom` },
    { label: "Export Internal", href: `/api/v1/quotes/${quoteId}/versions/${versionId}/exports/internal-margin-sheet` }
  ];
}

export function QuoteExportButtons({ quoteId, versionId, className }: { quoteId: string; versionId: string; className?: string }) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {getQuoteExportActions(quoteId, versionId).map((action) => (
        <Button key={action.href} type="button" onClick={() => window.location.assign(action.href)}>
          {action.label}
        </Button>
      ))}
    </div>
  );
}
