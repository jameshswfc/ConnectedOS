import ExcelJS from "exceljs";
import fs from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit/js/pdfkit.standalone";
import JSZip from "jszip";
import { QuoteExportType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/services/audit/audit-service";
import { assertQuotePermission } from "@/modules/quoting/quotes/quote-permissions";
import { assertQuoteVersionExportable } from "@/modules/quoting/quotes/quote-approval-service";
import type { CrmAccessContext } from "@/modules/crm/types/crm-context";

type ExportLine = {
  lineType: string;
  description: string;
  quantity: unknown;
  unitCost: unknown;
  unitSell: unknown;
  costTotal: unknown;
  sellTotal: unknown;
  marginTotal: unknown;
  marginPercent: unknown;
  product?: {
    sku: string;
    manufacturer: string;
    supplier: string;
    category?: string | null;
    leadTimeDays: number | null;
  } | null;
};

type ExportVersion = {
  versionNumber: number;
  sellTotal: unknown;
  costTotal?: unknown;
  marginTotal?: unknown;
  marginPercent?: unknown;
  terms: string;
  quote: {
    quoteNumber: string;
    title: string;
    customerName: string | null;
    hotelName: string | null;
    projectName: string | null;
    highLevelScope: string;
    preparedDate: Date | null;
    account: { name: string; addressLine1?: string | null; addressLine2?: string | null; city?: string | null; county?: string | null; postcode?: string | null; country?: string | null };
    opportunity?: { opportunityName?: string | null } | null;
    contact?: { firstName: string; lastName: string; email?: string | null; phone?: string | null; mobile?: string | null } | null;
    owner?: { displayName: string } | null;
  };
  lines: ExportLine[];
};

const brand = {
  purple: "4B1F73",
  orange: "F28C28",
  dark: "172033",
  pale: "F5F3F8"
};

export const connectedHospitalityLogoPath = "/branding/connected-hospitality-logo.png";
export const longProposalTemplatePath = "/templates/connected-hospitality-long-form-proposal-template.pptx";
export const pdfEngine = "pdfkit/js/pdfkit.standalone";
export const pdfFontSource = "embedded standard PDF AFM font data";
export type LongProposalCommercialCategory = "hardware" | "professionalServices" | "installationCabling" | "projectManagement";

export const longProposalCategoryLabels: Record<LongProposalCommercialCategory, string> = {
  hardware: "Hardware, Software & Licensing",
  professionalServices: "Professional Services",
  installationCabling: "Installation & Cabling",
  projectManagement: "Project Management"
};

export async function exportQuotePdf(context: CrmAccessContext, quoteId: string, versionId: string) {
  assertQuotePermission(context, "quotes.export");
  const version = await assertQuoteVersionExportable(context, quoteId, versionId);
  let buffer: Buffer;
  try {
    buffer = await generateCustomerQuotePdfBuffer(version as ExportVersion);
  } catch (error) {
    console.error("PDF export failed", {
      quoteId,
      versionId,
      quoteNumber: version.quote.quoteNumber,
      hasAccount: Boolean(version.quote.account),
      hasContact: Boolean(version.quote.contact),
      hasOpportunity: Boolean(version.quote.opportunity),
      logoPath: getLogoFilePath(),
      pdfEngine,
      pdfFontSource,
      error
    });
    throw new Error(`PDF export failed for ${version.quote.quoteNumber}`);
  }
  const filename = `${version.quote.quoteNumber}-v${version.versionNumber}.pdf`;
  await recordQuoteExport(context, quoteId, versionId, QuoteExportType.pdf_quote, filename);
  return { filename, contentType: "application/pdf", buffer };
}

export async function exportQuoteLongProposalPptx(context: CrmAccessContext, quoteId: string, versionId: string) {
  assertQuotePermission(context, "quotes.export");
  const version = await assertQuoteVersionExportable(context, quoteId, versionId);
  const buffer = await generateLongProposalPptxBuffer(version as ExportVersion);
  const filename = `${version.quote.quoteNumber}-v${version.versionNumber}-long-proposal.pptx`;
  await recordQuoteExport(context, quoteId, versionId, QuoteExportType.long_proposal_pptx, filename);
  return { filename, contentType: "application/vnd.openxmlformats-officedocument.presentationml.presentation", buffer };
}

export async function exportQuoteLongProposalPdf(context: CrmAccessContext, quoteId: string, versionId: string) {
  assertQuotePermission(context, "quotes.export");
  const version = await assertQuoteVersionExportable(context, quoteId, versionId);
  const buffer = await generateLongProposalPdfBuffer(version as ExportVersion);
  const filename = `${version.quote.quoteNumber}-v${version.versionNumber}-long-proposal.pdf`;
  await recordQuoteExport(context, quoteId, versionId, QuoteExportType.long_proposal_pdf, filename);
  return { filename, contentType: "application/pdf", buffer };
}

export async function exportQuoteExcelBom(context: CrmAccessContext, quoteId: string, versionId: string) {
  assertQuotePermission(context, "quotes.export");
  const version = await assertQuoteVersionExportable(context, quoteId, versionId);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "ConnectedOS";
  const sheet = workbook.addWorksheet("BoM");
  sheet.columns = [
    { key: "sku", width: 18 },
    { key: "manufacturer", width: 22 },
    { key: "supplier", width: 22 },
    { key: "description", width: 48 },
    { key: "quantity", width: 12 },
    { key: "leadTime", width: 14 },
    { key: "costPrice", width: 14 },
    { key: "sellPrice", width: 14 }
  ];
  addWorkbookHeader(workbook, sheet, version, "Customer BoM");
  addTableHeader(sheet, ["SKU", "Manufacturer", "Supplier", "Description", "Quantity", "Lead Time", "Cost Price", "Sell Price"]);
  addSectionedRows(sheet, version.lines as ExportLine[], false);
  formatMoneyColumns(sheet, ["G", "H"]);
  const filename = `${version.quote.quoteNumber}-v${version.versionNumber}-bom.xlsx`;
  await recordQuoteExport(context, quoteId, versionId, QuoteExportType.excel_bom, filename);
  return { filename, contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: Buffer.from(await workbook.xlsx.writeBuffer()) };
}

export async function exportQuoteInternalMarginSheet(context: CrmAccessContext, quoteId: string, versionId: string) {
  assertQuotePermission(context, "quotes.export");
  const version = await assertQuoteVersionExportable(context, quoteId, versionId);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "ConnectedOS";
  const sheet = workbook.addWorksheet("Internal Margin");
  sheet.columns = [
    { key: "sku", width: 18 },
    { key: "description", width: 48 },
    { key: "quantity", width: 12 },
    { key: "cost", width: 14 },
    { key: "sell", width: 14 },
    { key: "margin", width: 14 },
    { key: "marginPercent", width: 14 },
    { key: "supplier", width: 22 }
  ];
  addWorkbookHeader(workbook, sheet, version, "Internal Margin Sheet");
  addTableHeader(sheet, ["SKU", "Description", "Quantity", "Cost", "Sell", "Margin", "Margin %", "Supplier"]);
  addSectionedRows(sheet, version.lines as ExportLine[], true);
  sheet.addRow({});
  const totalRow = sheet.addRow({ description: "Grand total", cost: Number(version.costTotal), sell: Number(version.sellTotal), margin: Number(version.marginTotal), marginPercent: Number(version.marginPercent) / 100 });
  styleTotalRow(totalRow);
  formatMoneyColumns(sheet, ["D", "E", "F"]);
  sheet.getColumn("G").numFmt = "0.00%";
  const filename = `${version.quote.quoteNumber}-v${version.versionNumber}-margin.xlsx`;
  await recordQuoteExport(context, quoteId, versionId, QuoteExportType.internal_margin_sheet, filename);
  return { filename, contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: Buffer.from(await workbook.xlsx.writeBuffer()) };
}

export function renderCustomerQuoteHtml(version: ExportVersion) {
  const quote = version.quote;
  const preparedDate = quote.preparedDate ? quote.preparedDate.toLocaleDateString("en-GB") : new Date().toLocaleDateString("en-GB");
  const address = [quote.account.addressLine1, quote.account.addressLine2, quote.account.city, quote.account.county, quote.account.postcode, quote.account.country].filter(Boolean).join(", ");
  const contactName = quote.contact ? `${quote.contact.firstName} ${quote.contact.lastName}` : "-";
  const contactDetail = quote.contact ? [quote.contact.email, quote.contact.phone, quote.contact.mobile].filter(Boolean).join(" | ") : "";
  const lineSections = groupedLineSections(version.lines)
    .map((section) => {
      const rows = section.lines.map((line) => `<tr><td>${escapeHtml(line.product?.sku ?? "")}</td><td>${escapeHtml(line.description)}</td><td>${Number(line.quantity)}</td><td>${formatMoney(line.unitSell)}</td><td>${formatMoney(line.sellTotal)}</td></tr>`).join("");
      return `<h3>${escapeHtml(section.label)}</h3><table><thead><tr><th>SKU / Part Code</th><th>Description</th><th>Quantity</th><th>Unit Sell</th><th>Total Sell</th></tr></thead><tbody>${rows}</tbody></table>`;
    })
    .join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(quote.quoteNumber)}</title><style>body{font-family:Arial,sans-serif;color:#172033;margin:0;background:#fff}.top{background:#4B1F73;color:white;padding:34px 44px 32px;border-bottom:8px solid #F28C28}.logo{width:150px;background:white;padding:8px;border-radius:6px}.company{font-size:12px;line-height:1.5;color:#f8fafc}.quote-ref{float:right;text-align:right;font-size:13px;line-height:1.7}.title{padding:34px 44px 16px}h1{font-size:32px;margin:0;color:#4B1F73}.grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;padding:0 44px 24px}.panel{min-height:180px;border:1px solid #d8dee9;border-top:5px solid #F28C28;padding:14px}.panel h2,.section{color:#4B1F73;margin:0 0 10px;font-size:16px}.scope{margin:0 44px 24px;background:#F5F3F8;border-left:6px solid #F28C28;padding:16px;white-space:pre-wrap}.commercial{padding:0 44px 36px}h3{color:#4B1F73;border-bottom:2px solid #F28C28;padding-bottom:5px;margin-top:22px}table{width:100%;border-collapse:collapse;margin-top:10px;font-size:12px}th,td{border-bottom:1px solid #d8dee9;padding:9px;text-align:left;vertical-align:top}th{background:#4B1F73;color:white}.total{text-align:right;font-size:22px;margin-top:22px;color:#4B1F73;font-weight:bold}.terms{margin:28px 44px 0;padding-top:14px;border-top:3px solid #4B1F73;font-size:12px;color:#64748b;white-space:pre-wrap}</style></head><body><header class="top"><div class="quote-ref"><strong>Quote Reference</strong><br>${escapeHtml(quote.quoteNumber)}<br><strong>Version</strong> ${version.versionNumber}<br><strong>Prepared</strong> ${preparedDate}</div><img class="logo" src="${connectedHospitalityLogoPath}" alt="Connected Hospitality logo"><p class="company">Connected Hospitality<br>Technology solutions for hospitality environments<br>Where hospitality meets innovation</p></header><section class="title"><h1>${escapeHtml(quote.projectName || quote.title)}</h1></section><section class="grid"><div class="panel"><h2>Customer Details</h2><p><strong>Account:</strong> ${escapeHtml(quote.account.name)}</p><p><strong>Contact:</strong> ${escapeHtml(contactName)}</p><p><strong>Contact Details:</strong> ${escapeHtml(contactDetail || "-")}</p><p><strong>Address:</strong> ${escapeHtml(address || "-")}</p></div><div class="panel"><h2>Project Details</h2><p><strong>Opportunity / Project:</strong> ${escapeHtml(quote.projectName || quote.title)}</p><p><strong>Prepared By:</strong> ${escapeHtml(quote.owner?.displayName || "Connected Hospitality")}</p><p><strong>Prepared Date:</strong> ${preparedDate}</p></div></section><section class="scope"><h2 class="section">High Level Scope</h2>${escapeHtml(quote.highLevelScope)}</section><main class="commercial"><h2 class="section">Itemised Commercials</h2>${lineSections}<p class="total">Total: ${formatMoney(version.sellTotal)}</p></main><footer class="terms"><strong>Terms</strong><br>${escapeHtml(version.terms)}<br><br>Connected Hospitality | sales@connectedhsp.com</footer></body></html>`;
}

export async function generateCustomerQuotePdfBuffer(version: ExportVersion) {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 42, bufferPages: true, info: { Title: version.quote.quoteNumber, Author: "Connected Hospitality" } });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("error", reject);
    doc.on("end", () => resolve(Buffer.concat(chunks)));

    drawPdfHeader(doc, version);
    drawPdfInfoPanels(doc, version);
    drawPdfScope(doc, version.quote.highLevelScope);
    drawPdfCommercials(doc, version);
    drawPdfFooter(doc, version.terms);
    doc.end();
  });
}

export function htmlToPdfBuffer(html: string) {
  const textLines = html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 45);
  const content = textLines.map((line, index) => `BT /F1 10 Tf 50 ${760 - index * 15} Td (${escapePdfText(line)}) Tj ET`).join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf);
}

function drawPdfHeader(doc: PDFKit.PDFDocument, version: ExportVersion) {
  const quote = version.quote;
  const preparedDate = quote.preparedDate ? quote.preparedDate.toLocaleDateString("en-GB") : new Date().toLocaleDateString("en-GB");
  doc.save();
  doc.rect(0, 0, doc.page.width, 132).fill(`#${brand.purple}`);
  doc.rect(0, 124, doc.page.width, 8).fill(`#${brand.orange}`);
  const logoImage = getLogoImage();
  if (logoImage) {
    doc.roundedRect(42, 24, 136, 72, 6).fill("#ffffff");
    try {
      doc.image(logoImage.dataUrl, 50, 31, { fit: [120, 58], align: "center", valign: "center" });
    } catch (error) {
      console.warn("Connected Hospitality logo could not be embedded in PDF; using text fallback.", { logoPath: logoImage.path, pdfEngine, error });
      doc.fillColor(`#${brand.purple}`).fontSize(11).font("Helvetica-Bold").text("Connected Hospitality", 54, 58, { width: 112, align: "center" });
    }
  } else {
    doc.fillColor("#ffffff").fontSize(20).font("Helvetica-Bold").text("Connected Hospitality", 42, 36, { width: 180 });
  }
  doc.fillColor("#ffffff").fontSize(10).font("Helvetica").text("Connected Hospitality", 202, 34);
  doc.fillColor("#f8fafc").fontSize(9).text("Technology solutions for hospitality environments", 202, 51);
  doc.fillColor(`#${brand.orange}`).fontSize(9).font("Helvetica-Bold").text("Where hospitality meets innovation", 202, 68);
  doc.fillColor("#ffffff").fontSize(9).font("Helvetica-Bold").text("QUOTE REFERENCE", 414, 32, { width: 138, align: "right" });
  doc.fontSize(13).text(quote.quoteNumber, 414, 48, { width: 138, align: "right" });
  doc.fontSize(9).font("Helvetica").text(`Version ${version.versionNumber}`, 414, 68, { width: 138, align: "right" });
  doc.text(`Prepared ${preparedDate}`, 414, 83, { width: 138, align: "right" });
  doc.restore();

  doc.fillColor(`#${brand.purple}`).font("Helvetica-Bold").fontSize(24).text(quote.projectName || quote.title, 42, 160, { width: 510 });
  doc.fillColor(`#${brand.dark}`).font("Helvetica").fontSize(10).text("Commercial quote prepared for review and approval.", 42, 192);
  doc.moveTo(42, 214).lineTo(552, 214).lineWidth(1.5).strokeColor(`#${brand.orange}`).stroke();
}

function drawPdfInfoPanels(doc: PDFKit.PDFDocument, version: ExportVersion) {
  const quote = version.quote;
  const contactName = quote.contact ? `${quote.contact.firstName} ${quote.contact.lastName}` : "-";
  const contactDetail = quote.contact ? [quote.contact.email, quote.contact.phone, quote.contact.mobile].filter(Boolean).join(" | ") : "";
  const address = [quote.account.addressLine1, quote.account.addressLine2, quote.account.city, quote.account.county, quote.account.postcode, quote.account.country].filter(Boolean).join(", ");
  const preparedDate = quote.preparedDate ? quote.preparedDate.toLocaleDateString("en-GB") : new Date().toLocaleDateString("en-GB");

  const customerBottom = drawPdfPanel(doc, 42, 234, 244, "Customer Details", [
    ["Account", quote.account.name],
    ["Contact", contactName],
    ["Contact Details", contactDetail || "-"],
    ["Address", address || "-"]
  ]);
  const projectBottom = drawPdfPanel(doc, 308, 234, 244, "Project Details", [
    ["Opportunity / Project", quote.projectName || quote.title],
    ["Prepared By", quote.owner?.displayName || "Connected Hospitality"],
    ["Prepared Date", preparedDate],
    ["Quote Version", String(version.versionNumber)]
  ]);
  doc.y = Math.max(customerBottom, projectBottom) + 24;
}

function drawPdfPanel(doc: PDFKit.PDFDocument, x: number, y: number, width: number, title: string, rows: [string, string][]) {
  const rowHeights = rows.map(([, value]) => 18 + Math.max(14, doc.heightOfString(value, { width: width - 24, lineGap: 1 })));
  const panelHeight = Math.max(184, 52 + rowHeights.reduce((total, height) => total + height, 0));
  doc.save();
  doc.roundedRect(x, y, width, panelHeight, 4).lineWidth(0.8).strokeColor("#d8dee9").stroke();
  doc.rect(x, y, width, 7).fill(`#${brand.orange}`);
  doc.fillColor(`#${brand.purple}`).font("Helvetica-Bold").fontSize(12).text(title, x + 12, y + 18, { width: width - 24 });
  let cursorY = y + 40;
  for (const [label, value] of rows) {
    doc.fillColor("#64748b").font("Helvetica-Bold").fontSize(8).text(label.toUpperCase(), x + 12, cursorY, { width: width - 24 });
    cursorY += 10;
    doc.fillColor(`#${brand.dark}`).font("Helvetica").fontSize(9).text(value, x + 12, cursorY, { width: width - 24, lineGap: 1 });
    cursorY += Math.max(18, doc.heightOfString(value, { width: width - 24 }) + 8);
  }
  doc.restore();
  return y + panelHeight;
}

function drawPdfScope(doc: PDFKit.PDFDocument, scope: string) {
  const boxY = doc.y;
  const textHeight = doc.heightOfString(scope, { width: 474 });
  const boxHeight = Math.max(92, textHeight + 52);
  doc.roundedRect(42, boxY, 510, boxHeight, 4).fill(`#${brand.pale}`);
  doc.rect(42, boxY, 7, boxHeight).fill(`#${brand.orange}`);
  doc.fillColor(`#${brand.purple}`).font("Helvetica-Bold").fontSize(13).text("High Level Scope", 62, boxY + 16);
  doc.fillColor(`#${brand.dark}`).font("Helvetica").fontSize(10).text(scope, 62, boxY + 38, { width: 466, lineGap: 2 });
  doc.y = boxY + boxHeight + 26;
}

function drawPdfCommercials(doc: PDFKit.PDFDocument, version: ExportVersion) {
  doc.fillColor(`#${brand.purple}`).font("Helvetica-Bold").fontSize(15).text("Itemised Commercials", 42, doc.y);
  doc.moveDown(0.8);
  for (const section of groupedLineSections(version.lines)) {
    ensurePdfSpace(doc, 92);
    doc.fillColor(`#${brand.purple}`).font("Helvetica-Bold").fontSize(12).text(section.label, 42, doc.y);
    doc.moveDown(0.4);
    drawPdfTableHeader(doc);
    for (const line of section.lines) drawPdfLineRow(doc, line);
    const subtotal = section.lines.reduce((total, line) => total + Number(line.sellTotal), 0);
    drawPdfSubtotalRow(doc, `${section.label} subtotal`, subtotal);
    doc.moveDown(0.4);
  }
  ensurePdfSpace(doc, 78);
  doc.moveDown(0.5);
  doc.rect(356, doc.y, 196, 44).fill(`#${brand.purple}`);
  doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(10).text("TOTAL", 372, doc.y + 10);
  doc.fontSize(17).text(formatMoney(version.sellTotal), 428, doc.y - 10, { width: 108, align: "right" });
  doc.y += 58;
}

function drawPdfTableHeader(doc: PDFKit.PDFDocument) {
  const y = doc.y;
  doc.rect(42, y, 510, 24).fill(`#${brand.dark}`);
  doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(8);
  doc.text("SKU / Part Code", 50, y + 8, { width: 82 });
  doc.text("Description", 140, y + 8, { width: 206 });
  doc.text("Qty", 354, y + 8, { width: 38, align: "right" });
  doc.text("Unit Sell", 402, y + 8, { width: 62, align: "right" });
  doc.text("Total Sell", 474, y + 8, { width: 68, align: "right" });
  doc.y = y + 24;
}

function drawPdfLineRow(doc: PDFKit.PDFDocument, line: ExportLine) {
  const descriptionHeight = doc.heightOfString(line.description, { width: 206 });
  const rowHeight = Math.max(26, descriptionHeight + 14);
  ensurePdfSpace(doc, rowHeight + 10);
  const y = doc.y;
  doc.rect(42, y, 510, rowHeight).fill("#ffffff");
  doc.moveTo(42, y + rowHeight).lineTo(552, y + rowHeight).lineWidth(0.5).strokeColor("#d8dee9").stroke();
  doc.fillColor(`#${brand.dark}`).font("Helvetica").fontSize(8);
  doc.text(line.product?.sku ?? "", 50, y + 8, { width: 82 });
  doc.text(line.description, 140, y + 8, { width: 206 });
  doc.text(String(Number(line.quantity)), 354, y + 8, { width: 38, align: "right" });
  doc.text(formatMoney(line.unitSell), 402, y + 8, { width: 62, align: "right" });
  doc.text(formatMoney(line.sellTotal), 474, y + 8, { width: 68, align: "right" });
  doc.y = y + rowHeight;
}

function drawPdfSubtotalRow(doc: PDFKit.PDFDocument, label: string, subtotal: number) {
  ensurePdfSpace(doc, 28);
  const y = doc.y;
  doc.rect(356, y, 196, 26).fill("#f8fafc");
  doc.fillColor(`#${brand.dark}`).font("Helvetica-Bold").fontSize(8).text(label, 372, y + 8, { width: 72 });
  doc.text(formatMoney(subtotal), 456, y + 8, { width: 80, align: "right" });
  doc.y = y + 32;
}

function drawPdfFooter(doc: PDFKit.PDFDocument, terms: string) {
  ensurePdfSpace(doc, 120);
  doc.moveTo(42, doc.y).lineTo(552, doc.y).lineWidth(2).strokeColor(`#${brand.purple}`).stroke();
  doc.moveDown(0.7);
  doc.fillColor(`#${brand.dark}`).font("Helvetica-Bold").fontSize(10).text("Terms", 42, doc.y);
  doc.fillColor("#64748b").font("Helvetica").fontSize(8.5).text(terms, 42, doc.y + 16, { width: 510, lineGap: 2 });
  doc.moveDown(1);
  doc.fillColor(`#${brand.purple}`).font("Helvetica-Bold").fontSize(9).text("Connected Hospitality | sales@connectedhsp.com", 42, doc.y);
}

function ensurePdfSpace(doc: PDFKit.PDFDocument, height: number) {
  if (doc.y + height <= doc.page.height - 64) return;
  doc.addPage();
  doc.y = 42;
}

export function mapLineToLongProposalCategory(line: ExportLine): LongProposalCommercialCategory {
  if (line.lineType === "product") return "hardware";
  const category = line.product?.category?.trim().toLowerCase();
  if (!category) return "hardware";
  if (category.includes("installation") || category.includes("cabling")) return "installationCabling";
  if (category.includes("project management")) return "projectManagement";
  if (line.lineType === "labour" || line.lineType === "service") return "professionalServices";
  return "hardware";
}

export function calculateLongProposalCommercials(lines: ExportLine[]) {
  const totals: Record<LongProposalCommercialCategory, number> = {
    hardware: 0,
    professionalServices: 0,
    installationCabling: 0,
    projectManagement: 0
  };
  for (const line of lines) {
    if (line.lineType === "note") continue;
    totals[mapLineToLongProposalCategory(line)] += Number(line.sellTotal);
  }
  const rows = (Object.keys(totals) as LongProposalCommercialCategory[])
    .map((category) => ({ category, label: longProposalCategoryLabels[category], total: roundMoney(totals[category]) }))
    .filter((row) => row.total > 0);
  return {
    rows,
    total: roundMoney(rows.reduce((sum, row) => sum + row.total, 0))
  };
}

export async function generateLongProposalPptxBuffer(version: ExportVersion) {
  const templatePath = getLongProposalTemplateFilePath();
  if (!templatePath) throw new Error("Long-form proposal template not found");
  const zip = await JSZip.loadAsync(fs.readFileSync(templatePath));
  const slide1Path = "ppt/slides/slide1.xml";
  const slide5Path = "ppt/slides/slide5.xml";
  const slide1 = await zip.file(slide1Path)?.async("string");
  const slide5 = await zip.file(slide5Path)?.async("string");
  if (!slide1 || !slide5) throw new Error("Long-form proposal template slides not found");

  zip.file(slide1Path, populateLongProposalSlide1(slide1, version));
  zip.file(slide5Path, populateLongProposalSlide5(slide5, version));
  await addLongProposalTermsSlide(zip, version);
  return Buffer.from(await zip.generateAsync({ type: "nodebuffer" }));
}

export async function generateLongProposalPdfBuffer(version: ExportVersion) {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 42, bufferPages: true, info: { Title: `${version.quote.quoteNumber} Long Proposal`, Author: "Connected Hospitality" } });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("error", reject);
    doc.on("end", () => resolve(Buffer.concat(chunks)));

    drawLongProposalCover(doc, version);
    doc.addPage();
    drawLongProposalFixedPage(doc, "PROPOSED SOLUTION", "One estate. One accountable delivery partner.", [
      "Wi-Fi & networks, connectivity, guest technology, security, infrastructure and managed services.",
      "Strategic vendor ecosystem aligned to hospitality environments.",
      "Outcome focus: better connectivity, stronger resilience, simpler support and clearer accountability."
    ], "02");
    doc.addPage();
    drawLongProposalFixedPage(doc, "STRATEGIC RELATIONSHIP", "Preferred UK & Ireland delivery partner for hospitality technology delivery.", [
      "Brand-standard delivery with technical governance and practical implementation capability.",
      "In-house project managers, consultants and technical delivery teams.",
      "Full estate extension across networks, CCTV, telephony, IPTV, structured cabling, racks, UPS and lifecycle support."
    ], "03");
    doc.addPage();
    drawLongProposalFixedPage(doc, "SCOPE OF WORKS", "Consultancy-led delivery. Practical implementation. Managed handover.", [
      "Discover, design, validate, deliver and handover.",
      "Project management, consultancy, design, configuration and commissioning are delivered in-house.",
      "Physical installation is delivered through trusted installation partners under Connected Hospitality governance."
    ], "04");
    doc.addPage();
    drawLongProposalCommercialPage(doc, version);
    doc.end();
  });
}

function populateLongProposalSlide1(xml: string, version: ExportVersion) {
  return replaceText(replaceText(xml, "[Client Name]", version.quote.account.name), "[Project Name]", version.quote.projectName || version.quote.opportunity?.opportunityName || version.quote.title);
}

function populateLongProposalSlide5(xml: string, version: ExportVersion) {
  const commercials = calculateLongProposalCommercials(version.lines);
  const rowValues: Record<LongProposalCommercialCategory, string> = {
    hardware: "",
    professionalServices: "",
    installationCabling: "",
    projectManagement: ""
  };
  for (const row of commercials.rows) rowValues[row.category] = formatMoney(row.total);

  let nextXml = xml;
  nextXml = replaceText(nextXml, "Hardware, Software & Licensing", rowValues.hardware ? longProposalCategoryLabels.hardware : "");
  nextXml = replaceText(nextXml, "Connectivity / SIP / Services", "");
  nextXml = replaceText(nextXml, "Professional Services", rowValues.professionalServices ? longProposalCategoryLabels.professionalServices : "");
  nextXml = replaceText(nextXml, "Installation & Cabling", rowValues.installationCabling ? longProposalCategoryLabels.installationCabling : "");
  nextXml = replaceText(nextXml, "Project Management", rowValues.projectManagement ? longProposalCategoryLabels.projectManagement : "");
  nextXml = replaceText(nextXml, "Total Project Investment", "Total Sales Price");
  nextXml = replaceCurrencyPlaceholders(nextXml, [
    rowValues.hardware,
    "",
    rowValues.professionalServices,
    rowValues.installationCabling,
    rowValues.projectManagement,
    formatMoney(commercials.total)
  ]);
  return nextXml;
}

async function addLongProposalTermsSlide(zip: JSZip, version: ExportVersion) {
  const slidePath = "ppt/slides/slide6.xml";
  const slideRelsPath = "ppt/slides/_rels/slide6.xml.rels";
  const contentTypesPath = "[Content_Types].xml";
  const presentationPath = "ppt/presentation.xml";
  const presentationRelsPath = "ppt/_rels/presentation.xml.rels";
  const [contentTypes, presentation, presentationRels] = await Promise.all([
    zip.file(contentTypesPath)?.async("string"),
    zip.file(presentationPath)?.async("string"),
    zip.file(presentationRelsPath)?.async("string")
  ]);
  if (!contentTypes || !presentation || !presentationRels) throw new Error("Long-form proposal package metadata not found");

  zip.file(slidePath, buildLongProposalTermsSlideXml(version));
  zip.file(
    slideRelsPath,
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/></Relationships>`
  );

  if (!contentTypes.includes('/ppt/slides/slide6.xml"')) {
    zip.file(contentTypesPath, contentTypes.replace("</Types>", '<Override PartName="/ppt/slides/slide6.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/></Types>'));
  }

  const existingRelId = getSlideRelationshipId(presentationRels, "slides/slide6.xml");
  const slideRelId = existingRelId ?? nextRelationshipId(presentationRels);
  if (!existingRelId) {
    zip.file(
      presentationRelsPath,
      presentationRels.replace(
        "</Relationships>",
        `<Relationship Id="${slideRelId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide6.xml"/></Relationships>`
      )
    );
  }

  if (!presentation.includes(`r:id="${slideRelId}"`)) {
    zip.file(presentationPath, presentation.replace("</p:sldIdLst>", `<p:sldId id="${nextSlideId(presentation)}" r:id="${slideRelId}"/></p:sldIdLst>`));
  }

  const appProps = await zip.file("docProps/app.xml")?.async("string");
  if (appProps) zip.file("docProps/app.xml", appProps.replace(/<Slides>\d+<\/Slides>/, "<Slides>6</Slides>"));
}

function buildLongProposalTermsSlideXml(version: ExportVersion) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
      ${pptxRectShape(2, 0, 0, 180000, 10688638, brand.purple)}
      ${pptxRectShape(3, 180000, 0, 70000, 10688638, brand.orange)}
      ${pptxTextShape(4, "Section Label", "COMMERCIAL TERMS", 650000, 650000, 4200000, 300000, 760, brand.orange, true)}
      ${pptxTextShape(5, "Terms & Commercial Notes", "Terms & Commercial Notes", 650000, 1030000, 6000000, 640000, 1650, brand.purple, true)}
      ${pptxTextShape(6, "Quote Reference", `${version.quote.quoteNumber} | Version ${version.versionNumber}`, 650000, 1720000, 4600000, 300000, 760, "64748B", false)}
      ${pptxTextShape(7, "Terms Content", version.terms, 650000, 2260000, 6260000, 6150000, 860, brand.dark, false)}
      ${pptxTextShape(8, "Footer", "Connected Hospitality  |  Hospitality Technology Consultancy & Delivery Specialists  |  UK & Ireland", 650000, 9840000, 5000000, 260000, 620, "64748B", false)}
      ${pptxTextShape(9, "Page Number", "06", 6500000, 9840000, 420000, 260000, 760, brand.purple, true)}
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sld>`;
}

function drawLongProposalCover(doc: PDFKit.PDFDocument, version: ExportVersion) {
  drawLongProposalPageChrome(doc, "01");
  const logoImage = getLogoImage();
  if (logoImage) doc.image(logoImage.dataUrl, 58, 56, { fit: [130, 76] });
  doc.fillColor(`#${brand.orange}`).font("Helvetica-Bold").fontSize(11).text("PROPOSAL", 58, 176);
  doc.fillColor(`#${brand.purple}`).fontSize(30).text(version.quote.account.name, 58, 214, { width: 480 });
  doc.fillColor(`#${brand.dark}`).fontSize(20).text(version.quote.projectName || version.quote.opportunity?.opportunityName || version.quote.title, 58, 292, { width: 440 });
  doc.fillColor("#64748b").font("Helvetica").fontSize(11).text("Technology infrastructure proposal", 58, 340, { width: 420 });
}

function drawLongProposalFixedPage(doc: PDFKit.PDFDocument, title: string, subtitle: string, bullets: string[], pageNumber: string) {
  drawLongProposalPageChrome(doc, pageNumber);
  doc.fillColor(`#${brand.orange}`).font("Helvetica-Bold").fontSize(10).text(title, 58, 72);
  doc.fillColor(`#${brand.purple}`).fontSize(24).text(subtitle, 58, 110, { width: 455 });
  let y = 210;
  for (const bullet of bullets) {
    doc.roundedRect(58, y, 480, 72, 6).fill("#f8fafc");
    doc.fillColor(`#${brand.dark}`).font("Helvetica").fontSize(11).text(bullet, 78, y + 20, { width: 440, lineGap: 2 });
    y += 96;
  }
}

function drawLongProposalCommercialPage(doc: PDFKit.PDFDocument, version: ExportVersion) {
  drawLongProposalPageChrome(doc, "05");
  const commercials = calculateLongProposalCommercials(version.lines);
  doc.fillColor(`#${brand.orange}`).font("Helvetica-Bold").fontSize(10).text("COMMERCIAL PROPOSAL", 58, 72);
  doc.fillColor(`#${brand.purple}`).fontSize(23).text("Clear scope. Transparent pricing. Confident next steps.", 58, 110, { width: 455 });
  doc.fillColor(`#${brand.dark}`).fontSize(15).text("Investment summary", 58, 190);
  let y = 232;
  for (const row of commercials.rows) {
    doc.fillColor("#64748b").font("Helvetica").fontSize(11).text(row.label, 70, y, { width: 310 });
    doc.fillColor(`#${brand.dark}`).font("Helvetica-Bold").fontSize(11).text(formatMoney(row.total), 400, y, { width: 120, align: "right" });
    y += 34;
  }
  doc.moveTo(70, y + 2).lineTo(520, y + 2).strokeColor(`#${brand.orange}`).lineWidth(1.2).stroke();
  doc.fillColor(`#${brand.purple}`).font("Helvetica-Bold").fontSize(13).text("Total Sales Price", 70, y + 18);
  doc.text(formatMoney(commercials.total), 400, y + 18, { width: 120, align: "right" });
  doc.fillColor(`#${brand.dark}`).fontSize(12).text("Terms", 58, y + 82);
  doc.fillColor("#64748b").font("Helvetica").fontSize(9).text(version.terms, 58, y + 106, { width: 470, lineGap: 2 });
}

function drawLongProposalPageChrome(doc: PDFKit.PDFDocument, pageNumber: string) {
  doc.rect(0, 0, doc.page.width, doc.page.height).fill("#ffffff");
  doc.rect(0, 0, 16, doc.page.height).fill(`#${brand.purple}`);
  doc.rect(16, 0, 6, doc.page.height).fill(`#${brand.orange}`);
  doc.fillColor("#64748b").font("Helvetica").fontSize(8).text("Connected Hospitality  |  Hospitality Technology Consultancy & Delivery Specialists  |  UK & Ireland", 58, 806, { width: 420 });
  doc.fillColor(`#${brand.purple}`).font("Helvetica-Bold").fontSize(10).text(pageNumber, 520, 806, { width: 40, align: "right" });
}

async function recordQuoteExport(context: CrmAccessContext, quoteId: string, quoteVersionId: string, exportType: QuoteExportType, filename: string) {
  const quoteExport = await prisma.quoteExport.create({
    data: { quoteId, quoteVersionId, exportType, filename, generatedById: context.userId }
  });
  await createAuditLog({ userId: context.userId, module: "quoting", entityType: "QuoteExport", entityId: quoteExport.id, action: "export_generation", newValue: quoteExport });
  return quoteExport;
}

function formatMoney(value: unknown) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(Number(value));
}

function formatMoneyColumns(sheet: ExcelJS.Worksheet, columns: string[]) {
  for (const column of columns) sheet.getColumn(column).numFmt = '"£"#,##0.00';
  sheet.getRow(1).font = { bold: true };
}

function addWorkbookHeader(workbook: ExcelJS.Workbook, sheet: ExcelJS.Worksheet, version: { versionNumber: number; quote: { quoteNumber: string; title: string; projectName: string | null; account: { name: string }; contact?: { firstName: string; lastName: string } | null } }, title: string) {
  addWorkbookLogo(workbook, sheet);
  sheet.addRow(["", "", "Connected Hospitality", title]);
  sheet.addRow(["", "", "Quote Reference", version.quote.quoteNumber, "Version", version.versionNumber]);
  sheet.addRow(["", "", "Account", version.quote.account.name, "Contact", version.quote.contact ? `${version.quote.contact.firstName} ${version.quote.contact.lastName}` : "-"]);
  sheet.addRow(["", "", "Opportunity / Project", version.quote.projectName ?? version.quote.title]);
  sheet.addRow([]);
  for (let rowNumber = 1; rowNumber <= 4; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    row.font = { bold: true, color: { argb: rowNumber === 1 ? "FFFFFFFF" : `FF${brand.dark}` } };
    if (rowNumber === 1) row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${brand.purple}` } };
  }
  sheet.getRow(1).height = 38;
  sheet.getCell("D1").font = { bold: true, color: { argb: `FF${brand.orange}` } };
}

function addWorkbookLogo(workbook: ExcelJS.Workbook, sheet: ExcelJS.Worksheet) {
  const logoPath = getLogoFilePath();
  if (!logoPath) return;
  const imageId = workbook.addImage({ filename: logoPath, extension: "png" });
  sheet.addImage(imageId, { tl: { col: 0.15, row: 0.15 }, ext: { width: 110, height: 58 } });
}

function addTableHeader(sheet: ExcelJS.Worksheet, values: string[]) {
  const row = sheet.addRow(values);
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${brand.dark}` } };
}

function addSectionedRows(sheet: ExcelJS.Worksheet, lines: ExportLine[], includeMargin: boolean) {
  for (const section of groupedLineSections(lines)) {
    const sectionLines = section.lines;
    const sectionRow = sheet.addRow([section.label]);
    styleSectionRow(sectionRow);
    for (const line of sectionLines) {
      if (includeMargin) {
        sheet.addRow({
          sku: line.product?.sku ?? "",
          description: line.description,
          quantity: Number(line.quantity),
          cost: Number(line.costTotal),
          sell: Number(line.sellTotal),
          margin: Number(line.marginTotal),
          marginPercent: Number(line.marginPercent) / 100,
          supplier: line.product?.supplier ?? ""
        });
      } else {
        sheet.addRow({
          sku: line.product?.sku ?? "",
          manufacturer: line.product?.manufacturer ?? "",
          supplier: line.product?.supplier ?? "",
          description: line.description,
          quantity: Number(line.quantity),
          leadTime: line.product?.leadTimeDays ?? "",
          costPrice: Number(line.unitCost),
          sellPrice: Number(line.unitSell)
        });
      }
    }
    const subtotal = sectionLines.reduce((total, line) => total + Number(line.sellTotal), 0);
    const subtotalRow = sheet.addRow({ description: `${section.label} subtotal`, sellPrice: includeMargin ? undefined : subtotal, sell: includeMargin ? subtotal : undefined });
    styleTotalRow(subtotalRow);
  }
}

function styleSectionRow(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${brand.purple}` } };
}

function styleTotalRow(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: `FF${brand.dark}` } };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `22${brand.orange}` } };
}

function groupedLineSections(lines: ExportLine[]) {
  const sections = [
    { type: "product", label: "Products / Hardware" },
    { type: "labour", label: "Labour / Installation" },
    { type: "service", label: "Services" },
    { type: "note", label: "Notes" }
  ];
  return sections
    .map((section) => ({ ...section, lines: lines.filter((line) => line.lineType === section.type) }))
    .filter((section) => section.lines.length > 0);
}

function getLogoFilePath() {
  const pngPath = path.join(process.cwd(), "public", "branding", "connected-hospitality-logo.png");
  if (fs.existsSync(pngPath)) return pngPath;
  return null;
}

function getLongProposalTemplateFilePath() {
  const templatePath = path.join(process.cwd(), "public", "templates", "connected-hospitality-long-form-proposal-template.pptx");
  if (fs.existsSync(templatePath)) return templatePath;
  return null;
}

function getLogoImage() {
  const logoPath = getLogoFilePath();
  if (!logoPath) return null;
  return { path: logoPath, dataUrl: `data:image/png;base64,${fs.readFileSync(logoPath).toString("base64")}` };
}

function labelFromValue(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function replaceText(xml: string, from: string, to: string) {
  return xml.replace(new RegExp(`<a:t>${escapeRegExp(escapeXml(from))}</a:t>`, "g"), `<a:t>${escapeXml(to)}</a:t>`);
}

function replaceCurrencyPlaceholders(xml: string, replacements: string[]) {
  let index = 0;
  return xml.replace(/<a:t>£<\/a:t>/g, () => `<a:t>${escapeXml(replacements[index++] ?? "")}</a:t>`);
}

function pptxRectShape(id: number, x: number, y: number, cx: number, cy: number, fill: string) {
  return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="Brand panel ${id}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="${fill}"/></a:solidFill><a:ln><a:noFill/></a:ln></p:spPr><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:endParaRPr/></a:p></p:txBody></p:sp>`;
}

function pptxTextShape(id: number, name: string, text: string, x: number, y: number, cx: number, cy: number, fontSize: number, color: string, bold: boolean) {
  const paragraphs = text.split("\n").map((line) => {
    const boldTag = bold ? "<a:b/>" : "";
    return `<a:p><a:r><a:rPr lang="en-GB" sz="${fontSize}" dirty="0">${boldTag}<a:solidFill><a:srgbClr val="${color}"/></a:solidFill></a:rPr><a:t>${escapeXml(line)}</a:t></a:r><a:endParaRPr lang="en-GB" sz="${fontSize}" dirty="0"/></a:p>`;
  }).join("");
  return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="${escapeXml(name)}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln></p:spPr><p:txBody><a:bodyPr wrap="square" lIns="91440" tIns="91440" rIns="91440" bIns="91440"/><a:lstStyle/>${paragraphs}</p:txBody></p:sp>`;
}

function getSlideRelationshipId(relsXml: string, target: string) {
  const escapedTarget = escapeRegExp(target);
  return relsXml.match(new RegExp(`<Relationship[^>]+Id="([^"]+)"[^>]+Target="${escapedTarget}"`))?.[1] ?? null;
}

function nextRelationshipId(relsXml: string) {
  const ids = [...relsXml.matchAll(/Id="rId(\d+)"/g)].map((match) => Number(match[1])).filter(Number.isFinite);
  return `rId${Math.max(0, ...ids) + 1}`;
}

function nextSlideId(presentationXml: string) {
  const ids = [...presentationXml.matchAll(/<p:sldId[^>]+id="(\d+)"/g)].map((match) => Number(match[1])).filter(Number.isFinite);
  return String(Math.max(255, ...ids) + 1);
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function escapeXml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
}

function escapePdfText(value: string) {
  return value.replace(/[()\\]/g, "\\$&");
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}
