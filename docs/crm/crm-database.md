# CRM Database Requirements

## CRM Tables

Initial CRM tables:

- accounts.
- contacts.
- leads.
- opportunities.
- sales_activities.
- opportunity_stage_history.
- lost_reasons.

## Account Fields

- id.
- name.
- account_type.
- status.
- website.
- phone.
- address_line_1.
- address_line_2.
- city.
- county.
- postcode.
- country.
- industry.
- owner_id.
- notes.
- created_at.
- created_by_id.
- updated_at.
- updated_by_id.
- deleted_at.

## Contact Fields

- id.
- account_id.
- first_name.
- last_name.
- job_title.
- email.
- phone.
- mobile.
- linkedin_url.
- is_primary.
- relationship_strength.
- notes.
- status.
- created_at.
- updated_at.
- deleted_at.

## Lead Fields

- id.
- account_name.
- contact_name.
- email.
- phone.
- source.
- status.
- estimated_value.
- owner_id.
- next_action_date.
- converted_account_id.
- converted_contact_id.
- converted_opportunity_id.
- created_at.
- updated_at.

## Opportunity Fields

- id.
- account_id.
- primary_contact_id.
- owner_id.
- opportunity_name.
- opportunity_type.
- stage.
- status.
- value.
- margin_percent.
- probability_percent.
- weighted_value.
- expected_close_date.
- source.
- competitor.
- next_action_date.
- last_activity_at.
- won_date.
- lost_date.
- lost_reason.
- notes.
- created_at.
- updated_at.
- deleted_at.

Opportunity health is computed in the CRM service layer and is not stored as a database column.

Computed health inputs:

- next_action_date.
- expected_close_date.
- last_activity_at.
- recent sales activity.
- linked pre-sales request SLA/deadline state.

## Sales Activity Fields

- id.
- account_id.
- contact_id.
- lead_id.
- opportunity_id.
- owner_id.
- activity_type.
- subject.
- description.
- due_date.
- completed_at.
- outcome.
- created_at.
- updated_at.

## Indexes

Add indexes for:

- account owner.
- opportunity owner.
- opportunity stage.
- expected close date.
- next action date.
- last activity date.
- lead status.
- contact email.

## CRM Browser Testing Feedback - Sprint 2

### Sprint 2.1 CRM Refinement

Activities:

- Sales activities must support assignment to accounts.
- Sales activities must support assignment to opportunities.
- Sales activities should optionally support assignment to leads and contacts where sensible.
- Activity relationships must support showing related activities on account, opportunity and lead detail pages.
- Activity records must be addressable from detail views so users can click into the activity.

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
- The controlled value should apply primarily to contacts and account relationships.

Opportunity type:

- Add a controlled opportunity type value.
- Values:
  - WiFi.
  - Network Refresh.
  - IPTV.
  - Digital Signage.
  - Guest Room Tech.
  - ELV.
  - Structured Cabling.
  - Consultancy.
  - Support Contract.
  - Managed Service.
  - Other.

Opportunity source:

- Add a controlled opportunity source value.
- Values:
  - Referral.
  - LinkedIn.
  - Website.
  - Existing Customer.
  - Partner.
  - Manufacturer.
  - Tender Portal.
  - Cold Outreach.
  - Conference/Event.
  - Other.

Account, opportunity and lead detail data:

- Account detail queries must be able to return open linked opportunities, recent activities and key contacts.
- Opportunity detail queries must be able to return linked activities.
- Lead detail queries must be able to return linked activities.

### Sprint 3 CRM Pipeline, Forecasting and Automations

Currency handling:

- Opportunity value must support GBP, EUR and USD.
- Each opportunity should store:
  - original_currency.
  - original_value.
  - gbp_converted_value.
  - fx_rate_used.
  - fx_rate_date.
- Pipeline reporting must use GBP values.
- FX conversion must be isolated behind a service-layer integration.
- Potential FX providers to evaluate: ECB reference rates, Open Exchange Rates or exchangerate.host.

Pipeline forecasting:

- Database queries must support monthly expected close value.
- Database queries must support deals expected to close each month.
- Database queries must support unweighted and weighted pipeline.
- Database queries must support pipeline by stage and owner.
- Weighted pipeline must use stage probability.

Stages:

- Add a configurable stage/probability model later.
- Initial seeded stages should include Lead, Qualified, Pre-Sales / Solution Design, Proposal Sent, Negotiation, Proposal Verbally Accepted, Closed Won (PO Received) and Lost.

## Sales Ownership Implementation

- A salesperson is an active user whose assigned role is `Sales`.
- Leads, opportunities and sales activities use `owner_id` as the assigned salesperson field.
- `created_by_id` records who created the record where supported.
- Salesperson filtering is implemented in CRM services using `owner_id`; it is not client-side only.
- Administrator and Business Operations users can query all CRM sales-owned records or filter by salesperson.
- Sales users are scoped to their own `owner_id` for My Work, pipeline, forecast and dashboard totals.
