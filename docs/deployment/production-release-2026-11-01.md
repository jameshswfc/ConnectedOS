# Production Release: 1 November 2026

## Live Release

- Approved by James with Sage entirely disabled.
- Application commit: `1242cec05d03958b23b2803d1634565c2a9cb3b6`.
- Active directory: `/opt/connectedos-releases/20261101-workflow`; PM2 `connectedos`, port 3002.
- Build ID: `7_t-bfHfsjSmbyL_uT-ou`; final server verification at 08:08 UTC.
- Previous release retained: `/opt/connectedos-releases/20261031-roles-final`.
- Shared uploads remain `/opt/connectedos/storage`.

Delivered: Work Queue, opportunity next-step guidance, customer-linked projects with independent record visibility, grouped project workspace, schedule coverage summary and calendar/dependency date fixes. The Sage and invoice-request foundation is present but is not an activated accounting integration.

## Backup and Migrations

Private backup: `/opt/connectedos-backups/20261101-workflow` (directory mode 700; sensitive files mode 600). Includes database dump, application environment, PM2 configuration, shared uploads, exact source archive and release verification manifest. The database archive was listed and fully decoded with `pg_restore --file=/dev/null`; the uploads archive was listed successfully. A full restore into a separate database was not performed.

All 27 previously applied migration checksums were verified against the running release. The server-specific historical pre-sales migration file was preserved in the candidate. Only these additive migrations were applied:

- `20261101010000_sage_readonly_accounting`
- `20261101020000_project_invoice_approvals`

Production migration status: 29 migrations, up to date. No seed, reset, cleanup or business-record conversion was run. User/account/opportunity/quote/project/document counts were unchanged. Existing demonstration CRM records were not removed as part of deployment.

## Configuration and Access

- Both `SAGE_ENABLED=false` and `SAGE_ALLOW_INVOICE_CREATE=false` verified in the candidate environment and running PM2 process.
- Existing Microsoft/local authentication, session secret and other environment settings preserved.
- No Sage connection, imported invoice or invoice request exists; no financial call was made.
- Candidate ran on loopback port 3003 and passed login/provider/JSON 401 checks before the live switch. It was removed afterwards.
- Temporary SSH key removed from the server after verification. A fresh connection with that key was rejected; the local private key was then deleted. Other authorised keys and the user's own terminal session were not changed. No firewall changes.

## Validation

- 500 tests across 103 files passed; lint passed.
- Production server build, TypeScript and Prisma validation passed.
- Isolated local `test:journey` and `test:user-roles` passed, including linked sales-to-project creation and permissions/archival. No live customer record was submitted for testing.
- Candidate, active local port and public portal login/provider/API protection checks passed. Signed-out Me/Projects GET and invoice-request/Sage-connect POST returned JSON 401.
- Fresh Microsoft sign-in completed in the browser as the existing James administrator.
- Live Work Queue and opportunity next steps rendered; pre-sales and quote forms inherited the selected opportunity/customer; quote form inherited title/scope. Forms were not submitted.
- Customer-linked project region, Projects list, schedule calendar/availability and Sage disconnected screen rendered. No browser warning/error logs were captured in these checks.
- There are no project records on this production database. Project-detail workspace behaviour was covered locally, not by creating fake production projects.

The deployment helper initially stopped before activation because an optional environment-parser package was absent. It was changed to use Node's built-in parser; subsequent candidate verification and activation passed. No application change was needed.

## Rollback

Switch PM2 `connectedos` back to `/opt/connectedos-releases/20261031-roles-final` on port 3002, verify public login and save PM2 state. Keep Sage disabled. Retain the additive database tables; do not restore the database merely to roll back code, because doing so would discard subsequent business activity.

## Separate Work Still Pending

Live SharePoint provisioning, Completed Sites archival and external pre-sales submissions remain planned in `docs/sprints/sharepoint-external-presales-plan.md`. No SharePoint files were moved or uploaded in this release. Sage activation, source-backed pre-sales automation and Hilton CBOM automation require their separate implementation/acceptance gates.
