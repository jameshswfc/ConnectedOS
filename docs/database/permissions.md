# Permissions Matrix

## Purpose

This document defines the starting permission model. Codex should implement this in a flexible way so roles and permissions can be extended later.

## Roles

### Sales

Commercial users working CRM, opportunities, activities and quotes.

### Administrator

System administrators with full platform access and user administration rights.

### Pre-Sales

Technical pre-sales users working assigned pre-sales requests and tasks.

### Project Engineer

Delivery users for future project work.

### Project Manager

Delivery managers working future project management and field services modules.

### Field Engineer

Field delivery users for future project and site work.

### Business Operations

Operational users with wide commercial and delivery visibility, excluding user administration.

### Finance

Operational finance users with invoice, billing, expense-payment and procurement finance visibility, excluding user administration.

Internal/system roles may remain in the database where required for historical compatibility and notification routing, but administrator-facing user management presents the simplified business roles above.

## Permission Levels

### Administrator

Can see all records, use all implemented features, manage users, assign roles, reset passwords and deactivate users.

### User

Access is driven by the assigned business role. User-level accounts cannot manage users, reset passwords or delete records unless explicitly granted in a later sprint.

## Initial Permission Examples

CRM:

- crm.account.read_all
- crm.account.read_own
- crm.account.create
- crm.account.update
- crm.account.delete
- crm.contact.read_all
- crm.contact.read_own
- crm.opportunity.read_all
- crm.opportunity.read_own
- crm.opportunity.create
- crm.opportunity.update
- crm.opportunity.delete

Quotes:

- quotes.read_all
- quotes.read_own
- quotes.create
- quotes.update
- quotes.delete
- quotes.approve
- quotes.approve_own
- quotes.export

Pre-Sales:

- presales.read_all
- presales.read_assigned
- presales.create
- presales.assign
- presales.update
- presales.complete

Projects:

- projects.read_all
- projects.read_assigned
- projects.create
- projects.update
- projects.delete
- projects.budget_view
- projects.budget_update

Scheduling:

- schedule.read_all
- schedule.read_own
- schedule.create_booking
- schedule.override_conflict

Leave:

- leave.request
- leave.approve
- leave.view_team

Expenses:

- expenses.create
- expenses.submit
- expenses.approve
- expenses.view_all
- expenses.export
- expenses.pay

Field Services:

- field_services.access
- field_services.read_all
- field_services.read_own
- field_services.manage_resources
- field_services.manage_bookings
- field_services.override_conflict

Procurement:

- procurement.read_all
- procurement.create
- procurement.approve
- procurement.receive
- procurement.finance

Finance:

- finance.read_all
- finance.create_invoice
- finance.manage_billing
- finance.record_payment

Assets:

- assets.read_all
- assets.read_assigned
- assets.create
- assets.update

Helpdesk:

- helpdesk.read_all
- helpdesk.read_assigned
- helpdesk.create
- helpdesk.update
- helpdesk.manage_knowledge

Reporting:

- reports.sales
- reports.projects
- reports.finance
- reports.executive
- reports.resources
- reports.procurement
- reports.helpdesk

Admin:

- admin.users
- admin.roles
- admin.settings
- admin.integrations
- audit.read

## Implementation Guidance

Do not hardcode permissions only in the UI.

Permissions must be enforced server-side.

UI should hide actions the user cannot perform, but API must also reject unauthorised actions.

Sidebar navigation is filtered from the signed-in user's permissions:

- Admin links require admin permissions such as `admin.users` or `admin.roles`.
- CRM, Quotes and Pre-Sales links require the relevant module permissions.
- Settings remains visible to all authenticated users so profile and password management are always reachable.
- Future Reports navigation should use `reports.*` permissions when added.
- Global search results must be filtered using the same server-side permission rules as direct record access.
- Audit viewer navigation should only appear for users allowed to view operational audit history.

The admin UI presents only these approved assignable roles:

- Administrator
- Sales
- Pre-Sales
- Project Engineer
- Project Manager
- Field Engineer
- Business Operations
- Finance

Role navigation matrix:

| Role | Visible modules |
| --- | --- |
| Administrator | Everything, including Users, Roles, Permissions, Settings and future modules |
| Sales | Accounts, Contacts, Leads, Opportunities, My Work, CRM Pipeline, CRM Forecast, Activities, Pre-Sales, Quotes |
| Pre-Sales | Accounts, Contacts, Leads, Opportunities, Activities, Pre-Sales, Quotes |
| Project Engineer | Projects, Pre-Sales, Field Services, Project Management |
| Project Manager | Projects, Field Services, Project Management |
| Field Engineer | Field Services |
| Business Operations | Accounts, Contacts, Leads, Opportunities, My Work, CRM Pipeline, CRM Forecast, Activities, Pre-Sales, Projects, Field Services, Project Management, Products, Price Imports, Quotes, Procurement, Finance, Reports, Assets, Helpdesk |
| Finance | Finance, Expenses, Procurement, Reports |

Operational audit visibility:

- Administrator can view all audit events.
- Business Operations can view operational audit events through `/admin/audit`.
- Other users only get record-level audit visibility where they can already view the underlying record.

Helpdesk action visibility:

- Read-only users may view ticket detail where permitted.
- Only users with helpdesk update permissions may see assignment, status-change, attachment-management and linked-action controls.

Sales ownership rules:

- A salesperson selector includes active Sales, Administrator and Business Operations users according to the current sales-owner helper. Selection does not grant editing or user-admin permissions.
- Seeded Sales users have own-record permissions for leads, opportunities and activities.
- Sales users can create leads, opportunities and activities assigned to themselves.
- Sales users cannot assign sales-owned records to another salesperson.
- Administrator and Business Operations users can assign eligible active sales owners and can filter CRM dashboard, pipeline, forecast and My Work by salesperson.
- Business Operations keeps wide operational visibility but does not receive user administration permissions.
- Quotes inherit owner from the linked opportunity when created.
- Sales users are scoped to their own quotes server-side.
- Administrator and Business Operations users can filter quotes by eligible active sales owner.
- CRM My Work includes the selected salesperson's quotes and linked pre-sales requests where permitted.
- Notifications are visible through the top-right bell and `/notifications`; notification actions remain user-scoped.

## Microsoft 365 Onboarding and Navigation

New tenant members receive the `Staff` role and `user` permission level, with no operational permissions. Staff can access their profile, own notifications and restricted welcome dashboard. Administrators assign the existing approved business roles in Users. This retains the single-role model and adds no automatic domain-based or email-based elevation. Existing local accounts require explicit administrator identity linking; the API requires `admin.users` and audits the link.

The sidebar groups only links already permitted by the existing navigation rules: My Work, Sales, Pre-Sales, Projects, Scheduling, Business Tools and Administration. Empty groups are hidden; active groups expand. Grouping does not broaden server-side access. Inactive/deleted users lose permissions on session refresh and permission-service checks.

Page-level access denial should render the shared friendly AccessDenied experience or `/403`. API-level denial remains JSON `401` or `403`.

Admin-created users and admin password resets set the local user `mustChangePassword` flag. Users with that flag are redirected to `/settings/change-password` until they successfully change their password, which clears the flag.
# Combined Business Roles and Archived Users

Users retain one primary role and can have additional approved business roles through `UserRole`. Effective access is the union of these roles, still subject to existing ownership, assignment and approval checks. Navigation and salesperson/engineer/PM selectors recognise additional roles. Staff is an unassigned-access role and cannot be combined with business roles. Administrator cannot be assigned as an additional role. Combining ordinary business roles never grants `admin.*` permissions; permission level remains a separate, administrator-controlled setting.

Administrators can archive an already inactive user. This sets the existing soft-delete fields, removes the account from the Users list, preserves all linked history and retains its Microsoft tenant/object identity. Archived accounts cannot sign in or be recreated by directory import. Archiving oneself or an active account is rejected. Role changes and archival are audited transactionally.

Verification: `npm run test:user-roles` exercises persistence, union permissions, selectors, administrator isolation and archival in a temporary local database schema, removed afterwards. It refuses remote databases.
# Connected Workflow and Invoice Permissions

- Work Queue uses existing per-module read and record visibility rules, with assigned-to-me as default. It grants no edit rights.
- Customer-linked quotes, pre-sales and projects are independently scoped; customer access is not a cross-module bypass.
- Project invoice requests: administrator, Business Operations with `projects.update`, or the assigned Project Manager with `projects.update`.
- Invoice request reading: finance-wide readers/administrators, or users allowed to view the linked project.
- Invoice approval/rejection: exact `PROJECT_INVOICE_APPROVER_USER_ID` plus Administrator permission level; the recorded request approver must match.
- Sage snapshot reading: Administrator or `finance.read_all`. Connection management: Administrator or `admin.integrations`.
- No business-role or combined-role model change is introduced by this delivery.
