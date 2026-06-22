import { PresalesRequestStatus, PresalesRagStatus, PresalesSlaStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { calculatePresalesDeadlineStatus } from "@/modules/presales/presales-deadlines";

describe("pre-sales deadline calculations", () => {
  it("uses green when more than 48 hours remain", () => {
    expect(calculatePresalesDeadlineStatus(new Date("2026-06-12T00:00:00.000Z"), PresalesRequestStatus.assigned, new Date("2026-06-08T12:00:00.000Z"))).toEqual({
      slaStatus: PresalesSlaStatus.on_track,
      ragStatus: PresalesRagStatus.green
    });
  });

  it("uses amber when 48 hours or less remain", () => {
    expect(calculatePresalesDeadlineStatus(new Date("2026-06-10T00:00:00.000Z"), PresalesRequestStatus.assigned, new Date("2026-06-08T23:59:59.999Z"))).toEqual({
      slaStatus: PresalesSlaStatus.due_soon,
      ragStatus: PresalesRagStatus.amber
    });
  });

  it("uses red when overdue", () => {
    expect(calculatePresalesDeadlineStatus(new Date("2026-06-07T00:00:00.000Z"), PresalesRequestStatus.in_progress, new Date("2026-06-08T12:00:00.000Z"))).toEqual({
      slaStatus: PresalesSlaStatus.overdue,
      ragStatus: PresalesRagStatus.red
    });
  });

  it("marks complete requests as complete SLA", () => {
    expect(calculatePresalesDeadlineStatus(new Date("2026-06-07T00:00:00.000Z"), PresalesRequestStatus.complete, new Date("2026-06-08T12:00:00.000Z"))).toEqual({
      slaStatus: PresalesSlaStatus.complete,
      ragStatus: PresalesRagStatus.green
    });
  });
});

