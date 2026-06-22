import { NextResponse } from "next/server";
import { successResponse } from "@/lib/api-response";
import { getPresalesContext, handlePresalesApiError } from "@/modules/presales/api/presales-api-utils";
import { listPresalesFiles, uploadPresalesFiles, type PresalesUploadFile } from "@/modules/presales/presales-service";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    return NextResponse.json(successResponse(await listPresalesFiles(await getPresalesContext(), id)));
  } catch (error) {
    return handlePresalesApiError(error);
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const formData = await request.formData();
    const files = await presalesFilesFromFormData(formData);
    return NextResponse.json(successResponse(await uploadPresalesFiles(await getPresalesContext(), id, files)), { status: 201 });
  } catch (error) {
    return handlePresalesApiError(error);
  }
}

async function presalesFilesFromFormData(formData: FormData): Promise<PresalesUploadFile[]> {
  const entries = [...formData.getAll("files"), ...formData.getAll("file")];
  const files: PresalesUploadFile[] = [];
  for (const entry of entries) {
    if (!isFileLike(entry)) continue;
    const buffer = Buffer.from(await entry.arrayBuffer());
    files.push({ fileName: entry.name, fileType: entry.type || undefined, buffer });
  }
  return files;
}

function isFileLike(value: FormDataEntryValue): value is File {
  return typeof value === "object" && value !== null && "arrayBuffer" in value && "name" in value;
}
