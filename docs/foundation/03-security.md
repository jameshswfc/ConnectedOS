# Security Requirements

## Authentication

ConnectedOS currently uses local email/password authentication.

Microsoft Entra ID authentication is parked and remains deferred until re-enabled explicitly.

Local passwords must never be stored in plain text. Only password hashes may be stored.

Password rules:

- Minimum 10 characters.
- At least one letter.
- At least one number.

Admin-issued passwords are temporary. Users created by an administrator, or users whose password is reset by an administrator, must change that password on next login before accessing normal application pages.

## Session Management

Default session timeout:

```text
8 hours
```

Session timeout should be configurable later by administrators.

Users flagged with `mustChangePassword` are redirected to `/settings/change-password`. They may change password or sign out, but normal protected pages redirect until the password change completes.

## Role-Based Access Control

The system must implement role-based access control from Sprint 1.

Visible business roles:

- Administrator.
- Sales.
- Pre-Sales.
- Project Engineer.
- Project Manager.
- Field Engineer.
- Finance.
- Business Operations.

Permission levels:

- Administrator: full access, user management and password reset rights.
- User: access is driven by the assigned business role and remains limited by server-side permissions.

## Permission Model

Permissions should be action-based, for example:

- crm.account.read
- crm.account.create
- crm.account.update
- crm.account.delete
- crm.opportunity.read_all
- crm.opportunity.read_own
- quotes.approve
- expenses.approve
- projects.manage_all
- projects.manage_assigned

Roles should map to permissions.

Navigation visibility is permission-based for usability, but it is not the security boundary. Pages and API routes must continue to enforce permissions server-side.

Friendly access denied handling should show `/403` or the shared AccessDenied card for page views. API routes must keep returning structured JSON `401` or `403` errors.

Approved role navigation:

- Administrator: everything, including Users, Roles, Permissions, Settings and future modules.
- Sales: Accounts, Contacts, Leads, Opportunities, CRM Pipeline, CRM Forecast, Activities, Pre-Sales and Quotes.
- Pre-Sales: Accounts, Contacts, Leads, Opportunities, Activities, Pre-Sales and Quotes.
- Project Engineer: Projects, Pre-Sales, Field Services and Project Management.
- Project Manager: Projects, Field Services and Project Management.
- Field Engineer: Field Services.
- Business Operations: Accounts, Contacts, Leads, Opportunities, CRM Pipeline, CRM Forecast, Activities, Pre-Sales, Projects, Field Services, Project Management, Products, Price Imports and Quotes.
- Finance: Finance, Expenses, Procurement and finance/reporting views.

## Email Delivery

Application email must go through the shared email service abstraction rather than ad hoc module-specific sends.

Requirements:

- provider abstraction
- safe development console provider
- environment-driven SMTP configuration
- failure logging without surfacing raw provider errors to end users
- no workflow should crash because an email send fails

Common workflow emails currently include leave, expenses, helpdesk, quoting, projects and procurement notifications.

## Data Visibility

Sales users should generally see their own records unless granted team or manager visibility.

Directors should see all operational data.

Customer users must only see records explicitly shared with them.

## Encryption

Data in transit must use TLS.

Database and storage encryption should use cloud provider defaults and must be suitable for business confidential data.

## Audit Logging

Security-sensitive actions must be logged:

- Login.
- Failed login where available.
- Role changes.
- Permission changes.
- Record deletion.
- Approval and rejection.
- Export of sensitive records.
- Customer portal access changes.

## File Access

Files should be stored in SharePoint. Database records should store file metadata and references, not raw binary file data unless there is a specific reason.

File access must be permission checked through the application before the user is given access to the file link.

Global search must also obey record-level permission checks. Search result titles, references and links must not reveal restricted records to unauthorised users.

Audit history must be exposed through permission-aware viewers only. Operational audit viewers can show summary before/after values, but user/security-sensitive events should remain restricted to authorised operational roles.

## Customer Portal Security

Customer users must be isolated from internal data.

Customer users must not be able to access:

- Internal comments.
- Internal financials.
- Internal resource allocations.
- Other customers' projects.
- Internal sales pipeline.

## Future AI Security

Future AI assistants must obey the same permission model as normal users.

AI must not be allowed to access records a user could not access manually.
