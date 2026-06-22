import { describe, expect, it } from "vitest";
import { resourceBookingCreateSchema, resourceCreateSchema } from "@/modules/field-services/field-services-schemas";

describe("field services schemas", () => {
  it("parses a schedulable resource", () => {
    const result = resourceCreateSchema.parse({
      resourceType: "internal_user",
      displayName: "Alex Engineer",
      email: "alex@example.com",
      standardDayCost: "350",
      standardDaySell: "650"
    });

    expect(result.displayName).toBe("Alex Engineer");
    expect(result.standardDayCost).toBe(350);
    expect(result.standardDaySell).toBe(650);
  });

  it("parses a project booking with override flag", () => {
    const result = resourceBookingCreateSchema.parse({
      resourceId: "11111111-1111-4111-8111-111111111111",
      bookingType: "project",
      title: "Hilton install",
      startDate: "2026-06-16",
      endDate: "2026-06-20",
      overrideConflict: true
    });

    expect(result.overrideConflict).toBe(true);
    expect(result.startDate).toBeInstanceOf(Date);
    expect(result.endDate).toBeInstanceOf(Date);
  });
});
