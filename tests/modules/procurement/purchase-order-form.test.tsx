// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PurchaseOrderForm } from "@/modules/procurement/ui/purchase-order-form";

describe("purchase order form", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("auto-fills supplier fields and still allows manual override", async () => {
    render(
      <PurchaseOrderForm
        suppliers={[
          {
            id: "supplier-1",
            name: "Hotel Tech Supply",
            address: "1 Supplier Lane",
            contactName: "Sam Buyer",
            contactEmail: "sam@supplier.test"
          }
        ]}
        projects={[]}
        quotes={[]}
        changeRequests={[]}
      />
    );

    fireEvent.change(screen.getByLabelText("Supplier"), { target: { value: "supplier-1" } });

    expect((await screen.findByLabelText("Supplier name") as HTMLInputElement).value).toBe("Hotel Tech Supply");
    expect((screen.getByLabelText("Supplier address") as HTMLTextAreaElement).value).toBe("1 Supplier Lane");
    expect((screen.getByLabelText("Supplier contact name") as HTMLInputElement).value).toBe("Sam Buyer");
    expect((screen.getByLabelText("Supplier contact email") as HTMLInputElement).value).toBe("sam@supplier.test");

    fireEvent.change(screen.getByLabelText("Supplier name"), { target: { value: "Hotel Tech Supply - London" } });
    expect((screen.getByLabelText("Supplier name") as HTMLInputElement).value).toBe("Hotel Tech Supply - London");
  });

  it("calculates line totals with 20 percent tax", async () => {
    render(
      <PurchaseOrderForm
        suppliers={[{ id: "supplier-1", name: "Hotel Tech Supply" }]}
        projects={[]}
        quotes={[]}
        changeRequests={[]}
      />
    );

    fireEvent.change(screen.getByLabelText("SKU / part code"), { target: { value: "SW-24" } });
    fireEvent.change(screen.getByLabelText("Description"), { target: { value: "24-port switch" } });
    fireEvent.change(screen.getByLabelText("Quantity"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("Unit cost"), { target: { value: "125" } });

    await waitFor(() => expect(screen.getByText("Subtotal excluding tax").parentElement?.textContent).toContain("£250.00"));
    expect(screen.getByText("Tax total").parentElement?.textContent).toContain("£50.00");
    expect(screen.getByText("Total including tax").parentElement?.textContent).toContain("£300.00");
  });

  it("imports quote product lines and hides labour lines by default", async () => {
    render(
      <PurchaseOrderForm
        suppliers={[{ id: "supplier-1", name: "Hotel Tech Supply" }]}
        projects={[]}
        quotes={[
          {
            id: "quote-1",
            label: "Q-2026-0001",
            lines: [
              {
                id: "line-product",
                lineType: "product",
                itemType: "product",
                supplierId: "supplier-1",
                supplierName: "Hotel Tech Supply",
                sku: "AP-900",
                manufacturer: "WiFiCo",
                description: "Access point",
                quantity: 4,
                unitCost: 80
              },
              {
                id: "line-labour",
                lineType: "service",
                itemType: "service",
                sku: "LAB-INSTALL",
                manufacturer: "Connected Hospitality",
                description: "Installation labour",
                quantity: 2,
                unitCost: 250
              }
            ]
          }
        ]}
        changeRequests={[]}
      />
    );

    fireEvent.change(screen.getByLabelText("Quote link"), { target: { value: "quote-1" } });

    expect(await screen.findByText(/Access point/)).toBeTruthy();
    expect((screen.getByLabelText("Supplier") as HTMLSelectElement).value).toBe("supplier-1");
    expect(screen.queryByText(/Installation labour/)).toBeNull();

    fireEvent.click(screen.getByLabelText("Show labour/service lines"));
    expect(await screen.findByText(/Installation labour/)).toBeTruthy();

    fireEvent.click(screen.getAllByRole("checkbox").find((checkbox) => (checkbox as HTMLInputElement).checked === false)!);
    fireEvent.click(screen.getByRole("button", { name: "Import Selected Quote Lines" }));

    expect(await screen.findByDisplayValue("AP-900")).toBeTruthy();
    expect(screen.getByDisplayValue("WiFiCo")).toBeTruthy();
    expect(screen.getByDisplayValue("Access point")).toBeTruthy();
  });
});
