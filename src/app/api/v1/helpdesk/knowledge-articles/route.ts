import { NextResponse } from "next/server";
import { successResponse } from "@/lib/api-response";
import { knowledgeArticleSchema } from "@/modules/helpdesk/helpdesk-schemas";
import { createKnowledgeArticle, listKnowledgeArticles } from "@/modules/helpdesk/helpdesk-service";
import { getModuleContext, handleModuleApiError } from "@/modules/operations/api-utils";

export async function GET() {
  try {
    return NextResponse.json(successResponse(await listKnowledgeArticles(await getModuleContext())));
  } catch (error) {
    return handleModuleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    return NextResponse.json(successResponse(await createKnowledgeArticle(await getModuleContext(), knowledgeArticleSchema.parse(await request.json()))), { status: 201 });
  } catch (error) {
    return handleModuleApiError(error);
  }
}
