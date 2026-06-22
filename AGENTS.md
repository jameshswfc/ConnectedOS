# ConnectedOS - AGENTS.md

## Purpose

ConnectedOS is the internal business operations platform for Connected Hospitality. This repository is intended to be built by Codex and/or other AI coding agents using the documentation contained in this kick-off pack.

The system must cover CRM, quoting, pre-sales management, project management, resource scheduling, time off, expenses, reporting, client portal, procurement, asset tracking, Microsoft 365 integrations and future AI-assisted operations.

## How Codex Must Use This Repository

Before making any code change, Codex must read this file first. Codex must then read the relevant foundation, database, module and sprint files for the specific task being worked on.

Do not ask Codex to read the entire repository for every task. Use the reading map below to reduce unnecessary context usage.

## Mandatory Foundation Reading

For any development task, read:

- docs/foundation/01-platform-foundation.md
- docs/foundation/02-architecture.md
- docs/foundation/03-security.md
- docs/foundation/04-technology-stack.md
- docs/foundation/05-coding-standards.md
- docs/foundation/06-ui-standards.md
- docs/database/entities.md
- docs/database/relationships.md
- docs/database/permissions.md
- docs/database/audit.md

## Module Reading Map

When working on CRM, read:

- docs/crm/crm-overview.md
- docs/crm/crm-database.md
- docs/crm/crm-workflows.md
- docs/crm/crm-api.md
- docs/crm/crm-ui.md
- docs/crm/crm-sprints.md

When working on quoting and BoM, read:

- docs/quoting/quoting-overview.md

When working on pre-sales, read:

- docs/presales/presales-overview.md

When working on project management, read:

- docs/projects/project-management-overview.md

When working on scheduling and resources, read:

- docs/scheduling/resource-scheduling-overview.md

When working on time off, read:

- docs/leave/time-off-overview.md

When working on expenses, read:

- docs/expenses/expenses-overview.md

When working on reporting, read:

- docs/reporting/reporting-overview.md

When working on client portal, read:

- docs/client-portal/client-portal-overview.md

When working on procurement, read:

- docs/procurement/procurement-overview.md

When working on assets, read:

- docs/assets/asset-management-overview.md

When working on Microsoft 365 integrations, read:

- docs/integrations/microsoft-365-integrations.md

When working on delivery planning, read:

- docs/sprints/master-sprint-plan.md
- the specific sprint file under docs/sprints/

## Build Sequence

Build in this order unless James explicitly changes priority:

1. Platform foundation
2. CRM core
3. CRM automation and reporting
4. Quote and BoM tool
5. Pre-sales management
6. Project management
7. Scheduling and resource planning
8. Time off management
9. Expenses
10. Reporting and executive dashboards
11. Client portal
12. Procurement
13. Asset management
14. Knowledge base
15. AI assistant integrations

## Agent Rules

1. Build only the current sprint requirements unless instructed otherwise.
2. Do not build future modules early.
3. Do not create throwaway placeholder functionality.
4. Use reusable services, components and shared data models.
5. Do not duplicate entities. Accounts, contacts, users, products, projects and documents must be shared across modules.
6. Implement role-based access control from the start.
7. Implement audit logging from the start.
8. Implement soft delete for major business records.
9. Keep business logic in services, not UI components.
10. Write tests for critical workflows.
11. Keep Microsoft 365 integration points isolated in integration services.
12. Update documentation when architecture, schemas or workflows change.

## First Codex Task

Use this first prompt in Codex after the repository is created and this kick-off pack is committed:

```text
Read AGENTS.md, docs/foundation/*, docs/database/*, and docs/sprints/sprint-01-foundation.md.

Do not write application code yet.

Create a Sprint 1 implementation plan for the ConnectedOS platform foundation only.

Include:
1. Proposed repository structure.
2. Confirmed technology stack.
3. Initial database schema proposal.
4. Authentication approach.
5. Role-based access control approach.
6. Audit log approach.
7. Notification framework approach.
8. Risks, assumptions and questions.

Wait for approval before coding.
```

## Definition of Done

A feature is complete only when:

- Code is complete.
- Tests pass.
- Role permissions are implemented.
- Audit logging is implemented where required.
- Notifications are implemented where required.
- UI is responsive.
- Database migrations are complete.
- Documentation is updated.
- The feature is production deployable.

