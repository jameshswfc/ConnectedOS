# SharePoint Documents and Partner Intake

## Delivery Status

Deployed and verified as an **XTEST-only mapped pilot on 1 November 2026**. Partner intake and restricted SharePoint processing are enabled; only the reviewed XTEST route is configured. Sage and automatic export capture remain disabled. The earlier checkpoints below are historical, not the current activation status. See [live deployment evidence](../testing/xtest-intake-live-pilot.md).

The single-tenant **ConnectedOS Documents** application was registered in Entra with James's explicit approval:

- Client ID: `02f0c0b7-27ee-4399-9180-3f91c7dd2899`
- Tenant ID: `60281f9b-f78f-45e3-a61d-825e3d0d43da`
- Application object ID: `378976b7-ad3b-4b50-a2dd-fa614271c12d`
- Service principal ID: `1f82376e-fb05-4a21-8945-cfa42e543207`

Registration alone grants no SharePoint access. James subsequently approved saving and granting administrator consent to `Files.SelectedOperations.Selected`; Entra confirmed consent succeeded. The unnecessary default delegated `User.Read` permission was removed. James created and privately saved a separate document-app secret. On 1 November 2026 he entered it through a hidden-input VPS installer; Microsoft accepted it before the installer backed up and atomically updated the existing release configuration with mode 600. A separate server check confirmed authentication and the single `Files.SelectedOperations.Selected` application role without displaying credentials or tokens. The three folder grants were subsequently applied and verified as recorded below. Do not reuse the login application's secret or grant tenant-wide file/site access.

Credential installation did not deploy the document release or restart the portal. `SHAREPOINT_ENABLED`, `PARTNER_INTAKE_ENABLED`, `SHAREPOINT_CAPTURE_EXPORTS`, `SAGE_ENABLED` and `SAGE_ALLOW_INVOICE_CREATE` were all verified false. A site-level metadata request returned HTTP 403; this is not a folder-level permission test. Folder grants are now verified, but route configuration and the one-hotel create/upload/archive pilot remain pending. The document secret must be preserved privately when preparing the candidate release configuration. The existing email service still has a console provider and a deferred SMTP implementation, so notification email delivery has not been enabled or verified.

### Restricted Folder Grants: 1 November 2026

James explicitly approved write grants for the following three roots on the CH site. Microsoft Graph returned `201 Created` for each grant to the document application's client ID above. No library-wide or tenant-wide application scope was added.

Drive: `b!fpcMQbxO60Cj7MTJsAHSJomrTWpvwMlOmXbcX5D4uSbTY3H0FDvMSYsM8daGN2z7`

| Root | Item ID | Grant |
| --- | --- | --- |
| Business Development | `01A5LZBYFZHZX52LIHGBDK3Y23DIKNQPKG` | write |
| Pre-sales | `01A5LZBYDAM3U7MIVWCBGIGRSLB4GY6TQS` | write |
| Deployment | `01A5LZBYHGI4MLCMIBZZBKWI6M47JMOYF5` | write |

The returned permission ID on each root is `aTowaS50fG1zLnNwLmV4dHwwMmYwYzBiNy0yN2VlLTQzOTktOTE4MC0zZjkxYzdkZDI4OTlANjAyODFmOWItZjc4Zi00NWUzLWE2MWQtODI1ZTNkMGQ0M2Rh`. Permission changes must use the appropriate root item, not just this shared principal identifier.

- Before/after comparison: seven existing permission entries per root remained identical, including roles and principals; each root gained only the eighth, application-write entry. Folder-specific grants break parent inheritance, so future parent permission changes need separate review.
- An independently acquired VPS application token contained only `Files.SelectedOperations.Selected`. All three root metadata and child-list requests returned HTTP 200.
- Ancestor/library-root metadata and enumeration also return HTTP 200, but enumeration is security-trimmed: exactly the three approved folders, no other children and no continuation page. Do not use ancestor HTTP 200 alone as evidence of unrestricted access. A direct unrelated-folder denial and write/move operations still belong in the pilot.
- Graph Explorer's temporary personal permissions were revoked via My Apps. The resulting page explicitly stated: "This app does not have any permissions." Already issued access tokens may remain valid until expiry; no further Graph Explorer operations are required for these grants.
- Graph Explorer was signed out. The dedicated temporary VPS public key was removed; a fresh SSH attempt with that key was refused, and the local private key was removed. The separately installed document-app secret remains private on the VPS.
- No files were created, uploaded, moved or deleted. No release, migration, restart or automation activation was performed. Completed Sites descendants with unique permissions still need individual pilot verification.

The live recipient check found James, Tim and Stephen active. James and Tim satisfy the prepared intake-management permission check; Stephen's current Sales, Pre-Sales and Project Manager combination does not. The subsequent pilot prepared the narrow read-only fix described below. No roles were changed.

## VPS Pilot - 1 November 2026

The actual Graph client successfully created a synthetic folder named `ConnectedOS Pilot 2026-11-01 - NOT A CUSTOMER` and uploaded `pilot-readme.txt` beneath each of the three approved roots. Repeated creation/upload retained the same folder/file IDs. The client rejected the library root as an allowed destination. This application guard test is not evidence of a Graph-level denial for an unrelated folder.

The synthetic Deployment folder was moved to the existing `Deployment/1. UK/2. Marriott/1. Completed Sites` destination. Folder identity, destination, repeat-safe archival and the retained file were verified. No existing hotel/customer folder was moved. The three clearly labelled pilot folders remain for inspection. This exercised the real Graph move, not a live project's closure workflow.

A separate disposable PostgreSQL schema on the VPS exercised the actual partner services with the three active recipients' IDs and current permission combinations. It verified hotel prefill, durable submission, retry-safe receipt, exactly three notifications, detail links, receive audit, quarantine, real ClamAV clean scan, unavailable-scanner rejection, changed-file rejection and invitation revocation. The schema and test attachment were removed. No production submission, live bell notification or email was sent.

ClamAV and current signatures were installed from Ubuntu packages. The clean-file scan took 28.8 seconds against the current 30-second application limit. Before activation, establish scanner timing headroom and resource limits on this 1.8 GB RAM VPS; do not treat this one scan as a production capacity test.

Prepared local fixes:

- Exactly the three configured notification recipients can read intake and clean attachments when they already hold `presales.create`. Existing management permissions still govern invitation creation/revocation, conversion and document routing. Stephen does not receive management or user-admin rights. Invalid/missing recipient configuration fails closed.
- Upload source validation resolves both the file and allowed storage roots to canonical paths, supporting the verified `/opt/connectedos/storage` deployment symlink without allowing escaping file symlinks or sibling-prefix paths.

The document release and its additive migration are not deployed. SharePoint, partner intake, export capture and Sage remain disabled. The portal login returned HTTP 200 after the pilot. Authenticated browser review/conversion, live bell delivery, reverse-proxy upload controls, scanner capacity, the scheduled worker and an approved real hotel mapping remain activation checks. Email delivery requires separate provider verification.

After these checks, only the current temporary pilot SSH key was removed. A fresh connection with it was refused, and its local private key was deleted. Private pilot evidence remains on the VPS; no secret appears in the reports.

Local validation for the pilot fixes: 551 tests across 111 files passed, ESLint and production build passed, Prisma schema validation passed and all 30 local migrations were up to date. New tests cover recipient read-only access, manager-only actions, quarantined-download protection and canonical storage paths including traversal/symlink rejection. The older checkpoint below is retained as historical evidence, not the latest pilot status.

## Record Routing and Archival

### XTEST Intake Hardening

The approved next pilot is **Test Hotel**, code **XTEST**, **Tempo by Hilton**, **UK**, referring partner **Reivernet**. No real address or room/floor counts were supplied: these remain blank in the invitation prefill. Synthetic submission values are explicitly labelled internal test only. No invitation is to be sent externally during this pilot.

`npm run test:partner-intake` now creates an isolated local schema and exercises real invitation, submission, notification, staff conversion and routing persistence services. It refuses remote database hosts, disables SharePoint/Sage/email, verifies one receipt and request on retries, checks three recipients and revocation, then removes its schema and files. `npm run test:partner-intake -- --browser` temporarily opens the same isolated test at port 3012 for a browser submission, including one synthetic attachment, and shuts down after verification. This is not a production seeding command.

On 1 November the XTEST browser test confirmed the four hotel fields and Reivernet prefill, a real text-file selection/upload and the receipt screen. Database assertions confirmed quarantine, exactly three notification targets, reviewed request creation and inherited workspace mapping. No real users were notified and no SharePoint calls were made in this local browser check.

The background scanner now has a default 120-second timeout, configurable using `PARTNER_INTAKE_SCAN_TIMEOUT_SECONDS` from 30 to 300 seconds. It terminates timed-out processes and fails closed. Files are processed serially; one missing file no longer aborts all other intake processing. Clean files waiting for review are not continually rescanned ahead of new submissions, and promotion rechecks integrity and an exclusive attachment lock. Scan/promotion and upload outcomes are counted; pending security scans or failures produce a non-zero worker exit for monitoring. A timeout increase provides headroom, not proof of production scanner capacity.

`documents:sync` now honours both independent feature flags: intake processing is skipped while intake is disabled; folder discovery and remote operations are skipped while SharePoint is disabled. Upload copying still requires an explicit timestamp cutoff. Run a single worker instance using a service manager or `flock`; do not overlap cron runs. Review quarantine failures and storage capacity rather than repeatedly adding new invitations to a stalled queue.

These hardening changes require no additional database migration. The existing additive document/intake migration is still required when deploying the prepared release. Live activation and XTEST mapping must be verified separately; local checks do not establish production delivery.

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
