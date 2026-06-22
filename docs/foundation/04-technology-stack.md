# Technology Stack

## Preferred Stack

ConnectedOS should be built using:

- Next.js.
- TypeScript.
- TailwindCSS.
- shadcn/ui.
- PostgreSQL.
- Prisma.
- Microsoft Entra ID.
- NextAuth or equivalent Microsoft authentication implementation.
- SharePoint for files.
- Microsoft Graph for Microsoft 365 integrations.
- Redis and BullMQ for jobs.
- Recharts for dashboards.
- React PDF or equivalent for PDF generation.

## Frontend

Use Next.js with TypeScript.

Use TailwindCSS and shadcn/ui for clean, fast, consistent UI.

The application should be responsive and usable on desktop, tablet and mobile.

## Backend

The backend may use Next.js server functions/API routes if this keeps the project simpler.

If the backend grows complex, NestJS may be used. However, avoid unnecessary complexity in Sprint 1.

## Database

Use PostgreSQL.

Use Prisma for:

- Schema definitions.
- Migrations.
- Type-safe database access.
- Seed data.

## Authentication

Use Microsoft Entra ID.

Do not implement username/password login.

## File Storage

SharePoint should be the primary file store.

Application database should store:

- File ID/reference.
- File name.
- File type.
- Size.
- Linked module.
- Linked record.
- Uploaded by.
- Uploaded date.

## Background Jobs

Use Redis and BullMQ for background job processing when required.

Sprint 1 can define the framework even if only a small number of jobs exist.

## PDF Generation

Use a server-side PDF approach suitable for:

- Quotes.
- Expense receipt packs.
- Status reports.
- Project handover documents.
- Future proposals.

## Charts and Dashboards

Use Recharts or a similar React charting library.

Dashboards should be fast, clear and focused on management actions.
