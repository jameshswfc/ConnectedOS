# Production Release: 31 October 2026

## Release

Application commit: `bb94846` (Microsoft tenant-member sign-in, connected sales journey and grouped navigation).

Published to the existing GitHub `main` branch and deployed to the Fasthosts VPS. GitHub publishing uses the official GitHub CLI authenticated to the existing repository owner. No secret or customer upload was included in this release commit.

## Server Layout

- Active release: `/opt/connectedos-releases/20261031-m365`.
- PM2 process: `connectedos`, `npm run start -- -p 3002`.
- Previous release, retained for rollback: `/opt/connectedos`.
- Shared uploads: `/opt/connectedos/storage`, linked into the new release.
- Private backup: `/opt/connectedos-backups/20261031-2135`.
- Backup includes a PostgreSQL custom-format dump, verified readable by `pg_restore --list`, application/configuration/uploads archive, server changes and PM2 configuration.

The previous server has local changes to its lockfile and a historical migration. Those changes were preserved. The candidate retains the server's historical migration file; no migration, seed, reset or production-test cleanup was run. Both local and production migration status reported 26 migrations, up to date.

The live application is no longer running from the old checkout. Do not assume a `git pull` in `/opt/connectedos` updates the portal. Prepare a separate release, preserve uploads and environment, build and check it, then switch PM2 with rollback.

## Microsoft Sign-In

The production environment enables the single-tenant provider alongside local fallback. The secret is stored only in the candidate's private `.env` (mode `600`), not in this repository. Keep the existing NextAuth session secret unchanged.

The verified James Microsoft identity was linked through the account-link service to the existing active James administrator record. This wrote an audit entry and preserved role, password and ownership. A subsequent administrator-requested directory reconciliation linked the other seven existing active users and created nine missing passwordless Staff accounts. All 17 eligible active accounts now show Linked in the live Users page. Existing roles and ownership were preserved; four guests and three disabled Microsoft accounts were excluded. A repeat preview reported 17 unchanged, seven excluded, zero conflicts and zero pending creations/links. No directory-wide Graph permission was added. This is a reviewed import, not continuous directory synchronisation.

Enterprise application checks: sign-in enabled, assignment not required. James accepted the individual Microsoft consent screen. Microsoft sign-in then completed on the public portal, returning to Dashboard with the existing Administrator role and permission level. The successful sign-in was verified in the application audit trail.

The first callback exposed an nginx response-header limit: `upstream sent too big header`. The application and token exchange were healthy, but nginx rejected the authentication response. The portal-only configuration now uses `proxy_buffer_size 32k`, `proxy_buffers 8 16k`, `proxy_busy_buffers_size 64k` and `large_client_header_buffers 4 16k`. Its original configuration was backed up, `nginx -t` passed and nginx was reloaded. A fresh Microsoft sign-in succeeded. No TLS or firewall setting was changed.

## Validation

- Initial release: 417 tests passed in 88 files. After directory import: 435 tests passed in 89 files, including 18 new tests covering least privilege, inactive/guest exclusion, identity collisions, role preservation and repeatability. Local lint, build and Prisma validation passed again; 26 migrations remain current.
- Lint passed.
- Local and production builds passed.
- Prisma schema validation passed; production migration status is current.
- Isolated local database workflow passed: lead conversion, pre-sales, separately approved quote, sent, accepted, exactly one linked project, ownership, scope, budget, tasks, history and notifications.
- Candidate and public login/provider checks passed, including Microsoft and local providers.
- Public signed-out Projects, Opportunities, Helpdesk and Me APIs returned JSON 401.
- Existing live administrator session continued working after activation and the new grouped navigation rendered.
- A fresh Microsoft sign-in returned to the live Dashboard; Settings confirmed the existing Administrator role and permission level.
- Live browser checks passed for the lead qualification form, opportunity journey and account/opportunity/title prefill into quote creation. No customer record was submitted by those checks.
- No live customer sales record was created or modified for the workflow test. Full customer-facing journey acceptance remains a separate controlled browser exercise.

## Rollback

On the VPS, an authorised operator can stop `connectedos` and restart it from `/opt/connectedos` on port 3002, then save the PM2 process list. The previous release retains its original environment with Microsoft sign-in disabled. Do not restore the database merely to roll back this code-only release; that would discard subsequent user activity.

For an authentication-only rollback, disable `ENABLE_ENTRA_LOGIN` in the active release's private environment and restart the application. Retain identity links and business records.

The supplied Microsoft secret was disclosed in conversation. Rotate it after this controlled launch, without posting the replacement in chat. Do not remove the working local recovery login until Microsoft access and recovery procedures have been accepted.
