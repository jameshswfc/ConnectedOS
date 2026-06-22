import { describe, expect, it } from "vitest";
import { calculateWorkingDays, isWeekend } from "@/modules/projects/project-working-calendar";

describe("project working calendar", () => {
  it("counts Monday to Friday as five working days", () => {
    expect(calculateWorkingDays("2026-06-08", "2026-06-12")).toBe(5);
  });

  it("excludes weekends from longer ranges", () => {
    expect(calculateWorkingDays("2026-06-08", "2026-06-14")).toBe(5);
    expect(calculateWorkingDays("2026-06-08", "2026-06-15")).toBe(6);
  });

  it("counts a same weekday as one day and weekend-only as zero", () => {
    expect(calculateWorkingDays("2026-06-10", "2026-06-10")).toBe(1);
    expect(calculateWorkingDays("2026-06-13", "2026-06-14")).toBe(0);
  });

  it("identifies weekends", () => {
    expect(isWeekend("2026-06-13")).toBe(true);
    expect(isWeekend("2026-06-10")).toBe(false);
  });
});
