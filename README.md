# ConnectedOS

ConnectedOS is the internal business operations platform for Connected Hospitality. The current checkpoint covers Sprint 1 platform foundation plus Sprint 2-3 CRM core, refinement, pipeline and forecasting work.

The latest pre-testing hardening pass adds:

- central email notification delivery with a safe console provider by default
- an operational audit viewer and record-level audit panels
- permission-aware global search in the app shell
- hardened helpdesk attachments, SLA actions and linked booking/issue actions
- improved production-test seed data and tester workflows across operations modules
- a safe `npm run cleanup:production-test-data` command for clearing deterministic production-test records before reseeding

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy the example environment file:

```bash
cp .env.example .env
```

3. Fill in the local login and NextAuth values in `.env`.

Microsoft Entra login is currently parked. Local email/password login is the active sign-in method.

4. Start PostgreSQL:

```bash
docker compose up -d
```

5. Run the database migration and seed:

```bash
npm run prisma:migrate
npm run prisma:seed
npm run cleanup:production-test-data
npm run seed:production-test
```

6. Start the app on the current testing port:

```bash
npm run dev -- -p 3002
```

Open `http://localhost:3002`.

## Validation Commands

Run these from `/Users/james/Documents/Business Operations Platform`:

```bash
npm run test
npm run lint
npm run build
npx prisma validate
npx prisma migrate status
```

## Quote Catalogue CSV

Price Imports accepts products, labour and services in one CSV. Required columns:

```text
supplier,sku,manufacturer,category,description,item_type,unit_cost,unit_sell,lead_time_days
```

Allowed `item_type` values are `product`, `labour` and `service`.

Download the sample file from:

```text
http://localhost:3002/api/v1/price-imports/sample
```

## Pre-Sales File Uploads

Sprint 6.2 stores uploaded pre-sales files locally in development under:

```text
storage/presales/{year}/{requestNumber}/
```

Supported file types are PDF, DOCX, XLSX, PPTX, PNG, JPG/JPEG, CSV and TXT. The current upload limit is 25MB per file. The UI shows a SharePoint target path for each upload, but live SharePoint/Microsoft Graph upload remains deferred.

## Required Environment Variables

```text
DATABASE_URL
NEXTAUTH_URL
NEXTAUTH_SECRET
EMAIL_PROVIDER
EMAIL_FROM
SMTP_HOST
SMTP_PORT
SMTP_USER
SMTP_PASSWORD
SMTP_SECURE
AZURE_AD_CLIENT_ID
AZURE_AD_CLIENT_SECRET
AZURE_AD_TENANT_ID
INITIAL_ADMIN_EMAIL
INITIAL_ADMIN_NAME
INITIAL_ADMIN_PASSWORD
ENABLE_ENTRA_LOGIN
```

`INITIAL_ADMIN_EMAIL` and `INITIAL_ADMIN_PASSWORD` seed the first local Administrator account. Passwords must be at least 10 characters and include at least one letter and one number.

If `INITIAL_ADMIN_PASSWORD` is missing, seed uses a development-only default password:

```text
ConnectedOS123
```

and marks the account as needing a password change.

Admin-created users and users whose passwords are reset by an administrator must change their password on next login. Until that is complete, ConnectedOS redirects them to:

```text
/settings/change-password
```

The normal `/settings` page remains available for profile and password management after first-login password change is complete.

Set `ENABLE_ENTRA_LOGIN=true` only when Microsoft Entra is ready to be re-enabled.

## Email Notifications

ConnectedOS now uses a central email framework at:

```text
src/services/email/email-service.ts
```

Development defaults:

```text
EMAIL_PROVIDER=console
EMAIL_FROM=ConnectedOS noreply@connectedhsp.com
```

When `EMAIL_PROVIDER=console`, emails are rendered to the server console for safe local testing. SMTP settings can be added later without changing module code. Email failures are logged safely and do not crash application workflows.

## Access Control UX

Sidebar navigation is permission-based. Users only see menu items that match their current permissions, while server-side permission checks remain authoritative. Settings remains visible for all signed-in users.

Approved assignable roles:

- Administrator
- Sales
- Pre-Sales
- Project Engineer
- Project Manager
- Field Engineer
- Finance
- Business Operations

Older internal role records may remain for compatibility, but normal user administration only presents the approved role list above.

Friendly access denied handling is available at:

```text
/403
```

Restricted pages render an access denied card instead of raw stack traces where practical. API routes still return JSON `401`/`403` responses.

## Audit Viewer And Search

Operational audit history is now available to authorised users at:

```text
/admin/audit
```

The shared record-level audit panel is also available on implemented detail pages such as accounts, opportunities, quotes, projects, expenses, purchase orders, invoices, assets and helpdesk tickets.

Global search is available from the app shell and at:

```text
/search?q=
```

Search results are permission-scoped and grouped by module, so users only see records they are allowed to view.

## Helpdesk And Document Upload Notes

Helpdesk now supports:

- internal and customer-visible comments
- attachment upload/download with permission checks
- SLA pause states for `Waiting Customer` and `Waiting Third Party`
- ticket actions for resolve, close and reopen
- `Create Field Booking` and `Create Project Issue` shortcuts from ticket detail

Local fallback document storage remains active when live SharePoint is not configured. The UI shows clear SharePoint-style target paths without requiring Graph connectivity.

## Sprint 1-3 CRM Checkpoint

Current completed CRM features:

- Platform foundation: Next.js app shell, Microsoft Entra auth path, development login, RBAC seed data, audit logs, notifications, document stubs and PostgreSQL/Prisma setup.
- CRM core: accounts, contacts, leads, opportunities and activities with list/detail/create flows.
- CRM refinements: activity links to accounts/opportunities/leads/contacts, key contacts and open opportunities on account detail, controlled relationship strength, opportunity type and opportunity source.
- Pipeline and forecasting: CRM dashboard metrics, Kanban pipeline, drag-and-drop stage changes, forecast by expected close month and dynamic due/overdue activity alerts.
- Opportunity editing: `/crm/opportunities/:id/edit` and `POST /api/v1/opportunities/:id/change-stage`.

Current stage model:

| Stage | Probability |
| --- | ---: |
| Lead | 0% |
| Qualified | 10% |
| Pre-Sales / Solution Design | 20% |
| Proposal Sent | 30% |
| Negotiation | 50% |
| Proposal Verbally Accepted | 75% |
| Closed Won (PO Received) | 100% |
| Lost | 0% |

Permission rules:

- `read_own` users see records assigned to them via owner filtering.
- `read_all` users see all CRM records for that entity.
- Admin users with `admin.users` bypass CRM read scoping.
- Director and Sales Manager seeded roles include CRM `read_all` permissions.

Known deferred CRM features:

- FX conversion and GBP-normalized multi-currency opportunity values.
- Scheduled/background CRM notification jobs.
- Full pipeline by owner reporting and richer forecasting.
- Lead conversion workflow.
- Stale opportunity and high-value opportunity automation rules.
- Lost reason reporting beyond captured fields.

Current risks and technical debt:

- Stage probabilities are hardcoded in CRM stage constants, not configurable yet.
- Visibility is owner-based only; team/territory sharing is not implemented.
- Due/overdue alerts are generated dynamically, not persisted or scheduled.
- Microsoft Graph/SharePoint integrations remain stubs.
- Browser coverage is manual; automated browser tests are not yet part of the validation suite.

See `docs/crm/crm-checkpoint-sprint-1-3.md` for the full checkpoint.

## Sprint 1 Boundaries

The Sprint 1 scaffold intentionally did not implement CRM, quoting, pre-sales, project management, scheduling, leave, expenses, reporting, client portal, procurement, assets or AI assistant modules. CRM has since been implemented through the Sprint 1-3 checkpoint only.

SharePoint and Microsoft Graph are represented by a document service interface and stub only. Live Graph calls are deferred until the integration sprint.
