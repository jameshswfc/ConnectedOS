import { NextResponse } from "next/server";
import { successResponse } from "@/lib/api-response";
import { contactUpdateSchema } from "@/modules/crm/schemas/crm-schemas";
import { getContact, softDeleteContact, updateContact } from "@/modules/crm/contacts/contact-service";
import { getCrmContext, handleApiError, parseJsonBody } from "@/modules/crm/api/crm-api-utils";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    return NextResponse.json(successResponse(await getContact(await getCrmContext(), id)));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    return NextResponse.json(successResponse(await updateContact(await getCrmContext(), id, await parseJsonBody(request, contactUpdateSchema))));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    return NextResponse.json(successResponse(await softDeleteContact(await getCrmContext(), id)));
  } catch (error) {
    return handleApiError(error);
  }
}
