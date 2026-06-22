import { describe, expect, it } from "vitest";
import { ProfileMenu } from "@/components/auth/profile-menu";
import { loginCallbackUrl } from "@/components/auth/sign-out-button";

describe("profile menu", () => {
  it("renders profile actions and the user name", () => {
    const text = pageText(ProfileMenu({ userName: "James Harrison" }));

    expect(text).toContain("James Harrison");
    expect(text).toContain("Settings");
    expect(text).toContain("Change Password");
    expect(text).toContain("Sign out");
    expect(text).not.toContain("My Profile");
  });

  it("builds a same-origin login callback for sign out", () => {
    expect(loginCallbackUrl("http://localhost:3002")).toBe("http://localhost:3002/login");
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
