# Master Sprint Plan

## Delivery Approach

ConnectedOS must be built incrementally. Codex must not attempt to build the whole system at once.

Each sprint should end with working, tested, documented functionality.

Sprint 1-3 CRM checkpoint: see `docs/crm/crm-checkpoint-sprint-1-3.md` for the current CRM baseline, local commands, validation commands, stage model, permissions, deferred work and risks.

## Sprint List

### Sprint 1 - Platform Foundation

Build application shell, authentication, roles, base database, audit logs, notification framework and document framework.

### Sprint 2 - CRM Core

Build accounts, contacts, leads, opportunities and basic activities.

### Sprint 2.1 - CRM Refinement

Refine Sprint 2 CRM browser testing feedback before deeper pipeline automation where prioritised:

- Improve activity linking for accounts, opportunities, leads and contacts.
- Show clickable related activities on account, opportunity and lead detail pages.
- Show open linked opportunities, recent activities and key contacts on account detail.
- Replace relationship strength numeric/free-text fields with a controlled picklist.
- Add controlled opportunity type and source picklists.

### Sprint 3 - CRM Pipeline, Forecasting and Automations

Build CRM pipeline board, forecasting, FX-aware opportunity values, lead conversion, CRM notification rules, stale opportunity alerts, high-value alerts and CRM dashboard.

Sprint 3 CRM backlog additions from browser testing:

- GBP, EUR and USD opportunity currency support with GBP pipeline reporting.
- FX conversion service layer with provider-swappable design.
- Forecasting by month, stage and owner with unweighted and weighted pipeline.
- Kanban stage columns using the Connected Hospitality B2B sales stage model.
- Seeded default stage probabilities configurable later.
- Notification rules using the Sprint 1 notification framework.

Sprint 3 implementation note:

- Delivered pipeline columns, month forecast, seeded stage probabilities, stage-driven weighted values, activity completion and dynamic due/overdue activity alerts.
- Deferred FX conversion, full pipeline by owner reporting and scheduled CRM notification jobs.

Sprint 3.1 implementation note:

- Delivered opportunity editing, stage-change API and Kanban drag-and-drop stage movement.
- Stage movement recalculates probability and weighted value, creates stage history and audits the change.

### Sprint 4 - Quoting and Product Catalogue

Build product catalogue, pricing import and quote builder.

Sprint 4 implementation note:

- Delivered Product catalogue, CSV supplier price import, Quote, QuoteVersion and QuoteLine MVP models.
- Delivered quote creation linked to CRM accounts and opportunities, BoM line building for product/labour/service/note lines and service-layer margin calculations.
- Deferred PDF export, Excel export, approval workflow and accepted quote to project conversion.

### Sprint 5 - Quote Outputs and Approvals

Build PDF export, Excel BoM export, approval workflow and quote-to-project conversion.

Sprint 5 implementation note:

- Delivered server-side HTML-based customer PDF export.
- Delivered Excel BoM export and internal margin sheet export.
- Delivered quote approval requests, seeded approval rules, status transitions and approved-version locking.
- Delivered quote export history.
- Delivered CRM opportunity update to Closed Won (PO Received) when a linked quote is accepted.
- Deferred actual quote-to-project conversion until the project management sprint is approved.

Sprint 5.1 implementation note:

- Tightened quote creation so quotes are created from CRM opportunities and selected account contacts.
- Replaced quote notes workflow with required High Level Scope.
- Added product/labour/service catalogue item types and CSV upload support.
- Improved Price Imports guidance with sample CSV download and error visibility.
- Applied Connected Hospitality purple/orange branding to quote PDF, Excel BoM and internal margin sheet outputs.
- Fixed Submit for Approval so it creates a pending Internal Review approval request instead of auto-approving.
- Added in-app approval notifications and an email stub to `james@connectedhsp.com`.
- Account and Opportunity detail pages now show quote status and approval visibility.
- Accepted quotes update linked CRM opportunities and log completed CRM activity.

Sprint 5.3 implementation note:

- Enforced whole-number quote line quantities with minimum quantity `1`.
- Added quote line edit and delete actions in the quote builder, with service-layer recalculation and audit actions.
- Hardened customer PDF export with PDF-specific error logging and optional-field tolerance.
- Added `quotes.approve_own` and blocked own-quote approval unless the user has that override.
- Added quote status tabs and visible status badges across quote list, quote detail, account detail and opportunity detail.
- Added automatic 30-day expiry for sent quotes with audit logging and owner notifications.

Sprint 5.4 implementation note:

- Added editable quote-version terms with standard Connected Hospitality default wording.
- Short-form quote PDF now includes terms, uses `sales@connectedhsp.com` and has taller wrapped customer/project detail panels.
- Added long-form proposal PPTX export using the Connected Hospitality five-page proposal template.
- Added page 1 account/project population and page 5 commercial category totals with zero-value rows hidden.
- Added generated page 6 for long-form proposal terms so page 5 retains its acceptance/signature area.
- Updated visible export actions to primary buttons: `Export Quote`, `Export Proposal`, `Export Quote Excel` and `Export Internal`.
- Deferred visible long-form proposal PDF export; long-form proposal output is PPTX-only for now.

### Sprint 6 - Pre-Sales Requests

Build request intake, file upload, assignment, status workflow and deadline alerts.

Sprint 6 implementation note:

- Delivered Pre-Sales Requests MVP with `PS-YYYY-0001` request numbering.
- Added request and task models with category, type, priority, commercial priority, status, SLA and RAG tracking.
- Added `/presales`, `/presales/my-work`, `/presales/new` and `/presales/:id`.
- Added pre-sales request APIs for create, read, update, soft delete, assignment, status changes, tasks, document metadata and comments.
- Integrated with CRM so opportunities moved into `Pre-Sales / Solution Design` auto-create a linked pre-sales request.
- Integrated Account, Opportunity and Quote detail pages with linked pre-sales request visibility and create actions.
- Added quote snapshot values for quote-linked requests.
- Added CRM activity logging and in-app notifications for submitted, assigned, query raised, deadline and completion workflows.
- Added SharePoint folder design stub only; live Graph folder creation remains deferred.

Sprint 6.1 implementation note:

- Added seeded local Pre-Sales Engineer users for Eman Nwokoro, Artur Kellner and Richard Mumford using `example.local` development placeholder emails.
- Added standard pre-sales task templates by opportunity type for Guest WiFi, IPTV, MATV & TV Headend, Fibre & Broadband, Structured Cabling & Racks and PBX & Telephony.
- New pre-sales requests automatically create type-specific standard tasks once, with duplicate template-title prevention.
- BoM/Bill of Materials tasks tell users to create or update the BoM in the connected Quote Builder.
- BoM tasks link to an existing quote where available or prompt quote creation from the linked opportunity.

Sprint 6.2 implementation note:

- Opportunity service creation now auto-creates a pre-sales request when a new opportunity is initially created in `Pre-Sales / Solution Design`.
- Existing pipeline/stage-change auto-creation remains in place.
- Active request duplicate prevention applies to initial creation and stage changes.
- Pre-sales request detail now supports real file uploads and authenticated downloads.
- Development uploads are stored locally under `storage/presales/{year}/{requestNumber}/`.
- Uploaded files are recorded in the shared `Document` framework and display a SharePoint target path only.
- Supported file types are PDF, DOCX, XLSX, PPTX, PNG, JPG/JPEG, CSV and TXT with a 25MB per-file limit.
- Live SharePoint/Graph upload remains deferred to Sprint 7.

### Sprint 7 - SharePoint Automation for Pre-Sales and Projects

Build folder creation and file linking.

### Sprint 8 - Project Management Core

Build projects, milestones, tasks and project dashboards.

Sprint 8.4 implementation note:

- Added the Connected Hospitality weekly report reference template at `public/templates/connected-hospitality-weekly-status-report-template.docx`.
- Default project task and milestone dates now generate from project start date using the agreed offset schedule.
- Project Managers, Business Operations and Administrators can edit task and milestone rows directly on the project detail page.
- Weekly report PDF and Implementation Document PDF now use the shared Connected Hospitality project export template style with readable dark body text, purple headings and structured section tables.
- Project change requests now support linked change quotes so pricing, `LAB` day impact and hardware scope are created through the quote builder before project approval is applied.

Sprint 8.4.2 implementation note:

- Marking a quote as Sent now moves the linked CRM opportunity to Proposal Sent when the opportunity is still open.
- Proposal Sent sync recalculates CRM probability and weighted value, writes stage history only when the stage changes and does not move Closed Won or Lost opportunities backwards.
- Project Gantt headers now use compact week labels and horizontal overflow for readability instead of squeezing week columns too tightly.
- Added branded Gantt PDF export from the project detail page.
- Refactored project PDF pagination so exports only create new pages when content is about to be written, preventing trailing blank pages and footer-only pages.

Sprint 8.4.3 implementation note:

- Replaced the Gantt PDF summary output with a visual landscape Gantt export showing week columns, task bars, milestone markers and multi-part pagination for wide timelines.
- Strengthened shared project PDF table wrapping so long text grows rows safely and can continue across multiple row segments without overflowing boxes.
- Fixed change-request creation UX with explicit loading state, duplicate-submission prevention, friendly failure messaging and error logging.
- Project task completion now prompts for actual days used, defaults to estimated days where available and keeps task actual days separate from resource-assignment usage in project summaries.

Sprint 8.4.4 implementation note:

- Improved the Weekly Status Report PDF with more whitespace, larger table padding, safer footer margins, display-label formatting for enums and shaded RAG status cells.
- Extended the shared project PDF template helper so weekly report improvements also benefit implementation, change-request, daily update, closure and support handover exports.
- Expanded project effort rollups to show estimated task days, actual task days, task days variance and an over-estimate warning badge separately from resource-assignment usage.
- Added dependency-driven scheduling foundations with task dependency type, lag days, cascade date movement, linked milestone rescheduling, circular-dependency protection and audit logging.
- Added dependency / schedule summary content to weekly reports for concise governance visibility.

Sprint 8.4.5 implementation note:

- Weekly Status Report sections are now mapped to real project data or PM-entered Weekly Update fields instead of fake placeholder rows.
- Added explicit weekly-update inputs for customer decisions, site/resource access, hospitality operational impact, brand/compliance assurance and approval/distribution sections.
- Empty weekly-report sections now render clean one-line statements rather than meaningless table placeholders.
- Task forecast days are now derived from working-day date ranges and can still be manually overridden by permitted users.
- Added `Lock Project Plan` with project, task and milestone baseline capture.
- Task date edits in the web app now trigger dependency-driven successor rescheduling and linked milestone movement, while respecting manual milestone overrides.

Sprint 8.4.5b implementation note:

- New projects now create the standard default task dependency chain automatically using Finish-to-Start dependencies with zero lag.
- Marriott GPNS projects now route dependencies through the GPNS UAT task sequence before handover documentation.
- Added `Add Missing Default Dependencies` for existing projects so missing standard dependency links can be backfilled safely without duplication.
- Confirmed the current inline task edit flow uses the shared dependency scheduling service, so task date changes now reschedule downstream work when default dependencies exist.

Production hardening QA fix implementation note:

- `cleanup:production-test-data` now targets deterministic production-test/demo records more safely by following seeded `.test` identities and linked quote/ticket/project references instead of broad account-name deletion.
- Helpdesk `Create Field Booking` now resolves linked ticket context server-side, pre-fills booking details from the ticket and writes the booking back onto the ticket record on save.
- Operational selectors now hide inactive users and inactive resources by default across helpdesk assignment, expense claimant, project user and booking-resource flows.
- `/helpdesk/tickets` now defaults to active tickets only, while `/projects` defaults to active delivery projects only, with explicit historical tabs for resolved/completed/closed/cancelled records.

### Sprint 9 - Gantt, Risks, Issues and Change Requests

Build Gantt view, dependency handling, risk log, issue log and change requests.

### Sprint 10 - Scheduling and Resource Planning

Build resource calendar, bookings, conflict detection and utilisation reporting.

### Sprint 11 - Time Off Management

Build leave request and approval workflow with calendar blocking.

### Sprint 12 - Expenses

Build expense claims, receipt uploads, approvals and receipt PDF packs.

### Sprint 13 - Reporting

Build executive, sales, project, resource and finance dashboards.

### Sprint 14 - Client Portal

Build restricted client access for project status and shared documents.

### Sprint 15 - Procurement

Build supplier, PO and delivery tracking.

### Sprint 16 - Asset Management

Build asset register and lifecycle tracking.

### Sprint 17 - Knowledge Base

Build document library for standards, templates and internal guidance.

### Sprint 18 - AI Assistant Integration Foundation

Build API and permission-safe foundation for future AI assistance.

### Giant Sprint - Production Readiness Modules

Implemented scope:

- Added Field Services resource scheduling with `Resource` and `ResourceBooking` models, conflict-aware bookings and production-testing pages.
- Added Leave Management with request, approval and scheduling-block workflows.
- Added Expenses with numbered claims, receipt uploads, approval states and receipt-pack PDF export.
- Added Procurement with suppliers, purchase orders, goods receipts, supplier invoices and PO PDF export.
- Added Finance and Billing Tracker with customer invoices, billing schedules, payment recording and finance dashboard visibility.
- Added Reporting routes for Sales, Projects, Resources, Finance, Procurement and Helpdesk.
- Added SharePoint-style document automation fallback service for local storage plus future-compatible folder/url handling.
- Added Asset tracking linked to projects, products and purchase-order lines.
- Added Helpdesk ticketing with queues, comments, knowledge articles, SLA timing and assignment notifications.

### Final Pre-Testing Hardening Sprint

Implemented scope:

- Reviewed end-to-end operational workflows across Expenses, Procurement, Helpdesk, Leave, Field Services, Finance and Assets to remove dead ends and missing detail pages.
- Added a central email notification framework with console and SMTP-ready providers, branded templates and safe failure handling.
- Wired email events into leave, expenses, helpdesk, quotes, projects and procurement workflows alongside in-app notifications.
- Added `/admin/audit` plus `/audit` routing and shared record-level audit panels across major operational detail pages.
- Added permission-aware global search from the app shell and `/search`.
- Hardened helpdesk ticket resolve/close/reopen actions with resolution-note validation, friendly API errors and side-effect-safe notifications/email sends.
- Added deterministic production-test cleanup plus a reduced production-test seed pack so Field Services, Leave and Helpdesk calendars stay usable during repeated QA cycles.
- Resource deactivation now clears future project assignments as well as future direct bookings, while leaving historic schedule data available for audit and reporting.

### QA Fix Sprint - PO PDF, Leave, Resources and Helpdesk Selectors

Implemented scope:

- Reworked Purchase Order PDF layout to use safe wrapped rows, dynamic heights, VAT/total summaries and no trailing blank pages when supplier or line-item content is long.
- Replaced browser-confirm resource delete UX with an in-app deactivation flow, safe post-action redirect and friendly resource not-found handling.
- Fixed leave rejection so approvers must enter a rejection reason, requester notifications complete cleanly and approval-routing notifications reach James Harrison or fallback approvers.
- Scoped helpdesk contact, project and asset selectors to the selected account and added matching server-side validation to reject cross-account relationships.

### Field Services, Leave Calendar and Purchase Order QA Fix Sprint

Implemented scope:

- Reworked Field Services schedule into a calendar-first view with month, week, day and resource-grid layouts.
- Unified Field Services visibility so direct resource bookings and project resource assignments appear in the same operational calendar.
- Added resource edit, deactivate and soft-delete flows while keeping historic bookings visible.
- Synced active ConnectedOS users into internal schedulable resources without creating duplicates.
- Replaced leave-calendar placeholder people with real active ConnectedOS users and real leave requests only.
- Surfaced approved and pending leave in the shared scheduling context for operational planning.
- Improved Purchase Order creation with supplier autofill, supplier snapshot fields, delivery details, line-level tax handling and quote product-line import.
- Expanded PO detail and branded PDF output to include supplier, delivery, notes, tax and total visibility for production testing.
- Hardened helpdesk actions with attachment upload/download, resolve/close/reopen actions, queue/status updates, project issue creation and field-booking launch flow.
- Improved production testing support with richer seed coverage, operational dashboard links and updated browser QA checklist guidance.

### Admin User Management + Local Login Sprint

Implemented scope:

- Local email/password login is active.
- Microsoft Entra login is parked and hidden unless explicitly re-enabled.
- Password hashes are stored using bcrypt; plain text passwords must never be stored or logged.
- Initial admin is seeded from `INITIAL_ADMIN_EMAIL` and `INITIAL_ADMIN_PASSWORD`.
- Visible user-management roles are Administrator, Sales, Pre-Sales, Project Engineer, Project Manager, Field Engineer and Business Operations.
- Permission levels are Administrator and User.
- Administrator level grants full platform permissions.
- User level access is driven by the assigned business role and remains limited by server-side permissions.
- `/admin/users` supports user creation, edits, activation state and password reset.
- `/settings` supports profile update and password change.

### Access Control UX Polish Sprint

Implemented scope:

- Sidebar navigation is filtered by the signed-in user's permissions.
- Role-based navigation now follows the approved Administrator, Sales, Pre-Sales, Project Engineer, Project Manager, Field Engineer and Business Operations matrix.
- Settings remains visible to all signed-in users.
- `/403` provides a branded friendly access denied page.
- Admin pages render the shared AccessDenied card instead of raw permission errors.
- Client-side action forms translate `401` and `403` responses into: `You do not have permission to perform this action.`
- App shell includes a profile menu with Settings, Change Password and Sign out.
- Sign out returns to `/login` on the active browser origin/port.
- Admin-created users and admin password resets force `mustChangePassword`.
- Users with `mustChangePassword` are redirected to `/settings/change-password` until the password is changed.
- Projects, Field Services and Project Management have friendly placeholder pages for permitted roles until those modules are built in future sprints.

### CRM Sales Ownership and Filtering Sprint

Implemented scope:

- Salesperson is defined as an active user with the `Sales` role.
- Sales-owned records use `owner_id` on leads, opportunities and activities.
- Sales users creating leads, opportunities or activities are assigned to themselves server-side.
- Administrator and Business Operations users can assign active Sales users.
- `/crm/my-work` shows sales-owned leads, opportunities, activities and due or overdue follow-ups.
- CRM dashboard, pipeline and forecast support salesperson filtering for Administrator and Business Operations users.
- Sales users see their own pipeline, forecast and dashboard totals by default.
- Lead and opportunity lists show assigned salesperson and support salesperson filtering for users with all-sales visibility.

### Sprint 7A - Sales Operations and Pre-Sales Completion

Implemented scope:

- Added explicit quote ownership visibility and server-side Sales-user quote scoping.
- New quotes inherit owner from the linked CRM opportunity; future opportunity ownership changes do not rewrite existing quote owners.
- Quote list now shows Owner and Salesperson columns with Salesperson and My Quotes filters.
- CRM My Work now includes My Quotes and My Pre-Sales Requests.
- Added computed opportunity health scoring: Green, Amber and Red.
- Opportunity health appears on opportunity list, opportunity detail, pipeline board, forecast and CRM dashboard.
- CRM dashboard adds closing next month, open pre-sales requests, quotes awaiting approval, overdue opportunities and opportunities requiring attention.
- Added pre-sales deliverable tracking with expected deliverables by opportunity type, upload/replace/download support and completion progress.
- Added `PresalesDeliverable` and `PresalesDeliverableType`.
- Pre-sales dashboard adds assigned/unassigned/request status cards plus engineer workload summaries.
- Added top-right notification bell, unread count, notification page filters and mark-read actions using the existing notification framework.
- Revalidated role navigation/access-denied behaviour while keeping Project Management out of scope.

Deferred:

- Project creation and project management.
- Live SharePoint/Graph upload.
- AI document analysis.
- Resource scheduling, leave, expenses and customer portal features.

### Sprint 7A.1 - Pre-Sales Tasks and Deliverables Merge

Implemented scope:

- Merged the pre-sales operational checklist into Deliverables.
- Removed the separate visible Tasks section from the pre-sales request detail page.
- Standard opportunity-type task templates now generate expected deliverables instead of visible tasks.
- Existing `PresalesTask` records are retained for history and migrated into deliverables where practical.
- Deliverables support status, description/instructions, optional assignment, optional due date, uploaded file linkage, complete/reopen actions and progress tracking.
- BoM deliverables show Quote Builder guidance and link to an existing quote or Create Quote action.

Deferred:

- Deleting the old `PresalesTask` table.
- Live SharePoint/Graph upload.
- Project creation or handoff.

### Sprint 8 - Projects Core

Implemented scope:

- Added Projects as the first delivery module after approved, sent or accepted quotes.
- Added project creation from quote with account, opportunity, quote version, pre-sales request, scope, terms and commercial totals copied into the project.
- Added `PRJ-YYYY-0001` numbering.
- Added project dashboard, list, create, detail, edit and task-template pages.
- Added project tabs for overview, tasks, schedule, calendar, Gantt, resources, budget, issues/actions, daily updates, weekly updates, implementation document, change requests, closure, support handover, documents and audit.
- Added project tasks, dependencies, resource assignments, issue/action/risk/decision records, financial entries and forms.
- Added resource-day rollups and project RAG calculation.
- Added branded PDF exports for project forms and implementation outputs plus branded Excel export for issues/actions.
- Added project notifications for assignment, task assignment and red RAG status.
- Seeded project permissions for Administrator, Business Operations, Project Manager, Project Engineer, Field Engineer, Sales and Pre-Sales roles.

Deferred:

- Live SharePoint/Graph folder creation or upload.
- Full procurement and purchase order generation.
- Central resource scheduling.
- Customer portal, expenses, leave and AI project assistant.

### Sprint 8.1 - Project QA Fixes and Automation

Implemented scope:

- Removed duplicate project navigation by keeping Projects as the single project area.
- Redirected `/project-management` to `/projects`.
- Added automatic project creation when a quote becomes accepted.
- Quote detail now shows created project number and Open Project link.
- Added controlled project type using opportunity types, including Marriott GPNS.
- Project creation inherits project type from linked opportunity unless explicitly overridden.
- Project Manager selector now lists active Project Manager users only.
- Resource day budget is calculated from quote lines where SKU/part code starts with `LAB`.
- Resource scheduling uses inclusive calendar-day calculation for scheduled days.
- New projects receive standard default tasks.
- Marriott GPNS projects receive extra Marriott GPNS UAT/certificate tasks.
- Added project completion percentage from completed active tasks.
- Updated project export buttons to primary ConnectedOS buttons.
- Fixed project PDF body text to dark slate/black on white background and added Connected Hospitality logo where available.
- Weekly update exports now include task completion, issues/actions, resource schedule and PM summary content.
- Added in-app notifications for auto-created projects, PM assignment, default task creation, task due soon/overdue, resource scheduling and red RAG status.

Deferred:

- Excluding weekends from scheduled day calculations.
- Full procurement/PO generation.
- Field services module.
- Live SharePoint/Graph upload.

### Sprint 8.1.1 - Critical Project Workflow Fixes

Implemented scope:

- Closed Won (PO Received) opportunity stage changes now sync the latest linked approved/sent/accepted quote to Accepted.
- Closed Won opportunity changes now use the same project creation service as quote acceptance and manual Create Project.
- Project creation duplicate prevention remains based on one active project per quote.
- Automatically created projects inherit quote scope, quote reference, quote version, opportunity type, salesperson, pre-sales request and resource-day budget from `LAB` quote lines.
- Project overview and budget now show allocated, scheduled, actual used, remaining resource days and utilisation percentage.
- Project list, overview, dashboard and weekly update exports show project progress percentage.
- Weekly update PDF export returns a friendly error message on failure and logs export failures to audit.

Deferred:

- Multiple project creation from multiple accepted quotes on the same opportunity.
- Weekend/holiday-aware resource scheduling.
- Procurement, field services, live SharePoint/Graph and customer portal workflows.

### Sprint 8.2 - Project Controls and Resource Planning Foundation

Implemented scope:

- Working-day resource scheduling excluding weekends.
- Resource conflict detection with override notes and audit logging.
- Project milestones with default milestone generation.
- Baseline/current/actual date tracking and schedule variance labels.
- Executive project dashboard metrics and filters.
- Budget variance, resource cost, PO placeholder cost and margin-at-risk visibility.
- Automatic project status progression from tasks and closure forms.
- Pre-sales handover tab on project detail.
- Quote changes after project creation create project change requests instead of silent budget sync.
- PRINCE2-style stage gates with default gates and blocked-gate notifications.
- Gantt and calendar data include tasks, milestones, resources and forms.

Deferred:

- Public holiday calendars.
- Full central resource scheduling module.
- Full procurement and supplier PO generation.
- Customer portal, live SharePoint/Graph, expenses, leave and AI assistant features.

### Sprint 8.3 - Project QA Fixes: Stage Logic, Change Requests and Export Templates

Implemented scope:

- Clarified milestone completion sources and automated milestone completion from linked project tasks where possible.
- Added milestone helper text, linked task visibility and manual completion actions to project detail.
- Clarified PRINCE2-style stage-gate completion conditions and automated stage-gate progression from linked milestones, tasks and closure forms.
- Added stage-gate helper text, completion-source visibility and manual in-progress/complete/block actions to project detail.
- Fixed quote-change project notifications so change requests notify the Project Manager, Business Operations and Administrators when no PM exists.
- Added project change request approve/reject API actions.
- Approved quote-change requests apply commercial value delta, additional `LAB` resource-day delta and lightweight equipment/hardware impacts once only.
- Hardware/equipment impacts create project equipment items and an `Order Additional Hardware` task.
- Standardised project PDF exports through a shared Connected Hospitality project export template with logo, purple headings, gold accents and dark readable body text.
- Improved implementation document content with account, opportunity, quote, pre-sales, project, resource, milestone, stage gate, issue/action and budget data.
- Weekly update exports continue to include progress, tasks, milestones, stage gates, issues/actions, resources, budget summary, PM summary and next-week actions.
- Project export failures now return a friendly document-generation message and log details to audit.

Deferred:

- Full procurement or supplier ordering from project equipment items.
- Full hardware receiving workflow.
- Live SharePoint/Graph document generation/upload.
- Customer portal, expenses, leave and AI project assistant features.

## Sprint Completion Requirements

Each sprint must include:

- Working code.
- Database migrations.
- Tests for critical workflows.
- Updated documentation.
- Permission checks.
- Audit logging where required.
- Responsive UI.

### Production Testing Hardening Sprint

Implemented focus:

- Repeatable production-test seed pack covering CRM, quoting, pre-sales, projects, scheduling, leave, expenses, procurement, finance, assets, helpdesk and notifications.
- Dashboard readiness cards for My Work, bookings, leave, expenses, tickets, approvals and project/finance health.
- Permission-aware notifications navigation for all approved business roles with notification access.
- Friendlier create-form error copy for bookings, leave, expenses, procurement and helpdesk.
- Shared API error logging improvements for validation and unexpected failures.
- Browser QA checklist added at `docs/testing/production-testing-checklist.md`.
- Centralised Resources now behave as master data across Projects and Field Services, with project resource assignments linked to `Resource` records instead of user-only scheduling.
- Resource deactivation now keeps history, cancels future bookings only, hides inactive resources from new scheduling selectors and notifies affected project managers.
- Supplier master data now supports edit workflows, account manager/categories metadata and active/inactive management from the procurement area.
- Product catalogue items can optionally link to Supplier master data so purchase orders can suggest the correct supplier from imported quote/product lines.

Deferred:

- Additional browser-automation coverage beyond the checklist and existing test suite.
- Wider export redesign work beyond current branded export fixes already completed in prior sprints.
