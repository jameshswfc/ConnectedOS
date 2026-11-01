# SharePoint Documents and Partner Intake

## Delivery Status

Implemented locally on 1 November 2026. Not activated on the production portal. The existing workflow release and Microsoft sign-in are separate; Sage remains disabled.

The single-tenant **ConnectedOS Documents** application was registered in Entra with James's explicit approval:

- Client ID: `02f0c0b7-27ee-4399-9180-3f91c7dd2899`
- Tenant ID: `60281f9b-f78f-45e3-a61d-825e3d0d43da`
- Application object ID: `378976b7-ad3b-4b50-a2dd-fa614271c12d`
- Service principal ID: `1f82376e-fb05-4a21-8945-cfa42e543207`

Registration alone grants no SharePoint access. James subsequently approved saving and granting administrator consent to `Files.SelectedOperations.Selected`; Entra confirmed consent succeeded. The unnecessary default delegated `User.Read` permission was removed. James created and privately saved a separate document-app secret; the Entra tab count confirms one secret without reading its value. It has not been installed on the server, and no folder grants are configured at this checkpoint. Do not reuse the login application's secret or grant tenant-wide file/site access.

## Record Routing and Archival

`DocumentRoute` holds verified hotel, brand, location, address, property code and partner details, with separate folder item IDs for sales, pre-sales, deployment and Completed Sites. These are mapped existing destinations, not names guessed from a billing account or an external form.

`DocumentWorkspace` is unique by record type/ID. Opportunity mapping is inherited by linked quotes, pre-sales requests and projects. A staff override is never overwritten by reconciliation. Partner review also maps its linked opportunity, rejecting an existing conflicting hotel mapping. Missing mappings remain visibly pending.

The worker discovers records in batches and creates record-specific child folders beneath approved parents. It validates folder ancestry, uses conflict-fail creation and database locks, stores the folder ID and retries failures. Creation and archival are separate durable steps. A crash after a move retries the known folder rather than creating another at its former location.

Only project `closed` status triggers archival. Automatic task completion (`completed`) does not. Only the stored project child moves into its mapped Completed Sites folder; shared hotel folders and sales/pre-sales sources are never moved. The move uses an eTag guard and refreshes stored document URLs. Unexpected external moves require review.

The mapping editor cannot change provisioned destinations. Route edits and provisioning share a lock. User access to folder status is checked against the existing business-record visibility; routing administration requires existing administrative permissions. Direct SharePoint links additionally depend on SharePoint's own user permissions.

## Documents

- New internal uploads retain their local original and Document metadata. Local filenames now have random prefixes to prevent same-name overwrites.
- `documents:sync` copies eligible new documents for Opportunity, Quote, PresalesRequest and Project. An explicit `SHAREPOINT_DOCUMENTS_SINCE` timestamp prevents silently bulk-uploading historical files.
- Each remote filename includes Document ID for retry safety. Upload errors remain pending and never remove the local file. This pilot supports files up to 25 MB.
- Optional `SHAREPOINT_CAPTURE_EXPORTS=true` retains customer quote PDF, long proposal PDF/PPTX, project-form PDFs and implementation PDF. Internal quote margin/BoM cost exports are excluded pending audience review. Gantt and issues-log exports are unchanged.
- Existing-file inventory, bulk migration, remote-edit version synchronisation and all-module export capture remain separate work. Do not describe these as delivered.

## Private Partner Form

Staff use `/presales/intake` to create a hotel mapping and seven-day, revocable invitation. The link token is random, stored hashed and carried in the URL fragment to avoid ordinary access/referrer logs. The public page receives only the invitation's hotel prefill and referring partner, never an internal directory.

The partner can correct hotel details and provide scope, systems, existing equipment, constraints, requested date and contact details. Submitted text cannot set a route, account, engineer or other internal ID. Staff explicitly confirm the hotel mapping and select the account/opportunity before converting into the existing pre-sales workflow.

One invitation creates one durable submission. Retries return its receipt. Database locks and unique keys prevent duplicate requests. The submission transaction writes in-app notifications to exactly three configured active identities: **James, Tim and Stephen**. Email uses the existing central service, and email failure does not roll back submission. Console-provider output is not proof of delivery.

Uploads are restricted to PDF, PNG, JPEG and plain text for the pilot: up to five files, 5 MB each, 10 MB total; multipart body is limited to 12 MB. Files are isolated with hashes and private local permissions. A configured ClamAV scanner must report clean before downloads or promotion into a reviewed pre-sales request. Missing scanner, failure or changed bytes do not release files. Office/macro files and CAD formats need a later explicit safe-handling policy.

Public requests have a database-backed 30 requests/10-minute limit per invitation. Production also requires reverse-proxy body, rate and timeout limits, plus a reviewed retention policy. Invitation links grant access to that submission only; do not publish them publicly.

## Configuration and Activation

1. Back up database, configuration and local storage. Keep the prior application release available for rollback. Do not run seed/reset commands on production.
2. Apply additive migration `20261101120000_sharepoint_partner_intake` and regenerate Prisma. Existing records are retained; new routing/intake tables and nullable Document fields are added.
3. Save and consent only the appropriate selected-files application permission, then explicitly grant write access at the approved folders. Inspect permission inheritance impact first: selected folder grants can break inheritance on the granted resource. Do not broaden access to make a failing pilot pass.
4. Configure the separate secret privately on the server, its tenant/client IDs, the verified drive ID and allowed root IDs. Configure actual folder item IDs on one reviewed hotel mapping. Never put credentials in chat, source, logs or browser URLs.
5. Configure James, Tim and Stephen's exact production user UUIDs. Confirm all three have intake review access. Configure a functioning scanner and quarantine storage with capacity/retention monitoring. Test in-app delivery; separately verify actual email delivery if enabled.
6. Set a deliberate new-upload cutoff. Start with `SHAREPOINT_ENABLED=false`, `PARTNER_INTAKE_ENABLED=false`, `SHAREPOINT_CAPTURE_EXPORTS=false`. Enable each only after its pilot and audience checks.
7. Schedule `npm run documents:sync` under the application service account from the deployed release directory, initially every five minutes with non-overlapping execution. This is eventual background provisioning, not a blocking Graph call inside business-record creation. Ensure local storage is persistent across releases.
8. Pilot create/upload/retry and explicit project closure in approved non-production child folders. Confirm an outside-root attempt is denied. Verify direct-link audience before copying sensitive commercial or design documents.
9. Pilot a private invitation, corrected hotel details, file quarantine, scan, three notifications, review and conversion, and repeated-link receipt behaviour. Revoke the pilot invitation afterwards.
10. Keep Sage disabled throughout. Remove temporary deployment access after successful release checks.

Microsoft references: [Selected permissions](https://learn.microsoft.com/en-us/graph/permissions-selected-overview), [folder creation](https://learn.microsoft.com/en-us/graph/api/driveitem-post-children?view=graph-rest-1.0), [move](https://learn.microsoft.com/en-us/graph/api/driveitem-move?view=graph-rest-1.0), [upload](https://learn.microsoft.com/en-us/graph/api/driveitem-put-content?view=graph-rest-1.0).

## Remaining Research-Led Work

| Work | Current boundary | Next safe step |
| --- | --- | --- |
| Sales-to-project journey | Work Queue, stage guidance and focused project views released separately | Run a real permitted deal through handover with the team |
| SharePoint and external pre-sales | Built locally; activation gates above remain | Restricted folder and private invitation pilot |
| Pre-sales document assistant | Not implemented | Evidence-linked requirements/questions, BoM, diagrams and port matrix with engineer review |
| Hilton CBOM | Template supplied, automation not delivered | Inspect current workbook/macros and map authoritative product/price inputs before writing |
| Sage and invoice requests | Prepared integration; Sage disabled | Private OAuth, business/customer/tax/ledger mapping, read-only pilot, then separately approved invoice creation |
| Engineer execution | Existing schedule and project tasks | Bookings, job status, time and completion evidence; no GPS tracking |
| Supplier pricing | Existing master data/catalogue | Price provenance and controlled quote-to-order reconciliation |

The broader [platform research](../research/connected-workflow-platform-review.md) informs these increments; feature lists from other products are not completion evidence.

## Verification Checkpoint

- Full suite: 540 tests across 109 files passed; includes 40 new intake, routing, Graph retry, archive, JSON permission/error and export-capture tests.
- Lint and production build passed. Prisma validation passed; local database reports 30 migrations, up to date.
- Local browser pilot passed on desktop and 390px mobile: property prefill, submission, receipt and responsive layout. One submission, three notifications and one receive audit were verified in the local database. Temporary fixed-ID pilot users/submission were removed afterwards.
- Remote Graph responses are mocked in automated tests. Actual selected-folder create/upload/move, live permissions, antivirus execution, authenticated review/conversion browser flow and production deployment remain outstanding pilot checks.
- No production seeds, historical-file migration, folder move, SharePoint upload or Sage connection were performed for this checkpoint.
