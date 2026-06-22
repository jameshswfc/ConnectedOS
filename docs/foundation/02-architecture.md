# ConnectedOS Architecture

## Architectural Goal

ConnectedOS must be built as a modular business platform. Each module must be able to evolve independently while sharing common platform services such as authentication, users, permissions, audit logs, notifications, documents and reporting.

## Recommended Architecture

Use a modern TypeScript-first web architecture:

- Next.js for the web application.
- TypeScript throughout.
- PostgreSQL for relational data.
- Prisma for database access and migrations.
- Microsoft Entra ID for authentication.
- SharePoint for document storage.
- Microsoft Graph for Microsoft 365 integrations.
- Redis and BullMQ for background jobs.
- Recharts for dashboards.
- React PDF or server-side PDF generation for document packs.

## Application Layers

### Frontend Layer

Responsibilities:

- Page routing.
- UI components.
- Forms.
- Tables.
- Filters.
- Dashboards.
- Calendar views.
- Board views.
- User interactions.

The frontend must not contain core business logic. Business rules belong in services or API handlers.

### API Layer

Responsibilities:

- Authentication enforcement.
- Permission checks.
- Request validation.
- Response formatting.
- Routing to services.

All APIs must be versioned where practical, using patterns such as:

```text
/api/v1/accounts
/api/v1/opportunities
/api/v1/projects
```

### Business Logic Layer

Responsibilities:

- Workflow rules.
- Automation triggers.
- Approval rules.
- Notification creation.
- Audit creation.
- Integration calls.

### Data Layer

Responsibilities:

- Prisma models.
- Database queries.
- Migrations.
- Indexes.
- Relationships.
- Soft delete patterns.

### Integration Layer

Responsibilities:

- Microsoft Graph.
- SharePoint folder creation.
- Outlook calendar checking.
- Teams notifications.
- Future third-party integrations.

Integration logic must be isolated from core module logic so external API changes do not break business workflows.

## Shared Platform Services

The following services must be shared across modules:

- Auth service.
- User service.
- Role and permission service.
- Audit log service.
- Notification service.
- Document service.
- Comment service.
- Activity service.
- Search service.
- Export service.
- Approval workflow service.

## Module Boundary Rules

CRM owns:

- Accounts.
- Contacts.
- Leads.
- Opportunities.
- Sales activities.

Quoting owns:

- Quotes.
- Quote versions.
- Quote lines.
- Product catalogue.
- Pricing imports.

Pre-sales owns:

- Pre-sales requests.
- Pre-sales assignment.
- Pre-sales deadlines.
- Request file review workflow.

Project management owns:

- Projects.
- Milestones.
- Tasks.
- Risks.
- Issues.
- Changes.
- Budgets.

Scheduling owns:

- Resource bookings.
- Availability.
- Booking conflicts.

Leave owns:

- Time off requests.
- Approvals.
- Leave calendars.

Expenses owns:

- Expense claims.
- Expense lines.
- Receipts.
- Approvals.
- Receipt pack generation.

Reporting reads data from all modules but should not own transactional data.

## Folder Structure Target

The application should use a clear structure similar to:

```text
/src
  /app
  /components
  /lib
  /modules
    /crm
    /quoting
    /presales
    /projects
    /scheduling
    /leave
    /expenses
    /reporting
    /client-portal
  /services
    /auth
    /audit
    /notifications
    /documents
    /permissions
    /integrations
  /types
  /utils
/prisma
/docs
```

Codex may refine the structure, but must preserve modular boundaries.

## Background Jobs

Use background jobs for:

- Sending notifications.
- Deadline checks.
- Stale opportunity checks.
- Receipt PDF generation.
- SharePoint folder creation retries.
- Pricing sheet imports.
- Report generation.

## Error Handling

Errors must be handled consistently.

API responses should follow a standard pattern:

```json
{
  "success": false,
  "data": null,
  "errors": [
    {
      "code": "VALIDATION_ERROR",
      "message": "Expected close date is required"
    }
  ]
}
```

## Scalability Requirements

The platform must be designed to support:

- Multiple users.
- Multiple concurrent projects.
- Many documents per project.
- Large product catalogues.
- Multiple years of CRM and project history.
- Future AI analysis across structured data.

## Non-Functional Requirements

- Page load target: under 2 seconds for common pages.
- Dashboard load target: under 5 seconds for aggregated dashboards.
- Search response target: under 1 second where practical.
- Role checks must not noticeably slow page loads.
- Long-running imports must run in background jobs.
