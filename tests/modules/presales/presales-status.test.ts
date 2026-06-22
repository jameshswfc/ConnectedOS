import { PresalesRequestStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { isPresalesActive, isPresalesCancelled, isPresalesComplete } from "@/modules/presales/presales-status";

describe("pre-sales status helpers", () => {
  it("identifies complete status", () => {
    expect(isPresalesComplete(PresalesRequestStatus.complete)).toBe(true);
    expect(isPresalesActive(PresalesRequestStatus.complete)).toBe(false);
  });

  it("identifies cancelled as terminal but not complete", () => {
    expect(isPresalesComplete(PresalesRequestStatus.cancelled)).toBe(false);
    expect(isPresalesCancelled(PresalesRequestStatus.cancelled)).toBe(true);
    expect(isPresalesActive(PresalesRequestStatus.cancelled)).toBe(false);
  });

  it("identifies active statuses", () => {
    expect(isPresalesComplete(PresalesRequestStatus.in_progress)).toBe(false);
    expect(isPresalesCancelled(PresalesRequestStatus.in_progress)).toBe(false);
    expect(isPresalesActive(PresalesRequestStatus.in_progress)).toBe(true);
  });
});
