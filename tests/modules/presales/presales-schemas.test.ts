import { describe, expect, it } from "vitest";
import { presalesDocumentCreateSchema, presalesRequestCreateSchema, presalesTaskCreateSchema } from "@/modules/presales/schemas/presales-schemas";

describe("pre-sales schemas", () => {
  const validRequest = {
    accountId: "00000000-0000-0000-0000-000000000001",
    opportunityId: "00000000-0000-0000-0000-000000000002",
    quoteId: "00000000-0000-0000-0000-000000000003",
    requestCategory: "wi_fi",
    requestType: "wifi_design",
    priority: "normal",
    commercialPriority: "high",
    requestedDeliveryDate: "2026-06-20",
    internalDeadline: "2026-06-15",
    estimatedHours: "8",
    description: "Review RFP and produce design notes."
  };

  it("validates request creation fields", () => {
    const parsed = presalesRequestCreateSchema.parse(validRequest);

    expect(parsed.accountId).toBe(validRequest.accountId);
    expect(parsed.requestCategory).toBe("wi_fi");
    expect(parsed.internalDeadline).toBeInstanceOf(Date);
    expect(parsed.estimatedHours).toBe(8);
  });

  it("requires account, deadline and description", () => {
    expect(() => presalesRequestCreateSchema.parse({ ...validRequest, accountId: undefined })).toThrow();
    expect(() => presalesRequestCreateSchema.parse({ ...validRequest, internalDeadline: undefined })).toThrow();
    expect(() => presalesRequestCreateSchema.parse({ ...validRequest, description: "" })).toThrow();
  });

  it("validates task creation", () => {
    const parsed = presalesTaskCreateSchema.parse({ title: "Review floorplans", assignedToId: "", dueDate: "" });

    expect(parsed.title).toBe("Review floorplans");
    expect(parsed.assignedToId).toBeUndefined();
    expect(parsed.dueDate).toBeUndefined();
  });

  it("validates document metadata linking", () => {
    expect(presalesDocumentCreateSchema.parse({ fileName: "floorplan.pdf", fileType: "application/pdf", sizeBytes: "1200" }).sizeBytes).toBe(1200);
  });
});

