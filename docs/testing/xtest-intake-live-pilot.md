# XTEST Partner Intake Live Pilot

## Release: 1 November 2026

James approved a live XTEST-only pilot, notifications to James, Tim and Stephen, no invitation sent to Reivernet, no existing hotel-folder moves, and Sage remaining disabled.

- Release: `/opt/connectedos-releases/20261101-xtest-intake`.
- Previous release: `/opt/connectedos-releases/20261101-workflow`.
- Private backup: `/opt/connectedos-backups/20261101-xtest-intake` (database, configuration, uploads, PM2/proxy state and pilot evidence).
- Deployment source archive SHA256: `0d5a663496f24095f3bef2c1ab56f22e2998c08aa4dbab2b7e834367a361bfe2`. Operational pilot scripts and this subsequent evidence document are separate from that source archive.
- Verified 29 applied migration checksums before deploying the sole additive migration `20261101120000_sharepoint_partner_intake`. No reset, production seed or historical-data cleanup was run.
- Candidate built separately, checked on loopback port 3003, then Nginx switched to it. Microsoft sign-in provider retained; James's authenticated portal session continued to work. No fresh interactive Microsoft login was required or claimed as a new test.

## Verified Journey

1. Created one route for Test Hotel, XTEST, Tempo by Hilton, UK, Reivernet. The actual hotel address and room/floor counts remain unspecified.
2. Created a clearly labelled internal test account, not a real customer account.
3. Created a private seven-day invitation through the live authenticated UI; it was never sent externally.
4. Submitted one synthetic text attachment through the public browser form. Receipt: `f45ae143-1e9c-4e8f-8320-80d3b307549f`. Reload returned the same receipt.
5. Verified exactly three intake notifications, addressed to the existing James, Tim and Stephen user IDs with the correct review link. James's bell and notification navigation were tested in the browser. Tim/Stephen deliveries were checked in the database, not by impersonating their browser sessions.
6. Quarantine initially withheld the download link. Real ClamAV scanning marked the file clean; the link then appeared.
7. James's authenticated browser reviewed the hotel mapping and converted the submission into **PS-2026-0001**, ID `6d017659-318f-410f-a3e3-448065d9941b`, under **XTEST - INTERNAL PILOT ONLY**.
8. The worker rechecked the attachment, promoted one Document and copied it into the request-specific SharePoint folder. The Graph item parent matched the stored workspace folder ID. ConnectedOS displayed `ready` and the actual folder link. Authenticated document download succeeded.
9. A repeat worker run inspected/promoted/uploaded zero additional attachments/documents; the provisioned folder remained stable. The consumed invitation was revoked.

## Destinations

- Sales: `Business Development/Reivernet Sales/XTEST - Test Hotel - Tempo by Hilton - INTERNAL PILOT`.
- Pre-sales: `Pre-sales/Reivernet/UK/Hilton/Tempo/XTEST - Test Hotel - Tempo by Hilton - INTERNAL PILOT`.
- Deployment: `Deployment/1. UK/3. Hilton/XTEST - Test Hotel - Tempo by Hilton - INTERNAL PILOT`.
- Archive: `Deployment/1. UK/3. Hilton/Completed Sites`. No such child existed under Hilton, so it was created for the pilot.

A synthetic archive-verification child and text file were moved from the XTEST Deployment folder into Hilton Completed Sites. Folder identity, file parent and repeat-safe archival were verified. This tested the real folder operation, not a real project's closure workflow; no production project was created or closed. Only explicitly mapped routes are eligible for folder provisioning; all existing unmapped records remain pending mapping. Administrators must not add real mappings or external invitations before reviewing their destinations/audience.

## Operating Controls

- Existing three selected-folder grants retained. No additional Microsoft permissions granted.
- `PARTNER_INTAKE_ENABLED=true`, `SHAREPOINT_ENABLED=true`, with one XTEST route only.
- `SAGE_ENABLED=false`, `SAGE_ALLOW_INVOICE_CREATE=false`, `SHAREPOINT_CAPTURE_EXPORTS=false`.
- Explicit new-document timestamp cutoff; no historical-file bulk copying.
- Exact public API location: 12 MB request-body limit, 30-second body timeout, per-IP 10 requests/minute with burst 10, 429 limit response. Application limits remain five files, 5 MB/file, 10 MB total and invitation-level throttling.
- `connectedos-documents.service` is a single-instance, locked, memory-limited background worker. Its timer runs five minutes after completion with up to 20 seconds jitter; no overlapping scans.
- Scanner timeout: 120 seconds, fail closed. First live scan took approximately 32 seconds, with 800 MB resident-memory limit and about 761 MB swap peak. This demonstrates pilot operation, not capacity for broad partner intake; review capacity before wider release.
- Unauthenticated management and attachment endpoints returned 401 JSON. Invalid invitation returned friendly 400 JSON. Login and public form returned HTTPS 200.
- Email provider is not configured for real delivery. In-app notifications are verified; console email events are not delivered emails.
- Opening the SharePoint folder in the browser reached Microsoft's password prompt for James. The stored remote item was verified through Graph; direct browser SharePoint viewing still requires his private sign-in. No password was requested in chat or extracted.

## Validation and Remaining QA

- Local full suite: 568 tests across 113 files; lint, build, Prisma validate and migration status passed.
- Isolated local service and browser intake tests passed, including one attachment, exactly three recipients, conversion, retry protection and revocation.
- VPS production build passed; additive migration applied successfully.
- VPS migration status subsequently confirmed all 30 migrations up to date. The superseded PM2 process was stopped after verification; its code and backups remain available. The pilot process and timer are persisted for restart.
- Temporary XTEST SSH access was removed after health checks. A fresh connection with that key returned permission denied; the local private key was deleted. All other authorised-key lines were preserved.
- The existing pre-sales detail page still displays a legacy `sharepoint://` target in Commercial Context, separate from the correct new SharePoint Documents panel. Document MIME/uploader display and the empty-deliverables progress state also need presentation cleanup. These were observed, not silently labelled complete.
- Broader activation still needs real property mapping/audience review, upload retention policy, scanner capacity assessment and external partner invitation approval. Office/macros/CAD are not accepted by the pilot form.

## Rollback

Keep the old release and private backups. To roll back, stop/disable the document timer, restore the backed-up Nginx site and reload after `nginx -t`, and ensure the previous PM2 process `connectedos` is running on port 3002. The pilot process is `connectedos-xtest` on loopback port 3003. Do not drop additive tables or restore the database over new submissions merely to roll back code. Preserve the separately installed document secret and local uploaded originals. Never print the private `.env` or PM2 backup.
