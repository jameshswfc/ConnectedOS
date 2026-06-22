import Link from "next/link";
import { AccessDenied } from "@/components/auth/access-denied";
import { JsonActionForm } from "@/components/forms/json-action-form";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCrmPageContext } from "@/modules/crm/ui/crm-page-context";
import { listKnowledgeArticles } from "@/modules/helpdesk/helpdesk-service";
import { ModuleStatusBadge } from "@/modules/operations/ui/module-ui";

export default async function KnowledgeBasePage() {
  const { context, userName } = await getCrmPageContext();
  let articles: Awaited<ReturnType<typeof listKnowledgeArticles>> | null = null;
  try {
    articles = await listKnowledgeArticles(context);
  } catch (error) {
    if (!(error instanceof Error) || !error.message.startsWith("Missing permission")) throw error;
  }
  if (!articles) return <AppShell title="Knowledge Base" userName={userName}><AccessDenied /></AppShell>;
  return (
    <AppShell title="Knowledge Base" userName={userName}>
      <Card>
        <CardHeader><CardTitle>Create Article</CardTitle></CardHeader>
        <CardContent>
          <JsonActionForm endpoint="/api/v1/helpdesk/knowledge-articles" buttonLabel="Create Article" fields={[{ name: "title", label: "Title", required: true }, { name: "category", label: "Category" }, { name: "body", label: "Body", type: "textarea", required: true }, { name: "status", label: "Status", defaultValue: "draft" }]} />
        </CardContent>
      </Card>
      <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <Table><TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Category</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>
          {articles.map((article) => <TableRow key={article.id}><TableCell><Link href={`/helpdesk/knowledge-base/${article.id}`} className="font-medium text-brand-700">{article.title}</Link></TableCell><TableCell>{article.category ?? "-"}</TableCell><TableCell><ModuleStatusBadge value={article.status} /></TableCell></TableRow>)}
        </TableBody></Table>
      </div>
    </AppShell>
  );
}
