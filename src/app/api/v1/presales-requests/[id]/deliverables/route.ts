import { NextResponse } from "next/server";
import { PresalesDeliverableType } from "@prisma/client";
import { successResponse } from "@/lib/api-response";
import { getPresalesContext, handlePresalesApiError } from "@/modules/presales/api/presales-api-utils";
import { uploadPresalesDeliverable, type PresalesUploadFile } from "@/modules/presales/presales-service";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const formData = await request.formData();
    const deliverableType = String(formData.get("deliverableType") ?? "");
    if (!isPresalesDeliverableType(deliverableType)) throw new Error("Invalid deliverable type");
    const title = String(formData.get("title") ?? "").trim() || labelFromDeliverableType(deliverableType);
    const file = await presalesFileFromFormData(formData);
    return NextResponse.json(successResponse(await uploadPresalesDeliverable(await getPresalesContext(), id, { deliverableType, title, file })), { status: 201 });
  } catch (error) {
    return handlePresalesApiError(error);
  }
}

async function presalesFileFromFormData(formData: FormData): Promise<PresalesUploadFile> {
  const entry = formData.get("file") ?? formData.get("files");
  if (!isFileLike(entry)) throw new Error("No file was supplied");
  return {
    fileName: entry.name,
    fileType: entry.type || undefined,
    buffer: Buffer.from(await entry.arrayBuffer())
  };
}

function isPresalesDeliverableType(value: string): value is PresalesDeliverableType {
  return Object.values(PresalesDeliverableType).includes(value as PresalesDeliverableType);
}

function isFileLike(value: FormDataEntryValue | null): value is File {
  return typeof value === "object" && value !== null && "arrayBuffer" in value && "name" in value;
}

function labelFromDeliverableType(value: string) {
  return value.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}
