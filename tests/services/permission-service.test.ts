import { describe, expect, it } from "vitest";
import { hasPermissionFromCodes } from "@/services/permissions/permission-service";

describe("permission service", () => {
  it("returns true when the required permission exists", () => {
    expect(hasPermissionFromCodes(["admin.users", "audit.read"], "admin.users")).toBe(true);
  });

  it("returns false when the required permission is missing", () => {
    expect(hasPermissionFromCodes(["notifications.read"], "admin.users")).toBe(false);
  });
});
