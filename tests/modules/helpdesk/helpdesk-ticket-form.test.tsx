// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HelpdeskTicketForm } from "@/modules/helpdesk/ui/helpdesk-ticket-form";

describe("helpdesk ticket form", () => {
  const accounts = [
    { id: "account-1", label: "Hilton Leeds" },
    { id: "account-2", label: "Native Manchester" }
  ];
  const contacts = [
    { id: "contact-1", label: "Olivia Reed", accountId: "account-1" },
    { id: "contact-2", label: "Daniel Price", accountId: "account-2" }
  ];
  const projects = [
    { id: "project-1", label: "PRJ-2026-0001 Hilton WiFi", accountId: "account-1" },
    { id: "project-2", label: "PRJ-2026-0002 Native IPTV", accountId: "account-2" }
  ];
  const assets = [
    { id: "asset-1", label: "AST-2026-0001 Switch", accountId: "account-1" },
    { id: "asset-2", label: "AST-2026-0002 AP", accountId: "account-2" }
  ];

  it("disables dependent selectors until an account is selected and filters options by account", () => {
    render(
      <HelpdeskTicketForm
        accounts={accounts}
        contacts={contacts}
        projects={projects}
        assets={assets}
        queues={[]}
        users={[]}
      />
    );

    const contactSelect = screen.getByLabelText("Contact") as HTMLSelectElement;
    const projectSelect = screen.getByLabelText("Project") as HTMLSelectElement;
    const assetSelect = screen.getByLabelText("Asset") as HTMLSelectElement;

    expect(contactSelect.disabled).toBe(true);
    expect(projectSelect.disabled).toBe(true);
    expect(assetSelect.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText("Account"), { target: { value: "account-1" } });

    expect(contactSelect.disabled).toBe(false);
    expect(screen.getByRole("option", { name: "Olivia Reed" })).toBeTruthy();
    expect(screen.queryByRole("option", { name: "Daniel Price" })).toBeNull();
    expect(screen.getByRole("option", { name: "PRJ-2026-0001 Hilton WiFi" })).toBeTruthy();
    expect(screen.queryByRole("option", { name: "PRJ-2026-0002 Native IPTV" })).toBeNull();
    expect(screen.getByRole("option", { name: "AST-2026-0001 Switch" })).toBeTruthy();
    expect(screen.queryByRole("option", { name: "AST-2026-0002 AP" })).toBeNull();
  });

  it("clears dependent selections when the account changes", () => {
    render(
      <HelpdeskTicketForm
        accounts={accounts}
        contacts={contacts}
        projects={projects}
        assets={assets}
        queues={[]}
        users={[]}
      />
    );

    fireEvent.change(screen.getByLabelText("Account"), { target: { value: "account-1" } });
    fireEvent.change(screen.getByLabelText("Contact"), { target: { value: "contact-1" } });
    fireEvent.change(screen.getByLabelText("Project"), { target: { value: "project-1" } });
    fireEvent.change(screen.getByLabelText("Asset"), { target: { value: "asset-1" } });

    fireEvent.change(screen.getByLabelText("Account"), { target: { value: "account-2" } });

    expect((screen.getByLabelText("Contact") as HTMLSelectElement).value).toBe("");
    expect((screen.getByLabelText("Project") as HTMLSelectElement).value).toBe("");
    expect((screen.getByLabelText("Asset") as HTMLSelectElement).value).toBe("");
  });
});
