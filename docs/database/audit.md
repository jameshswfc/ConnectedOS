# Audit Logging Requirements

## Purpose

ConnectedOS must provide an audit trail for important business actions. This is required for accountability, management control, approvals and future ISO/process evidence.

## Audit Log Fields

Each audit record should include:

- id
- timestamp
- user_id
- module
- entity_type
- entity_id
- action
- previous_value
- new_value
- ip_address where available
- user_agent where available

## Actions to Audit

Audit the following:

- Record creation.
- Record update.
- Record soft delete.
- Status change.
- Owner change.
- Assignment change.
- Approval.
- Rejection.
- Quote sent.
- Quote accepted.
- Project created.
- Expense submitted.
- Expense approved.
- Leave approved.
- Permission changed.
- Role changed.
- File uploaded.
- File deleted or unlinked.

## Audit Display

Major record detail pages should show an activity/audit history panel.

This should be human-readable, for example:

```text
James Harrison changed Opportunity Stage from Proposal to Negotiation on 7 June 2026 at 14:32.
```

## Technical Guidance

Use a shared audit service.

Do not implement separate audit logic independently inside each module.

Audit should be created inside service-layer operations, not only UI actions.
