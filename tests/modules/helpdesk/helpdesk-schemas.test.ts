import { describe, expect, it } from "vitest";
import { helpdeskCommentSchema, helpdeskTicketCreateSchema } from "@/modules/helpdesk/helpdesk-schemas";

describe("helpdesk schemas", () => {
  it("applies ticket defaults", () => {
    const result = helpdeskTicketCreateSchema.parse({
      title: "Guest WiFi down",
      description: "Floor 2 has no service",
      ticketType: "incident",
      category: "wifi"
    });

    expect(result.priority).toBe("normal");
    expect(result.impact).toBe("low");
    expect(result.urgency).toBe("low");
    expect(result.source).toBe("manual");
  });

  it("defaults comments to internal visibility", () => {
    const result = helpdeskCommentSchema.parse({ body: "Investigating with vendor" });

    expect(result.visibility).toBe("internal");
  });

  it("accepts maintenance ticket type", () => {
    const result = helpdeskTicketCreateSchema.parse({
      title: "Quarterly maintenance visit",
      description: "Routine hotel technology maintenance window",
      ticketType: "maintenance",
      category: "hardware"
    });

    expect(result.ticketType).toBe("maintenance");
  });
});
