# ConnectedOS Platform Foundation

## Project Vision

ConnectedOS is the internal business operations platform for Connected Hospitality.

The platform will replace disconnected tools, spreadsheets, email trackers and manual processes used across sales, pre-sales, project delivery, scheduling, expenses and reporting.

ConnectedOS must become the single source of truth for:

- Customer relationships.
- Contacts.
- Leads and opportunities.
- Quotes and BoMs.
- Pre-sales requests.
- Projects.
- Tasks.
- Resource planning.
- Time off.
- Expenses.
- Management reporting.
- Client collaboration.
- Future AI-assisted operations.

## Business Objectives

### Sales Visibility

The platform must provide visibility of all sales opportunities, expected close dates, values, probability, activities and pipeline health.

Success means:

- All opportunities are tracked centrally.
- Directors and sales managers can see live pipeline value.
- Stale opportunities are highlighted automatically.
- Forecasting is available by month, salesperson, customer, stage and probability.

### Pre-Sales Control

The platform must control pre-sales workload, request intake, file review, engineer assignment and deadlines.

Success means:

- Every pre-sales request is logged.
- Every request has an owner, status and due date.
- Engineers receive assignments clearly.
- Approaching deadlines trigger alerts.
- Submitted requests can create SharePoint folders automatically.

### Project Delivery Visibility

The platform must provide structured project management across milestones, tasks, budgets, risks, issues, dependencies and resources.

Success means:

- Project managers can see project health quickly.
- Directors can see budget and delivery risk.
- Engineers can see assigned tasks and schedules.
- Gantt-style planning is available.
- Resource conflicts are identified before they cause delivery issues.

### Operational Efficiency

The platform must reduce manual administration by automating repeatable tasks.

Examples:

- Create reminders automatically.
- Create SharePoint folders automatically.
- Convert accepted quotes into project budgets.
- Convert pre-sales requests into tasks.
- Generate receipt packs from expense uploads.
- Generate management dashboards from live data.

### AI Readiness

The platform must be built with structured data and secure APIs so future AI assistants can:

- Analyse RFPs.
- Review uploaded drawings.
- Draft proposals.
- Create project summaries.
- Flag delivery risks.
- Summarise opportunities.
- Suggest follow-up actions.

## Design Principles

### Single Source of Truth

Each business entity must exist once and be reused across modules.

Examples:

- Account records live in CRM.
- Projects, quotes and pre-sales requests reference the account record.
- Contacts live once and are linked to accounts, opportunities and projects.
- Users live once and are referenced by tasks, bookings, approvals and audit records.

### Automation First

Whenever a process can be automated safely, it should be automated.

The system should automatically create:

- Tasks.
- Reminders.
- Notifications.
- SharePoint folders.
- Audit logs.
- Default project structures.
- Default approval records.

### Security By Default

Users should only see data they are permitted to access.

Role-based access control must be implemented from the foundation sprint, not added later.

### Auditability

Important actions must be traceable.

The system must record who changed what, when it changed, and what changed.

### Microsoft 365 Native

ConnectedOS must integrate naturally with the Microsoft ecosystem used by the business:

- Microsoft Entra ID for authentication.
- SharePoint for file storage.
- Outlook for calendar and email workflows.
- Teams for notifications.
- Microsoft Graph as the integration layer.

## Target Users

### Directors

Need:

- Forecasting.
- Business dashboards.
- Project visibility.
- Financial visibility.
- Resource visibility.
- Risk visibility.

### Sales Users

Need:

- Accounts.
- Contacts.
- Leads.
- Opportunities.
- Activities.
- Quotes.
- Follow-up reminders.

### Pre-Sales Engineers

Need:

- Assigned pre-sales requests.
- Uploaded files.
- Deadlines.
- Internal notes.
- Task lists.
- Completion workflow.

### Project Managers

Need:

- Projects.
- Tasks.
- Gantt charts.
- Budget tracking.
- Resource planning.
- Risks and issues.
- Customer reporting.

### Engineers

Need:

- Assigned tasks.
- Site bookings.
- Project documents.
- Schedule visibility.
- Timesheet or time allocation information in future.

### Finance Users

Need:

- Expenses.
- Approval status.
- Project cost visibility.
- Exportable records.
- Receipt packs.

### Customer Users

Need restricted portal access to:

- Their own projects.
- Status updates.
- Shared documents.
- Approvals where enabled.

## Platform Modules

The complete platform shall include:

1. CRM.
2. Quoting and BoM.
3. Pre-Sales Management.
4. Project Management.
5. Resource Scheduling.
6. Time Off Management.
7. Expenses.
8. Reporting and Dashboards.
9. Client Portal.
10. Document Generation.
11. Procurement.
12. Asset Management.
13. Knowledge Base.
14. Future AI Assistant.

## Core Global Features

Every major module must support, where appropriate:

- Create, read, update and soft delete.
- Search.
- Filtering.
- Sorting.
- List views.
- Detail views.
- Comments.
- Attachments.
- Status history.
- Assignment.
- Notifications.
- Audit trail.
- Role permissions.
- Export where useful.

## Initial Delivery Priority

The platform must be built in this order:

1. Foundation.
2. CRM.
3. Quoting.
4. Pre-Sales.
5. Project Management.
6. Scheduling.
7. Time Off.
8. Expenses.
9. Reporting.
10. Client Portal.
11. Procurement.
12. Assets.
13. Knowledge Base.
14. AI Assistant.
