import { AuditPanel } from "@/components/audit/audit-panel";
import { AccessDenied } from "@/components/auth/access-denied";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCrmPageContext } from "@/modules/crm/ui/crm-page-context";
import { getSupplier } from "@/modules/procurement/procurement-service";
import { ModuleDetailGrid } from "@/modules/operations/ui/module-ui";
import Link from "next/link";

type Params = { params: Promise<{ id: string }> };

export default async function SupplierDetailPage({ params }: Params) {
  const { context, userName } = await getCrmPageContext();
  const { id } = await params;
  let supplier: Awaited<ReturnType<typeof getSupplier>> | null = null;
  try {
    supplier = await getSupplier(context, id);
  } catch (error) {
    if (!(error instanceof Error) || !error.message.startsWith("Missing permission")) throw error;
  }
  if (!supplier) return <AppShell title="Supplier" userName={userName}><AccessDenied /></AppShell>;

  return (
    <AppShell title={supplier.name} userName={userName}>
      <div className="mb-4 flex justify-end">
        <Link href={`/procurement/suppliers/${supplier.id}/edit`}><Button>Edit Supplier</Button></Link>
      </div>
      <Card>
        <CardHeader><CardTitle>Supplier Summary</CardTitle></CardHeader>
        <CardContent>
          <ModuleDetailGrid items={[
            { label: "Name", value: supplier.name },
            { label: "Account", value: supplier.account?.name ?? "-" },
            { label: "Contact", value: supplier.contactName ?? "-" },
            { label: "Email", value: supplier.email ?? "-" },
            { label: "Phone", value: supplier.phone ?? "-" },
            { label: "Account manager", value: supplier.accountManager ?? "-" },
            { label: "Payment terms", value: supplier.paymentTerms ?? "-" },
            { label: "Categories supplied", value: supplier.categoriesSupplied ?? "-" },
            { label: "Currency", value: supplier.defaultCurrency },
            { label: "Status", value: supplier.active ? "Active" : "Inactive" }
          ]} />
        </CardContent>
      </Card>
      <AuditPanel module="procurement" entityType="Supplier" entityId={supplier.id} />
    </AppShell>
  );
}
