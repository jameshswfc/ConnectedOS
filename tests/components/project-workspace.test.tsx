// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ProjectPanel, ProjectWorkspace, projectViewFromHash } from "@/modules/projects/ui/project-workspace";
afterEach(() => { cleanup(); window.history.replaceState(null, "", "/"); });
describe("focused project workspace", () => {
  it("shows one working area while retaining direct section links", () => {
    render(<ProjectWorkspace><ProjectPanel name="overview"><p>Overview content</p></ProjectPanel><ProjectPanel name="tasks"><p>Tasks content</p></ProjectPanel></ProjectWorkspace>);
    expect(screen.getByText("Tasks content").closest("[hidden]")).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Delivery" }));
    expect(screen.getByText("Tasks content").closest("[hidden]")).toBeNull();
    expect(window.location.hash).toBe("#tasks");
    fireEvent.change(screen.getByLabelText("Project section"), { target: { value: "overview" } });
    expect(screen.getByText("Tasks content").closest("[hidden]")).not.toBeNull();
  });
  it("resolves existing hashes and safely defaults unknown views", () => {
    expect(projectViewFromHash("#pre-sales-handover")).toBe("pre-sales-handover");
    expect(projectViewFromHash("#project-stage-gates")).toBe("overview");
    expect(projectViewFromHash("#unknown")).toBe("overview");
  });
});
