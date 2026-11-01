import { NextResponse } from "next/server";
import { documentApiError } from "@/services/documents/document-api-error";
import { getPartnerFormContext, getPartnerInvitation, limitInvitationRequests, submitPartnerRequest } from "@/modules/presales/partner-intake-service";
import { limitedRequestBody } from "@/modules/presales/partner-intake-storage";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const token = request.headers.get("x-intake-token") ?? "";
    if (process.env.PARTNER_INTAKE_ENABLED !== "true") throw new Error("Partner submissions are not available yet.");
    await limitInvitationRequests(token);
    await getPartnerInvitation(token);
    if (request.headers.get("x-intake-action") === "context") return NextResponse.json(await getPartnerFormContext(token), { headers: { "Cache-Control": "no-store" } });
    const bytes = await limitedRequestBody(request);
    const parsed = new Request(request.url, { method: "POST", headers: { "Content-Type": request.headers.get("content-type") ?? "" }, body: new Uint8Array(bytes) });
    const form = await parsed.formData();
    const files: { name: string; buffer: Buffer }[] = [];
    for (const value of form.getAll("files")) {
      if (typeof value === "string") throw new Error("Invalid attachment.");
      if (value.size) files.push({ name: value.name, buffer: Buffer.from(await value.arrayBuffer()) });
    }
    const result = await submitPartnerRequest(token, JSON.parse(String(form.get("details"))), files);
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return documentApiError(error, true); }
}
