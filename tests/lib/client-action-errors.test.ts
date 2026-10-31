import { describe, expect, it } from "vitest";
import { friendlyActionError } from "@/lib/client-action-errors";

describe("friendly authentication errors", () => {
  it("explains expired sessions separately from permission denial", async () => {
    await expect(friendlyActionError(new Response(null, { status: 401 }), "Failed")).resolves.toBe("Your session has expired. Please sign in again.");
    await expect(friendlyActionError(new Response(null, { status: 403 }), "Failed")).resolves.toBe("You do not have permission to perform this action.");
  });
  it("explains the password-change gate without consuming the response", async () => {
    const response = Response.json({ errors: [{ code: "PASSWORD_CHANGE_REQUIRED" }] }, { status: 403 });
    await expect(friendlyActionError(response, "Failed")).resolves.toBe("Please change your password in Settings before continuing.");
    expect(response.bodyUsed).toBe(false);
  });
});
