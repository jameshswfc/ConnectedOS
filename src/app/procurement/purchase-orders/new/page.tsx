import { AccessDenied } from "@/components/auth/access-denied";
import { AppShell } from "@/components/layout/app-shell";
import { prisma } from "@/lib/prisma";
import { getCrmPageContext } from "@/modules/crm/ui/crm-page-context";
import { projectVisibilityWhere } from "@/modules/projects/project-permissions";
import { listSuppliers } from "@/modules/procurement/procurement-service";
import { PurchaseOrderForm } from "@/modules/procurement/ui/purchase-order-form";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function NewPurchaseOrderPage({ searchParams }: { searchParams?: SearchParams }) {
  const { context, userName } = await getCrmPageContext();
  if (!context.permissions.includes("procurement.create") && context.permissionLevel !== "administrator") {
    return <AppShell title="New Purchase Order" userName={userName}><AccessDenied /></AppShell>;
  }

  const params = searchParams ? await searchParams : {};
  const defaultProjectId = typeof params.projectId === "string" ? params.projectId : undefined;
  const defaultQuoteId = typeof params.quoteId === "string" ? params.quoteId : undefined;
  const defaultChangeRequestId = typeof params.changeRequestId === "string" ? params.changeRequestId : undefined;

  const [suppliers, projects, quotes, changeRequests] = await Promise.all([
    listSuppliers(context, { activeOnly: true }),
    prisma.project.findMany({
      where: { AND: [projectVisibilityWhere(context), { deletedAt: null }] },
      include: { account: true },
      orderBy: [{ projectNumber: "asc" }]
    }),
    prisma.quote.findMany({
      where: context.permissionLevel === "administrator"
        || context.role === "Business Operations"
        || context.role === "Finance"
        || context.permissions.includes("quotes.read_all")
        ? { deletedAt: null }
        : {
            deletedAt: null,
            OR: [
              { ownerId: context.userId },
              { projects: { some: { projectManagerId: context.userId, deletedAt: null } } }
            ]
          },
      include: {
        account: true,
        versions: {
          orderBy: { versionNumber: "desc" },
          take: 1,
          include: {
            lines: {
              where: { deletedAt: null },
              include: { product: true },
              orderBy: { sortOrder: "asc" }
            }
          }
        }
      },
      orderBy: [{ quoteNumber: "desc" }]
    }),
    prisma.projectForm.findMany({
      where: {
        deletedAt: null,
        formType: "change_request",
        project: projectVisibilityWhere(context)
      },
      include: { project: true },
      orderBy: [{ createdAt: "desc" }]
    })
  ]);

  return (
    <AppShell title="New Purchase Order" userName={userName}>
      <PurchaseOrderForm
        suppliers={suppliers.map((supplier) => ({
          id: supplier.id,
          name: supplier.name,
          address: supplier.address,
          contactName: supplier.contactName,
          contactEmail: supplier.email
        }))}
        projects={projects.map((project) => ({
          id: project.id,
          label: `${project.projectNumber} ${project.name}`,
          deliveryAddress: [project.account.addressLine1, project.account.city, project.account.postcode].filter(Boolean).join(", ")
        }))}
        quotes={quotes.map((quote) => ({
          id: quote.id,
          label: `${quote.quoteNumber} | ${quote.account.name} | ${quote.title}`,
          lines: (quote.versions[0]?.lines ?? []).map((line) => ({
            id: line.id,
            productId: line.productId,
            supplierId: line.product?.supplierId ?? null,
            supplierName: line.product?.supplier ?? null,
            lineType: line.lineType,
            itemType: line.product?.itemType ?? null,
            sku: line.product?.sku ?? null,
            manufacturer: line.product?.manufacturer ?? null,
            description: line.description,
            quantity: Number(line.quantity),
            unitCost: Number(line.unitCost)
          }))
        }))}
        changeRequests={changeRequests.map((changeRequest) => ({
          id: changeRequest.id,
          label: `${changeRequest.project.projectNumber} | ${changeRequest.title}`
        }))}
        defaultProjectId={defaultProjectId}
        defaultQuoteId={defaultQuoteId}
        defaultChangeRequestId={defaultChangeRequestId}
      />
    </AppShell>
  );
}
