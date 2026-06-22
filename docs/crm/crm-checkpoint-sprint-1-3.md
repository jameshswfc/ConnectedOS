# CRM Checkpoint - Sprints 1-3

## Current Completed CRM Features

Platform foundation:

- Next.js App Router application shell.
- TypeScript, TailwindCSS and shadcn-style local UI primitives.
- PostgreSQL with Prisma and Docker Compose local database.
- Microsoft Entra authentication path through NextAuth.
- Development-only login using `INITIAL_ADMIN_EMAIL`.
- Seeded roles and permissions.
- User, role and permission admin list views.
- Audit log service.
- In-app notification records.
- Document service interface/stub for future Microsoft Graph and SharePoint integration.

CRM core:

- Accounts, contacts, leads, opportunities and activities.
- CRM navigation, list views and detail views.
- Account, contact and opportunity create flows.
- Opportunity edit flow at `/crm/opportunities/:id/edit`.
- Soft-delete service support for major CRM records.
- Activity creation linked to accounts, opportunities, leads and contacts.
- Activity completion with outcome notes.
- Account detail shows open linked opportunities, recent activities and key contacts.
- Opportunity and lead detail pages show linked clickable activities.
- Relationship strength controlled picklist.
- Opportunity type and source controlled picklists.

CRM pipeline and forecasting:

- CRM dashboard with open pipeline, weighted open pipeline, deals closing this month, due activities, overdue activities and pipeline by stage.
- Kanban pipeline at `/crm/pipeline`.
- Kanban drag-and-drop stage movement.
- Stage change API at `POST /api/v1/opportunities/:id/change-stage`.
- Stage changes recalculate probability and weighted value.
- Stage changes create opportunity stage history and audit logs.
- Forecast page at `/crm/forecast`, grouped by expected close month.
- Dynamic due and overdue activity alerts using activity queries.

## Known Deferred CRM Features

- GBP/EUR/USD opportunity currency fields and FX conversion.
- GBP-normalized pipeline reporting.
- External FX provider service layer.
- Scheduled/background CRM notification jobs.
- Stale opportunity automation.
- High-value opportunity automation.
- No-follow-up and no-recent-activity automation.
- Lead conversion workflow.
- Pipeline by owner reporting.
- Configurable stage probabilities.
- Lost reason reporting beyond captured opportunity fields.
- Richer Kanban drag/drop behaviour, such as ordering within columns.
- Automated browser testing.

## Exact Local Run Commands

Run from `/Users/james/Documents/Business Operations Platform`:

```bash
cd "/Users/james/Documents/Business Operations Platform"
npm install
cp .env.example .env
docker compose up -d
npm run prisma:migrate
npm run prisma:seed
npm run dev -- -p 3002
```

Open:

```text
http://localhost:3002
```

## Exact Test Commands

Run from `/Users/james/Documents/Business Operations Platform`:

```bash
cd "/Users/james/Documents/Business Operations Platform"
npm run test
npm run lint
npm run build
npx prisma validate
npx prisma migrate status
```

## Current Stage Model and Weightings

| Internal value | Display label | Probability |
| --- | --- | ---: |
| `lead` | Lead | 0% |
| `qualified` | Qualified | 10% |
| `pre_sales_solution_design` | Pre-Sales / Solution Design | 20% |
| `proposal_sent` | Proposal Sent | 30% |
| `negotiation` | Negotiation | 50% |
| `proposal_verbally_accepted` | Proposal Verbally Accepted | 75% |
| `closed_won_po_received` | Closed Won (PO Received) | 100% |
| `lost` | Lost | 0% |

Closed stages:

- `closed_won_po_received`.
- `lost`.

Open pipeline stages:

- `lead`.
- `qualified`.
- `pre_sales_solution_design`.
- `proposal_sent`.
- `negotiation`.
- `proposal_verbally_accepted`.

## Permission Rules

CRM visibility uses seeded permissions:

- `read_own` scopes records to the signed-in user through owner/assignee fields.
- `read_all` allows all records for that CRM entity.
- `admin.users` bypasses CRM read scoping.
- Director and Sales Manager seeded roles have CRM `read_all` permissions.
- Standard Sales User seeded role has CRM `read_own` permissions.

Current scoping:

- Opportunities use `Opportunity.ownerId`.
- Activities use `SalesActivity.ownerId`.
- Accounts use `Account.ownerId`.
- Leads use `Lead.ownerId`.
- Contacts inherit visibility through their account owner for `read_own`.
- Pipeline, forecast and CRM dashboard totals use the same opportunity visibility helper.
- Due and overdue activity counts use the same activity visibility helper.
- Linked activity sections filter by activity visibility where practical.

## Current Risks and Technical Debt

- Stage probabilities are hardcoded in `src/modules/crm/opportunities/opportunity-stages.ts`.
- CRM permission sharing is owner-based only; team, territory and delegated access are not implemented.
- Due and overdue CRM alerts are dynamic query results, not scheduled notification records.
- Full CRM automation rules are deferred.
- FX conversion is deferred, so all current pipeline values use the existing opportunity value only.
- Microsoft Graph and SharePoint integrations are represented by service stubs only.
- Existing tests cover helpers/services and build validation, but not automated browser workflows.
- Prisma enum migrations have changed opportunity stages several times; future stage changes should be handled carefully with data mapping.
- NextAuth local redirect behaviour depends on current request/callback origin and should be retested when production auth configuration is added.
