# Project Forms And Outputs

Sprint 8 adds first-version project forms and branded exports.

## Project Export Template Standard

Project PDF exports share one Connected Hospitality template standard:

- Connected Hospitality logo top-right on the first page.
- White page background.
- Deep purple headings and header accents.
- Purple table header rows.
- Grey table borders.
- Gold divider/accent lines only.
- Dark slate or black body text.
- Calibri-style body sizing where supported by the PDF engine, with a safe Helvetica fallback.
- Footer using the document name, project number and export date.

This standard applies to daily updates, weekly updates, implementation document, change request, closure and support handover PDFs. Export failures return a friendly API message:

```text
Unable to generate this document. Please contact an administrator if the issue persists.
```

Failures are logged with project ID, user ID, export type and exception message.

Sprint 8.4.2 tightens the pagination rule for all project PDF exports:

- only create a new page immediately before known content is written
- do not create footer-only pages
- do not add page breaks after the final section
- skip empty sections rather than rendering placeholder pages

This rule applies to Weekly Status Report, Implementation Document, Change Request, Daily Update, Closure, Support Handover and Gantt PDF exports.

Sprint 8.4.3 adds a stricter text-layout rule:

- table cell text wraps inside the available width
- row heights grow to fit wrapped content
- very long rows are split into safe continuation rows when needed
- page breaks happen before a row that would overflow the current page
- footer, header and section text stay inside the printable area

This prevents text running outside borders, headers or footer regions.

Sprint 8.4.4 further refines the weekly-report layout:

- larger section spacing above and below headings
- larger table cell padding
- safer footer exclusion zone so content does not sit on the gold footer line
- display labels instead of raw enum values such as `not_started` or `green`
- shaded RAG status cells for Green / Amber / Red
- cleaner final approval/distribution page spacing

## Daily Updates

Daily updates capture project status, work completed, work planned next, blockers, resources on site, health and safety notes, customer notes and next actions. Daily updates can be exported as branded PDFs.

## Weekly Updates

Weekly updates capture:

- Reporting period start and end.
- Report number.
- Current stage.
- PM written project management summary.
- Executive summary.
- Overall status.
- RAG status.
- Percentage completion.
- Tasks completed this week.
- Tasks in progress.
- Overdue tasks.
- Upcoming tasks.
- Issues and actions log summary with status.
- Resource schedule summary.
- Resource days used this week.
- Resource days remaining.
- Budget summary.
- Risks/blockers.
- Next week plan.
- Customer actions required.
- Customer readiness commentary.
- Operational impact commentary.
- Resource / site access notes.
- Brand / compliance notes.
- Approval / distribution notes.

Sprint 8.4.5 makes the customer-facing weekly report sections explicitly editable in the web app so the PDF is no longer forced to invent placeholder content. Weekly Update forms now expose:

- Executive summary and PM commentary.
- Health dashboard commentary for overall, schedule, budget, scope, risks/issues, resources, customer readiness and operational impact.
- Customer decisions required rows.
- Resource and site access status/commentary rows.
- Hospitality operational impact rows.
- Brand / compliance and technical assurance rows.
- Approval rows.
- Distribution rows.

If a section has no PM-entered rows and no real project source data, the PDF now renders a clean one-line statement rather than fake table rows.

Weekly updates can be exported as branded PDFs. Sprint 8.4 rebuilds the weekly report around the Connected Hospitality weekly status report layout standard, including:

- cover / project table
- document control
- version history
- executive summary
- health dashboard
- weekly progress and next-week activities
- milestone status
- risks / issues
- changes / variations
- customer-safe commercial summary
- customer decisions required
- resource and site access summary
- hospitality operational impact
- brand / compliance and technical assurance
- PM commentary
- approval / distribution

Sprint 8.2 weekly exports also include milestones and project stage gates.

Sprint 8.4.4 adds a concise dependency / schedule summary to the weekly report so upcoming dependency-driven movement can be reviewed without expanding the full Gantt view.

Sprint 8.4.5 also tightens weekly report content rules:

- no generic placeholder rows such as `None / Customer / Project Team`
- no default `Everyone` distribution row
- no raw enum values in customer-facing sections
- no formal `Unassigned` approval entry; unresolved approvals show `To be confirmed`

## Implementation Document

The implementation document is generated from:

- Account name, address and key contact details.
- Opportunity name, opportunity type, source, notes and salesperson.
- Quote number, accepted/current version, high-level scope, commercial summary and terms.
- Pre-sales request number, engineer, request type, deliverables, notes and linked files.
- Project number, PM, resource plan, milestones, stage gates, tasks, issues/risks/actions, RAG and budget summary.

Sections are:

1. Project Overview
2. Customer Details
3. Contact Matrix
4. Scope of Works
5. Technical Summary
6. Pre-Sales Handover Summary
7. Commercial Summary
8. Resource Plan
9. Implementation Plan
10. Milestones and Stage Gates
11. Risks, Issues and Assumptions
12. Acceptance Criteria
13. Handover Requirements
14. Appendices / Linked Documents

Sprint 8.4 aligns the implementation document to the same Connected Hospitality visual standard as the weekly report and uses the same shared PDF template helper.

## Issues And Actions

Issues and actions support issue, action, risk and decision records. They can be exported as branded Excel.

## Change Requests

Change requests are stored as project forms. Quote changes after project creation automatically create pending-review change requests with commercial, resource-day and hardware/equipment impact data.

From Sprint 8.4 onward, the main pricing workflow is quote-driven:

- users create a linked change quote from the change request
- the change quote is built in the normal quote builder
- the change request stores linked quote and version references
- project budget updates are applied from the approved change request using the linked change quote deltas

Change request PDFs use the standard project export template and include customer/account details, project details, quote reference, change summary, commercial impact, resource-day impact, hardware/software impact and an approval/signature section.

## Gantt PDF Export

Projects now provide a dedicated Gantt PDF export. The Gantt PDF includes:

- project number and project name
- customer/account
- project manager
- project date range
- Connected Hospitality branding
- status legend
- tasks and milestones rendered on a visual week-based timeline
- dependency references where practical
- multi-part landscape pages when the Gantt is wider than one page

## Closure And Support Handover

Closure and support handover records are stored as project forms and export as branded PDFs.
