import { NextResponse } from "next/server";
import { successResponse } from "@/lib/api-response";
import { getModuleContext, handleModuleApiError } from "@/modules/operations/api-utils";
import { listHelpdeskAttachments, uploadHelpdeskAttachment } from "@/modules/helpdesk/helpdesk-service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    return NextResponse.json(successResponse(await listHelpdeskAttachments(await getModuleContext(), id)));
  } catch (error) {
    return handleModuleApiError(error, { module: "helpdesk", action: "list_attachments" });
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      throw new Error("File attachment is required");
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const uploaded = await uploadHelpdeskAttachment(await getModuleContext(), id, {
      fileName: file.name,
      fileType: file.type || undefined,
      buffer
    });
    return NextResponse.json(successResponse(uploaded), { status: 201 });
  } catch (error) {
    return handleModuleApiError(error, { module: "helpdesk", action: "upload_attachment" });
  }
}
