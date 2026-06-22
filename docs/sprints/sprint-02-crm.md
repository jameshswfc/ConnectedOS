# Sprint 2 - CRM Core

## Goal

Build the core CRM entities and screens.

## Scope

- Accounts.
- Contacts.
- Leads.
- Opportunities.
- Sales activities.
- CRM dashboard starter.

## Acceptance Criteria

- Sales users can create and update their own records.
- Sales managers can view all CRM records.
- Directors can view all CRM records.
- Audit logs work.
- CRM records can be searched and filtered.

## CRM Browser Testing Feedback - Sprint 2

### Sprint 2.1 CRM Refinement

The following feedback should be captured for a CRM refinement sprint and not treated as Sprint 2 baseline rework unless explicitly prioritised:

- Activities must be assignable to accounts.
- Activities must be assignable to opportunities.
- Activities should optionally be assignable to leads and contacts where sensible.
- Account detail pages must show related activities.
- Opportunity and lead detail pages must show related activities and allow clicking into each activity.
- Relationship strength must move from numeric/free-text to a controlled picklist.
- Relationship strength values should be Unknown, Weak, Medium, Strong, Secured, Preferred Partner and Only Partner.
- Opportunity type must use controlled values: WiFi, Network Refresh, IPTV, Digital Signage, Guest Room Tech, ELV, Structured Cabling, Consultancy, Support Contract, Managed Service and Other.
- Opportunity source must use controlled values: Referral, LinkedIn, Website, Existing Customer, Partner, Manufacturer, Tender Portal, Cold Outreach, Conference/Event and Other.
- Account detail must show all open linked opportunities, recent activities and key contacts.
- Linked opportunities on account detail must be clickable.
- Linked activities on opportunity and lead detail must be clickable.

### Sprint 3 CRM Pipeline, Forecasting and Automations

The following feedback belongs to Sprint 3 or later:

- Opportunity value must support GBP, EUR and USD.
- Each opportunity should store original currency, original value, GBP converted value, FX rate used and FX rate date.
- Pipeline reporting must always show GBP.
- EUR and USD opportunities must be converted into GBP through an external FX service.
- FX integration should be a provider-swappable service layer.
- Possible providers: ECB reference rates, Open Exchange Rates or exchangerate.host.
- Pipeline view must show monthly expected close value, deals expected to close each month, unweighted pipeline, weighted pipeline, pipeline by stage and pipeline by owner.
- Weighted pipeline must use stage probability.
- Add Kanban-style pipeline board with opportunities in stage columns.
- Drag and drop is implemented for stage movement.
- Recommended stage model: Lead, Qualified, Pre-Sales / Solution Design, Proposal Sent, Negotiation, Proposal Verbally Accepted, Closed Won (PO Received) and Lost.
- Seed default stage probabilities: 0%, 10%, 20%, 30%, 50%, 75%, 100% and 0%.
- Stage probabilities must be configurable later.
- Create CRM notification rules using the Sprint 1 notification framework.
- Notification rules should cover no follow-up activity within 7 days, no activity/update for 7 days, account no contact/activity for 30 days, close date passed while open and high-value opportunity created or updated.
- Background/scheduled jobs can be Sprint 3 or later.

Sprint 3 implementation note:

- Implemented Kanban-style pipeline columns, expected-close-month forecasting, stage-driven weighted values, activity completion outcome capture and dynamic due/overdue activity alerts.
- Deferred FX conversion, full pipeline by owner reporting and scheduled CRM notification jobs.
