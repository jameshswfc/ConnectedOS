// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectChangeRequestQuickForm, ProjectTaskInlineEditForm, defaultActualDaysSuggestion } from "@/modules/projects/ui/project-actions";

describe("project actions", () => {
  const reloadMock = vi.fn();

  beforeEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(window, "location", {
      value: { ...window.location, reload: reloadMock, hash: "" },
      writable: true
    });
    vi.stubGlobal("alert", vi.fn());
    reloadMock.mockReset();
  });

  it("uses estimated days as the default actual-days suggestion", () => {
    expect(defaultActualDaysSuggestion(0, 2)).toBe("2");
    expect(defaultActualDaysSuggestion(1.5, 2)).toBe("1.5");
    expect(defaultActualDaysSuggestion(null, null)).toBe("1");
  });

  it("creates a change request once, shows loading, and clears on success", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id: "form-1" } })
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<ProjectChangeRequestQuickForm projectId="project-1" buttonLabel="Add Change Request" />);
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Scope Variation" } });
    const form = screen.getByRole("button", { name: "Add Change Request" }).closest("form")!;
    fireEvent.submit(form);
    fireEvent.submit(form);

    await screen.findByRole("button", { name: "Creating..." });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(reloadMock).toHaveBeenCalledTimes(1));
  });

  it("shows a friendly error and clears loading after failure", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ errors: [{ message: "Unable to create change request. Please try again or contact an administrator." }] })
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<ProjectChangeRequestQuickForm projectId="project-1" buttonLabel="Add Change Request" />);
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Scope Variation" } });
    fireEvent.submit(screen.getByRole("button", { name: "Add Change Request" }).closest("form")!);

    expect(await screen.findByText("Unable to create change request. Please try again or contact an administrator.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add Change Request" })).toBeTruthy();
  });

  it("updates project task dates successfully and shows the reschedule message", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { rescheduleMessage: "Dependent tasks were rescheduled." } })
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <ProjectTaskInlineEditForm
        task={{
          id: "task-1",
          title: "Equipment Order",
          startDate: "2026-06-10",
          endDate: "2026-06-12",
          status: "in_progress",
          estimatedDays: 3,
          actualDays: 0
        }}
        users={[{ id: "user-1", label: "Pat PM" }]}
      />
    );

    fireEvent.change(screen.getByLabelText("Start date"), { target: { value: "2026-06-16" } });
    fireEvent.change(screen.getByLabelText("End date"), { target: { value: "2026-06-18" } });
    fireEvent.submit(screen.getByRole("button", { name: "Save Task" }).closest("form")!);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith("Dependent tasks were rescheduled."));
    await waitFor(() => expect(reloadMock).toHaveBeenCalledTimes(1));
  });

  it("shows a friendly task-date error instead of the generic unexpected error", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ errors: [{ message: "An unexpected error occurred." }] })
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <ProjectTaskInlineEditForm
        task={{
          id: "task-1",
          title: "Equipment Order",
          startDate: "2026-06-10",
          endDate: "2026-06-12",
          status: "in_progress",
          estimatedDays: 3,
          actualDays: 0
        }}
        users={[]}
      />
    );

    fireEvent.submit(screen.getByRole("button", { name: "Save Task" }).closest("form")!);

    expect(await screen.findByText("Unable to update task dates. Please check the dates and try again.")).toBeTruthy();
  });
});
