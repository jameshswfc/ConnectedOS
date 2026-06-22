import { describe, expect, it } from "vitest";
import { assetCreateSchema } from "@/modules/assets/asset-schemas";

describe("asset schemas", () => {
  it("requires an asset description and defaults status", () => {
    const result = assetCreateSchema.parse({
      description: "Access point for ballroom"
    });

    expect(result.status).toBe("required");
    expect(result.description).toContain("ballroom");
  });
});
