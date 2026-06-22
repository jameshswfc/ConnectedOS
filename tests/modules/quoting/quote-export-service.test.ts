import ExcelJS from "exceljs";
import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { calculateLongProposalCommercials, connectedHospitalityLogoPath, generateCustomerQuotePdfBuffer, generateLongProposalPdfBuffer, generateLongProposalPptxBuffer, longProposalCategoryLabels, mapLineToLongProposalCategory, pdfEngine, pdfFontSource, renderCustomerQuoteHtml } from "@/modules/quoting/quotes/quote-export-service";
import { DEFAULT_QUOTE_TERMS } from "@/modules/quoting/quotes/quote-terms";

describe("quote export service", () => {
  const version = {
    versionNumber: 2,
    sellTotal: 1500,
    terms: DEFAULT_QUOTE_TERMS,
    quote: {
      quoteNumber: "Q-2026-0001",
      title: "Guest Wi-Fi Refresh",
      customerName: "Connected Hospitality Demo Account",
      hotelName: "Demo Hotel",
      projectName: "Wi-Fi Refresh",
      highLevelScope: "Install guest WiFi across public areas.",
      preparedDate: new Date("2026-06-08T00:00:00.000Z"),
      account: { name: "Connected Hospitality Demo Account", addressLine1: "1 Test Street", addressLine2: null, city: "London", county: null, postcode: "SW1A 1AA", country: "United Kingdom" },
      contact: { firstName: "Alex", lastName: "Morgan", email: "alex@example.com", phone: null, mobile: null },
      owner: { displayName: "James Harrison" }
    },
    lines: [
      {
        lineType: "product",
        description: "Access Point",
        quantity: 2,
        unitCost: 400,
        unitSell: 600,
        costTotal: 800,
        sellTotal: 1200,
        marginTotal: 400,
        marginPercent: 33.33,
        product: { sku: "AP-1", manufacturer: "Vendor", supplier: "Supplier", category: "Wireless", leadTimeDays: 7 }
      },
      {
        lineType: "service",
        description: "Configuration",
        quantity: 1,
        unitCost: 100,
        unitSell: 300,
        costTotal: 100,
        sellTotal: 300,
        marginTotal: 200,
        marginPercent: 66.67,
        product: { sku: "SVC-1", manufacturer: "Connected Hospitality", supplier: "Connected Hospitality", category: "Professional Services", leadTimeDays: 0 }
      }
    ]
  };

  it("renders customer quote HTML without internal margin values", () => {
    const html = renderCustomerQuoteHtml(version);

    expect(html).toContain("Connected Hospitality");
    expect(html).toContain(connectedHospitalityLogoPath);
    expect(html).toContain("Customer Details");
    expect(html).toContain("Project Details");
    expect(html).toContain("Quote Reference");
    expect(html).toContain("Q-2026-0001");
    expect(html).toContain("Alex Morgan");
    expect(html).toContain("Wi-Fi Refresh");
    expect(html).toContain("Install guest WiFi across public areas.");
    expect(html).toContain("Access Point");
    expect(html).toContain("Itemised Commercials");
    expect(html).toContain("Quote is valid for 30 days");
    expect(html).toContain("sales@connectedhsp.com");
    expect(html).not.toContain("Terms / Notes Placeholder");
    expect(html).not.toContain("james@connectedhsp.com");
    expect(html).not.toContain("Margin %");
    expect(html).not.toContain("Cost Price");
    expect(html).not.toContain("unitCost");
  });

  it("generates a branded customer PDF", async () => {
    const buffer = await generateCustomerQuotePdfBuffer(version);

    expect(pdfEngine).toBe("pdfkit/js/pdfkit.standalone");
    expect(pdfFontSource).toContain("embedded");
    expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");
    expect(buffer.length).toBeGreaterThan(1000);
  });

  it("generates a PDF with missing optional contact phone, address and project fields", async () => {
    const sparseVersion = {
      ...version,
      quote: {
        ...version.quote,
        projectName: null,
        account: { name: "Sparse Hotel Account", addressLine1: null, addressLine2: null, city: null, county: null, postcode: null, country: null },
        contact: { firstName: "Alex", lastName: "Morgan", email: "alex@example.com", phone: null, mobile: null }
      }
    };
    const html = renderCustomerQuoteHtml(sparseVersion);
    const buffer = await generateCustomerQuotePdfBuffer(sparseVersion);

    expect(html).toContain("Sparse Hotel Account");
    expect(html).toContain("Guest Wi-Fi Refresh");
    expect(html).toContain("Address:</strong> -");
    expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");
    expect(buffer.length).toBeGreaterThan(1000);
  });

  it("can create an Excel workbook with BoM-style content", async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("BoM");
    sheet.columns = [
      { header: "SKU", key: "sku" },
      { header: "Manufacturer", key: "manufacturer" },
      { header: "Supplier", key: "supplier" },
      { header: "Description", key: "description" }
    ];
    sheet.addRow({ sku: "AP-1", manufacturer: "Vendor", supplier: "Supplier", description: "Access Point" });

    const buffer = await workbook.xlsx.writeBuffer();
    const loaded = new ExcelJS.Workbook();
    await loaded.xlsx.load(buffer);

    expect(loaded.getWorksheet("BoM")?.getCell("A2").value).toBe("AP-1");
    expect(loaded.getWorksheet("BoM")?.getCell("D2").value).toBe("Access Point");
  });

  it("maps long proposal commercial categories", () => {
    expect(mapLineToLongProposalCategory(version.lines[0])).toBe("hardware");
    expect(mapLineToLongProposalCategory({ ...version.lines[1], product: { ...version.lines[1].product!, category: "Installation & Cabling" } })).toBe("installationCabling");
    expect(mapLineToLongProposalCategory({ ...version.lines[1], product: { ...version.lines[1].product!, category: "Project Management" } })).toBe("projectManagement");
    expect(mapLineToLongProposalCategory({ ...version.lines[1], product: { ...version.lines[1].product!, category: "Consultancy" } })).toBe("professionalServices");
    expect(mapLineToLongProposalCategory({ ...version.lines[1], product: null })).toBe("hardware");
  });

  it("calculates long proposal totals and hides zero-value categories", () => {
    const commercials = calculateLongProposalCommercials(version.lines);

    expect(commercials.rows).toEqual([
      { category: "hardware", label: longProposalCategoryLabels.hardware, total: 1200 },
      { category: "professionalServices", label: longProposalCategoryLabels.professionalServices, total: 300 }
    ]);
    expect(commercials.total).toBe(1500);
  });

  it("populates long proposal PPTX page 1, page 5 commercials and page 6 terms", async () => {
    const buffer = await generateLongProposalPptxBuffer(version);
    const zip = await JSZip.loadAsync(buffer);
    const slide1 = await zip.file("ppt/slides/slide1.xml")?.async("string");
    const slide5 = await zip.file("ppt/slides/slide5.xml")?.async("string");
    const slide6 = await zip.file("ppt/slides/slide6.xml")?.async("string");
    const presentation = await zip.file("ppt/presentation.xml")?.async("string");
    const presentationRels = await zip.file("ppt/_rels/presentation.xml.rels")?.async("string");
    const contentTypes = await zip.file("[Content_Types].xml")?.async("string");

    expect(slide1).toContain("Connected Hospitality Demo Account");
    expect(slide1).toContain("Wi-Fi Refresh");
    expect(slide1).not.toContain("[Client Name]");
    expect(slide5).toContain("Hardware, Software &amp; Licensing");
    expect(slide5).toContain("Professional Services");
    expect(slide5).not.toContain("Installation &amp; Cabling</a:t>");
    expect(slide5).toContain("Total Sales Price");
    expect(slide5).not.toContain("Quote Terms");
    expect(slide5).not.toContain("Terms &amp; Commercial Notes");
    expect(slide5).not.toContain("Quote is valid for 30 days");
    expect(slide6).toContain("Terms &amp; Commercial Notes");
    expect(slide6).toContain("Quote is valid for 30 days");
    expect(presentation).toContain('<p:sldId id="261"');
    expect(presentationRels).toContain("slides/slide6.xml");
    expect(contentTypes).toContain("/ppt/slides/slide6.xml");
  });

  it("generates a long-form proposal PDF", async () => {
    const buffer = await generateLongProposalPdfBuffer(version);

    expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");
    expect(buffer.length).toBeGreaterThan(1000);
  });
});
