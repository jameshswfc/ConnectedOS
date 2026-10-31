// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LeadConversionForm } from "@/modules/crm/ui/lead-conversion-form";
import { SalesJourney } from "@/modules/crm/ui/sales-journey";
const { push, refresh } = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh }) }));
const props = { lead: { id: "lead", accountId: null, contactId: null, accountName: "QA Hotel", contactName: "Hotel Manager", email: "manager@example.com", phone: null }, accounts: [], contacts: [] };
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.clearAllMocks(); });
describe("sales journey controls", () => {
  it("guards duplicate submit, clears loading, and opens the converted opportunity", async () => {
    let resolve!: (response: Response) => void;
    const fetchMock = vi.fn(() => new Promise<Response>((done) => { resolve = done; }));
    vi.stubGlobal("fetch", fetchMock);
    render(<LeadConversionForm {...props} />);
    const form = screen.getByText("Qualify and Convert").closest("form")!;
    fireEvent.submit(form); fireEvent.submit(form);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(screen.getByText("Converting...")).toBeTruthy();
    resolve(new Response(JSON.stringify({ data: { opportunityId: "opportunity" } }), { status: 200 }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/crm/opportunities/opportunity"));
    expect(screen.getByText("Qualify and Convert")).toBeTruthy();
  });
  it("shows validation without hanging", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ errors: [{ message: "Select an active contact belonging to this account." }] }), { status: 400 })));
    render(<LeadConversionForm {...props} />);
    fireEvent.submit(screen.getByText("Qualify and Convert").closest("form")!);
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Select an active contact"));
    expect(screen.getByText("Qualify and Convert")).toBeTruthy();
  });
  it("shows only provided accessible records and actions, not invented progress", () => {
    render(<SalesJourney steps={[{ title: "Pre-Sales", records: [], emptyLabel: "No accessible pre-sales request" }, { title: "Project", records: [{ id: "project", label: "PRJ-2026-0001", status: "initiation", href: "/projects/project" }], emptyLabel: "No accessible project" }]} />);
    expect(screen.getByText("No accessible pre-sales request")).toBeTruthy();
    expect(screen.getByText("Initiation")).toBeTruthy();
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.getByRole("link").getAttribute("href")).toBe("/projects/project");
  });
});
