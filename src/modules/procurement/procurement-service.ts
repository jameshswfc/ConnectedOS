import fs from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit/js/pdfkit.standalone";
import { PurchaseOrderStatus, SupplierInvoiceStatus, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { CrmAccessContext } from "@/modules/crm/types/crm-context";
import { assertAnyModulePermission, assertModulePermission, isAdminContext } from "@/modules/operations/module-permissions";
import type { PurchaseOrderCreateInput, SupplierCreateInput, SupplierUpdateInput } from "@/modules/procurement/procurement-schemas";
import { createAuditLog } from "@/services/audit/audit-service";
import { uploadFileToSharePointStub } from "@/services/documents/sharepoint-document-service";
import { sendTemplatedEmail, sendTemplatedEmailToUserIds } from "@/services/email/email-service";
import { createNotification } from "@/services/notifications/notification-service";
import { findPreferredApprovers } from "@/services/users/user-service";

const supplierInclude = { account: true } satisfies Prisma.SupplierInclude;
const purchaseOrderInclude = {
  supplier: true,
  project: true,
  quote: true,
  changeRequest: true,
  requestedBy: true,
  approvedBy: true,
  lines: { include: { product: true, assets: true } },
  goodsReceipts: true,
  supplierInvoices: { include: { document: true } }
} satisfies Prisma.PurchaseOrderInclude;

export type ProcurementUploadFile = {
  fileName: string;
  fileType?: string;
  buffer: Buffer;
};

export async function listSuppliers(context: CrmAccessContext, options: { activeOnly?: boolean } = {}) {
  assertAnyModulePermission(context, ["procurement.read_all", "procurement.create", "procurement.approve", "procurement.finance"]);
  return prisma.supplier.findMany({
    where: {
      AND: [
        supplierVisibilityWhere(context),
        options.activeOnly ? { active: true } : {}
      ]
    },
    include: supplierInclude,
    orderBy: [{ active: "desc" }, { name: "asc" }]
  });
}

export async function getSupplier(context: CrmAccessContext, id: string) {
  assertAnyModulePermission(context, ["procurement.read_all", "procurement.create", "procurement.approve", "procurement.finance"]);
  const supplier = await prisma.supplier.findFirst({
    where: { AND: [supplierVisibilityWhere(context), { id }] },
    include: supplierInclude
  });
  if (!supplier) throw new Error("Supplier not found");
  return supplier;
}

export async function createSupplier(context: CrmAccessContext, input: SupplierCreateInput) {
  assertModulePermission(context, "procurement.create");
  const supplier = await prisma.supplier.create({ data: input, include: supplierInclude });
  await createAuditLog({ userId: context.userId, module: "procurement", entityType: "Supplier", entityId: supplier.id, action: "create", newValue: supplier as unknown as Prisma.InputJsonValue });
  return supplier;
}

export async function updateSupplier(context: CrmAccessContext, id: string, input: SupplierUpdateInput) {
  assertModulePermission(context, "procurement.create");
  const previous = await getSupplier(context, id);
  const supplier = await prisma.supplier.update({
    where: { id },
    data: input,
    include: supplierInclude
  });
  await createAuditLog({
    userId: context.userId,
    module: "procurement",
    entityType: "Supplier",
    entityId: supplier.id,
    action: "update",
    previousValue: previous as unknown as Prisma.InputJsonValue,
    newValue: supplier as unknown as Prisma.InputJsonValue
  });
  return supplier;
}

export async function listPurchaseOrders(context: CrmAccessContext) {
  assertAnyModulePermission(context, ["procurement.read_all", "procurement.create", "procurement.approve", "procurement.finance"]);
  return prisma.purchaseOrder.findMany({
    where: purchaseOrderVisibilityWhere(context),
    include: purchaseOrderInclude,
    orderBy: [{ createdAt: "desc" }]
  });
}

export async function getPurchaseOrder(context: CrmAccessContext, id: string) {
  const po = await prisma.purchaseOrder.findFirst({
    where: { AND: [purchaseOrderVisibilityWhere(context), { id }] },
    include: purchaseOrderInclude
  });
  if (!po) throw new Error("Purchase order not found");
  return po;
}

export async function createPurchaseOrder(context: CrmAccessContext, input: PurchaseOrderCreateInput) {
  assertModulePermission(context, "procurement.create");
  const poNumber = await nextPurchaseOrderNumber();
  const supplier = await prisma.supplier.findFirst({ where: { id: input.supplierId, deletedAt: null, active: true } });
  if (!supplier) throw new Error("Supplier not found");
  const totals = calculatePoTotals(input.lines);
  const po = await prisma.purchaseOrder.create({
    data: {
      poNumber,
      supplierId: input.supplierId,
      supplierName: input.supplierName?.trim() || supplier.name,
      supplierAddress: input.supplierAddress?.trim() || supplier.address,
      supplierContactName: input.supplierContactName?.trim() || supplier.contactName,
      supplierContactEmail: input.supplierContactEmail?.trim() || supplier.email,
      deliveryAddress: input.deliveryAddress?.trim() || null,
      projectId: input.projectId,
      quoteId: input.quoteId,
      changeRequestId: input.changeRequestId,
      status: input.status ?? PurchaseOrderStatus.draft,
      requestedById: input.requestedById ?? context.userId,
      orderDate: input.orderDate ?? null,
      expectedDeliveryDate: input.expectedDeliveryDate ?? null,
      currency: input.currency,
      notes: input.notes,
      subtotal: totals.subtotal,
      vatAmount: totals.vatAmount,
      totalAmount: totals.totalAmount,
      lines: {
        create: input.lines.map((line) => ({
          productId: line.productId,
          sku: line.sku,
          manufacturer: line.manufacturer,
          description: line.description,
          quantity: line.quantity,
          unitCost: line.unitCost,
          totalCost: calculatePurchaseOrderLineTotals(line).lineTotal,
          taxRate: line.taxRate ?? 20,
          taxAmount: calculatePurchaseOrderLineTotals(line).taxAmount,
          totalIncludingTax: calculatePurchaseOrderLineTotals(line).totalIncludingTax
        }))
      }
    },
    include: purchaseOrderInclude
  });
  await createAuditLog({ userId: context.userId, module: "procurement", entityType: "PurchaseOrder", entityId: po.id, action: "create", newValue: po as unknown as Prisma.InputJsonValue });
  return po;
}

export async function updatePurchaseOrderStatus(context: CrmAccessContext, id: string, status: PurchaseOrderStatus, notes?: string | null) {
  const po = await getPurchaseOrder(context, id);
  if (([
    PurchaseOrderStatus.submitted,
    PurchaseOrderStatus.approved,
    PurchaseOrderStatus.ordered
  ] as PurchaseOrderStatus[]).includes(status)) {
    assertAnyModulePermission(context, ["procurement.create", "procurement.approve"]);
  }
  if (([
    PurchaseOrderStatus.partially_received,
    PurchaseOrderStatus.received
  ] as PurchaseOrderStatus[]).includes(status)) {
    assertAnyModulePermission(context, ["procurement.receive", "procurement.approve"]);
  }
  const updated = await prisma.purchaseOrder.update({
    where: { id },
    data: {
      status,
      notes: notes ?? po.notes,
      approvedById: status === PurchaseOrderStatus.approved ? context.userId : po.approvedById,
      approvedAt: status === PurchaseOrderStatus.approved ? new Date() : po.approvedAt,
      orderDate: status === PurchaseOrderStatus.ordered ? new Date() : po.orderDate,
      receivedDate: status === PurchaseOrderStatus.received ? new Date() : po.receivedDate
    },
    include: purchaseOrderInclude
  });
  await createAuditLog({ userId: context.userId, module: "procurement", entityType: "PurchaseOrder", entityId: updated.id, action: status, previousValue: po as unknown as Prisma.InputJsonValue, newValue: updated as unknown as Prisma.InputJsonValue });
  if (status === PurchaseOrderStatus.submitted) {
    const approvers = await findPreferredApprovers("james@connectedhsp.com", "James Harrison");
    if (approvers[0]) {
      await createNotification({
        userId: approvers[0].id,
        title: "Purchase order awaiting approval",
        body: `${updated.poNumber} for ${updated.supplier.name} has been submitted.`,
        metadata: { href: `/procurement/purchase-orders/${updated.id}` }
      });
      await sendTemplatedEmailToUserIds([approvers[0].id], () => ({
        title: "Purchase order awaiting approval",
        summary: `${updated.poNumber} has been submitted for approval.`,
        details: [
          { label: "PO", value: updated.poNumber },
          { label: "Supplier", value: updated.supplier.name },
          { label: "Total", value: formatMoney(Number(updated.totalAmount), updated.currency) },
          { label: "Project", value: updated.project?.name ?? "-" }
        ],
        actionLabel: "Open purchase order",
        actionHref: `/procurement/purchase-orders/${updated.id}`
      }));
    }
  }
  if ((status === PurchaseOrderStatus.approved || status === PurchaseOrderStatus.cancelled) && updated.requestedBy?.email) {
    await sendTemplatedEmail({
      to: updated.requestedBy.email,
      title: `Purchase order ${status.replaceAll("_", " ")}`,
      summary: `${updated.poNumber} is now ${status.replaceAll("_", " ")}.`,
      details: [
        { label: "PO", value: updated.poNumber },
        { label: "Supplier", value: updated.supplier.name },
        { label: "Total", value: formatMoney(Number(updated.totalAmount), updated.currency) }
      ],
      actionLabel: "Open purchase order",
      actionHref: `/procurement/purchase-orders/${updated.id}`
    });
  }
  return updated;
}

export async function recordGoodsReceipt(context: CrmAccessContext, id: string, notes?: string | null) {
  assertAnyModulePermission(context, ["procurement.receive", "procurement.approve"]);
  const po = await getPurchaseOrder(context, id);
  const receipt = await prisma.goodsReceipt.create({
    data: {
      purchaseOrderId: id,
      receivedById: context.userId,
      notes
    }
  });
  await prisma.purchaseOrder.update({
    where: { id },
    data: { status: PurchaseOrderStatus.received, receivedDate: receipt.receivedAt }
  });
  for (const line of po.lines) {
    const existingAsset = await prisma.asset.findFirst({
      where: {
        purchaseOrderLineId: line.id,
        deletedAt: null
      }
    });
    if (!existingAsset) {
      await prisma.asset.create({
        data: {
          assetNumber: await nextAssetNumber(),
          projectId: po.projectId,
          accountId: po.project?.accountId,
          purchaseOrderLineId: line.id,
          productId: line.productId,
          sku: line.sku,
          manufacturer: line.manufacturer,
          description: line.description,
          status: "received"
        }
      });
    }
  }
  await createAuditLog({ userId: context.userId, module: "procurement", entityType: "GoodsReceipt", entityId: receipt.id, action: "create", newValue: receipt as unknown as Prisma.InputJsonValue });
  return getPurchaseOrder(context, id);
}

export async function addSupplierInvoice(context: CrmAccessContext, purchaseOrderId: string, input: { invoiceNumber: string; invoiceDate: Date; dueDate?: Date; amount: number; status?: SupplierInvoiceStatus }, file?: ProcurementUploadFile | null) {
  assertAnyModulePermission(context, ["procurement.finance", "procurement.approve"]);
  const po = await getPurchaseOrder(context, purchaseOrderId);
  let documentId: string | undefined;
  if (file) {
    const document = await uploadFileToSharePointStub({
      folderPath: `ConnectedOS/Procurement/${po.poNumber} ${po.supplier.name}`,
      fileName: file.fileName,
      fileType: file.fileType,
      buffer: file.buffer,
      entityType: "PurchaseOrder",
      entityId: po.id,
      uploadedById: context.userId
    });
    documentId = document.id;
  }
  const invoice = await prisma.supplierInvoice.create({
    data: {
      purchaseOrderId,
      invoiceNumber: input.invoiceNumber,
      invoiceDate: input.invoiceDate,
      dueDate: input.dueDate ?? null,
      amount: input.amount,
      status: input.status ?? SupplierInvoiceStatus.received,
      documentId
    }
  });
  await prisma.purchaseOrder.update({
    where: { id: purchaseOrderId },
    data: { status: PurchaseOrderStatus.invoiced }
  });
  await createAuditLog({ userId: context.userId, module: "procurement", entityType: "SupplierInvoice", entityId: invoice.id, action: "create", newValue: invoice as unknown as Prisma.InputJsonValue });
  const financeUsers = await prisma.user.findMany({
    where: {
      isActive: true,
      deletedAt: null,
      deactivatedAt: null,
      role: { name: "Finance" }
    },
    select: { id: true }
  });
  await sendTemplatedEmailToUserIds(financeUsers.map((user) => user.id), () => ({
    title: "Supplier invoice received",
    summary: `${po.poNumber} has a supplier invoice ready for finance review.`,
    details: [
      { label: "PO", value: po.poNumber },
      { label: "Supplier", value: po.supplier.name },
      { label: "Invoice", value: input.invoiceNumber },
      { label: "Amount", value: formatMoney(input.amount, po.currency) }
    ],
    actionLabel: "Open purchase order",
    actionHref: `/procurement/purchase-orders/${po.id}`
  }));
  return getPurchaseOrder(context, purchaseOrderId);
}

export async function generatePurchaseOrderPdf(context: CrmAccessContext, id: string) {
  const po = await getPurchaseOrder(context, id);
  return renderPurchaseOrderPdfBuffer(po);
}

type PurchaseOrderPdfInput = {
  id: string;
  poNumber: string;
  status: string;
  currency: string;
  expectedDeliveryDate: Date | null;
  supplierName: string | null;
  supplierAddress: string | null;
  supplierContactName: string | null;
  supplierContactEmail: string | null;
  deliveryAddress: string | null;
  notes: string | null;
  subtotal: number | Prisma.Decimal;
  vatAmount: number | Prisma.Decimal;
  totalAmount: number | Prisma.Decimal;
  supplier: {
    name: string;
    address: string | null;
    contactName: string | null;
    email: string | null;
  };
  project?: {
    projectNumber: string;
    name: string;
  } | null;
  quote?: {
    quoteNumber: string;
  } | null;
  changeRequest?: {
    title: string;
  } | null;
  lines: Array<{
    sku: string | null;
    manufacturer: string | null;
    description: string;
    quantity: number | Prisma.Decimal;
    unitCost: number | Prisma.Decimal;
    taxRate: number | Prisma.Decimal;
    taxAmount: number | Prisma.Decimal;
    totalIncludingTax: number | Prisma.Decimal;
  }>;
};

const poPdfPage = { width: 595, height: 842, margin: 44, footerHeight: 54 };
const poPdfContentWidth = poPdfPage.width - (poPdfPage.margin * 2);
const poPdfTextPaddingX = 5;
const poPdfTextPaddingY = 5;
const poPdfBodyFont = "Helvetica";

export async function renderPurchaseOrderPdfBuffer(po: PurchaseOrderPdfInput) {
  const doc = new PDFDocument({ margin: 44, size: "A4", autoFirstPage: true, compress: false });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  const purple = "#4B1F73";
  const gold = "#D4AF37";
  const dark = "#172033";
  const border = "#CBD5E1";
  const borderDark = "#94A3B8";
  const white = "#FFFFFF";
  const tableColumnWidths = [60, 68, 163, 26, 56, 28, 46, 60];
  const tableHeaders = ["SKU / Part Code", "Manufacturer", "Description", "Qty", "Unit Cost", "VAT", "Tax", "Line Total"];
  const logoPath = getPurchaseOrderLogoPath();

  const drawPageHeader = () => {
    if (logoPath) {
      try {
        doc.image(`data:image/png;base64,${fs.readFileSync(logoPath).toString("base64")}`, 426, 28, { fit: [125, 60] });
      } catch (error) {
        console.warn("Purchase order logo render failed", { poId: po.id, error });
      }
    }
    doc.font(poPdfBodyFont).fillColor(purple).fontSize(24).text("Purchase Order", poPdfPage.margin, 40, {
      width: 260
    });
    doc.fillColor(dark).fontSize(11).text(`PO Number: ${po.poNumber}`, poPdfPage.margin, 78, { width: 260 });
    doc.text(`Status: ${displayPurchaseOrderLabel(po.status)}`, poPdfPage.margin, 94, { width: 260 });
    doc.text(`Delivery Date: ${po.expectedDeliveryDate ? po.expectedDeliveryDate.toISOString().slice(0, 10) : "-"}`, poPdfPage.margin, 110, { width: 260 });
    doc.moveTo(poPdfPage.margin, 134).lineTo(poPdfPage.margin + poPdfContentWidth, 134).lineWidth(2).strokeColor(gold).stroke();
    doc.y = 150;
  };

  const drawPageFooter = () => {
    doc.save();
    doc.moveTo(poPdfPage.margin, poPdfPage.height - 42).lineTo(poPdfPage.margin + poPdfContentWidth, poPdfPage.height - 42).lineWidth(1.5).strokeColor(gold).stroke();
    doc.restore();
    doc.fillColor("#64748B").font(poPdfBodyFont).fontSize(10).text(
      "Connected Hospitality | sales@connectedhsp.com",
      poPdfPage.margin,
      poPdfPage.height - 31,
      { width: poPdfContentWidth, align: "center" }
    );
  };

  const addPage = () => {
    drawPageFooter();
    doc.addPage();
    drawPageHeader();
  };

  drawPageHeader();

  const supplierRows = [
    { label: "Supplier", value: po.supplierName ?? po.supplier.name },
    { label: "Address", value: po.supplierAddress ?? po.supplier.address ?? "-" },
    { label: "Contact", value: po.supplierContactName ?? po.supplier.contactName ?? "-" },
    { label: "Email", value: po.supplierContactEmail ?? po.supplier.email ?? "-" }
  ];
  const deliveryRows = [
    { label: "Delivery Address", value: po.deliveryAddress ?? "-" },
    { label: "Project", value: po.project ? `${po.project.projectNumber} ${po.project.name}` : "-" },
    { label: "Quote", value: po.quote?.quoteNumber ?? "-" },
    { label: "Change Request", value: po.changeRequest?.title ?? "-" }
  ];
  const infoBoxHeight = Math.max(
    purchaseOrderInfoBoxHeight(doc, 242, supplierRows),
    purchaseOrderInfoBoxHeight(doc, 242, deliveryRows)
  );

  const firstInfoBoxY = doc.y;
  drawPurchaseOrderInfoBox(doc, {
    title: "Supplier Details",
    x: poPdfPage.margin,
    y: firstInfoBoxY,
    width: 242,
    height: infoBoxHeight,
    rows: supplierRows
  });
  drawPurchaseOrderInfoBox(doc, {
    title: "Delivery Details",
    x: 309,
    y: firstInfoBoxY,
    width: 242,
    height: infoBoxHeight,
    rows: deliveryRows
  });
  doc.y = firstInfoBoxY + infoBoxHeight + 18;

  if (po.notes?.trim()) {
    const notesHeight = purchaseOrderTextBoxHeight(doc, po.notes, poPdfContentWidth);
    if (ensurePurchaseOrderPageSpace(doc, notesHeight + 34, addPage)) {
      doc.y = 150;
    }
    doc.fillColor(purple).font(poPdfBodyFont).fontSize(12).text("Notes", poPdfPage.margin, doc.y, {
      width: poPdfContentWidth
    });
    doc.y += 18;
    const notesY = doc.y;
    doc.save();
    doc.roundedRect(poPdfPage.margin, notesY, poPdfContentWidth, notesHeight, 4).fillAndStroke("#F7F5FA", border);
    doc.restore();
    doc.fillColor(dark).font(poPdfBodyFont).fontSize(11).text(po.notes, poPdfPage.margin + poPdfTextPaddingX, notesY + poPdfTextPaddingY, {
      width: poPdfContentWidth - (poPdfTextPaddingX * 2),
      lineGap: 3
    });
    doc.y = notesY + notesHeight + 18;
  }

  drawPurchaseOrderTableHeader(doc, tableColumnWidths, tableHeaders, purple, borderDark, white);
  for (const line of po.lines) {
    const rowValues = [
      line.sku ?? "-",
      line.manufacturer ?? "-",
      line.description,
      Number(line.quantity).toString(),
      formatMoney(Number(line.unitCost), po.currency),
      `${Number(line.taxRate).toFixed(0)}%`,
      formatMoney(Number(line.taxAmount), po.currency),
      formatMoney(Number(line.totalIncludingTax), po.currency)
    ];
    const rowChunks = chunkPurchaseOrderRow(doc, rowValues, tableColumnWidths, 8);
    for (const rowChunk of rowChunks) {
      const rowHeight = purchaseOrderTableRowHeight(doc, rowChunk, tableColumnWidths, false);
      if (ensurePurchaseOrderPageSpace(doc, rowHeight + 6, addPage)) {
        drawPurchaseOrderTableHeader(doc, tableColumnWidths, tableHeaders, purple, borderDark, white);
      }
      drawPurchaseOrderTableRow(doc, rowChunk, tableColumnWidths, rowHeight, dark, border);
      doc.y += 6;
    }
  }

  if (ensurePurchaseOrderPageSpace(doc, 90, addPage)) {
    drawPurchaseOrderTableHeader(doc, tableColumnWidths, tableHeaders, purple, borderDark, white);
  }
  doc.y += 6;
  doc.moveTo(338, doc.y).lineTo(poPdfPage.margin + poPdfContentWidth, doc.y).lineWidth(1).strokeColor(borderDark).stroke();
  doc.y += 10;
  doc.fillColor(dark).font(poPdfBodyFont).fontSize(11).text(`Subtotal excluding VAT: ${formatMoney(Number(po.subtotal), po.currency)}`, 338, doc.y, { width: 213, align: "right" });
  doc.text(`VAT at 20%: ${formatMoney(Number(po.vatAmount), po.currency)}`, 338, doc.y + 18, { width: 213, align: "right" });
  doc.fillColor(purple).fontSize(14).text(`Total including VAT: ${formatMoney(Number(po.totalAmount), po.currency)}`, 338, doc.y + 40, { width: 213, align: "right" });

  drawPageFooter();
  doc.end();
  return done;
}

export function calculatePurchaseOrderLineTotals(line: Pick<PurchaseOrderCreateInput["lines"][number], "quantity" | "unitCost" | "taxRate">) {
  const lineTotal = Number(line.quantity) * Number(line.unitCost);
  const taxRate = Number(line.taxRate ?? 20);
  const taxAmount = Number((lineTotal * (taxRate / 100)).toFixed(2));
  return {
    lineTotal,
    taxRate,
    taxAmount,
    totalIncludingTax: Number((lineTotal + taxAmount).toFixed(2))
  };
}

export function calculatePoTotals(lines: PurchaseOrderCreateInput["lines"]) {
  const subtotal = lines.reduce((sum, line) => sum + calculatePurchaseOrderLineTotals(line).lineTotal, 0);
  const vatAmount = lines.reduce((sum, line) => sum + calculatePurchaseOrderLineTotals(line).taxAmount, 0);
  return {
    subtotal,
    vatAmount,
    totalAmount: subtotal + vatAmount
  };
}

async function nextPurchaseOrderNumber() {
  const year = new Date().getFullYear();
  const prefix = `PO-${year}-`;
  const latest = await prisma.purchaseOrder.findFirst({ where: { poNumber: { startsWith: prefix } }, orderBy: { poNumber: "desc" } });
  return `${prefix}${String(latest ? Number(latest.poNumber.slice(prefix.length)) + 1 : 1).padStart(4, "0")}`;
}

async function nextAssetNumber() {
  const year = new Date().getFullYear();
  const prefix = `AST-${year}-`;
  const latest = await prisma.asset.findFirst({ where: { assetNumber: { startsWith: prefix } }, orderBy: { assetNumber: "desc" } });
  return `${prefix}${String(latest ? Number(latest.assetNumber.slice(prefix.length)) + 1 : 1).padStart(4, "0")}`;
}

function supplierVisibilityWhere(context: CrmAccessContext): Prisma.SupplierWhereInput {
  if (isAdminContext(context) || context.permissions.includes("procurement.read_all") || context.permissions.includes("procurement.create")) {
    return { deletedAt: null };
  }
  return { deletedAt: null, account: { ownerId: context.userId, deletedAt: null } };
}

function purchaseOrderVisibilityWhere(context: CrmAccessContext): Prisma.PurchaseOrderWhereInput {
  if (
    isAdminContext(context)
    || context.permissions.includes("procurement.read_all")
    || context.permissions.includes("procurement.create")
    || context.permissions.includes("procurement.approve")
    || context.permissions.includes("procurement.finance")
  ) {
    return { deletedAt: null };
  }
  return {
    deletedAt: null,
    OR: [
      { project: { projectManagerId: context.userId, deletedAt: null } },
      { quote: { ownerId: context.userId, deletedAt: null } }
    ]
  };
}

function formatMoney(amount: number, currency = "GBP") {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(amount || 0);
}

function getPurchaseOrderLogoPath() {
  const logoPath = path.join(process.cwd(), "public", "branding", "connected-hospitality-logo.png");
  return fs.existsSync(logoPath) ? logoPath : null;
}

function displayPurchaseOrderLabel(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

function purchaseOrderInfoBoxHeight(
  doc: PDFKit.PDFDocument,
  width: number,
  rows: Array<{ label: string; value: string }>
) {
  const bodyWidth = width - 24;
  const total = rows.reduce((height, row) => {
    const labelHeight = doc.font(poPdfBodyFont).fontSize(9).heightOfString(row.label, { width: bodyWidth, lineGap: 2 });
    const valueHeight = doc.font(poPdfBodyFont).fontSize(10).heightOfString(row.value, { width: bodyWidth, lineGap: 3 });
    return height + labelHeight + valueHeight + 12;
  }, 0);
  return Math.max(154, total + 38);
}

function drawPurchaseOrderInfoBox(
  doc: PDFKit.PDFDocument,
  input: { title: string; x: number; y: number; width: number; height: number; rows: Array<{ label: string; value: string }> }
) {
  const purple = "#4B1F73";
  const dark = "#172033";
  const border = "#CBD5E1";
  doc.save();
  doc.roundedRect(input.x, input.y, input.width, input.height, 6).fillAndStroke("#FFFFFF", border);
  doc.restore();
  doc.fillColor(purple).font(poPdfBodyFont).fontSize(12).text(input.title, input.x + 12, input.y + 12, {
    width: input.width - 24
  });
  let y = input.y + 36;
  for (const row of input.rows) {
    doc.fillColor("#64748B").font(poPdfBodyFont).fontSize(9).text(row.label, input.x + 12, y, {
      width: input.width - 24,
      lineGap: 2
    });
    y += doc.heightOfString(row.label, { width: input.width - 24, lineGap: 2 }) + 3;
    doc.fillColor(dark).font(poPdfBodyFont).fontSize(10).text(row.value, input.x + 12, y, {
      width: input.width - 24,
      lineGap: 3
    });
    y += doc.heightOfString(row.value, { width: input.width - 24, lineGap: 3 }) + 10;
  }
}

function purchaseOrderTextBoxHeight(doc: PDFKit.PDFDocument, value: string, width: number) {
  const textHeight = doc.font(poPdfBodyFont).fontSize(11).heightOfString(value, {
    width: width - (poPdfTextPaddingX * 2),
    lineGap: 3
  });
  return Math.max(48, textHeight + (poPdfTextPaddingY * 2));
}

function drawPurchaseOrderTableHeader(
  doc: PDFKit.PDFDocument,
  widths: number[],
  labels: string[],
  background: string,
  border: string,
  textColor: string
) {
  const rowHeight = purchaseOrderTableRowHeight(doc, labels, widths, true);
  const y = doc.y;
  let x = poPdfPage.margin;
  labels.forEach((label, index) => {
    doc.save();
    doc.rect(x, y, widths[index], rowHeight).fill(background);
    doc.restore();
    doc.save();
    doc.rect(x, y, widths[index], rowHeight).stroke(border);
    doc.restore();
    doc.fillColor(textColor).font(poPdfBodyFont).fontSize(8).text(label, x + poPdfTextPaddingX, y + poPdfTextPaddingY, {
      width: widths[index] - (poPdfTextPaddingX * 2),
      lineGap: 2
    });
    x += widths[index];
  });
  doc.y = y + rowHeight + 6;
}

function drawPurchaseOrderTableRow(
  doc: PDFKit.PDFDocument,
  values: string[],
  widths: number[],
  rowHeight: number,
  textColor: string,
  border: string
) {
  const y = doc.y;
  let x = poPdfPage.margin;
  values.forEach((value, index) => {
    doc.save();
    doc.rect(x, y, widths[index], rowHeight).fill("#FFFFFF");
    doc.restore();
    doc.save();
    doc.rect(x, y, widths[index], rowHeight).stroke(border);
    doc.restore();
    doc.fillColor(textColor).font(poPdfBodyFont).fontSize(8).text(value, x + poPdfTextPaddingX, y + poPdfTextPaddingY, {
      width: widths[index] - (poPdfTextPaddingX * 2),
      lineGap: 2
    });
    x += widths[index];
  });
  doc.y = y + rowHeight;
}

function purchaseOrderTableRowHeight(doc: PDFKit.PDFDocument, values: string[], widths: number[], header: boolean) {
  const maxHeight = Math.max(...values.map((value, index) => doc.font(poPdfBodyFont).fontSize(8).heightOfString(value, {
    width: widths[index] - (poPdfTextPaddingX * 2),
    lineGap: header ? 2 : 2
  })));
  return Math.max(28, maxHeight + (poPdfTextPaddingY * 2));
}

function chunkPurchaseOrderRow(doc: PDFKit.PDFDocument, values: string[], widths: number[], maxLinesPerChunk: number) {
  const wrapped = values.map((value, index) => wrapPurchaseOrderText(doc, value, widths[index] - (poPdfTextPaddingX * 2)));
  const maxLines = Math.max(...wrapped.map((lines) => lines.length), 1);
  if (maxLines <= maxLinesPerChunk) return [values];
  const chunks: string[][] = [];
  for (let start = 0; start < maxLines; start += maxLinesPerChunk) {
    chunks.push(wrapped.map((lines) => lines.slice(start, start + maxLinesPerChunk).join("\n")));
  }
  return chunks;
}

function wrapPurchaseOrderText(doc: PDFKit.PDFDocument, value: string, width: number) {
  doc.font(poPdfBodyFont).fontSize(8);
  const lines: string[] = [];
  const paragraphs = String(value ?? "").split("\n");
  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) {
      lines.push("");
      continue;
    }
    const words = paragraph.split(/\s+/);
    let current = "";
    for (const word of words) {
      const next = current ? `${current} ${word}` : word;
      if (doc.widthOfString(next) <= width) {
        current = next;
      } else if (!current) {
        lines.push(word);
      } else {
        lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);
  }
  return lines.length ? lines : [""];
}

function ensurePurchaseOrderPageSpace(doc: PDFKit.PDFDocument, requiredHeight: number, addPage: () => void) {
  const available = poPdfPage.height - poPdfPage.footerHeight - 16 - doc.y;
  if (available < requiredHeight) {
    addPage();
    return true;
  }
  return false;
}
