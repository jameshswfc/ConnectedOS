import { NextResponse } from "next/server";
import { successResponse } from "@/lib/api-response";
import { contactCreateSchema } from "@/modules/crm/schemas/crm-schemas";
import { createContact, listContacts } from "@/modules/crm/contacts/contact-service";
import { getCrmContext, getSearchParam, handleApiError, parseJsonBody } from "@/modules/crm/api/crm-api-utils";

export async function GET(request: Request) {
  try {
    const context = await getCrmContext();
    return NextResponse.json(successResponse(await listContacts(context, getSearchParam(request))));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const context = await getCrmContext();
    const input = await parseJsonBody(request, contactCreateSchema);
    return NextResponse.json(successResponse(await createContact(context, input)), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
