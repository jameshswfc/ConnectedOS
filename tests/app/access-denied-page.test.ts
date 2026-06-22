import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/layout/app-shell", () => ({
  AppShell: ({ children }: { children: unknown }) => children
}));

describe("/403 page", () => {
  it("renders the friendly access denied message", async () => {
    const { default: AccessDeniedPage } = await import("@/app/403/page");
    const text = pageText(AccessDeniedPage());

    expect(text).toContain("Access denied");
    expect(text).toContain("You do not have permission to view this page.");
    expect(text).toContain("Back to Dashboard");
    expect(text).toContain("Go to Settings");
  });
});

function pageText(node: unknown): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(pageText).join(" ");
  if (typeof node === "object" && "props" in node && node.props && typeof node.props === "object") {
    if ("children" in node.props) {
      const childText = pageText(node.props.children);
      if (childText) return childText;
    }
    if ("type" in node && typeof node.type === "function") return pageText(node.type(node.props));
  }
  return "";
}
