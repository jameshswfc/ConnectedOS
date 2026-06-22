import Link from "next/link";
import { AccessDenied } from "@/components/auth/access-denied";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCrmPageContext } from "@/modules/crm/ui/crm-page-context";
import { listSuppliers } from "@/modules/procurement/procurement-service";

export default async function SuppliersPage() {
  const { context, userName } = await getCrmPageContext();
  let suppliers: Awaited<ReturnType<typeof listSuppliers>> | null = null;
  try {
    suppliers = await listSuppliers(context);
  } catch (error) {
    if (!(error instanceof Error) || !error.message.startsWith("Missing permission")) throw error;
  }
  if (!suppliers) return <AppShell title="Suppliers" userName={userName}><AccessDenied /></AppShell>;
  return (
    <AppShell title="Suppliers" userName={userName}>
      <div className="mb-4 flex justify-end"><Link href="/procurement/suppliers/new"><Button>Create Supplier</Button></Link></div>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Account</TableHead><TableHead>Contact</TableHead><TableHead>Email</TableHead><TableHead>Phone</TableHead><TableHead>Account Manager</TableHead><TableHead>Categories</TableHead><TableHead>Active</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader><TableBody>
          {suppliers.map((supplier) => <TableRow key={supplier.id}><TableCell><Link href={`/procurement/suppliers/${supplier.id}`} className="font-medium text-brand-700">{supplier.name}</Link></TableCell><TableCell>{supplier.account?.name ?? "-"}</TableCell><TableCell>{supplier.contactName ?? "-"}</TableCell><TableCell>{supplier.email ?? "-"}</TableCell><TableCell>{supplier.phone ?? "-"}</TableCell><TableCell>{supplier.accountManager ?? "-"}</TableCell><TableCell>{supplier.categoriesSupplied ?? "-"}</TableCell><TableCell>{supplier.active ? "Yes" : "No"}</TableCell><TableCell><Link href={`/procurement/suppliers/${supplier.id}/edit`} className="font-medium text-brand-700">Edit</Link></TableCell></TableRow>)}
        </TableBody></Table>
      </div>
    </AppShell>
  );
}
