# Database Relationships

## Core Relationship Principles

- Accounts are the parent record for most customer-facing activity.
- Contacts belong to accounts.
- Opportunities belong to accounts and may link to contacts.
- Quotes usually belong to opportunities and accounts.
- Projects can be created from accepted quotes.
- Pre-sales requests may link to opportunities and accounts.
- Documents can link to many different module records.
- Comments can link to many different module records.
- Audit logs reference the affected module and record.

## Key Relationships

### Account Relationships

An account may have:

- Many contacts.
- Many leads.
- Many opportunities.
- Many quotes.
- Many pre-sales requests.
- Many projects.
- Many documents.
- Many expense claims.
- Many assets.

### Contact Relationships

A contact belongs to one account.

A contact may be linked to:

- Opportunities.
- Activities.
- Projects as customer stakeholder.
- Portal user in future.

### Opportunity Relationships

An opportunity belongs to one account.

An opportunity may have:

- One primary contact.
- Many activities.
- Many quotes.
- Many pre-sales requests.
- One resulting project if won.

### Quote Relationships

A quote belongs to one account and may belong to one opportunity.

A quote has one owner.

A quote has many quote lines.

An accepted quote may create one project.

### Pre-Sales Relationships

A pre-sales request belongs to one account and may belong to one opportunity and many quote-linked contexts over time.

A pre-sales request has many tasks and many expected deliverables.

A pre-sales deliverable may link to one document when the engineering output has been uploaded.

### Project Relationships

A project belongs to one account.

A project may be linked to:

- Opportunity.
- Quote.
- Project manager.
- Milestones.
- Tasks.
- Risks.
- Issues.
- Change requests.
- Resource bookings.
- Expense claims.
- Assets.
- Documents.

### Resource Booking Relationships

A resource booking belongs to one user.

A booking may be linked to:

- Project.
- Project task.
- Pre-sales request.
- Leave request.
- Internal activity.

### Expense Relationships

An expense claim belongs to one claimant.

It may be linked to:

- Project.
- Account.
- Cost code in future.

An expense claim has many expense lines.

Expense lines may have receipt documents.

## Polymorphic Link Pattern

For reusable documents, comments, activities and audit logs, use a safe polymorphic pattern or explicit join tables.

Required fields may include:

- entity_type
- entity_id

Allowed entity types must be controlled by application logic.

## Indexing Guidance

Add indexes for:

- account_id.
- owner_id.
- project_id.
- opportunity_id.
- status.
- due dates.
- expected close dates.
- created_at.
- deleted_at.

High-use dashboards may need compound indexes later.
