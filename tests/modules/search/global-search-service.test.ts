import { describe, expect, it } from "vitest";
import { runGlobalSearch } from "@/modules/search/global-search-service";

describe("global search service", () => {
  it("returns no results for an empty query without touching module results", async () => {
    const results = await runGlobalSearch(
      {
        userId: "user-1",
        permissions: [],
        permissionLevel: "user",
        role: "Sales"
      },
      "   "
    );

    expect(results).toEqual([]);
  });
});
