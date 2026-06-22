import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GlobalSearchForm } from "@/components/search/global-search-form";
import { requireAuthenticatedUser } from "@/services/auth/auth-service";
import { runGlobalSearch } from "@/modules/search/global-search-service";
import { formatModuleLabel } from "@/modules/operations/ui/module-ui";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function SearchPage({ searchParams }: { searchParams?: SearchParams }) {
  const user = await requireAuthenticatedUser();
  const params = searchParams ? await searchParams : {};
  const q = typeof params.q === "string" ? params.q : "";
  const results = await runGlobalSearch({
    userId: user.id,
    permissions: user.permissions,
    permissionLevel: user.permissionLevel,
    role: user.role
  }, q);

  const grouped = results.reduce<Record<string, typeof results>>((accumulator, item) => {
    accumulator[item.module] ??= [];
    accumulator[item.module].push(item);
    return accumulator;
  }, {});

  return (
    <AppShell title="Search" userName={user.name}>
      <div className="mb-4">
        <GlobalSearchForm defaultValue={q} />
      </div>
      {!q ? <p className="text-sm text-slate-500">Enter a search term to find accounts, quotes, projects, tickets, suppliers, assets and more.</p> : null}
      {q && !results.length ? <p className="text-sm text-slate-500">No results matched your search.</p> : null}
      <div className="space-y-4">
        {Object.entries(grouped).map(([module, items]) => (
          <Card key={module}>
            <CardHeader>
              <CardTitle>{module}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {items.map((item) => (
                <div key={`${item.module}-${item.href}-${item.reference}`} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-slate-900">{item.title}</p>
                      <p className="text-xs text-slate-500">{item.reference}{item.subtitle ? ` · ${item.subtitle}` : ""}</p>
                    </div>
                    <Link href={item.href} className="font-medium text-brand-700">Open</Link>
                  </div>
                  {item.status ? <p className="mt-2 text-xs text-slate-600">Status: {formatModuleLabel(item.status)}</p> : null}
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
