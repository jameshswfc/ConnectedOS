# Connected Workflow and Sage: Delivery Handover

Prepared 31 October 2026. Branch: `codex/connected-workflow-sage`.

## Release Readiness Update: 1 November 2026

James approved deployment with Sage entirely disabled, including temporary access, backup and verification before traffic switching. Deployment completed on 1 November 2026. The authoritative release record is [production-release-2026-11-01.md](../deployment/production-release-2026-11-01.md).

- Fresh local validation passed: 500 tests / 103 files, lint, production build, Prisma validation and migration status (29 current).
- Isolated local sales-journey and combined-role persistence checks passed. The sandbox initially blocked database connections; reruns with authorised local database access passed.
- Exact application commit `1242cec05d03958b23b2803d1634565c2a9cb3b6` is live in `/opt/connectedos-releases/20261101-workflow`.
- The earlier browser-console attempt failed because of keyboard corruption. James subsequently signed in privately through normal SSH and installed a short-lived public key; no host-key bypass or password reset was used.
- Verified private backup stored at `/opt/connectedos-backups/20261101-workflow`. Both additive migrations applied; production has 29 current migrations, with the historical pre-sales baseline preserved.
- Microsoft sign-in verified freshly in the browser; Work Queue, opportunity guidance, linked creation forms, customer projects, schedule coverage and Sage disconnected state verified live.
- Both `SAGE_ENABLED=false` and `SAGE_ALLOW_INVOICE_CREATE=false` verified in the live environment and PM2 process. Existing authentication/session settings and shared uploads preserved.
- Temporary key removed; fresh SSH connection rejected; local private key deleted. No production seeds, cleanup or test business records created.
- SharePoint review and proposed routing are recorded separately in `sharepoint-external-presales-plan.md`; no SharePoint files were created, moved or shared.

## Executive Summary

The broader platform research has been implemented as a first, bounded workflow release rather than a Sage-only exercise. It simplifies daily work and project navigation, improves customer-linked visibility and scheduling, and adds the PM -> James -> Sage invoice-request foundation.

**Live portal change completed:** Carl Smith's primary role is Sales. User permission level, active status and Microsoft linkage were retained; the saved role was reloaded and verified.

**Now live:** the reviewed workflow code and additive schema. Sage remains disabled and unconnected. No real Sage invoice was created, no payment was recorded and no customer invoice was sent. SharePoint and external intake remain separate planned work.

## Delivered Code

- Work Queue across leads, opportunities, activities, pre-sales, quotes and project tasks, with existing visibility rules and assigned-to-me default.
- Salesforce-style stage guidance and qualification/follow-up completeness on opportunities.
- Customer projects linked from account detail; account child records/counts no longer inherit blanket account visibility.
- Project sections grouped into Overview, Delivery, Commercial and Reports & Handover; deep links and existing forms retained.
- Sales-only My Work renamed Sales Overview in navigation, separate from the cross-team Work Queue.
- Resource date-coverage table, explicit leave/overlap counts and preserved inactive-history filter.
- British Summer Time calendar navigation fix; default project dependency links preserve planned template spacing; local-day comparison fixes cascade equality around summer time.
- Sage read-only invoice snapshots with encrypted OAuth, business scoping, bounded pagination, retained cache on failure and currency-separated totals.
- Completed-stage/project invoice requests, James-only approval/rejection, exact amount calculations, customer/VAT/ledger confirmation, single-POST claim and reconciliation hold for uncertain results.
- James dashboard approval count and linked in-app notifications; existing email abstraction reused without claiming live SMTP delivery.

## Research and Remaining Product Work

See [the 12-platform comparison and roadmap](../research/connected-workflow-platform-review.md) for vendor sources, the adopted patterns and explicit boundaries. This delivery does not claim feature parity with Odoo, Salesforce or Asana.

Still to implement/accept separately:

- Pre-sales document ingestion, source-backed requirement extraction, draft network diagrams, BoMs and port matrices with engineer review.
- Actual Hilton macro-enabled CBOM template mapping, formula/macro preservation and Excel acceptance.
- Per-resource hourly capacity, public holidays and advanced dependency policies.
- Wider supplier sourcing/price provenance, full receiving reconciliation and offline/mobile engineer evidence capture.
- Live SMTP delivery and live SharePoint/Graph handling.
- Live Sage connection and financial acceptance, including an operator reconciliation interface before broad invoice automation.

## Files Changed by Area

| Area | Main files |
| --- | --- |
| Work Queue and guidance | `src/modules/work/work-queue-service.ts`, `src/app/work/page.tsx`, `src/modules/crm/ui/opportunity-next-step.tsx`, opportunity page, dashboard page |
| Customer visibility | `src/modules/crm/accounts/account-service.ts`, account detail page, dashboard service |
| Project workspace | `src/modules/projects/ui/project-workspace.tsx`, project detail page |
| Navigation | `src/components/navigation/navigation-items.ts`, `navigation-groups.ts`, CRM My Work page |
| Scheduling | `src/modules/scheduling/schedule-availability.ts`, `calendar-utils.ts`, `src/components/scheduling/schedule-availability-table.tsx`, `module-calendar.tsx`, Field Services schedule page |
| Default plan dates | `src/modules/projects/project-dependency-scheduling.ts`, `project-service.ts` |
| Sage connector | `src/services/integrations/sage/*`, `src/app/api/v1/integrations/sage/*`, `src/app/finance/sage/page.tsx`, `src/modules/finance/ui/sage-actions.tsx` |
| Invoice requests | `src/modules/finance/invoice-request-rules.ts`, `invoice-request-service.ts`, `ui/invoice-request-form.tsx`, `src/app/finance/invoice-requests/*`, `src/app/api/v1/finance/invoice-requests/*`, finance page |
| Schema/configuration | `prisma/schema.prisma`, two additive migration directories, `.env.example` |
| Tests | New service/component tests for invoice approval, Sage, work queue, account visibility, calendar navigation, schedule buffers/coverage and project workspace; navigation expectations; `scripts/check-sales-journey.ts` |
| Documentation | README, platform comparison, Sage guide, security/entities/relationships/permissions addenda, project/scheduling workflows, master sprint plan, testing checklist, this handover |

No dependency package was added or changed. No role-model migration or destructive business-record migration was added.

## Migrations

- `20261101010000_sage_readonly_accounting`: Sage connection, OAuth attempt and external invoice cache.
- `20261101020000_project_invoice_approvals`: invoice-request status enum and project/user-linked request model, unique trigger/external-reference constraints and monetary checks.

Both were applied locally and to production; migration status reports 29 current migrations. A local schema comparison also identified a pre-existing `ProjectResourceAssignment.userId` foreign-key delete-action mismatch; this unrelated historical drift was not reset or silently repaired. Production migration checksums were verified and the previously recorded pre-sales migration variant preserved.

## Validation

| Check | Result |
| --- | --- |
| Unit/service/component suite | 500 tests passed across 103 files, up from 451 baseline tests. |
| ESLint | Passed. |
| Production build / TypeScript | Passed; final rebuild verified before publishing. |
| Prisma schema validation | Passed. |
| Local migration status | Up to date, 29 migrations. |
| `test:journey` | Passed against a disposable local schema: lead -> opportunity -> pre-sales -> reviewed quote -> sent -> accepted -> one project; owner/scope/LAB budget/task links; invoice request/rejection/resubmission and no duplicates. |
| `test:user-roles` | Passed against a disposable local schema: combined-role permissions/selectors, administrator isolation, archival/idempotency and retained history. |
| Local browser | Work Queue, project hash/section views, customer-linked project, stage invoice request/rejection, Sage disabled state, schedule summary and summer-time navigation inspected. Project/work-queue mobile layout checked at 390px without page-level horizontal overflow. |
| API unauthenticated check | Invoice request POST returned structured JSON 401. Unit tests cover 403, same-origin rejection and validation/error sanitisation. |
| Live Sage | Not connected or financially tested; write calls mocked in tests. |
| Live deployment | Completed 1 November 2026 with Sage disabled; see the release record for checks and limitations. |

Expected negative-path test logs include email/provider failures. Existing React test-harness warnings about server form actions and the Vite CommonJS deprecation remain; they are not production build failures. No new browser console errors were observed in the local preview. The disposable preview schema was explicitly removed; no production-test seed was run.

## James: Morning Decisions and Access

1. Completed: approved workflow release deployed with verified backups and migrations; temporary deployment access revoked afterwards. Team acceptance can start from the live Work Queue.
2. Confirm the Sage Accounting business and authorise an application registration/callback. Browser sign-in alone is insufficient. Initial read-only scope is recommended; no consent has been granted on your behalf.
3. Set James's exact active administrator user ID as invoice approver. Confirm sales ledger and 0%/20% VAT codes, customer mapping and existing project billing with Finance before enabling invoice creation.
4. Run one controlled completed-stage invoice with James present after configuration. Check customer, amount, VAT and duplicate protection in Sage. Keep customer sending separate.
5. Confirm the next build slice: source-backed pre-sales deliverables plus Hilton CBOM mapping, or deeper scheduling capacity. The existing requested priority remains lead -> pre-sales -> proposal/quote -> project.

## Local Mac Commands

From a configured local checkout/database only:

```bash
cd "/Users/james/Documents/Business Operations Platform"
npx prisma generate
npx prisma migrate deploy
npm run test
npm run lint
npm run build
npx prisma validate
npx prisma migrate status
npm run test:journey
npm run test:user-roles
```

For a normal local preview, set `NEXTAUTH_URL` to the chosen local origin, ensure the port is unused, and keep Sage disabled until separately configured:

```bash
cd "/Users/james/Documents/Business Operations Platform"
NEXTAUTH_URL=http://localhost:3015 npm run dev -- -p 3015
```

Use an existing local test login. Do not substitute the production database URL. Do not run seed/reset/cleanup commands against the live server as a release step. Production deployment instructions and Sage activation are separate from these local commands.
