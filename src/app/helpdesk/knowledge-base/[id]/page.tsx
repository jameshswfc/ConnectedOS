import { AccessDenied } from "@/components/auth/access-denied";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { getCrmPageContext } from "@/modules/crm/ui/crm-page-context";

type Params = { params: Promise<{ id: string }> };
export default async function KnowledgeArticleDetailPage({ params }: Params) {
  const { context, userName } = await getCrmPageContext();
  if (!context.permissions.includes("helpdesk.manage_knowledge") && !context.permissions.includes("helpdesk.read_all") && !context.permissions.includes("helpdesk.read_assigned") && context.permissionLevel !== "administrator") {
    return <AppShell title="Knowledge Article" userName={userName}><AccessDenied /></AppShell>;
  }
  const { id } = await params;
  const article = await prisma.knowledgeArticle.findUnique({ where: { id } });
  if (!article) return <AppShell title="Knowledge Article" userName={userName}><AccessDenied /></AppShell>;
  return <AppShell title={article.title} userName={userName}><Card><CardHeader><CardTitle>{article.title}</CardTitle></CardHeader><CardContent className="space-y-2"><p className="text-sm text-slate-500">{article.category ?? "General"} · {article.status}</p><div className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{article.body}</div></CardContent></Card></AppShell>;
}
