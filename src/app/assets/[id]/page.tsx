import { AuditPanel } from "@/components/audit/audit-panel";
import { AccessDenied } from "@/components/auth/access-denied";
import { JsonActionForm } from "@/components/forms/json-action-form";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCrmPageContext } from "@/modules/crm/ui/crm-page-context";
import { getAsset } from "@/modules/assets/asset-service";
import { ModuleDetailGrid, ModuleStatusBadge, formatModuleDate, formatModuleLabel } from "@/modules/operations/ui/module-ui";

type Params = { params: Promise<{ id: string }> };
export default async function AssetDetailPage({ params }: Params) {
  const { context, userName } = await getCrmPageContext();
  const { id } = await params;
  let asset: Awaited<ReturnType<typeof getAsset>> | null = null;
  try {
    asset = await getAsset(context, id);
  } catch (error) {
    if (!(error instanceof Error) || !error.message.startsWith("Missing permission")) throw error;
  }
  if (!asset) return <AppShell title="Asset" userName={userName}><AccessDenied /></AppShell>;
  return (
    <AppShell title={asset.assetNumber} userName={userName}>
      <Card>
        <CardHeader><CardTitle>Asset Summary</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <ModuleDetailGrid items={[
            { label: "Description", value: asset.description ?? "-" },
            { label: "Status", value: formatModuleLabel(asset.status) },
            { label: "Project", value: asset.project?.name ?? "-" },
            { label: "Account", value: asset.account?.name ?? "-" },
            { label: "Serial", value: asset.serialNumber ?? "-" },
            { label: "MAC", value: asset.macAddress ?? "-" },
            { label: "Location", value: asset.location ?? "-" },
            { label: "Warranty End", value: formatModuleDate(asset.warrantyEnd) }
          ]} />
          <ModuleStatusBadge value={asset.status} />
        </CardContent>
      </Card>
      <Card className="mt-4">
        <CardHeader><CardTitle>Update Asset</CardTitle></CardHeader>
        <CardContent>
          <JsonActionForm
            endpoint={`/api/v1/assets/${asset.id}`}
            method="PATCH"
            buttonLabel="Save Asset"
            fields={[
              { name: "description", label: "Description", defaultValue: asset.description ?? "" },
              { name: "location", label: "Location", defaultValue: asset.location ?? "" },
              { name: "serialNumber", label: "Serial number", defaultValue: asset.serialNumber ?? "" },
              { name: "macAddress", label: "MAC address", defaultValue: asset.macAddress ?? "" },
              { name: "notes", label: "Notes", type: "textarea", defaultValue: asset.notes ?? "" }
            ]}
          />
        </CardContent>
      </Card>
      <AuditPanel module="assets" entityType="Asset" entityId={asset.id} />
    </AppShell>
  );
}
