import { describe, expect, it } from "vitest";
import { formatProjectNumber } from "@/modules/projects/project-numbering";

describe("project numbering", () => {
  it("formats project numbers as PRJ-YYYY-0001", () => {
    expect(formatProjectNumber(2026, 1)).toBe("PRJ-2026-0001");
    expect(formatProjectNumber(2026, 42)).toBe("PRJ-2026-0042");
  });
});
