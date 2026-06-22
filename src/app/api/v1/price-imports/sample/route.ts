import { samplePriceImportCsv } from "@/modules/quoting/price-imports/price-import-parser";

export async function GET() {
  return new Response(samplePriceImportCsv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=\"connectedos-catalogue-import-sample.csv\""
    }
  });
}
