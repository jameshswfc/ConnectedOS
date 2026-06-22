import ExcelJS from "exceljs";
import PDFDocument from "pdfkit/js/pdfkit.standalone";
import { prisma } from "@/lib/prisma";
import { buildProjectGanttData } from "@/modules/projects/project-gantt-service";
import { projectResourceDisplayName } from "@/modules/projects/project-resource-label";
import { getProject, projectCompletionPercent } from "@/modules/projects/project-service";
import { assertProjectPermission } from "@/modules/projects/project-permissions";
import { displayLabel, generateProjectPdfBuffer, getProjectLogoDataUri, projectExportBrand, type ProjectExportDefinition } from "@/modules/projects/project-export-template";
import { projectLabel } from "@/modules/projects/ui/project-format";
import { createAuditLog } from "@/services/audit/audit-service";
import type { CrmAccessContext } from "@/modules/crm/types/crm-context";

export async function exportProjectFormPdf(context: CrmAccessContext, projectId: string, formIdOrType: string) {
  assertProjectPermission(context, "projects.export");
  const project = await getProject(context, projectId);
  const form = project.forms.find((item) => item.id === formIdOrType || item.formType === formIdOrType) ?? null;
  if (!form) throw new Error("Project form not found");
  const formContent = form.formType === "weekly_update"
    ? buildWeeklyUpdateContent(project, form.content as Record<string, unknown>)
    : form.formType === "change_request"
      ? buildChangeRequestContent(project, form.content as Record<string, unknown>)
      : form.content as Record<string, unknown>;
  let buffer: Buffer;
  try {
    buffer = await generateProjectPdfBuffer(project, form.title, formContent);
  } catch (error) {
    await logProjectExportFailure(context, projectId, `${form.formType}_pdf`, error);
    throw new ProjectExportGenerationError();
  }
  return {
    filename: `${project.projectNumber}-${form.formType}.pdf`,
    contentType: "application/pdf",
    buffer
  };
}

export async function exportImplementationDocumentPdf(context: CrmAccessContext, projectId: string) {
  assertProjectPermission(context, "projects.export");
  const project = await getProject(context, projectId);
  const content = buildImplementationDocumentContent(project);
  let buffer: Buffer;
  try {
    buffer = await generateProjectPdfBuffer(project, "Implementation Document", content);
  } catch (error) {
    await logProjectExportFailure(context, projectId, "implementation_document_pdf", error);
    throw new ProjectExportGenerationError();
  }
  return { filename: `${project.projectNumber}-implementation-document.pdf`, contentType: "application/pdf", buffer };
}

export async function exportProjectGanttPdf(context: CrmAccessContext, projectId: string) {
  assertProjectPermission(context, "projects.export");
  const project = await getProject(context, projectId);
  let buffer: Buffer;
  try {
    buffer = await generateProjectGanttPdfBuffer(project);
  } catch (error) {
    await logProjectExportFailure(context, projectId, "gantt_pdf", error);
    throw new ProjectExportGenerationError();
  }
  return { filename: `${project.projectNumber}-gantt.pdf`, contentType: "application/pdf", buffer };
}

export async function exportIssuesActionsExcel(context: CrmAccessContext, projectId: string) {
  assertProjectPermission(context, "projects.export");
  const project = await getProject(context, projectId);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Connected Hospitality";
  const sheet = workbook.addWorksheet("Issues & Actions");
  sheet.columns = [
    { header: "Type", key: "type", width: 18 },
    { header: "Title", key: "title", width: 34 },
    { header: "Owner", key: "owner", width: 24 },
    { header: "Priority", key: "priority", width: 14 },
    { header: "Status", key: "status", width: 16 },
    { header: "Due Date", key: "dueDate", width: 16 },
    { header: "Resolution", key: "resolution", width: 34 }
  ];
  sheet.spliceRows(1, 0, [`Connected Hospitality - ${project.projectNumber} Issues & Actions`], [`${project.name} - ${project.account.name}`], []);
  sheet.mergeCells("A1:G1");
  sheet.getCell("A1").font = { bold: true, size: 16, color: { argb: "FFFFFFFF" } };
  sheet.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${projectExportBrand.purple}` } };
  sheet.getRow(4).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(4).fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${projectExportBrand.purple}` } };
  project.issueActions.forEach((item) => sheet.addRow({
    type: item.type,
    title: item.title,
    owner: item.owner?.displayName ?? "",
    priority: item.priority,
    status: item.status,
    dueDate: item.dueDate?.toLocaleDateString("en-GB") ?? "",
    resolution: item.resolution ?? ""
  }));
  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  return { filename: `${project.projectNumber}-issues-actions.xlsx`, contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer };
}

export async function ensureProjectForm(context: CrmAccessContext, projectId: string, formType: "closure" | "support_handover") {
  const project = await getProject(context, projectId);
  const existing = project.forms.find((form) => form.formType === formType);
  if (existing) return existing;
  return prisma.projectForm.create({
    data: {
      projectId,
      formType,
      title: formType === "closure" ? "Project Closure" : "Support Handover",
      preparedById: context.userId,
      content: {}
    }
  });
}

export function buildWeeklyUpdateContent(project: Awaited<ReturnType<typeof getProject>>, content: Record<string, unknown>): ProjectExportDefinition {
  const completion = projectCompletionPercent(project);
  const completedTasks = project.tasks.filter((task) => task.status === "complete");
  const inProgressTasks = project.tasks.filter((task) => task.status === "in_progress");
  const overdueTasks = project.tasks.filter((task) => task.status !== "complete" && task.endDate < new Date());
  const upcomingTasks = project.tasks.filter((task) => task.status !== "complete" && task.endDate >= new Date()).slice(0, 8);
  const openIssues = project.issueActions.filter((item) => item.status !== "closed");
  const changeRequests = project.forms.filter((form) => form.formType === "change_request");
  const reportStart = asDate(content.reportingPeriodStart) ?? project.startDate ?? new Date();
  const reportEnd = asDate(content.reportingPeriodEnd) ?? new Date();
  const reportNumber = text(content.reportNumber) || `${project.projectNumber}-WR-01`;
  const pmSummary = text(content.pmSummary) || text(content.executiveSummary) || `Project is ${displayLabel(String(project.ragStatus))} with ${completion}% completion, ${overdueTasks.length} overdue task(s) and ${openIssues.length} open risk / issue entries.`;
  const pmCommentary = text(content.pmCommentary) || pmSummary;
  const overallCommentary = text(content.overallCommentary) || pmSummary;
  const scheduleCommentary = text(content.scheduleCommentary) || `${overdueTasks.length} overdue task(s). ${project.milestones.filter((milestone) => milestone.status !== "complete").length} milestone(s) still open.`;
  const budgetCommentary = text(content.budgetCommentary) || text(content.budgetSummary) || `Contract value ${money(project.commercialValue)}. Outstanding billing ${money(project.outstandingAmount)}.`;
  const scopeCommentary = text(content.scopeCommentary) || project.scopeSummary || project.description || "Scope remains aligned to the agreed brief.";
  const risksCommentary = text(content.risksIssuesCommentary) || text(content.risksBlockers) || "No major blockers recorded.";
  const resourcesCommentary = text(content.resourcesCommentary) || "No major resource exceptions reported this period.";
  const customerReadiness = text(content.customerReadinessCommentary) || "";
  const operationalImpactCommentary = text(content.operationalImpactCommentary) || "";
  const budgetSummary = text(content.budgetSummary) || `Contract value ${money(project.commercialValue)}. Outstanding billing ${money(project.outstandingAmount)}.`;
  const nextWeekPlan = text(content.nextWeekPlan) || "Continue with scheduled activities, close open issues and prepare for the next stage gate.";
  const customerActions = text(content.customerActionsRequired) || text(content.customerDecisionsRequired) || "No customer decisions currently required.";
  const dependencySummaryRows = project.tasks
    .filter((task) => task.predecessors?.length)
    .slice(0, 6)
    .map((task) => [task.title, task.predecessors?.map((dependency) => dependencyLabel(project.tasks, dependency.predecessorTaskId)).filter(Boolean).join(", ") || "-", formatDate(task.startDate)]);
  const customerDecisionRows = contentRows(content.customerDecisionRows, 5);
  const resourceSiteRows = buildResourceSiteRows(content);
  const operationalImpactRows = buildOperationalImpactRows(content);
  const brandComplianceRows = buildBrandComplianceRows(content, project.projectType);
  const approvalRows = buildApprovalRows(project, content);
  const distributionRows = buildDistributionRows(project, content);
  const projectTable = [
    ["Project Name", project.name],
    ["Customer", project.account.name],
    ["Property / Site", project.account.name],
    ["Reporting Period", `${formatDate(reportStart)} to ${formatDate(reportEnd)}`],
    ["Report Number", reportNumber],
    ["Project Manager", project.projectManager?.displayName ?? "To be confirmed"],
    ["Current Stage", text(content.currentStage) || project.status],
    ["Status", text(content.status) || text(content.overallStatus) || project.status]
  ];

  return {
    title: "Weekly Status Report",
    intro: "This weekly report provides a concise view of project health, progress, risks, issues, decisions and operational impacts. It is designed for customer review, internal management oversight and stage gate evidence without duplicating the detailed Project Plan, RAID Log or Change Register.",
    metadata: [
      { label: "Project", value: `${project.projectNumber} - ${project.name}` },
      { label: "Customer", value: project.account.name },
      { label: "Report Number", value: reportNumber },
      { label: "Reporting Period", value: `${formatDate(reportStart)} to ${formatDate(reportEnd)}` }
    ],
    footerLabel: "Connected Hospitality Limited - Weekly Status Report - Controlled Project Document",
    sections: [
      {
        title: "Project Summary",
        tables: [
          { title: "Project Table", columns: ["Field", "Value"], rows: projectTable },
          {
            title: "Document Control",
            columns: ["Field", "Value"],
            rows: [
              ["Document Owner", project.projectManager?.displayName ?? "Connected Hospitality"],
              ["Review Frequency", "Weekly"],
              ["Status", displayLabel(text(content.status) || text(content.overallStatus) || project.status)],
              ["Related Documents", `${project.quote.quoteNumber}, ${project.projectNumber}`]
            ]
          },
          { title: "Version History", columns: ["Version", "Date", "Author", "Description"], rows: [["1.0", formatDate(new Date()), project.projectManager?.displayName ?? "Connected Hospitality", "Generated weekly status report"]] }
        ]
      },
      {
        title: "Section 1 - Executive Summary",
        body: pmSummary
      },
      {
        title: "Section 2 - Project Health Dashboard",
        tables: [{
          columns: ["Area", "RAG Status", "Commentary"],
          rows: [
            ["Overall Project", project.ragStatus, pmSummary],
            ["Schedule", project.ragStatus, scheduleCommentary],
            ["Budget", project.ragStatus, budgetCommentary],
            ["Scope", project.ragStatus, scopeCommentary],
            ["Risks and Issues", openIssues.length ? "amber" : "green", risksCommentary],
            ["Resources", project.resourceAssignments.length ? "green" : "amber", resourcesCommentary],
            ["Customer Readiness", customerReadiness ? "amber" : "green", customerReadiness || "No customer readiness issues reported this period."],
            ["Operational Impact", operationalImpactCommentary ? "amber" : "green", operationalImpactCommentary || "No known hospitality operational impact this period."]
          ]
        }]
      },
      {
        title: "Section 3 - Progress This Week",
        tables: [{
          columns: ["Completed Activity", "Outcome / Evidence", "Owner"],
          rows: completedTasks.length
            ? completedTasks.map((task) => [task.title, task.description ?? "Task completed.", task.assignedTo?.displayName ?? task.owner?.displayName ?? "-"])
            : [["No completed activities recorded", "-", "-"]]
        }]
      },
      {
        title: "Section 4 - Planned Activities Next Week",
        tables: [
          {
            columns: ["Planned Activity", "Owner", "Target Date", "Dependency / Note"],
            rows: upcomingTasks.length
              ? upcomingTasks.map((task) => [task.title, task.assignedTo?.displayName ?? task.owner?.displayName ?? "-", formatDate(task.endDate), dependencyNote(task, project.tasks)])
              : [["No planned activities recorded", "-", "-", "-"]]
          },
          {
            title: "Dependency / Schedule Notes",
            columns: ["Task", "Dependency", "Forecast Start"],
            rows: dependencySummaryRows.length ? dependencySummaryRows : [["No upcoming dependency-driven changes recorded", "-", "-"]]
          }
        ]
      },
      {
        title: "Section 5 - Milestone Status",
        tables: [{
          columns: ["Milestone", "Baseline Date", "Forecast / Actual Date", "Status", "Commentary"],
          rows: project.milestones.length
            ? project.milestones.map((milestone) => [milestone.title, formatDate(milestone.milestoneDate), formatDate(milestone.completedAt ?? milestone.milestoneDate), milestone.status, milestone.description ?? linkedProjectNote(milestone.title)])
            : [["No milestones recorded", "-", "-", "-", "-"]]
        }]
      },
      {
        title: "Section 6 - Risks and Issues Summary",
        tables: [
          {
            title: "Top Risks",
            columns: ["Title", "Owner", "Status", "Priority", "Due Date"],
            rows: project.issueActions.filter((item) => item.type === "risk").length
              ? project.issueActions.filter((item) => item.type === "risk").map((item) => [item.title, item.owner?.displayName ?? "-", item.status, item.priority, formatDate(item.dueDate)])
              : [["No active risks", "-", "-", "-", "-"]]
          },
          {
            title: "Top Issues",
            columns: ["Title", "Owner", "Status", "Priority", "Due Date"],
            rows: project.issueActions.filter((item) => item.type === "issue").length
              ? project.issueActions.filter((item) => item.type === "issue").map((item) => [item.title, item.owner?.displayName ?? "-", item.status, item.priority, formatDate(item.dueDate)])
              : [["No active issues", "-", "-", "-", "-"]]
          }
        ]
      },
      {
        title: "Section 7 - Changes and Variations Summary",
        tables: [{
          columns: ["Ref", "Change / Variation", "Cost Impact", "Programme Impact", "Status"],
          rows: changeRequests.length
            ? changeRequests.map((form) => {
                const formContent = plain(form.content);
                return [
                  form.title,
                  text(formContent.summary) || text(formContent.reason) || "Change request raised.",
                  money(formContent.valueImpact ?? formContent.difference ?? 0),
                  `${Number(formContent.resourceDayImpact ?? 0)} resource day(s)`,
                  text(formContent.status) || "pending_review"
                ];
              })
            : [["No variations recorded", "-", "-", "-", "-"]]
        }]
      },
      {
        title: "Section 8 - Commercial Summary",
        tables: [{
          columns: ["Metric", "Value / Status", "Commentary"],
          rows: [
            ["Contract Value", money(project.commercialValue), "Current approved contract value."],
            ["Approved Variations", money(changeRequests.filter((form) => text(plain(form.content).status) === "approved").reduce((sum, form) => sum + Number(plain(form.content).valueImpact ?? plain(form.content).difference ?? 0), 0)), "Approved project change requests."],
            ["Pending Variations", money(changeRequests.filter((form) => text(plain(form.content).status) !== "approved").reduce((sum, form) => sum + Number(plain(form.content).valueImpact ?? plain(form.content).difference ?? 0), 0)), "Pending customer or internal approval."]
          ]
        }]
      },
      {
        title: "Section 9 - Customer Decisions Required",
        tables: customerDecisionRows.length ? [{
          columns: ["Decision / Action Required", "Owner", "Required By", "Impact if Delayed", "Status"],
          rows: customerDecisionRows.map((row) => [row[0], row[1] || "To be confirmed", row[2] || "-", row[3] || "Programme progression may be impacted.", row[4] || "Open"])
        }] : undefined,
        body: customerDecisionRows.length ? undefined : "No customer decisions required this reporting period."
      },
      {
        title: "Section 10 - Resource and Site Access Summary",
        tables: resourceSiteRows.length ? [{
          columns: ["Area", "Status", "Commentary"],
          rows: resourceSiteRows
        }] : undefined,
        body: resourceSiteRows.length ? undefined : "No resource or site access exceptions reported this period."
      },
      {
        title: "Section 11 - Hospitality Operational Impact",
        tables: operationalImpactRows.length ? [{
          columns: ["Operational Area", "Impact This Week", "Planned Impact Next Week", "Controls / Notes"],
          rows: operationalImpactRows
        }] : undefined,
        body: operationalImpactRows.length ? undefined : "No known hospitality operational impact this period."
      },
      {
        title: "Section 12 - Brand, Compliance and Technical Assurance",
        tables: brandComplianceRows.length ? [{
          columns: ["Requirement", "Status", "Evidence / Commentary"],
          rows: brandComplianceRows
        }] : undefined,
        body: brandComplianceRows.length ? undefined : "No brand, compliance or technical assurance exceptions reported this period."
      },
      {
        title: "Section 13 - Project Manager Commentary",
        body: pmCommentary
      },
      {
        title: "Section 14 - Approval and Distribution",
        startOnNewPage: true,
        tables: approvalRows.length || distributionRows.length ? [
          {
            title: "Approval Table",
            columns: ["Role", "Name", "Status / Signature", "Date"],
            rows: approvalRows.length ? approvalRows : [["Awaiting project approval details.", "-", "-", "-"]]
          },
          {
            title: "Distribution List",
            columns: ["Recipient", "Organisation", "Purpose"],
            rows: distributionRows.length ? distributionRows : [["Awaiting distribution details.", "-", "-"]]
          }
        ] : undefined,
        body: approvalRows.length || distributionRows.length ? undefined : "Awaiting project approval details."
      }
    ]
  };
}

export function buildChangeRequestContent(project: Awaited<ReturnType<typeof getProject>>, content: Record<string, unknown>): ProjectExportDefinition {
  const hardwareItems = Array.isArray(content.hardwareItems) ? content.hardwareItems as Record<string, unknown>[] : [];
  return {
    title: "Project Change Request",
    subtitle: "Connected Hospitality Limited",
    footerLabel: "Connected Hospitality Limited - Project Change Request - Controlled Project Document",
    metadata: [
      { label: "Project", value: `${project.projectNumber} - ${project.name}` },
      { label: "Customer", value: project.account.name },
      { label: "Quote Reference", value: text(content.quoteNumber) || project.quote.quoteNumber }
    ],
    sections: [
      {
        title: "Customer / Account Details",
        body: `${project.account.name}\nAddress: ${accountAddress(project.account)}`
      },
      {
        title: "Project Details",
        body: `${project.projectNumber} - ${project.name}\nPM: ${project.projectManager?.displayName ?? "Unassigned"}\nRAG: ${project.ragStatus}`
      },
      {
        title: "Quote Reference",
        body: `${text(content.quoteNumber) || project.quote.quoteNumber}\nVersion: ${text(content.quoteVersionNumber) || project.quoteVersion.versionNumber}`
      },
      {
        title: "Change Summary",
        body: text(content.reason) || text(content.summary) || "Quote changed after project creation"
      },
      {
        title: "Commercial Impact",
        body: `Old total: ${money(content.oldTotal)}\nNew total: ${money(content.newTotal)}\nDifference: ${money(content.difference ?? content.valueImpact)}`
      },
      {
        title: "Resource Day Impact",
        body: `${content.resourceDayImpact ?? 0} additional resource day(s)`
      },
      {
        title: "Hardware / Software Impact",
        tables: [{
          columns: ["SKU", "Description", "Quantity", "Unit Sell"],
          rows: hardwareItems.length
            ? hardwareItems.map((item) => [text(item.sku) || "-", text(item.description) || "-", Number(item.quantity ?? 0), money(item.unitSell)])
            : [["-", "No hardware/software impact recorded.", "-", "-"]]
        }]
      },
      {
        title: "Approval / Signature",
        body: `Status: ${text(content.status) || "pending_review"}\nApproved by: ______________________________\nDate: ______________________________\nCustomer / internal sign-off: ______________________________`
      }
    ]
  };
}

export function buildGanttPdfContent(project: Awaited<ReturnType<typeof getProject>>): ProjectExportDefinition {
  const gantt = buildProjectGanttData(project);
  const timelineColumns = ["Item", "Owner", "Start", "End", "Timeline", "Depends On"];
  return {
    title: "Project Gantt",
    subtitle: "Connected Hospitality Limited",
    footerLabel: "Connected Hospitality Limited - Project Gantt - Controlled Project Document",
    metadata: [
      { label: "Project", value: `${project.projectNumber} - ${project.name}` },
      { label: "Customer", value: project.account.name },
      { label: "Project Manager", value: project.projectManager?.displayName ?? "Unassigned" },
      { label: "Date Range", value: `${formatDate(gantt.chartStartDate)} to ${formatDate(gantt.chartEndDate)}` },
      { label: "Export Date", value: formatDate(new Date()) }
    ],
    sections: [
      {
        title: "Project Details",
        body: [
          `Project number: ${project.projectNumber}`,
          `Project name: ${project.name}`,
          `Customer: ${project.account.name}`,
          `Project manager: ${project.projectManager?.displayName ?? "Unassigned"}`,
          `Timeline: ${gantt.timelineLabel}`
        ]
      },
      {
        title: "Status Legend",
        tables: [{
          columns: ["Status", "Meaning"],
          rows: [
            ["Green", "Complete"],
            ["Purple", "In progress"],
            ["Amber", "Blocked or delayed"],
            ["Grey", "Not started"],
            ["Red", "Overdue"]
          ]
        }]
      },
      {
        title: "Gantt Timeline",
        body: "Timeline bars are shown at week level for PDF export while the in-app Gantt keeps the day-level interactive view.",
        tables: [{
          title: `Timeline weeks: ${gantt.weekHeaders.map((week) => week.shortLabel).join(" | ")}`,
          columns: timelineColumns,
          rows: gantt.items.length
            ? gantt.items.map((item) => [
                item.type === "milestone" ? `Milestone: ${item.title}` : item.title,
                item.assignedTo ?? "-",
                formatDate(item.startDate),
                formatDate(item.endDate),
                buildWeeklyTimelineBar(item.offsetDays, item.spanDays, gantt.totalDays, gantt.weekHeaders.length, item.type === "milestone"),
                item.dependencyLabels.length ? item.dependencyLabels.join(", ") : "-"
              ])
            : [["No project tasks or milestones available", "-", "-", "-", "-", "-"]]
        }]
      }
    ]
  };
}

export async function generateProjectGanttPdfBuffer(project: Awaited<ReturnType<typeof getProject>>) {
  const gantt = buildProjectGanttData(project);
  const page = { width: 842, height: 595, margin: 28 };
  const taskColumnWidth = 220;
  const timelineX = page.margin + taskColumnWidth;
  const timelineWidth = page.width - page.margin - timelineX;
  const weekColumnWidth = 120;
  const weeksPerPage = Math.max(1, Math.floor(timelineWidth / weekColumnWidth));
  const rowHeight = 24;
  const timelineHeaderY = 138;
  const timelineRowStartY = timelineHeaderY + 28;
  const rowAreaHeight = page.height - page.margin - 34 - timelineRowStartY;
  const rowsPerPage = Math.max(1, Math.floor(rowAreaHeight / rowHeight));
  const weekChunks = chunkArray(gantt.weekHeaders, weeksPerPage);
  const rowChunks = chunkArray(gantt.items, rowsPerPage);
  const totalParts = Math.max(1, weekChunks.length * rowChunks.length);

  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      layout: "landscape",
      margin: page.margin,
      compress: false,
      info: { Title: `${project.projectNumber} Project Gantt`, Author: "Connected Hospitality" }
    });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    let partIndex = 0;
    weekChunks.forEach((weekChunk, weekChunkIndex) => {
      const startOffset = weekChunk[0]?.offsetDays ?? 0;
      const visibleSpanDays = weekChunk.reduce((sum, week) => sum + week.spanDays, 0);
      const visibleEndOffset = startOffset + visibleSpanDays;
      rowChunks.forEach((rowChunk, rowChunkIndex) => {
        if (partIndex > 0) doc.addPage();
        partIndex += 1;

        drawGanttPdfHeader(doc, page, project, partIndex, totalParts);
        drawGanttLegend(doc, page);
        drawGanttMetadata(doc, page, project, gantt);
        drawGanttGrid(doc, page, weekChunk, weekColumnWidth, taskColumnWidth, timelineHeaderY);

        rowChunk.forEach((item, rowIndex) => {
          const rowY = timelineRowStartY + rowIndex * rowHeight;
          drawGanttRowLabel(doc, item, page.margin, rowY, taskColumnWidth);
          drawGanttTimelineRow(
            doc,
            item,
            weekChunk,
            startOffset,
            visibleEndOffset,
            timelineX,
            rowY,
            weekColumnWidth,
            rowHeight
          );
        });

        drawLandscapeFooter(doc, page, `Connected Hospitality Limited - Project Gantt - Controlled Project Document`, `${project.projectNumber} - ${project.name}`);
      });
    });

    doc.end();
  });
}

export function buildImplementationDocumentContent(project: Awaited<ReturnType<typeof getProject>>): ProjectExportDefinition {
  return {
    title: "Implementation Document",
    subtitle: "Connected Hospitality Limited",
    footerLabel: "Connected Hospitality Limited - Implementation Document - Controlled Project Document",
    metadata: [
      { label: "Project", value: `${project.projectNumber} - ${project.name}` },
      { label: "Customer", value: project.account.name },
      { label: "Project Manager", value: project.projectManager?.displayName ?? "Unassigned" },
      { label: "Quote", value: project.quote.quoteNumber }
    ],
    sections: [
      { title: "1. Project Overview", body: `${project.projectNumber} - ${project.name}\nStatus: ${project.status}\nRAG: ${project.ragStatus}\nProject type: ${project.projectType}\nScope summary: ${project.scopeSummary ?? project.description ?? "-"}` },
      { title: "2. Customer Details", body: `${project.account.name}\nAddress: ${accountAddress(project.account)}\nPrimary contact: ${project.quote.contact ? `${project.quote.contact.firstName} ${project.quote.contact.lastName} | ${project.quote.contact.email ?? "-"} | ${project.quote.contact.phone ?? project.quote.contact.mobile ?? "-"}` : "See CRM contact record"}` },
      { title: "3. Contact Matrix", tables: [{ columns: ["Role", "Name", "Organisation / Notes"], rows: [["Project Manager", project.projectManager?.displayName ?? "Unassigned", "Connected Hospitality"], ["Salesperson", project.opportunity.owner.displayName, "Connected Hospitality"], ["Pre-Sales Engineer", project.presalesRequest?.assignedTo?.displayName ?? "Unassigned", project.presalesRequest?.requestNumber ?? "No linked request"], ["Customer Contact", project.quote.contact ? `${project.quote.contact.firstName} ${project.quote.contact.lastName}` : "TBC", project.account.name]] }] },
      { title: "4. Scope of Works", body: `${project.scopeSummary ?? "-"}\nOpportunity notes: ${project.opportunity.notes ?? "-"}` },
      { title: "5. Technical Summary", body: `Opportunity type: ${project.opportunity.opportunityType}\nSource: ${project.opportunity.source}\nHigh level scope: ${project.quote.highLevelScope}\nTerms: ${project.paymentTerms ?? project.quoteVersion.terms}` },
      { title: "6. Pre-Sales Handover Summary", tables: [{ columns: ["Item", "Summary"], rows: [["Request", project.presalesRequest?.requestNumber ?? "None linked"], ["Engineer", project.presalesRequest?.assignedTo?.displayName ?? "Unassigned"], ["Request Type", project.presalesRequest?.requestType ?? "-"], ["Deliverables", project.presalesRequest?.deliverables.map((deliverable) => `${deliverable.title} (${deliverable.status})`).join("; ") || "No deliverables recorded."], ["Files", project.presalesRequest?.deliverables.filter((deliverable) => deliverable.document).map((deliverable) => deliverable.document?.fileName).filter(Boolean).join("; ") || "No files linked."]]}] },
      { title: "7. Commercial Summary", tables: [{ columns: ["Metric", "Value"], rows: [["Quote Reference", project.quote.quoteNumber], ["Accepted Version", project.quoteVersion.versionNumber], ["Commercial Value", money(project.commercialValue)], ["Budget Sell", money(project.budgetSell)], ["Budget Cost", money(project.budgetCost)]] }] },
      { title: "8. Resource Plan", tables: [{ columns: ["Resource", "Role", "Date Range", "Scheduled Days", "Used Days"], rows: project.resourceAssignments.length ? project.resourceAssignments.map((resource) => [projectResourceDisplayName(resource), resource.role, `${formatDate(resource.startDate)} to ${formatDate(resource.endDate)}`, Number(resource.scheduledDays), Number(resource.usedDays)]) : [["No resources scheduled", "-", "-", "-", "-"]] }] },
      { title: "9. Implementation Plan", tables: [{ columns: ["Task", "Status", "Start", "Finish"], rows: project.tasks.length ? project.tasks.map((task) => [task.title, task.status, formatDate(task.startDate), formatDate(task.endDate)]) : [["No tasks recorded", "-", "-", "-"]] }] },
      { title: "10. Milestones and Stage Gates", tables: [{ title: "Milestones", columns: ["Milestone", "Date", "Status"], rows: project.milestones.length ? project.milestones.map((milestone) => [milestone.title, formatDate(milestone.milestoneDate), milestone.status]) : [["None", "-", "-"]] }, { title: "Stage Gates", columns: ["Stage", "Status", "Notes"], rows: project.stageGates.length ? project.stageGates.map((gate) => [gate.stage, gate.status, gate.notes ?? "-"]) : [["None", "-", "-"]] }] },
      { title: "11. Risks, Issues and Assumptions", tables: [{ columns: ["Type", "Title", "Status", "Priority"], rows: project.issueActions.length ? project.issueActions.map((item) => [item.type, item.title, item.status, item.priority]) : [["No risks, issues or actions recorded", "-", "-", "-"]] }] },
      { title: "12. Acceptance Criteria", body: "Customer acceptance, successful handover, documentation completion, support readiness and formal closure sign-off." },
      { title: "13. Handover Requirements", body: `Support handover form: ${project.forms.some((form) => form.formType === "support_handover") ? "Available" : "Not yet completed"}\nClosure form: ${project.forms.some((form) => form.formType === "closure") ? "Available" : "Not yet completed"}` },
      { title: "14. Appendices / Linked Documents", tables: [{ columns: ["Type", "Document"], rows: project.documentRecords.length ? project.documentRecords.map((record) => [record.documentType, record.document.fileName]) : [["No project documents linked", "-"]] }] }
    ]
  };
}

export async function logProjectExportFailure(context: CrmAccessContext, projectId: string, exportType: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  console.error("Project export failed", { projectId, userId: context.userId, exportType, error });
  await createAuditLog({
    userId: context.userId,
    module: "projects",
    entityType: "Project",
    entityId: projectId,
    action: "export_failed",
    newValue: { exportType, message }
  });
}

export class ProjectExportGenerationError extends Error {
  constructor() {
    super("Unable to generate this document. Please contact an administrator if the issue persists.");
    this.name = "ProjectExportGenerationError";
  }
}

function money(value: unknown) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(Number(value ?? 0));
}

function accountAddress(account: Awaited<ReturnType<typeof getProject>>["account"]) {
  return [account.addressLine1, account.addressLine2, account.city, account.county, account.postcode, account.country].filter(Boolean).join(", ") || "-";
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-GB");
}

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

function dependencyNote(task: { description?: string | null; predecessors?: { predecessorTaskId?: string | null }[] }, allTasks?: { id: string; title: string }[]) {
  const dependencyNames = task.predecessors?.map((dependency) => dependencyLabel(allTasks ?? [], dependency.predecessorTaskId)).filter(Boolean) ?? [];
  const note = task.description?.trim() || "";
  if (dependencyNames.length && note) return `Depends on: ${dependencyNames.join(", ")}. ${note}`;
  if (dependencyNames.length) return `Depends on: ${dependencyNames.join(", ")}`;
  return note || "-";
}

function dependencyLabel(tasks: { id: string; title: string }[], predecessorTaskId?: string | null) {
  return tasks.find((task) => task.id === predecessorTaskId)?.title ?? null;
}

function asDate(value: unknown) {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function plain(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function linkedProjectNote(title: string) {
  if (title === "Customer Kick Off" || title === "Kick Off") return "Linked to Customer Kick Off Call task completion.";
  if (title === "Equipment Delivered") return "Linked to Equipment Order task or manual completion.";
  if (title === "Deployment Start") return "Linked to Deployment Commenced task completion.";
  if (title === "UAT Complete") return "Linked to Marriott GPNS validation task where applicable.";
  if (title === "Handover") return "Linked to Handover to Support Completed task completion.";
  if (title === "Closure") return "Linked to Project Closure Document & Sign Off task completion.";
  return "Manual milestone review.";
}

function contentRows(value: unknown, expectedColumns: number) {
  if (!Array.isArray(value)) return [];
  return value
    .map((row) => {
      if (Array.isArray(row)) return row.map((item) => String(item ?? "").trim()).slice(0, expectedColumns);
      if (row && typeof row === "object") {
        const objectValues = Object.values(row as Record<string, unknown>).map((item) => String(item ?? "").trim());
        return objectValues.slice(0, expectedColumns);
      }
      return [String(row ?? "").trim()];
    })
    .map((row) => [...row, ...Array.from({ length: Math.max(0, expectedColumns - row.length) }, () => "")].slice(0, expectedColumns))
    .filter((row) => row.some((cell) => cell.length > 0));
}

function buildResourceSiteRows(content: Record<string, unknown>) {
  const rows = [
    [
      "Connected Hospitality Resources",
      text(content.connectedHospitalityResourcesStatus),
      text(content.connectedHospitalityResourcesCommentary)
    ],
    [
      "Subcontractor Resources",
      text(content.subcontractorResourcesStatus),
      text(content.subcontractorResourcesCommentary)
    ],
    [
      "Customer Site Access",
      text(content.customerSiteAccessStatus),
      text(content.customerSiteAccessCommentary)
    ],
    [
      "Room / Area Access",
      text(content.roomAreaAccessStatus),
      text(content.roomAreaAccessCommentary)
    ],
    [
      "Permits / RAMS / Inductions",
      text(content.permitsRamsInductionsStatus),
      text(content.permitsRamsInductionsCommentary)
    ],
    [
      "Deliveries / Storage",
      text(content.deliveriesStorageStatus),
      text(content.deliveriesStorageCommentary)
    ]
  ];

  return rows.filter((row) => row.slice(1).some((cell) => cell.trim().length > 0));
}

function buildOperationalImpactRows(content: Record<string, unknown>) {
  return contentRows(content.operationalImpactRows, 4);
}

function buildBrandComplianceRows(content: Record<string, unknown>, projectType?: string | null) {
  const rows = contentRows(content.brandComplianceRows, 3);
  if (rows.length) {
    return rows;
  }
  if (String(projectType ?? "").trim().toLowerCase() === "marriott_gpns") {
    return [["Brand Standard Compliance", "Amber", "Marriott GPNS compliance under review."]];
  }
  return [];
}

function buildApprovalRows(project: Awaited<ReturnType<typeof getProject>>, content: Record<string, unknown>) {
  const rows = contentRows(content.approvalRows, 4);
  if (rows.length) {
    return rows.map((row) => [
      row[0] || "Role",
      normaliseFormalName(row[1], row[0]),
      row[2] || "Pending",
      row[3] || "-"
    ]);
  }

  const defaults = [
    ["Project Manager", normaliseFormalName(project.projectManager?.displayName ?? "", "Project Manager"), "Pending", "-"],
    ["Project Sponsor", "To be confirmed", "Pending", "-"],
    ["Customer Representative", quoteContactName(project), "Pending", "-"]
  ];
  return defaults.filter((row) => row[1] !== "To be confirmed" || row[0] !== "Customer Representative");
}

function buildDistributionRows(project: Awaited<ReturnType<typeof getProject>>, content: Record<string, unknown>) {
  const rows = contentRows(content.distributionRows, 3);
  if (rows.length) {
    return rows.map((row) => [
      normaliseFormalName(row[0], "Recipient"),
      row[1] || project.account.name,
      row[2] || "Weekly report circulation"
    ]);
  }

  const defaults = [
    [normaliseFormalName(project.projectManager?.displayName ?? "", "Recipient"), "Connected Hospitality", "Project oversight"],
    [normaliseFormalName(quoteContactName(project), "Recipient"), project.account.name, "Customer review"],
    [normaliseFormalName(project.opportunity.owner?.displayName ?? "", "Recipient"), "Connected Hospitality", "Sales coordination"]
  ];
  return defaults.filter((row) => row[0] !== "To be confirmed");
}

function normaliseFormalName(value: string, fallbackLabel: string) {
  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === "unassigned") {
    return fallbackLabel === "Project Manager" ? "To be confirmed" : "To be confirmed";
  }
  if (trimmed.toLowerCase() === "everyone") return "To be confirmed";
  return trimmed;
}

function quoteContactName(project: Awaited<ReturnType<typeof getProject>>) {
  const first = project.quote.contact?.firstName?.trim() ?? "";
  const last = project.quote.contact?.lastName?.trim() ?? "";
  const fullName = `${first} ${last}`.trim();
  return fullName || "To be confirmed";
}

function buildWeeklyTimelineBar(offsetDays: number, spanDays: number, totalDays: number, weekCount: number, milestone: boolean) {
  const buckets = Math.max(1, weekCount);
  const chars = Array.from({ length: buckets }, () => "·");
  const startBucket = Math.min(buckets - 1, Math.floor((offsetDays / Math.max(1, totalDays)) * buckets));
  const endBucket = Math.min(buckets - 1, Math.floor(((offsetDays + Math.max(1, spanDays) - 1) / Math.max(1, totalDays)) * buckets));
  if (milestone) {
    chars[startBucket] = "◆";
    return chars.join(" ");
  }
  for (let index = startBucket; index <= endBucket; index += 1) {
    chars[index] = "█";
  }
  return chars.join(" ");
}

function drawGanttPdfHeader(
  doc: PDFKit.PDFDocument,
  page: { width: number; height: number; margin: number },
  project: Awaited<ReturnType<typeof getProject>>,
  partIndex: number,
  totalParts: number
) {
  doc.save();
  doc.rect(0, 0, page.width, 10).fill(`#${projectExportBrand.purple}`);
  doc.restore();
  const logoDataUri = getProjectLogoDataUri();
  if (logoDataUri) {
    try {
      doc.image(logoDataUri, page.width - page.margin - 90, 18, { fit: [82, 56], align: "right" });
    } catch (error) {
      console.error("Gantt PDF logo rendering failed", { projectId: project.id, error });
    }
  }
  doc.fillColor(`#${projectExportBrand.purple}`).font(projectExportBrand.bodyFont).fontSize(20).text(
    totalParts > 1 ? `GANTT CHART PART ${partIndex}` : "GANTT CHART",
    page.margin,
    22,
    { width: page.width - page.margin * 2 - 110 }
  );
  doc.fillColor(`#${projectExportBrand.dark}`).font(projectExportBrand.bodyFont).fontSize(10).text(
    "Connected Hospitality Limited",
    page.margin,
    48
  );
}

function drawGanttMetadata(
  doc: PDFKit.PDFDocument,
  page: { width: number; height: number; margin: number },
  project: Awaited<ReturnType<typeof getProject>>,
  gantt: ReturnType<typeof buildProjectGanttData>
) {
  const metadataRows = [
    ["Project Number", project.projectNumber],
    ["Project Name", project.name],
    ["Customer", project.account.name],
    ["Project Manager", project.projectManager?.displayName ?? "Unassigned"],
    ["Date Range", `${formatDate(gantt.chartStartDate)} to ${formatDate(gantt.chartEndDate)}`],
    ["Export Date", formatDate(new Date())]
  ];
  let y = 78;
  metadataRows.forEach(([label, value]) => {
    doc.fillColor(`#${projectExportBrand.muted}`).font(projectExportBrand.bodyFont).fontSize(9).text(`${label}:`, page.margin, y, { width: 80 });
    doc.fillColor(`#${projectExportBrand.dark}`).font(projectExportBrand.bodyFont).fontSize(9).text(value, page.margin + 84, y, { width: 240 });
    y += 12;
  });
}

function drawGanttLegend(doc: PDFKit.PDFDocument, page: { width: number; height: number; margin: number }) {
  const items = [
    ["Complete", "#16A34A"],
    ["In progress", "#4B1F73"],
    ["Blocked / delayed", "#F59E0B"],
    ["Not started", "#94A3B8"],
    ["Overdue", "#DC2626"]
  ] as const;
  let x = page.margin + 340;
  const y = 90;
  items.forEach(([label, color]) => {
    doc.save();
    doc.roundedRect(x, y, 14, 10, 3).fill(color);
    doc.restore();
    doc.fillColor(`#${projectExportBrand.dark}`).font(projectExportBrand.bodyFont).fontSize(8).text(label, x + 18, y - 1, { width: 72 });
    x += 92;
  });
}

function drawGanttGrid(
  doc: PDFKit.PDFDocument,
  page: { width: number; height: number; margin: number },
  weekChunk: ReturnType<typeof buildProjectGanttData>["weekHeaders"],
  weekColumnWidth: number,
  taskColumnWidth: number,
  timelineHeaderY: number
) {
  doc.save();
  doc.rect(page.margin, timelineHeaderY, taskColumnWidth, 24).fill(`#${projectExportBrand.purple}`);
  doc.restore();
  doc.fillColor(`#${projectExportBrand.white}`).font(projectExportBrand.bodyFont).fontSize(10).text("Task / Milestone", page.margin + 8, timelineHeaderY + 7, { width: taskColumnWidth - 16 });
  weekChunk.forEach((week, index) => {
    const x = page.margin + taskColumnWidth + index * weekColumnWidth;
    doc.save();
    doc.rect(x, timelineHeaderY, weekColumnWidth, 24).fill(`#${projectExportBrand.purple}`);
    doc.restore();
    doc.fillColor(`#${projectExportBrand.white}`).font(projectExportBrand.bodyFont).fontSize(9).text(week.shortLabel, x + 4, timelineHeaderY + 7, {
      width: weekColumnWidth - 8,
      align: "center"
    });
  });
}

function drawGanttRowLabel(
  doc: PDFKit.PDFDocument,
  item: ReturnType<typeof buildProjectGanttData>["items"][number],
  x: number,
  y: number,
  width: number
) {
  doc.save();
  doc.rect(x, y, width, 24).fill("#FFFFFF");
  doc.rect(x, y, width, 24).stroke(`#${projectExportBrand.border}`);
  doc.restore();
  const label = item.type === "milestone" ? `◆ ${item.title}` : item.title;
  const meta = `${formatDate(item.startDate)} - ${formatDate(item.endDate)} | ${projectLabel(item.status)}`;
  doc.fillColor(item.overdue ? "#DC2626" : `#${projectExportBrand.dark}`).font(projectExportBrand.bodyFont).fontSize(9).text(label, x + 6, y + 4, {
    width: width - 12,
    ellipsis: true
  });
  doc.fillColor(`#${projectExportBrand.muted}`).font(projectExportBrand.bodyFont).fontSize(7).text(meta, x + 6, y + 14, {
    width: width - 12,
    ellipsis: true
  });
}

function drawGanttTimelineRow(
  doc: PDFKit.PDFDocument,
  item: ReturnType<typeof buildProjectGanttData>["items"][number],
  weekChunk: ReturnType<typeof buildProjectGanttData>["weekHeaders"],
  visibleStartOffset: number,
  visibleEndOffset: number,
  timelineX: number,
  y: number,
  weekColumnWidth: number,
  rowHeight: number
) {
  weekChunk.forEach((week, index) => {
    const cellX = timelineX + index * weekColumnWidth;
    doc.save();
    doc.rect(cellX, y, weekColumnWidth, rowHeight).fill(index % 2 === 0 ? "#FFFFFF" : `#${projectExportBrand.pale}`);
    doc.rect(cellX, y, weekColumnWidth, rowHeight).stroke(`#${projectExportBrand.border}`);
    doc.restore();
  });

  const visibleSpan = Math.max(1, visibleEndOffset - visibleStartOffset);
  const clampedStart = Math.max(visibleStartOffset, item.offsetDays);
  const clampedEnd = Math.min(visibleEndOffset, item.offsetDays + item.spanDays);
  if (clampedEnd <= visibleStartOffset || clampedStart >= visibleEndOffset) {
    if (item.dependencyLabels.length) {
      doc.fillColor(`#${projectExportBrand.muted}`).font(projectExportBrand.bodyFont).fontSize(7).text(
        `Depends on: ${item.dependencyLabels.join(", ")}`,
        timelineX + 4,
        y + 8,
        { width: weekChunk.length * weekColumnWidth - 8, ellipsis: true }
      );
    }
    return;
  }

  const startRatio = (clampedStart - visibleStartOffset) / visibleSpan;
  const widthRatio = Math.max(1 / visibleSpan, (clampedEnd - clampedStart) / visibleSpan);
  const chartWidth = weekChunk.length * weekColumnWidth;
  const left = timelineX + startRatio * chartWidth;
  const barWidth = Math.max(item.type === "milestone" ? 12 : 12, widthRatio * chartWidth);
  const toneColor = item.tone === "green"
    ? "#16A34A"
    : item.tone === "red"
      ? "#DC2626"
      : item.tone === "amber"
        ? "#F59E0B"
        : item.tone === "grey"
          ? "#94A3B8"
          : `#${projectExportBrand.purple}`;

  if (item.type === "milestone") {
    doc.save();
    doc.translate(left + 6, y + rowHeight / 2);
    doc.rotate(45);
    doc.rect(-5, -5, 10, 10).fill(toneColor);
    doc.restore();
  } else {
    doc.save();
    doc.roundedRect(left, y + 7, barWidth, 10, 4).fill(toneColor);
    doc.restore();
    if (item.completionPercent === 100) {
      doc.save();
      doc.rect(left + barWidth - 3, y + 7, 3, 10).fill("#14532D");
      doc.restore();
    }
  }

  if (item.dependencyLabels.length) {
    doc.fillColor(`#${projectExportBrand.muted}`).font(projectExportBrand.bodyFont).fontSize(7).text(
      `Depends on: ${item.dependencyLabels.join(", ")}`,
      timelineX + 4,
      y + rowHeight - 10,
      { width: chartWidth - 8, ellipsis: true }
    );
  }
}

function drawLandscapeFooter(
  doc: PDFKit.PDFDocument,
  page: { width: number; height: number; margin: number },
  footerLabel: string,
  title: string
) {
  const dividerY = page.height - page.margin + 4 - 20;
  const textY = page.height - page.margin + 10 - 20;
  doc.save();
  doc.rect(page.margin, dividerY, page.width - page.margin * 2, 1).fill(`#${projectExportBrand.gold}`);
  doc.restore();
  doc.fillColor(`#${projectExportBrand.muted}`).font(projectExportBrand.bodyFont).fontSize(8).text(
    `${footerLabel} | ${title} | ${formatDate(new Date())}`,
    page.margin,
    textY,
    { width: page.width - page.margin * 2, align: "center" }
  );
}

function chunkArray<T>(items: T[], chunkSize: number) {
  if (!items.length) return [[]] as T[][];
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }
  return chunks;
}
