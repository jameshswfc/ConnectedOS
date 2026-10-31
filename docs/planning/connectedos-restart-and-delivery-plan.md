# ConnectedOS Restart and Delivery Plan

Production update: the Microsoft login, grouped navigation and connected sales journey were deployed and browser-checked on 31 October 2026. See `docs/deployment/production-release-2026-10-31.md`. The inspection and validation notes below describe the earlier restart checkpoint, not the final deployment state. The pre-sales assistant and Hilton CBOM adapter remain planned, not delivered by this release.

## Agreed Outcome

ConnectedOS should organise work around one connected journey:

Lead -> Qualified Opportunity -> Pre-Sales -> Reviewed Design and BoM -> Proposal/Quote -> Accepted/Won -> Project -> Scheduled Delivery -> Handover/Support.

James has prioritised this journey over adding modules. Engineer tracking means bookings, status, time and completion evidence, not live location. All tenant members may sign in with limited access before an administrator grants business access.

## Evidence at Restart: 31 October 2026

- Local checkout and remote `main` both referenced `56478ac8b899d883aaef3f7c3994373d3799f24f` at inspection. The remote is `jameshswfc/ConnectedOS`.
- The live portal responds and redirects an unauthenticated dashboard request to login. Response headers identify nginx/Ubuntu and Next.js. James confirms a Fasthosts VPS; read-only control-panel inspection shows `My VPS`, Ubuntu 26.04, with an IP matching the portal's DNS. The running release/commit, process manager and deployment command have not been verified.
- GitHub's unauthenticated repository endpoints exposed the repository; no Actions workflows or deployments were returned at inspection. There is no local `.github` workflow. This does not prove there is no external deployment process.
- Before changes, 327 automated tests passed, lint/build/Prisma validation passed, and 26 migrations were current after restarting the existing local PostgreSQL instance.
- Browser API smoke checks reproduced JSON 500 responses on unauthenticated requests. A page-oriented redirect was being caught by API error handlers. Separate API authentication now returns JSON 401/403.
- Local and live databases must not be assumed identical. Local data exists across sales, pre-sales, projects, scheduling and helpdesk. Finance/assets/expenses had sparse or empty local records, so numerical dashboards are not evidence of full workflow acceptance.
- The configured initial-admin email points to an inactive historical local account. Do not reseed or reactivate it to recover login; verify the current active administrator.
- The email framework exists but production delivery is not complete: console output is not delivered email, and the current SMTP provider is a stub. Document services use local fallback; live SharePoint/Graph is not complete.
- A catalogue CSV is tracked beneath `storage/presales`. Review repository visibility and tracked business uploads before broadening access. Do not place private pricing templates, uploads or secrets in a public repository.

## Existing Modules, Not New Build Promises

CRM and My Work; quoting/versioning/approval/exports; pre-sales requests/deliverables; project tasks, dependencies, milestones, budgets, forms and exports; resources/scheduling; leave; expenses; suppliers/procurement; finance/billing; reporting; local documents; assets; helpdesk; audit/search; user/role administration.

The historical testing trail ended around helpdesk resolve/close/reopen, ticket-to-booking, inactive scheduling data, active/historical filters and broadening salesperson selectors. The current commit already includes Administrator and Business Operations sales owners. Service tests pass, but that is not a complete live-server/browser workflow sign-off.

## Implementation in This Restart Pass

1. Separate API authentication errors from page redirects across module API helpers, profile and notifications. Preserve server-side permission checks and local password-change enforcement.
2. Add opt-in Microsoft tenant-member onboarding, basic Staff access, explicit existing-account identity linking, audit and administrator notification. Preserve local fallback. No credentials enabled and no live deployment performed.
3. Group existing permitted navigation under My Work, Sales, Pre-Sales, Projects, Scheduling, Business Tools and Administration. Empty groups disappear, active groups expand and mobile navigation is accessible. No existing operational permission is broadened by grouping.
4. Document the rollout and next work packages. No schema migration or production seed operation is needed for these changes.

## Product Research and Design Choices

These are design recommendations drawn from official product documentation, not claims of implemented parity.

| Reference | Useful pattern | ConnectedOS decision |
| --- | --- | --- |
| [Odoo CRM to quotation](https://www.odoo.com/documentation/19.0/applications/sales/crm/acquire_leads/send_quotes.html) | Keep commercial work attached to the opportunity | One account/site/opportunity chain; quote versions retain ownership and approval history |
| [Odoo field-service task creation](https://www.odoo.com/documentation/19.0/applications/services/field_service/creating_tasks.html) | Sales/support work can generate delivery work | Preserve ticket-to-booking and quote-to-project links; avoid duplicate customer/resource records |
| [Odoo supplier pricelists](https://www.odoo.com/documentation/19.0/applications/inventory_and_mrp/purchase/products/pricelist.html) | Supplier-specific product pricing | Master part identity plus supplier price, currency, validity, lead time and minimum quantity; quote snapshots remain immutable |
| [Dynamics Field Service status lifecycle](https://learn.microsoft.com/en-us/dynamics365/field-service/work-order-status-booking-status) | Work-order and individual booking progress differ | Track booking, attendance/time and evidence without confusing them with whole-project completion |
| [Dynamics resource setup](https://learn.microsoft.com/en-us/dynamics365/field-service/set-up-bookable-resources) | Central schedulable resources and availability | Keep the central Resource repository for employees and contractors; retain historic inactive resource records |
| [Asana Timeline](https://help.asana.com/s/article/plan-and-execute-projects-with-timeline) | Dependencies and dates should be visible and actionable | Strengthen current task/dependency editing and schedule feedback before further Gantt export work |

## Delivery Order and Acceptance Gates

### 1. Identity and Deployment

Complete Microsoft registration and identity mapping; verify Fasthosts release path; take restorable database/upload backups; use staging. Confirm roles, offboarding, emergency local login, 401/403 and search/audit scoping. Resolve production email delivery and durable private document storage before claiming operational readiness.

### 2. Lead-to-Project Acceptance Test

Use one clearly labelled test customer and one controlled scenario: qualify lead, assign owner, create pre-sales request, submit/review deliverables, build and approve a versioned quote, mark sent, accept, create exactly one linked project. Verify status histories, document links, prices, notifications and permissions after each step. Add retries/double-submission/concurrent event cases. Never use production seed/cleanup scripts as deployment steps.

### 3. Document-Led Pre-Sales Assistant

Inputs: RFPs, floor plans, customer correspondence, equipment schedules, brand requirements and approved catalogue/prices. Preserve source file/page references and version provenance. Customer documents are untrusted content, not operating instructions.

Outputs: requirements and compliance matrix; questions and missing inputs; assumptions/risks; logical and physical network diagrams; BoM with quantities/accessories/licences; port matrix; engineer review checklist and proposal scope draft.

Quality gates: separate sourced facts from inferred design assumptions; reconcile APs, switch ports, uplinks, PoE, optics, rack capacity, licences, support and costs; do not invent certification or predictive survey results from drawings alone. Diagrams and port matrices must agree with the BoM. Uncertain measurements and unsupported products must be flagged. Richard or another authorised engineer reviews and releases the design. No automatic customer sending, purchasing or compliance approval.

Use a background job with progress, cancellation, retry, versioned outputs and a comparison against the previous design. Select model/provider and document handling after confirming privacy, retention, supported formats and cost limits. This engine is not yet implemented by the restart pass.

### 4. Hilton CBOM Adapter

Controlling private file supplied by James: `Hilton_CBOM_Tool_October2026_v2.xlsm`, in the company OneDrive Pre-sales/Reivernet folder. Inspected read-only without executing macros; original unchanged and not copied into the repository.

Observed workbook structure: `Quote_input`, `Hotel Property - UnoNet`, `Hotel Property- Connected Room`, `Bundle_Info `, plus hidden `BOM_DATA`, `CHSP_MASTER`, `CHSP_BUNDLES `, `Product_Rules`, `INSIGHT_MASTER_PRICING`. The package contains VBA, tables, formulas, pricing validity/currency fields and bundle/product rules. Some defined names contain `#REF!`/`#NAME?`; assess them in native Excel before treating them as either failures or harmless compatibility names.

Implement a versioned, tested mapping of approved design/quote data into the workbook's intended input cells. Preserve VBA, formulas, validations, hidden sheets, named ranges and output layout. Do not execute uploaded macros on the web server. Validate quantities, dependencies, currency, validity dates and totals against native Excel results. Agree whether the issued deliverable is XLSM, PDF or both. No generic replacement workbook or automatic assertion of Hilton compliance.

### 5. Delivery and Commercial Master Data

Consolidate contractor contacts, skills, availability and rates in Resources, and supplier/manufacturer part identities and price provenance in the existing product catalogue. Give engineers a focused assigned-work view: booking, status, time and evidence. Keep task effort separate from resource usage to avoid double-counting. Preserve project variation approval before changing accepted budgets.

## Release Rules

- Make small reviewable releases with a rollback point, rather than another giant feature sprint.
- Test local/staging first. A passing build does not prove Microsoft login, delivered email, Graph uploads, Excel fidelity or live server deployment.
- Do not delete historical records, weaken permissions, overwrite existing prices or run destructive cleanup against live data.
- Customer-facing proposals and technical designs require authorised review; generated output remains a draft until released.
- Record each test's environment, commit and outcome. Distinguish tests run from checks deferred.

## Validation of This Pass

- `npm run test`: 402 tests passed in 86 files (75 additional tests compared with restart baseline).
- `npm run lint`: passed.
- `npm run build`: passed, including TypeScript and route generation.
- `npx prisma validate`: passed.
- `npx prisma migrate status`: 26 migrations, database up to date. No migration added.
- Local Chrome: active administrator login, six protected page loads, desktop/mobile screenshots and signed-out API checks passed. No uncaught browser page errors; the development log recorded a screenshot/caret-style hydration warning, not a workflow exception.
- The UI unit harness reports a React 18 function-form-action warning; browser sign-in completed successfully. Existing Vitest CJS deprecation notice remains.
- No seed, cleanup, password reset, business-record mutation, push or live deployment was run. Sign-in updates normal login audit/timestamp records.
- Microsoft registration identifiers are supplied and recorded only in ignored local configuration; provider remains disabled without a secret and rollout acceptance.
- Full Microsoft browser round-trip, production email, live SharePoint, full sales/delivery mutation testing and native Excel CBOM generation are not signed off.

Local validation commands:

```bash
cd "/Users/james/Documents/Business Operations Platform"
npm run test
npm run lint
npm run build
npx prisma validate
npx prisma migrate status
NEXTAUTH_URL=http://localhost:3002 npm run dev -- --hostname 127.0.0.1 -p 3002
```
