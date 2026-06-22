import Link from "next/link";
import { AccessDenied } from "@/components/auth/access-denied";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCrmPageContext } from "@/modules/crm/ui/crm-page-context";
import { listAssets } from "@/modules/assets/asset-service";
import { ModuleStatusBadge, formatModuleDate, formatModuleLabel } from "@/modules/operations/ui/module-ui";

export default async function AssetsPage() {
  const { context, userName } = await getCrmPageContext();
  let assets: Awaited<ReturnType<typeof listAssets>> | null = null;
  try {
    assets = await listAssets(context);
  } catch (error) {
    if (!(error instanceof Error) || !error.message.startsWith("Missing permission")) throw error;
  }
  if (!assets) return <AppShell title="Assets" userName={userName}><AccessDenied /></AppShell>;
  return (
    <AppShell title="Assets" userName={userName}>
      <div className="mb-4 flex justify-end"><Link href="/assets/new"><Button>Create Asset</Button></Link></div>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <Table><TableHeader><TableRow><TableHead>Asset</TableHead><TableHead>Project</TableHead><TableHead>Account</TableHead><TableHead>Status</TableHead><TableHead>Location</TableHead><TableHead>Warranty End</TableHead></TableRow></TableHeader><TableBody>
          {assets.map((asset) => <TableRow key={asset.id}><TableCell><Link href={`/assets/${asset.id}`} className="font-medium text-brand-700">{asset.assetNumber}<br /><span className="text-slate-700">{asset.description ?? asset.sku ?? "-"}</span></Link></TableCell><TableCell>{asset.project?.name ?? "-"}</TableCell><TableCell>{asset.account?.name ?? "-"}</TableCell><TableCell><ModuleStatusBadge value={asset.status} /></TableCell><TableCell>{asset.location ?? "-"}</TableCell><TableCell>{formatModuleDate(asset.warrantyEnd)}</TableCell></TableRow>)}
        </TableBody></Table>
      </div>
    </AppShell>
  );
}
