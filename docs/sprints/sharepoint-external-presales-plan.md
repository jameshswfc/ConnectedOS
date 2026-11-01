# SharePoint Documents and External Pre-Sales Intake

Added to scope on 1 November 2026. Status: invitation intake, routing and Graph worker implemented locally; production activation remains gated. See [implementation and activation runbook](../integrations/sharepoint-partner-intake.md). The original requirements below remain the acceptance scope, not a claim that live grants or migration have happened.

## Release Order

1. Release the reviewed Connected Workflow changes with Sage disabled: Work Queue, opportunity next steps, focused project views, customer-linked projects and schedule fixes. Back up production, preserve the existing migration baseline, apply the two additive migrations and smoke-test permissions and the sales-to-project journey before switching traffic. Do not run test seeds on production.
2. Pilot project invoice requests with James's exact approver identity configured. Connect Sage read-only after application registration and business confirmation. Separately approve write consent, ledger/VAT/customer mappings and one controlled invoice before enabling invoice creation. Customer sending remains separate.
3. Implement and pilot SharePoint folder provisioning and document storage on explicitly selected locations.
4. Pilot external pre-sales intake against that same document service. Do not publish anonymous uploads before security acceptance.

The existing SharePoint service writes local files under `storage/sharepoint-fallback`; pre-sales also has its own local storage adapter. SharePoint-style URLs are not evidence of live Graph storage. Both paths must be integrated, with existing downloads preserved.

## SharePoint Record Folders

### Verified Location Review: 1 November 2026

Read-only browser inspection of all three supplied links confirmed the same site, `https://jrharrison.sharepoint.com/sites/CH`, and library URL segment `Shared Documents` (displayed as Documents). These are verified examples, not a complete recursive inventory. No folders or permissions were changed.

| Module | Existing root | Observed organisation |
| --- | --- | --- |
| Sales | `Business Development` | Sales-owner areas, then brands, management groups, partners or individual opportunities. |
| Pre-sales | `Pre-sales` | Mixed brand/partner roots; the Reivernet branch uses region, brand group, sub-brand and property. |
| Projects | `Deployment` | Region, then brand and property, alongside reference/configuration/template folders. |

Verified example paths relative to the library:

- `Business Development/1. Mike (UK & Ireland)/Hilton Projects/Doubletree Ten Square`
- `Business Development/1. Mike (UK & Ireland)/Hilton Projects/Dover Marina Hotel`
- `Business Development/1. Mike (UK & Ireland)/Hilton Projects/Tapestry by Hilton Dover Marina Hotel`
- `Pre-sales/Reivernet/UK/Hilton/Graduate/Cambridge - Graduate by Hilton - STNGA`
- `Deployment/1. UK/2. Marriott/Marwell Hotel`

Pre-sales also contains Accor - UK, Best Western, Boldyn, IHG, Independent, Management Groups and Partners roots. Deployment contains other regional roots and shared reference folders. Sales has additional owner areas for Stephen, James and Tim. These names are routing categories, not proof of current ConnectedOS ownership or the hotel's invoicing account.

Lifecycle folders exist, including `1.Won and Moved to Deployment`, `1. Won and Moved to Development`, `2. Lost`, and `1. Completed Sites`. Preserve exact existing names; do not infer that the differently named folders are interchangeable. The two Dover Marina folder names may refer to the same property, but require review rather than automatic merging.

### Proposed Routing Rules

1. Keep the three existing roots. Do not create a competing top-level ConnectedOS document tree.
2. Separate property identity/address/code from invoicing account, referring partner, management company, brand group, sub-brand, region and salesperson. A Reivernet opportunity for a Hilton hotel must not be routed solely from account name.
3. Maintain explicit module-specific mappings to stable SharePoint folder IDs. Reuse a verified property folder; suggest possible matches for staff confirmation rather than fuzzy-name auto-linking. Allow an authorised override for exceptions and multi-property opportunities.
4. Preserve existing sales-owner folder links. For new owners without a mapped sales area, require configuration rather than inventing a person's folder. Changing opportunity owner must not move documents automatically.
5. Within the mapped property folder, use record-reference subfolders for new opportunities, pre-sales requests and projects where multiple jobs exist. Exact inner template names remain to be approved; do not reorganise old flat files automatically.
6. Pre-sales creation inherits verified property/routing metadata from the opportunity. Project creation inherits the same property and links to the pre-sales source, then provisions under Deployment. Keep sales and pre-sales source folders intact. James approved moving the completed project's folder into the corresponding existing Completed Sites location when explicitly marked fully complete; see the safeguards below.
7. Missing region/brand/property mapping leaves provisioning visibly pending for review. Do not guess UK, use the partner as the hotel brand, or create a duplicate property.
8. External intake captures hotel/property name, location, brand/sub-brand, property code if known and referring company separately. Unverified submissions stay in a restricted intake area until reviewed; submitted text never selects an arbitrary SharePoint path.
9. The CH site/library also holds unrelated material. Prefer grants limited to the approved root folders if supported by the pilot; do not assume whole-site write access is acceptable merely because all three roots share a library. Preserve existing access inheritance and verify direct-link visibility.

The live inspection confirms paths only. Drive/item IDs, API grants, access inheritance and an inventory of existing files still need verification during integration setup.

### Fully Complete Project Archival

Decision confirmed by James on 1 November 2026; implemented against explicit `closed` status, awaiting live folder pilot.

- Trigger on an authorised explicit fully-complete/closure action, not merely automatic completion of all tasks. Map this action to the existing lifecycle during implementation.
- Move the project's document folder to the verified existing Completed Sites folder under its appropriate region/brand branch. Keep the project record and all historical links available in ConnectedOS.
- Never move an entire shared hotel folder containing other active projects. Move the completed project's own folder only; legacy shared folders require a reviewed mapping before archival.
- Use stored folder identities, verify the destination and resulting links, preserve permissions, and audit the move. Retry safely without duplicate folders. Missing destination or failed transfer must show pending archival, not claim success.
- No live folders have been moved by recording this decision.

Scope: opportunities/sales documents, quotes/proposals, pre-sales requests and projects, including existing active records through a reviewed backfill.

- Map each module to a confirmed SharePoint site, document library and root folder. Existing business folders may be used; no site or library will be guessed or created without agreement.
- Use stable record IDs/references in folder identities, with readable customer/hotel names. Renaming a record must not silently create another folder.
- On record creation, atomically enqueue provisioning with a unique record key. A retryable worker creates or finds the folder and stores drive ID, item ID and web URL. Graph failure must leave a visible pending/error state, not roll back the business record or falsely report SharePoint success.
- Route file uploads and generated sales/pre-sales/project documents through the shared provider. Preserve shared Document records, uploader/source, versions, permissions and audit history.
- Add Open SharePoint Folder and provisioning status on each record. Link related opportunity, pre-sales, quote and project folders without uncontrolled duplicate copies.
- Preserve existing files during migration. Inventory local files, dry-run mapping, copy and verify bytes/metadata before switching references. Do not delete source files as part of initial adoption.
- Do not automatically broaden SharePoint user access. ConnectedOS downloads enforce record permissions; direct SharePoint links remain subject to SharePoint permissions. Confirm both access models during pilot.
- Prefer a separate document-automation app, selected-resource permissions and explicit write grants only on approved locations. Start with Sites.Selected on a dedicated site if suitable; evaluate narrower library grants if using a shared site. Do not request tenant-wide file access by default.

Microsoft reference: https://learn.microsoft.com/en-us/graph/permissions-selected-overview

## External Pre-Sales Submission

Recommended first release: revocable, expiring invitation links, without requiring an external Microsoft account. This is a submission workflow, not general customer portal access. A public website form is a separate publication decision.

Capture:

- Requester name, company, email and telephone.
- Hotel/property name, brand, address, room/floor counts and operational status.
- Required systems, requested deliverables, scope, existing equipment and known constraints.
- Required response date, planned deployment dates, site access and relevant brand requirements.
- Floorplans, RFPs, specifications, photos, existing BoMs and supporting documents.
- Privacy acknowledgement and authority to share the documents.

Submission flow:

1. Validate the invitation and payload server-side; do not expose customer, user or project directories.
2. Accept files into isolated quarantine with file/count/total-size limits, content validation, malware scanning and rate limits. No execution of macros or uploaded content. Macro-enabled templates require an explicit safe-handling policy rather than a blanket extension change.
3. Save a durable intake record and receipt reference. Repeated submissions must not create duplicate requests.
4. Provision a submission folder under the approved intake/pre-sales location. Transfer only cleared files and record pending/failed transfer states honestly.
5. Notify the configured intake owner. Staff review and link an existing account/opportunity, or create approved master records; do not guess an account from an email domain or create duplicate opportunities automatically.
6. Convert/link to the normal pre-sales request, preserving source files and history. The engineer uses the existing checklist and deliverables workflow. External access cannot reveal internal comments, prices or unrelated documents.

James confirmed notification recipients are **James, Tim and Stephen**. Configure their exact active ConnectedOS user IDs, not fuzzy display-name matching. External confirmation email requires real email delivery configuration and testing; the existing console provider is not delivery.

### Hotel and Partner Prefill

James requested automatic identification where possible on 1 November 2026. Invitation/property-based prefill is implemented; document extraction remains deferred:

- Prefill brand, sub-brand, location and property code from verified property mappings or a property-specific invitation. Show the requester the values for confirmation/correction.
- Derive the referring partner from the server-side invitation context where available. Otherwise ask explicitly; do not infer partner identity from hotel brand or an email domain alone.
- New or ambiguous properties remain unverified until staff triage. Keep invoicing account, hotel brand, management company and referring partner separate.
- Do not expose the internal customer/property directory to external visitors. Any document-derived suggestions require source evidence and confirmation; extraction is not currently implemented.
- External edits never directly select SharePoint paths. Staff-confirmed routing determines the destination.

## Acceptance Tests

- One folder per record, including retries/concurrent creation; rename and backfill do not duplicate it.
- Opportunity, pre-sales, quote and project documents use the approved location and retain links through the sales-to-project journey.
- Graph outage/recovery, local-file migration verification and unauthorised download rejection.
- No access outside explicitly authorised SharePoint resources; direct-link permissions reviewed.
- Expired/revoked invitations, spoofed record IDs, rate limits, malicious/oversized/unsupported files and interrupted uploads are rejected safely.
- Submission retry, triage/linking, notifications and file provenance work without exposing internal data.
- Prefill uses verified invitation/property context, permits corrections, and leaves ambiguous identities for triage without directory leakage.
- Fully-complete archival uses the mapped Completed Sites destination, preserves other active hotel projects and remains idempotent across failures/retries.
- Desktop/mobile form and internal review journey tested in a non-production folder before publication.

## Outstanding Inputs and Activation Gates

- Three roots and representative hierarchy verified above. Fully-complete archival is approved as described above. Confirm new-record subfolder conventions, reviewed property/destination mappings and a restricted intake area before provisioning.
- Invitation-only versus public submission; intake owner and external privacy wording.
- Explicit Entra consent and selected-location grants, private server credential configuration and pilot folder.
- File retention/quarantine policy and malware-scanning provision.
- Approval for existing-file migration after inventory, distinct from new-record automation.

No new permission grants, live uploads, public endpoint, Sage connection or production deployment were performed when this plan was added.
