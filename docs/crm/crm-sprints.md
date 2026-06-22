# CRM Sprint Breakdown

Current checkpoint: see `docs/crm/crm-checkpoint-sprint-1-3.md` for the Sprint 1-3 CRM baseline, local commands, validation commands, stage model, permissions, deferred work and risks.

## Sprint 2 - CRM Core

Deliver:

- Account CRUD.
- Contact CRUD.
- Lead CRUD.
- Opportunity CRUD.
- Basic activity logging.
- CRM navigation.
- CRM list and detail views.

Acceptance:

- Sales users can manage their own accounts and opportunities.
- Sales managers can view all CRM records.
- Audit logging works for create/update/delete.

## Sprint 3 - CRM Pipeline, Automation and Reporting

Deliver:

- Opportunity board.
- Stage movement.
- Lead conversion.
- Stale opportunity detection.
- High-value opportunity alerts.
- CRM dashboard.
- Lost reason reporting.

Acceptance:

- Pipeline is visible by stage.
- Alerts are generated correctly.
- Dashboard totals reconcile to opportunity data.

## CRM Browser Testing Feedback - Sprint 2

### Sprint 2.1 CRM Refinement

Deliver:

- Activities assignable to accounts.
- Activities assignable to opportunities.
- Activities optionally assignable to leads and contacts where sensible.
- Account detail showing open opportunities, recent activities and key contacts.
- Opportunity detail showing linked clickable activities.
- Lead detail showing linked clickable activities.
- Relationship strength changed from numeric/free-text to controlled picklist.
- Relationship strength values: Unknown, Weak, Medium, Strong, Secured, Preferred Partner, Only Partner.
- Opportunity type changed to a controlled picklist.
- Opportunity source changed to a controlled picklist.

Acceptance:

- Account detail shows all open linked opportunities and each opportunity is clickable.
- Account detail shows related activities and key contacts.
- Opportunity detail shows linked activities and each activity is clickable.
- Lead detail shows linked activities and each activity is clickable.
- Relationship strength can only use the approved picklist values.
- Opportunity type and opportunity source can only use approved picklist values.

### Sprint 3 CRM Pipeline, Forecasting and Automations

Deliver:

- GBP, EUR and USD opportunity currency support.
- Opportunity original currency, original value, GBP converted value, FX rate used and FX rate date.
- FX conversion service layer with provider-swappable design.
- Pipeline forecasting by month, stage and owner.
- Unweighted and weighted pipeline reporting.
- Kanban-style pipeline board with visible stage columns.
- Seeded stage probabilities.
- CRM notification rules using the Sprint 1 notification framework.

Backlog details:

- Possible FX providers to evaluate: ECB reference rates, Open Exchange Rates or exchangerate.host.
- Recommended stages: Lead, Qualified, Pre-Sales / Solution Design, Proposal Sent, Negotiation, Proposal Verbally Accepted, Closed Won (PO Received) and Lost.
- Default probabilities: 0%, 10%, 20%, 30%, 50%, 75%, 100% and 0% respectively.
- Notification rules: no follow-up within 7 days, no activity/update for 7 days, account no contact/activity for 30 days, close date passed while open, high-value opportunity created or updated.

Sprint 3 implementation:

- Added `/crm/pipeline` Kanban-style stage columns.
- Added `/crm/forecast` expected-close-month forecast.
- Applied default stage probabilities and stage-driven weighted value recalculation.
- Added activity completion with outcome notes.
- Added dynamic due and overdue activity alerts on the CRM Dashboard.
- Deferred FX conversion, full pipeline by owner reporting and scheduled CRM notification jobs.

### Sprint 3.1 CRM Stage Editing and Kanban Drag-and-Drop

Delivered:

- Opportunity edit route at `/crm/opportunities/:id/edit`.
- Edit actions from opportunity detail and opportunity list.
- Stage change API at `POST /api/v1/opportunities/:id/change-stage`.
- Kanban drag-and-drop stage movement on `/crm/pipeline`.
- Stage changes recalculate probability and weighted value, write stage history and audit the change.
- Kanban board renders after client mount to avoid dnd-kit hydration mismatches.
- Simplified opportunity stages to the eight-stage model: Lead, Qualified, Pre-Sales / Solution Design, Proposal Sent, Negotiation, Proposal Verbally Accepted, Closed Won (PO Received) and Lost.

Still deferred:

- FX conversion.
- Full CRM automation jobs.
- Drag/drop enhancements beyond simple reliable stage movement.

### Sales Ownership and Salesperson Filtering Sprint

Delivered:

- Defined salesperson as an active user with the `Sales` role.
- Added server-side owner assignment enforcement for leads, opportunities and sales activities.
- Sales users default to themselves as owner and cannot assign another salesperson.
- Administrator and Business Operations users can assign active Sales users.
- Added `/crm/my-work` with My Leads, My Opportunities, My Activities and due or overdue follow-ups.
- Added salesperson filtering to CRM dashboard, pipeline, forecast, lead list and opportunity list.
- Added My Work navigation for Sales, Administrator and Business Operations users.
- Updated Sales role seed permissions so seeded Sales users use own-record lead, opportunity and activity visibility.

Deferred:

- Team hierarchy or sales manager territory filtering.
- Pipeline reporting by sales team.
- Bulk ownership reassignment.
