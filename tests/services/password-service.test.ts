import { describe, expect, it } from "vitest";
import { assertPasswordConfirmation, hashPassword, validatePasswordRules, verifyPassword } from "@/services/auth/password-service";

describe("password service", () => {
  it("hashes and verifies passwords without returning plain text", async () => {
    const hash = await hashPassword("Connected123");

    expect(hash).not.toBe("Connected123");
    await expect(verifyPassword("Connected123", hash)).resolves.toBe(true);
    await expect(verifyPassword("WrongPassword123", hash)).resolves.toBe(false);
  });

  it("enforces minimum password rules", () => {
    expect(() => validatePasswordRules("short1")).toThrow("at least 10");
    expect(() => validatePasswordRules("NoNumbersHere")).toThrow("at least 10");
    expect(() => validatePasswordRules("1234567890")).toThrow("at least 10");
    expect(() => validatePasswordRules("Connected123")).not.toThrow();
  });

  it("requires confirmation to match", () => {
    expect(() => assertPasswordConfirmation("Connected123", "Connected123")).not.toThrow();
    expect(() => assertPasswordConfirmation("Connected123", "Connected124")).toThrow("confirmation");
  });
});
