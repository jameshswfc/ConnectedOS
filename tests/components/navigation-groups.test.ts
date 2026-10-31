import { describe, expect, it } from "vitest";
import { approvedRoleNames, visibleNavigationItems } from "@/components/navigation/navigation-items";
import { groupNavigationItems } from "@/components/navigation/navigation-groups";

describe("simplified navigation", () => {
  it.each(approvedRoleNames)("preserves exactly the permitted links for %s", (role) => {
    const items = visibleNavigationItems([], role === "Administrator" ? "administrator" : "user", role);
    const grouped = groupNavigationItems(items, "/settings").flatMap((group) => group.items.map((item) => item.href));
    expect(grouped.sort()).toEqual(items.map((item) => item.href).sort());
    expect(new Set(grouped).size).toBe(grouped.length);
  });
  it("only exposes basic account navigation for new Staff users", () => {
    const items = visibleNavigationItems([], "user", "Staff");
    expect(items.map((item) => item.href)).toEqual(["/dashboard", "/notifications", "/settings"]);
    expect(groupNavigationItems(items, "/dashboard").map((group) => group.label)).toEqual(["My Work"]);
  });
  it("opens the group containing the active record without opening unrelated groups", () => {
    const groups = groupNavigationItems(visibleNavigationItems([], "administrator"), "/quotes/quote-123");
    expect(groups.filter((group) => group.active).map((group) => group.label)).toEqual(["Sales"]);
  });
});
