import { describe, expect, it } from "vitest";
import { ProjectStatus } from "@prisma/client";
import { projectCreateFromQuoteSchema, projectTaskCreateSchema } from "@/modules/projects/project-schemas";

describe("project schemas", () => {
  it("accepts project creation from an eligible quote payload", () => {
    expect(projectCreateFromQuoteSchema.parse({ projectType: "guest_wifi", status: ProjectStatus.draft, totalResourceDaysBudget: "12" }).totalResourceDaysBudget).toBe(12);
  });

  it("requires task title and dates", () => {
    expect(() => projectTaskCreateSchema.parse({ title: "", startDate: "2026-06-09", endDate: "2026-06-10" })).toThrow();
    expect(projectTaskCreateSchema.parse({ title: "Kick off", startDate: "2026-06-09", endDate: "2026-06-10" }).title).toBe("Kick off");
  });
});
