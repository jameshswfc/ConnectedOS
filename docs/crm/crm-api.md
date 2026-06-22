# CRM API Requirements

## Accounts

Required endpoints:

- GET /api/v1/accounts
- POST /api/v1/accounts
- GET /api/v1/accounts/:id
- PATCH /api/v1/accounts/:id
- DELETE /api/v1/accounts/:id

## Contacts

Required endpoints:

- GET /api/v1/contacts
- POST /api/v1/contacts
- GET /api/v1/contacts/:id
- PATCH /api/v1/contacts/:id
- DELETE /api/v1/contacts/:id

## Leads

Required endpoints:

- GET /api/v1/leads
- POST /api/v1/leads
- PATCH /api/v1/leads/:id
- POST /api/v1/leads/:id/convert

## Opportunities

Required endpoints:

- GET /api/v1/opportunities
- POST /api/v1/opportunities
- GET /api/v1/opportunities/:id
- PATCH /api/v1/opportunities/:id
- POST /api/v1/opportunities/:id/change-stage
- POST /api/v1/opportunities/:id/mark-won
- POST /api/v1/opportunities/:id/mark-lost

## Activities

Required endpoints:

- GET /api/v1/activities
- POST /api/v1/activities
- PATCH /api/v1/activities/:id
- POST /api/v1/activities/:id/complete

## Dashboard

Required endpoint:

- GET /api/v1/crm/dashboard

Should return:

- total_pipeline_value.
- weighted_pipeline_value.
- closing_this_month.
- opportunities_by_stage.
- stale_opportunities.
- high_value_opportunities.
