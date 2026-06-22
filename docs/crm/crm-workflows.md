# CRM Workflows

## Lead to Opportunity Workflow

1. User creates lead.
2. User contacts lead.
3. Lead is qualified.
4. System allows conversion to account, contact and opportunity.
5. Original lead is marked converted.
6. Audit log records conversion.

## Opportunity Stage Workflow

Stages:

1. Lead.
2. Qualified.
3. Pre-Sales / Solution Design.
4. Proposal Sent.
5. Negotiation.
6. Proposal Verbally Accepted.
7. Closed Won (PO Received).
8. Lost.

When stage changes:

- Record stage history.
- Recalculate stage probability and weighted value from the controlled stage model.
- Trigger relevant alerts.
- Update dashboard metrics.

## Opportunity Won Workflow

When opportunity is marked won:

- Require final value.
- Require won date.
- Allow conversion to project.
- Link accepted quote where available.
- Notify Director and relevant project manager if assigned.

Sprint 5.1 accepted quote workflow:

- When a linked quote is marked Accepted, the quote module updates the CRM opportunity to Closed Won (PO Received).
- Opportunity status is set to won.
- Opportunity value and weighted value are updated to the accepted quote sell total.
- A completed activity is logged against the opportunity and account.
- Project creation remains deferred.

## Opportunity Lost Workflow

When opportunity is marked lost:

- Require lost reason.
- Allow competitor entry.
- Capture notes.
- Remove from active forecast.
- Include in lost reason reporting.

## Stale Opportunity Workflow

Daily background job checks:

- Active opportunities with no activity for 14 days.
- Opportunities with expected close date in the past.
- Opportunities with no next action.

Actions:

- Create notification for owner.
- Escalate to Sales Manager if overdue beyond configured threshold.

## High Value Opportunity Workflow

If opportunity value exceeds configured threshold, notify Director.

Default threshold:

```text
£50,000
```

## CRM Browser Testing Feedback - Sprint 2

### Sprint 2.1 CRM Refinement

Activity linking workflow:

- Users must be able to create activities linked to accounts.
- Users must be able to create activities linked to opportunities.
- Users should optionally be able to link activities to leads and contacts where sensible.
- Account detail must show related activities.
- Opportunity and lead detail must show related activities and allow users to click into each activity.

Relationship strength workflow:

- Users should select relationship strength from a controlled picklist rather than entering numeric or free-text values.
- Suggested values are Unknown, Weak, Medium, Strong, Secured, Preferred Partner and Only Partner.
- Relationship strength should primarily describe contacts and account relationships.

Detail view workflow:

- When a user opens an account, the system must show open opportunities linked to that account.
- Account-linked opportunities must be clickable.
- Account detail must also show recent activities and key contacts.
- When a user opens an opportunity or lead, the system must show linked activities.
- Activity entries must be clickable from opportunity and lead detail.

### Sprint 3 CRM Pipeline, Forecasting and Automations

FX conversion workflow:

- Users may enter opportunity value in GBP, EUR or USD.
- The system stores original currency and original value.
- EUR and USD values are converted to GBP through an external FX service.
- The system stores GBP converted value, FX rate used and FX rate date.
- Pipeline reporting always uses GBP.
- FX provider must be isolated behind a service layer so the provider can change later.
- Possible providers to evaluate: ECB reference rates, Open Exchange Rates or exchangerate.host.

Pipeline forecasting workflow:

- Pipeline forecasting must show monthly expected close value.
- Pipeline forecasting must show deals expected to close each month.
- Pipeline forecasting must show unweighted and weighted pipeline.
- Pipeline forecasting must show pipeline by stage.
- Pipeline forecasting must show pipeline by owner.
- Weighted pipeline must use stage probability.

Stage and Kanban workflow:

- Add a Kanban-style pipeline board with opportunities grouped into stage columns.
- Drag and drop should support moving opportunities between stage columns.
- Recommended initial stages and probabilities:
  - Lead: 0%.
  - Qualified: 10%.
  - Pre-Sales / Solution Design: 20%.
  - Proposal Sent: 30%.
  - Negotiation: 50%.
  - Proposal Verbally Accepted: 75%.
  - Closed Won (PO Received): 100%.
  - Lost: 0%.
- Stage probabilities must be configurable later, but can be seeded initially.

Notification workflow:

- CRM notifications should use the existing Sprint 1 notification framework.
- Notify when an opportunity has no follow-up activity scheduled within 7 days.
- Notify when an opportunity has had no activity or update for 7 days.
- Notify when an account has had no contact or activity for 30 days.
- Notify when an opportunity close date has passed and the status is still open.
- Notify when a high-value opportunity is created or updated.
- Background or scheduled jobs can be implemented in Sprint 3 or later.

Sprint 3 implementation note:

- Due and overdue activity alerts are generated dynamically for CRM Dashboard visibility.
- Full scheduled notification rules remain deferred.

Sprint 3.1 stage editing workflow:

- Users can edit an opportunity and change stage from the opportunity edit page.
- Users can drag an opportunity card between Kanban stage columns.
- Stage changes recalculate probability and weighted value from the stage defaults.
- Stage changes create opportunity stage history where the stage actually changes.
- Stage changes are audited through the existing audit service.
- The Kanban board renders after client mount to avoid dnd-kit hydration mismatches.

## Sales Ownership Workflow

- Sales users creating leads or opportunities are assigned as owner automatically.
- Administrator and Business Operations users select an active Sales user when creating or editing sales-owned records.
- Sales users cannot assign their leads, opportunities or activities to another salesperson.
- My Work shows the selected salesperson's leads, opportunities, open activities and due or overdue follow-ups.
- Pipeline and forecast views accept `salespersonId` as a query filter for Administrator and Business Operations users.
- Sales users requesting another salesperson's pipeline or forecast are scoped back to their own records server-side.

## Sprint 7A Opportunity Health Workflow

- Opportunity health is computed only; no database column is stored.
- Green means the opportunity has a next action, the expected close date is not overdue and activity occurred within the last 7 days.
- Amber means the opportunity needs attention because activity is 7 to 14 days old, the next action is due within 48 hours or a linked pre-sales request is due soon.
- Red means the opportunity is overdue or neglected because activity is older than 14 days, the next action is overdue, the expected close date is overdue or a linked pre-sales request is overdue.
- Dashboard, pipeline, forecast and opportunity list filters can show Green, Amber and Red opportunities.

## Sprint 7A Quote Ownership Workflow

- New quotes inherit `ownerId` from the linked opportunity.
- If no linked opportunity is available in a future path, quote ownership falls back to the current user.
- Existing quote ownership does not change when opportunity ownership changes.
- Sales users see their own quotes server-side; Administrator and Business Operations users can filter quotes by active Sales user.
