# Production Release: 31 October 2026

Superseded for active-release paths by [the 1 November workflow release](production-release-2026-11-01.md). Retained as deployment history.

## Latest Update: Combined Roles and User Archival

This update supersedes the active-release location and user counts below; the original launch record remains for history.

- Application commits: `28224a5` (combined roles and archive) and `1dc0e18` (consistent UK last-login timestamps).
- Active release: `/opt/connectedos-releases/20261031-roles-final`, PM2 `connectedos`, port 3002. Immediate rollback release: `/opt/connectedos-releases/20261031-roles` (same role/archive support, before the timestamp correction).
- Private pre-change database/configuration/PM2 backup: `/opt/connectedos-backups/20261031-roles`. Database dump verified with `pg_restore --list`; reviewed prior role/archive values retained privately. No seed, reset or cleanup was run.
- Additive migration `20261031223000_multiple_user_roles` applied locally and in production; all 27 migrations current. The existing server-specific historical migration file was preserved.
- Nine explicitly reviewed role configurations applied through audited user services. Non-administrators retain normal User permission level and no `admin.*` permissions. Two other active accounts were left unchanged.
- Six already inactive accounts archived, leaving 11 users in the normal list. Historical records, immutable Microsoft links and blocked access retained. No Microsoft directory account was deleted.
- Validation: 451 tests across 92 files; lint, local and production build, Prisma validation/status; isolated local multi-role/archive persistence check; isolated lead-to-project journey check.
- Candidate Microsoft/local provider checks and JSON 401 checks passed before activation. Live administrator session continued working. Browser verification showed exactly 11 retained users, correct combined-role selections and no new console errors after the timestamp fix.
- Temporary deployment key removed from the VPS, a subsequent SSH attempt was rejected, and the local private key was removed. No firewall changes.

For rollback, keep the additive table and user data; switch PM2 to the immediate rollback release. Do not restore the database simply to roll back application code, as that would discard subsequent business activity. Reviewed personnel details are not stored in this public repository.

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
