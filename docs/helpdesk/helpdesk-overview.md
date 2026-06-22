# Helpdesk Module

## Purpose

The helpdesk module manages customer incidents, service requests, operational tickets and internal support follow-up after project delivery.

## Core Features

- Central ticket register.
- Queue and assignment workflow.
- Priority and SLA tracking.
- Internal and customer-visible comments.
- Links to accounts, contacts, projects and assets.
- Knowledge article storage for internal support reuse.

## Current Implementation Status

ConnectedOS currently delivers:

- `HelpdeskTicket`, `HelpdeskTicketComment`, `HelpdeskQueue`, `HelpdeskSlaPolicy` and `KnowledgeArticle`.
- Ticket numbering using `HD-YYYY-0001`.
- `/helpdesk`, `/helpdesk/tickets`, `/helpdesk/tickets/new`, `/helpdesk/tickets/:id`, `/helpdesk/queues`, `/helpdesk/knowledge-base` and `/helpdesk/knowledge-base/:id`.
- Basic SLA due-date calculation by priority.
- Notifications for urgent tickets and new assignment.
- Resolve, close and reopen actions with friendly validation and non-blocking email side effects.
- Resolve now requires a resolution note, which is captured in the ticket activity trail as an internal comment.
- Internal knowledge article create/list/detail support for production testing.
- The new-ticket workflow now scopes contact, project and asset selectors to the selected account and clears mismatched selections when the account changes.
- Server-side validation rejects mismatched account-linked contact, project or asset combinations so restricted relationships cannot be bypassed through the API.
- The main ticket list now defaults to active operational tickets only, with explicit `Active`, `Resolved`, `Closed` and `All` views for historical review.
- The `Create Field Booking` action now opens a booking form that resolves the linked ticket server-side, pre-fills account/project context and writes the booking back to the ticket relationship on save.

## SLA Defaults

- Critical: response 1 hour, resolution 4 hours.
- Urgent: response 2 hours, resolution 8 hours.
- High: response 4 hours, resolution 2 business days.
- Normal: response 1 business day, resolution 5 business days.
- Low: response 2 business days, resolution 10 business days.
