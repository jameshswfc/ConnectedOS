import fs from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit/js/pdfkit.standalone";

export const projectExportBrand = {
  purple: "4B1F73",
  gold: "D4AF37",
  dark: "172033",
  muted: "475569",
  pale: "F7F5FA",
  border: "CBD5E1",
  borderDark: "94A3B8",
  white: "FFFFFF",
  ragGreenBg: "DCFCE7",
  ragGreenText: "166534",
  ragAmberBg: "FEF3C7",
  ragAmberText: "92400E",
  ragRedBg: "FEE2E2",
  ragRedText: "991B1B",
  bodyFont: "Helvetica"
};

const MAX_TABLE_ROW_LINES = 12;
const CELL_PADDING_X = 8;
const CELL_PADDING_Y = 8;
const SECTION_SPACING_BEFORE = 12;
const SECTION_SPACING_AFTER = 10;

type ProjectExportShape = {
  id: string;
  projectNumber: string;
  name: string;
  account: { name: string };
};

export type ProjectExportTable = {
  title?: string;
  columns: string[];
  rows: Array<Array<string | number | null | undefined>>;
};

export type ProjectExportSection = {
  title: string;
  body?: string | string[];
  tables?: ProjectExportTable[];
  startOnNewPage?: boolean;
};

export type ProjectExportDefinition = {
  title: string;
  subtitle?: string;
  intro?: string;
  metadata?: Array<{ label: string; value: string | number | null | undefined }>;
  sections: ProjectExportSection[];
  footerLabel?: string;
};

const PAGE = { width: 595, height: 842, margin: 44 };
const CONTENT_WIDTH = PAGE.width - PAGE.margin * 2;
const HEADER_HEIGHT = 112;
const FOOTER_HEIGHT = 52;

export async function generateProjectPdfBuffer(
  project: ProjectExportShape,
  title: string,
  content: Record<string, unknown> | ProjectExportDefinition
) {
  const definition = isDefinition(content) ? content : legacyDefinition(title, content);
  return new Promise<Buffer>((resolve, reject) => {
    const pageContentCounts: number[] = [];
    const doc = new PDFDocument({
      size: "A4",
      margin: PAGE.margin,
      autoFirstPage: false,
      info: { Title: `${project.projectNumber} ${definition.title}`, Author: "Connected Hospitality" }
    });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const addProjectPage = () => {
      if ((doc as PDFKit.PDFDocument & { page?: unknown }).page) {
        drawProjectFooter(doc, project, definition.footerLabel);
      }
      doc.addPage();
      pageContentCounts.push(0);
      drawProjectHeader(doc, project, definition);
    };

    addProjectPage();
    renderProjectDocument(doc, definition, pageContentCounts, addProjectPage);
    drawProjectFooter(doc, project, definition.footerLabel);
    doc.end();
  });
}

export function projectPdfTemplateUsesReadableBodyText() {
  return projectExportBrand.dark !== projectExportBrand.white && projectExportBrand.bodyFont === "Helvetica";
}

export function getProjectLogoDataUri() {
  const logoPath = getLogoFilePath();
  if (!logoPath) return null;
  return `data:image/png;base64,${fs.readFileSync(logoPath).toString("base64")}`;
}

export function trimTrailingBlankPageCounts(pageContentCounts: number[]) {
  const trimmed = [...pageContentCounts];
  while (trimmed.length > 1 && trimmed[trimmed.length - 1] === 0) trimmed.pop();
  return trimmed;
}

export function displayLabel(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "-";
  return trimmed
    .replaceAll("_", " ")
    .split(" ")
    .map((part) => part ? part.charAt(0).toUpperCase() + part.slice(1) : "")
    .join(" ");
}

function renderProjectDocument(
  doc: PDFKit.PDFDocument,
  definition: ProjectExportDefinition,
  pageContentCounts: number[],
  addProjectPage: () => void
) {
  if (definition.subtitle) {
    markPageContent(pageContentCounts);
    doc.font(projectExportBrand.bodyFont).fontSize(11).fillColor(`#${projectExportBrand.muted}`).text(definition.subtitle, PAGE.margin, doc.y, {
      width: CONTENT_WIDTH
    });
    doc.moveDown(0.8);
  }
  if (definition.metadata?.length) {
    renderMetadataTable(doc, definition.metadata, pageContentCounts, addProjectPage);
    doc.moveDown(0.7);
  }
  if (definition.intro) {
    renderParagraph(doc, definition.intro, pageContentCounts, addProjectPage);
    doc.moveDown(0.7);
  }

  const sections = definition.sections.filter(hasRenderableSectionContent);
  sections.forEach((section, index) => {
    if (section.startOnNewPage && index > 0) addProjectPage();
    ensurePageSpace(doc, minimumSectionHeight(section), addProjectPage);
    renderSectionHeading(doc, section.title, pageContentCounts, addProjectPage);
    if (section.body) {
      const lines = Array.isArray(section.body) ? section.body : [section.body];
      lines.filter((line) => line.trim()).forEach((line) => renderParagraph(doc, line, pageContentCounts, addProjectPage));
    }
    section.tables?.forEach((table, tableIndex, tables) => {
      if (table.title) {
        ensurePageSpace(doc, 44, addProjectPage);
        markPageContent(pageContentCounts);
        doc.font(projectExportBrand.bodyFont).fontSize(11).fillColor(`#${projectExportBrand.purple}`).text(table.title, PAGE.margin, doc.y, {
          width: CONTENT_WIDTH
        });
        doc.moveDown(0.5);
      }
      renderTable(doc, table, pageContentCounts, addProjectPage);
      if (tableIndex < tables.length - 1) doc.moveDown(0.9);
    });
    if (index < sections.length - 1) doc.moveDown(0.5);
  });
}

function renderSectionHeading(doc: PDFKit.PDFDocument, title: string, pageContentCounts: number[], addProjectPage: () => void) {
  if (doc.y > HEADER_HEIGHT + 24) {
    ensurePageSpace(doc, SECTION_SPACING_BEFORE + 36, addProjectPage);
    doc.y += SECTION_SPACING_BEFORE;
  } else {
    ensurePageSpace(doc, 36, addProjectPage);
  }
  markPageContent(pageContentCounts);
  doc.save();
  doc.roundedRect(PAGE.margin, doc.y, CONTENT_WIDTH, 24, 4).fill(`#${projectExportBrand.purple}`);
  doc.restore();
  doc.fillColor(`#${projectExportBrand.white}`).font(projectExportBrand.bodyFont).fontSize(12).text(title, PAGE.margin + 10, doc.y + 6, {
    width: CONTENT_WIDTH - 20
  });
  doc.moveDown(1.2);
  doc.y += SECTION_SPACING_AFTER;
}

function renderParagraph(doc: PDFKit.PDFDocument, text: string, pageContentCounts: number[], addProjectPage: () => void) {
  if (!text.trim()) return;
  ensurePageSpace(doc, Math.max(40, doc.heightOfString(text, { width: CONTENT_WIDTH, lineGap: 4 }) + 12), addProjectPage);
  markPageContent(pageContentCounts);
  doc.fillColor(`#${projectExportBrand.dark}`).font(projectExportBrand.bodyFont).fontSize(12).text(text, PAGE.margin, doc.y, {
    width: CONTENT_WIDTH,
    lineGap: 4
  });
  doc.moveDown(0.75);
}

function renderMetadataTable(
  doc: PDFKit.PDFDocument,
  rows: Array<{ label: string; value: string | number | null | undefined }>,
  pageContentCounts: number[],
  addProjectPage: () => void
) {
  const table: ProjectExportTable = {
    columns: ["Field", "Value"],
    rows: rows.map((row) => [row.label, formatCell(row.value)])
  };
  renderTable(doc, table, pageContentCounts, addProjectPage, [160, CONTENT_WIDTH - 160]);
}

function renderTable(
  doc: PDFKit.PDFDocument,
  table: ProjectExportTable,
  pageContentCounts: number[],
  addProjectPage: () => void,
  forcedWidths?: number[]
) {
  const widths = forcedWidths ?? autoWidths(table.columns.length);
  ensurePageSpace(doc, tableRowHeight(doc, table.columns, widths, true) + 24, addProjectPage);
  drawTableRow(doc, table.columns, widths, true, pageContentCounts, addProjectPage, table.columns);
  table.rows.forEach((row) => {
    const values = table.columns.map((_, index) => formatCell(row[index]));
    const chunks = chunkRowForTable(doc, values, widths, MAX_TABLE_ROW_LINES);
    chunks.forEach((chunk) => drawTableRow(doc, chunk, widths, false, pageContentCounts, addProjectPage, table.columns));
  });
}

function drawTableRow(
  doc: PDFKit.PDFDocument,
  cells: string[],
  widths: number[],
  header: boolean,
  pageContentCounts: number[],
  addProjectPage: () => void,
  columnLabels: string[]
) {
  const rowHeight = tableRowHeight(doc, cells, widths, header);
  ensurePageSpace(doc, rowHeight + 4, addProjectPage);
  const y = doc.y;
  let x = PAGE.margin;
  markPageContent(pageContentCounts);

  cells.forEach((cell, index) => {
    const style = header ? null : cellStyle(columnLabels[index], cell);
    doc.save();
    doc.rect(x, y, widths[index], rowHeight).fill(header ? `#${projectExportBrand.purple}` : style?.background ?? `#${projectExportBrand.white}`);
    doc.restore();
    doc.save();
    doc.rect(x, y, widths[index], rowHeight).stroke(`#${projectExportBrand.borderDark}`);
    doc.restore();
    doc.fillColor(header ? `#${projectExportBrand.white}` : style?.color ?? `#${projectExportBrand.dark}`).font(projectExportBrand.bodyFont).fontSize(12).text(cell, x + CELL_PADDING_X, y + CELL_PADDING_Y, {
      width: widths[index] - CELL_PADDING_X * 2,
      height: rowHeight - CELL_PADDING_Y * 2,
      lineGap: 3,
      ellipsis: !header
    });
    x += widths[index];
  });

  doc.y = y + rowHeight;
}

function tableRowHeight(doc: PDFKit.PDFDocument, cells: string[], widths: number[], header: boolean) {
  const heights = cells.map((cell, index) => doc.heightOfString(cell, {
    width: widths[index] - CELL_PADDING_X * 2,
    lineGap: header ? 2 : 3
  }));
  return Math.max(36, Math.max(...heights) + CELL_PADDING_Y * 2);
}

function autoWidths(columnCount: number) {
  const width = CONTENT_WIDTH / columnCount;
  return Array.from({ length: columnCount }, () => width);
}

function chunkRowForTable(doc: PDFKit.PDFDocument, cells: string[], widths: number[], maxLinesPerChunk: number) {
  const wrappedLinesByCell = cells.map((cell, index) => wrapTextToLines(doc, cell, widths[index] - CELL_PADDING_X * 2));
  const maxLineCount = Math.max(...wrappedLinesByCell.map((lines) => lines.length), 1);
  if (maxLineCount <= maxLinesPerChunk) return [cells];

  const chunks: string[][] = [];
  for (let start = 0; start < maxLineCount; start += maxLinesPerChunk) {
    chunks.push(wrappedLinesByCell.map((lines) => lines.slice(start, start + maxLinesPerChunk).join("\n")));
  }
  return chunks;
}

function wrapTextToLines(doc: PDFKit.PDFDocument, text: string, width: number) {
  doc.font(projectExportBrand.bodyFont).fontSize(12);
  const paragraphs = String(text ?? "").split("\n");
  const lines: string[] = [];
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

function ensurePageSpace(doc: PDFKit.PDFDocument, requiredHeight: number, addProjectPage: () => void) {
  const available = PAGE.height - FOOTER_HEIGHT - 16 - doc.y;
  if (available < requiredHeight) addProjectPage();
}

function markPageContent(pageContentCounts: number[]) {
  if (!pageContentCounts.length) pageContentCounts.push(0);
  pageContentCounts[pageContentCounts.length - 1] += 1;
}

function hasRenderableSectionContent(section: ProjectExportSection) {
  const bodyLines = Array.isArray(section.body) ? section.body : section.body ? [section.body] : [];
  const hasBody = bodyLines.some((line) => line.trim().length > 0);
  const hasTables = (section.tables ?? []).some((table) => table.rows.length > 0 || table.title || table.columns.length > 0);
  return hasBody || hasTables;
}

function minimumSectionHeight(section: ProjectExportSection) {
  const hasTables = (section.tables ?? []).length > 0;
  const hasBody = Boolean(section.body);
  if (hasTables && hasBody) return 108;
  if (hasTables) return 92;
  return 72;
}

function cellStyle(columnLabel: string, value: string) {
  const normalizedValue = value.trim().toLowerCase();
  const normalizedLabel = columnLabel.trim().toLowerCase();
  const ragish = normalizedLabel.includes("rag") || normalizedValue === "green" || normalizedValue === "amber" || normalizedValue === "red";
  if (!ragish) return null;
  if (normalizedValue === "green") return { background: `#${projectExportBrand.ragGreenBg}`, color: `#${projectExportBrand.ragGreenText}` };
  if (normalizedValue === "amber") return { background: `#${projectExportBrand.ragAmberBg}`, color: `#${projectExportBrand.ragAmberText}` };
  if (normalizedValue === "red") return { background: `#${projectExportBrand.ragRedBg}`, color: `#${projectExportBrand.ragRedText}` };
  return null;
}

function drawProjectHeader(doc: PDFKit.PDFDocument, project: ProjectExportShape, definition: ProjectExportDefinition) {
  doc.save();
  doc.rect(0, 0, PAGE.width, HEADER_HEIGHT).fill(`#${projectExportBrand.white}`);
  doc.rect(0, 0, PAGE.width, 9).fill(`#${projectExportBrand.purple}`);
  doc.rect(PAGE.margin, HEADER_HEIGHT - 16, CONTENT_WIDTH, 2).fill(`#${projectExportBrand.gold}`);
  doc.restore();

  const logoDataUri = getProjectLogoDataUri();
  if (logoDataUri) {
    try {
      doc.image(logoDataUri, PAGE.width - PAGE.margin - 70, 18, { fit: [70, 70], align: "right" });
    } catch (error) {
      console.error("Project PDF logo rendering failed", { projectId: project.id, error });
    }
  }

  doc.fillColor(`#${projectExportBrand.purple}`).font(projectExportBrand.bodyFont).fontSize(22).text(definition.title.toUpperCase(), PAGE.margin, 24, {
    width: CONTENT_WIDTH - 90
  });
  doc.fillColor(`#${projectExportBrand.dark}`).font(projectExportBrand.bodyFont).fontSize(11).text("Connected Hospitality Limited", PAGE.margin, 54, {
    width: CONTENT_WIDTH - 90
  });
  doc.fillColor(`#${projectExportBrand.muted}`).font(projectExportBrand.bodyFont).fontSize(9).text(
    `${project.projectNumber} | ${project.name} | ${project.account.name}`,
    PAGE.margin,
    72,
    { width: CONTENT_WIDTH - 90 }
  );
  doc.y = HEADER_HEIGHT + 10;
}

function drawProjectFooter(doc: PDFKit.PDFDocument, project: ProjectExportShape, footerLabel?: string) {
  const dividerY = PAGE.height - PAGE.margin - 16;
  const textY = dividerY + 6;
  doc.save();
  doc.rect(PAGE.margin, dividerY, CONTENT_WIDTH, 1).fill(`#${projectExportBrand.gold}`);
  doc.restore();
  doc.fillColor(`#${projectExportBrand.muted}`).font(projectExportBrand.bodyFont).fontSize(8).text(
    footerLabel ?? `${project.projectNumber} | Connected Hospitality | ${new Date().toLocaleDateString("en-GB")}`,
    PAGE.margin,
    textY,
    { width: CONTENT_WIDTH, align: "center" }
  );
}

function legacyDefinition(title: string, content: Record<string, unknown>): ProjectExportDefinition {
  return {
    title,
    sections: Object.entries(content).map(([key, value]) => ({
      title: key,
      body: formatLegacyValue(value)
    }))
  };
}

function formatLegacyValue(value: unknown) {
  if (Array.isArray(value)) return value.map((item) => String(item ?? "-"));
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).map(([key, item]) => `${displayLabel(key)}: ${String(item ?? "-")}`);
  }
  return String(value ?? "-");
}

function formatCell(value: string | number | null | undefined) {
  return value == null || value === "" ? "-" : displayLabel(String(value));
}

function isDefinition(value: Record<string, unknown> | ProjectExportDefinition): value is ProjectExportDefinition {
  return "sections" in value && Array.isArray((value as ProjectExportDefinition).sections);
}

function getLogoFilePath() {
  const logoPath = path.join(process.cwd(), "public", "branding", "connected-hospitality-logo.png");
  return fs.existsSync(logoPath) ? logoPath : null;
}
