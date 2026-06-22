import Link from "next/link";
import { AccessDenied } from "@/components/auth/access-denied";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCrmPageContext } from "@/modules/crm/ui/crm-page-context";
import { listResources } from "@/modules/field-services/field-services-service";

type SearchParams = Promise<{ message?: string; status?: string; showInactive?: string }>;

export default async function FieldServiceResourcesPage({ searchParams }: { searchParams?: SearchParams }) {
  const { context, userName } = await getCrmPageContext();
  const params = searchParams ? await searchParams : {};
  const showInactive = params?.showInactive === "true";
  let resources: Awaited<ReturnType<typeof listResources>> | null = null;
  try {
    resources = await listResources(context, { includeInactive: showInactive });
  } catch (error) {
    if (!(error instanceof Error) || !error.message.startsWith("Missing permission")) {
      throw error;
    }
  }

  if (!resources) {
    return <AppShell title="Resources" userName={userName}><AccessDenied /></AppShell>;
  }

  return (
    <AppShell title="Resources" userName={userName}>
      {params?.message ? (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {params.message}
        </div>
      ) : null}
      <div className="mb-4 flex flex-wrap justify-between gap-3">
        <Link href={showInactive ? "/field-services/resources" : "/field-services/resources?showInactive=true"}>
          <Button variant="secondary">{showInactive ? "Hide inactive resources" : "Show inactive resources"}</Button>
        </Link>
        <Link href="/field-services/resources/new"><Button>Create Resource</Button></Link>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white">
        <Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Company</TableHead><TableHead>Skills</TableHead><TableHead>Cost Day</TableHead><TableHead>Sell Day</TableHead><TableHead>Phone</TableHead><TableHead>Email</TableHead><TableHead>Agent</TableHead><TableHead>Active</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader><TableBody>
          {resources.map((resource) => <TableRow key={resource.id}><TableCell><Link className="font-medium text-brand-700" href={`/field-services/resources/${resource.id}`}>{resource.displayName}</Link></TableCell><TableCell>{resource.resourceType.replaceAll("_", " ")}</TableCell><TableCell>{resource.companyName ?? "-"}</TableCell><TableCell>{resource.skillTags.join(", ") || "-"}</TableCell><TableCell>{resource.standardDayCost.toString()}</TableCell><TableCell>{resource.standardDaySell.toString()}</TableCell><TableCell>{resource.phone ?? "-"}</TableCell><TableCell>{resource.email ?? "-"}</TableCell><TableCell>{resource.agentName ?? "-"}</TableCell><TableCell>{resource.active ? "Yes" : "No"}</TableCell><TableCell><div className="flex gap-3"><Link className="font-medium text-brand-700" href={`/field-services/resources/${resource.id}`}>View</Link><Link className="font-medium text-brand-700" href={`/field-services/resources/${resource.id}/edit`}>Edit</Link></div></TableCell></TableRow>)}
        </TableBody></Table>
      </div>
    </AppShell>
  );
}
