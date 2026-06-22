// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ResourceDeleteButton } from "@/modules/field-services/ui/resource-delete-button";
import { ResourceNotFoundCard } from "@/modules/field-services/ui/resource-not-found-card";

describe("resource delete UX", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("shows an in-app confirmation panel instead of using browser confirm", () => {
    render(<ResourceDeleteButton resourceId="resource-1" />);

    fireEvent.click(screen.getByRole("button", { name: "Deactivate Resource" }));

    expect(screen.getByText("Deactivate resource?")).toBeTruthy();
    expect(screen.getByText(/cancel any future bookings/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeTruthy();
  });

  it("renders a friendly not-found card for deleted or missing resources", () => {
    render(<ResourceNotFoundCard />);

    expect(screen.getByText("Resource not found or no longer active.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Back to Resources" }).getAttribute("href")).toBe("/field-services/resources");
    expect(screen.getByRole("link", { name: "Field Services Schedule" }).getAttribute("href")).toBe("/field-services/schedule");
  });
});
