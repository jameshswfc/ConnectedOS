# ConnectedOS: Connected Workflow Platform Review

Research date: 31 October 2026. Primary vendor documentation was checked live. This is a design decision record, not a claim that ConnectedOS reproduces every vendor feature or integrates with those vendors.

## Recommendation for Connected Hospitality

Keep ConnectedOS as the operational system and Sage Accounting as the accounting source of truth. The strongest pattern is a connected record journey with a clear next action, not an ever-growing set of independent modules.

Target journey:

Lead -> qualified opportunity -> scoped pre-sales request -> reviewed design and BoM -> approved proposal/quote -> accepted deal -> linked project -> scheduled delivery -> completed milestone -> PM invoice request -> James approval -> Sage invoice.

Keep customer/account, contacts, products, resources and documents shared. Do not create a second customer master, a second task system or a second accounting ledger merely to imitate a vendor screen.

## Platform Comparison and Decisions

| Platform | Useful evidenced pattern | ConnectedOS decision | Delivery status |
| --- | --- | --- | --- |
| [Odoo CRM](https://www.odoo.com/documentation/20.0/applications/sales/crm/optimize/utilize_activities.html) | Activities and reusable activity plans are attached to leads/opportunities, with responsible people and relative deadlines. | Make the next piece of work visible across the existing records. Retain existing activity records; consider reusable sales follow-up plans later. | New permission-scoped Work Queue; activity-plan designer deferred. |
| [Salesforce Path](https://help.salesforce.com/s/articleView?id=sales.path_considerations.htm&language=en_US&type=5) | Key fields and stage-specific guidance help users progress a deal. | Show stage guidance and missing contact/decision/follow-up data on opportunities without adding a parallel sales process. | Implemented as opportunity Next Step. Existing sales-to-project links retained. |
| [HubSpot lifecycle stages](https://knowledge.hubspot.com/records/use-lifecycle-stages) | Contact/company lifecycle is distinct from the deal pipeline; automation can move lifecycle forward. | Keep account identity separate from opportunity stage. Show related quotes, pre-sales and projects on the customer record, with module permissions. | Linked project view added; linked-record visibility tightened. No new lifecycle enum. |
| [Pipedrive activities](https://support.pipedrive.com/en/article/activities) | Activities connect people, organisations, leads, deals and projects. | Prioritise owner, due date and next action in the daily work view. | Work Queue includes leads, opportunities, activities, pre-sales, quotes and project tasks. |
| [Asana timeline](https://help.asana.com/s/article/managing-tasks-and-dependencies-with-timeline) | Dependency behaviour distinguishes maintained buffers from consumed slack; completed work should not be casually rescheduled. | Preserve deliberate template spacing when installing default dependencies. Keep task, schedule, resource and report views focused within one project. | Focused project workspace and default-spacing defect fix implemented. Full selectable dependency policies and critical-path scheduling deferred. |
| [monday.com workload](https://support.monday.com/hc/en-us/articles/360010699760-The-Workload-Widget) | Workload needs effort and working capacity, not just task counts. | Keep task effort separate from resource usage. Do not call booked dates a true utilisation percentage. | Existing separate effort totals retained; new date-coverage summary explicitly states its limits. |
| [Float capacity planning](https://support.float.com/en/articles/13847946-capacity-planning-and-resource-scheduling) | Availability depends on work hours, leave, holidays and existing allocations; scheduling and capacity are different questions. | Surface bookings, approved/pending leave, unbooked weekdays and overlapping dates in the central schedule. | Implemented using existing permission-filtered calendar data. Individual hours, holidays and partial-day capacity remain future work. |
| [Zoho Blueprint](https://www.zoho.com/crm/process-management/blueprint.html?source_from=crm-header) | Guided transitions and required inputs make process controls visible. | Apply explicit completion/approval checks to the invoice handoff. Avoid broad new mandatory sales gates before team testing. | Completed milestone/stage/project checks, designated approver, validation and audit implemented. |
| [Dynamics 365 Field Service](https://learn.microsoft.com/en-us/dynamics365/field-service/create-work-order) | Work orders, bookings and review form an operational path into billing. | Preserve booking status, evidence and resource identity; require review before an accounting write. | Existing field-service journey retained; PM-to-James-to-Sage invoice path implemented behind a disabled live-write switch. |
| [ServiceM8](https://support.servicem8.com/help-center/topics/quotes-and-invoicing) | Quoting and invoicing belong to the job journey rather than isolated administration. | Expose invoice requests directly from the project and link notifications back to the review. | Implemented. Offline/mobile field capture is not part of this change. |
| [QuoteWerks procurement](https://quotewerks.com/features/purchasing-procurement-receiving/) | Purchasing follows commercial lines through ordering, partial receiving and serial tracking. | Retain the shared product/supplier/PO/asset chain; prioritise traceability rather than adding another parts list. | Existing functionality retained, not rebuilt or newly certified in this delivery. Supplier-price provenance and receiving reconciliation remain acceptance work. |
| [ConnectWise CPQ sourcing](https://www.connectwise.com/platform/cpq/product-sourcing) | Supplier sourcing and vendor quote import reduce re-entry between quoting and purchasing. | Keep supplier/product IDs and costs through quote-to-PO; introduce reviewed import mappings before live supplier feeds. | Existing catalogue and price import retained. No live vendor-ordering integration added. |

These choices are our design inferences from the cited product documentation, not claims of vendor endorsement or feature parity.

## What Has Been Implemented in This Branch

1. `/work`: a shared operational queue, assigned-to-me by default, with area and attention filters. Blocked/overdue/today/no-date work is prioritised and each row links to the existing record. Queries are permission scoped and capped at 50 per area with a visible limit notice. The previous sales-only My Work route remains available as Sales Overview under Sales.
2. Opportunity Next Step: stage-specific guidance and open-deal completeness prompts. It guides users without silently changing the pipeline or permissions.
3. Customer relationship view: projects appear alongside the account's existing quotes and pre-sales. Child queries and counts respect their module access rules; owners expose only identity fields, not password data.
4. Project workspace: Overview, Delivery, Commercial, Reports & Handover groups, with a section selector. Existing forms are retained and hash links open the appropriate panel.
5. Schedule availability: visible booking-date coverage, leave and overlaps for active resources. Existing inactive-history behaviour is preserved when changing calendar views. Calendar date links no longer shift backwards during British Summer Time.
6. New default dependency links no longer collapse all later template task dates onto the first task. This does not rewrite existing live project plans.
7. Sage Accounting: encrypted, business-scoped OAuth connection; manual read-only invoice snapshot refresh; currency-separated outstanding totals; no duplicate local accounting ledger.
8. Project invoicing: PM requests against completed work, James reviews the Sage customer/amount/VAT, and the service can create one invoice once live configuration is explicitly enabled. Uncertain results stop for reconciliation instead of retrying. James has a permission-scoped pending-request dashboard card.

## Practical Operating Model

| Role | Default working surface | Responsibility |
| --- | --- | --- |
| Sales | Work Queue, pipeline, opportunity | Qualify, keep the next action current, obtain requirements and own the commercial proposal. |
| Pre-Sales | Work Queue, request deliverables | Clarify scope, document assumptions, produce and review design/BoM evidence. |
| Project Manager | Projects, Delivery, resource schedule | Confirm plan, schedule engineers, track evidence and request stage invoices. |
| Engineer | Assigned tasks/bookings | Record progress, time and completion evidence. |
| Business Operations | Permitted cross-team work and scheduling | Resolve operational blockers and maintain shared master data. |
| Finance | Invoice requests and Sage Accounting | Review financial visibility and reconcile with the accounting source. |
| James | Exceptions and approval notifications | Approve project invoices, oversee risk and control access. |

Combined roles remain supported. This delivery does not alter the approved role model.

## Next Priorities, Not Claimed Complete

### 1. Pre-Sales Document Assistant

Proposed workflow: authorised document upload -> extraction with page/source references -> requirement register -> assumptions/questions -> draft topology, port matrix and BoM -> Richard's review -> approved deliverables -> quote builder.

Required safeguards: customer document permission checks, extraction provenance, untrusted-document isolation, no automatic customer sending, no autonomous purchasing, explicit uncertainty, model/provider configuration, document retention policy and reviewed product matching. A drawing is not an independently verified network design.

### 2. Hilton CBOM

The supplied reference is `Hilton_CBOM_Tool_October2026_v2.xlsm` in the Connected Hospitality OneDrive pre-sales folder. This delivery does not claim to populate or validate it. Next work must inspect the actual latest workbook, preserve macros/formulae, map approved catalogue data, reconcile quantities/totals and validate the generated workbook in Excel. No replacement template should be invented.

### 3. Scheduling Precision

Add per-resource working hours, holiday calendars, partial-day allocation, skills filters, planned-versus-actual effort and explicit dependency buffer policies. The present coverage table deliberately does not claim these features.

### 4. Commercial Controls

Before enabling Sage writes: confirm business, customer mapping, sales ledger, VAT codes, existing project billing and one controlled invoice acceptance. Add an operator reconciliation path for uncertain writes before scaling beyond a small pilot. The new request ceiling does not replace reconciliation of invoices created elsewhere.

### 5. Adoption

Pilot one real deal with Sales, Richard and a PM. Measure missing next actions, time to proposal, handover completeness, schedule clashes, unbilled completed work and duplicate entry. Do not expand features merely because a competitor has them.
