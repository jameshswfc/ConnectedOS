# CRM Module Overview

## Purpose

The CRM module manages sales relationships, contacts, leads, opportunities, activities, pipeline visibility, closures, alerts and forecasting.

It takes inspiration from Salesforce, Pipedrive, monday.com CRM and similar tools, but should be simplified for Connected Hospitality's operational needs.

## Core CRM Objects

- Accounts.
- Contacts.
- Leads.
- Opportunities.
- Activities.
- Pipeline stages.
- Follow-up reminders.
- Forecasts.
- Lost reasons.

## Accounts

Accounts represent organisations such as prospects, customers, partners, suppliers and former customers.

Required features:

- Create account.
- Edit account.
- View account detail.
- Link contacts.
- Link opportunities.
- Link quotes.
- Link projects.
- Link documents.
- Store account owner.
- Store account status.
- Activity timeline.

Account statuses:

- Prospect.
- Active Customer.
- Partner.
- Supplier.
- Inactive.
- Former Customer.

## Contacts

Contacts represent people linked to accounts.

Required features:

- Contact details.
- Job title.
- Email.
- Phone.
- Mobile.
- LinkedIn URL.
- Primary contact flag.
- Relationship strength score.
- Notes.
- Activity history.

## Leads

Leads represent unqualified sales interest.

Lead sources may include:

- Website.
- Referral.
- Existing customer.
- LinkedIn.
- Event.
- Partner.
- Manual entry.

Lead statuses:

- New.
- Contacted.
- Qualified.
- Disqualified.
- Converted.

Lead automation:

- If a lead is not contacted within 48 hours, notify the owner.
- If a lead is qualified, allow conversion to account/contact/opportunity.

## Opportunities

Opportunities represent active deals.

Required fields:

- Opportunity name.
- Account.
- Primary contact.
- Owner.
- Stage.
- Value.
- Probability.
- Weighted value.
- Expected close date.
- Margin percentage.
- Source.
- Competitor.
- Notes.
- Lost reason if lost.

Stages:

- Lead.
- Qualified.
- Pre-Sales / Solution Design.
- Proposal Sent.
- Negotiation.
- Proposal Verbally Accepted.
- Closed Won (PO Received).
- Lost.

## Pipeline Management

Required views:

- List view.
- Kanban board by stage.
- Forecast view.
- Closing this month.
- Stale opportunities.
- High-value opportunities.

## CRM Alerts

The system must create alerts for:

- Opportunity untouched for 14 days.
- Opportunity over a configured value threshold.
- Opportunity expected close date missed.
- Lead not contacted within 48 hours.
- No next activity scheduled.
- Opportunity stuck in the same stage for too long.

## CRM Dashboards

Required dashboard cards:

- Total pipeline value.
- Weighted pipeline value.
- Deals closing this month.
- Deals closing next month.
- Deals by stage.
- Win rate.
- Average deal size.
- Lost reasons.
- Top accounts by value.
- Opportunities requiring attention.

## CRM Integration Points

The CRM must integrate with:

- Quoting: opportunities can create quotes.
- Pre-sales: opportunities can create pre-sales requests.
- Projects: won opportunities can become projects.
- Reporting: all sales data feeds executive dashboards.
- Documents: account and opportunity files stored in SharePoint.

Sprint 5.1 quote integration:

- Quotes must be created from existing CRM opportunities.
- Quote account details come from the opportunity's linked account.
- Quote contact details come from a selected contact linked to that account.
- Quote creation logs a completed CRM note against the linked account and opportunity.
- Account and opportunity detail pages show linked quote status, approval status, latest version and value.
- Accepted linked quotes update the opportunity to Closed Won (PO Received), set the opportunity status to won and log a completed CRM activity.

Sprint 7A sales operations integration:

- Quotes have an owner and inherit ownership from the linked opportunity when created.
- CRM My Work includes My Quotes and My Pre-Sales Requests alongside leads, opportunities, activities and due follow-ups.
- Opportunity health is computed in the service layer as Green, Amber or Red based on next action, expected close date, recent activity and linked pre-sales SLA state.
- CRM dashboard, opportunity list, opportunity detail, pipeline board and forecast show opportunity health badges.
- CRM dashboard includes operational cards for open pre-sales requests, quotes awaiting approval, overdue opportunities and opportunities requiring attention.
- Notification centre uses the existing notification framework and links users directly to CRM, quote and pre-sales records where metadata is available.

## Acceptance Criteria

The CRM module is acceptable when:

- Users can create accounts, contacts, leads and opportunities.
- Opportunities can move through pipeline stages.
- Dashboard metrics are visible.
- CRM records obey role permissions.
- Important changes are audited.
- Alerts are generated for stale or high-risk records.

## CRM Browser Testing Feedback - Sprint 2

### Sprint 2.1 CRM Refinement

Activities:

- Activities must be assignable to accounts.
- Activities must be assignable to opportunities.
- Activities should optionally be assignable to leads and contacts where sensible.
- Account detail pages must show related activities.
- Opportunity and lead detail pages must show related activities.
- Activities shown from account, opportunity and lead detail pages must be clickable.

Relationship strength:

- Replace numeric or free-text relationship strength with a controlled picklist.
- Suggested values:
  - Unknown.
  - Weak.
  - Medium.
  - Strong.
  - Secured.
  - Preferred Partner.
  - Only Partner.
- Relationship strength should apply primarily to contacts and account relationships.

Opportunity type and source:

- Add controlled opportunity type values: WiFi, Network Refresh, IPTV, Digital Signage, Guest Room Tech, ELV, Structured Cabling, Consultancy, Support Contract, Managed Service and Other.
- Add controlled opportunity source values: Referral, LinkedIn, Website, Existing Customer, Partner, Manufacturer, Tender Portal, Cold Outreach, Conference/Event and Other.

Account detail:

- Account detail must show all open opportunities linked to the account.
- Each linked opportunity must be clickable.
- Account detail must show recent activities and key contacts.

Opportunity and lead detail:

- Opportunity detail must show all linked activities.
- Lead detail must show all linked activities.
- Activities must be clickable from detail views.

### Sprint 3 CRM Pipeline, Forecasting and Automations

Currency handling:

- Opportunities must support GBP, EUR and USD.
- Each opportunity must store original currency, original value, GBP converted value, FX rate used and FX rate date.
- Pipeline reporting must always show GBP.
- EUR and USD opportunities must be converted into GBP using an external FX service.
- FX integration must be designed as a service layer so the provider can be changed later.
- Possible FX providers to evaluate: ECB reference rates, Open Exchange Rates or exchangerate.host.

Pipeline forecasting:

- Pipeline view must show monthly expected close value.
- Pipeline view must show deals expected to close each month.
- Pipeline view must show unweighted pipeline.
- Pipeline view must show weighted pipeline.
- Pipeline view must show pipeline by stage.
- Pipeline view must show pipeline by owner.
- Weighted pipeline must use stage probability.

Opportunity stages and Kanban:

- Add a Kanban-style pipeline board.
- Opportunities should be shown in stage columns.
- Drag and drop should support moving opportunities between stage columns.
- Stage model should reflect B2B sales and the Connected Hospitality workflow.
- Recommended initial stages:
  - Lead.
  - Qualified.
  - Pre-Sales / Solution Design.
  - Proposal Sent.
  - Negotiation.
  - Proposal Verbally Accepted.
  - Closed Won (PO Received).
  - Lost.
- Default stage probabilities:
  - Lead: 0%.
  - Qualified: 10%.
  - Pre-Sales / Solution Design: 20%.
  - Proposal Sent: 30%.
  - Negotiation: 50%.
  - Proposal Verbally Accepted: 75%.
  - Closed Won (PO Received): 100%.
  - Lost: 0%.
- Stage probabilities must be configurable later, but can be seeded initially.

Notifications:

- Create CRM notification rules using the existing Sprint 1 notification framework.
- Opportunity has no follow-up activity scheduled within 7 days.
- Opportunity has had no activity or update for 7 days.
- Account has had no contact or activity for 30 days.
- Opportunity close date has passed and status is still open.
- High-value opportunity created or updated.
- Background or scheduled jobs can be Sprint 3 or later.

## Sales Ownership and Filtering

Current implementation:

- A salesperson is an active internal user assigned the `Sales` role.
- Lead, opportunity and activity ownership uses the shared `owner_id` field.
- Sales users creating leads, opportunities or activities are assigned as owner server-side.
- Sales users cannot assign leads, opportunities or activities to another salesperson.
- Administrator and Business Operations users can assign leads and opportunities to any active Sales user.
- `/crm/my-work` shows sales-owned leads, opportunities, activities and due or overdue follow-ups.
- CRM dashboard, pipeline, forecast, lead list and opportunity list support salesperson filtering for Administrator and Business Operations users.
- Sales users see their own sales-owned pipeline, forecast, dashboard totals and My Work records by default.
