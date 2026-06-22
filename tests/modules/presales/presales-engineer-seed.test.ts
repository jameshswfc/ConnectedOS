import { describe, expect, it } from "vitest";
import { isDevelopmentPlaceholderEmail, presalesEngineerSeedRole, presalesEngineerSeedUsers } from "@/modules/presales/presales-engineer-seed";

describe("pre-sales engineer seed users", () => {
  it("defines local placeholder pre-sales engineers", () => {
    expect(presalesEngineerSeedRole).toBe("Pre-Sales");
    expect(presalesEngineerSeedUsers).toEqual([
      { displayName: "Eman Nwokoro", email: "eman.nwokoro@example.local", isDevelopmentPlaceholder: true },
      { displayName: "Artur Kellner", email: "artur.kellner@example.local", isDevelopmentPlaceholder: true },
      { displayName: "Richard Mumford", email: "richard.mumford@example.local", isDevelopmentPlaceholder: true }
    ]);
  });

  it("marks example.local emails as development placeholders", () => {
    for (const user of presalesEngineerSeedUsers) {
      expect(isDevelopmentPlaceholderEmail(user.email)).toBe(true);
      expect(user.isDevelopmentPlaceholder).toBe(true);
    }
  });
});
