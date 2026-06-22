import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("pre-sales detail page", () => {
  it("renders deliverables as the operational checklist and no separate Tasks section", () => {
    const source = readFileSync(join(process.cwd(), "src/app/presales/[id]/page.tsx"), "utf8");

    expect(source).toContain("<CardHeader><CardTitle>Deliverables</CardTitle></CardHeader>");
    expect(source).not.toContain("<CardHeader><CardTitle>Tasks</CardTitle></CardHeader>");
    expect(source).not.toContain("PresalesTaskForm");
  });
});
