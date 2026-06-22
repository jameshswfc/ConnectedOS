# Reporting and Dashboards Module

## Purpose

The reporting module provides management visibility across sales, pre-sales, projects, resources, finances, expenses and executive performance.

## Dashboard Types

### Executive Dashboard

Shows:

- Total pipeline value.
- Weighted pipeline.
- Forecast revenue.
- Active project value.
- Project margin.
- Overdue tasks.
- At-risk projects.
- Resource utilisation.
- Expenses awaiting approval.

### Sales Dashboard

Shows:

- Pipeline by stage.
- Deals closing this month.
- Win rate.
- Lost reasons.
- Activity completion.
- Stale opportunities.

### Project Dashboard

Shows:

- Active projects.
- Project health.
- Overdue milestones.
- Budget variance.
- Risks and issues.
- Change requests.

### Resource Dashboard

Shows:

- Utilisation by user.
- Booked days.
- Available days.
- Overbooked users.
- Leave impact.

### Finance Dashboard

Shows:

- Quote margin.
- Project budget vs actual.
- Expense claims.
- Approved but unpaid expenses.
- High-value quotes awaiting approval.

## Reporting Requirements

Reports must support:

- Date filters.
- User filters.
- Customer filters.
- Status filters.
- Export to CSV/XLSX where useful.

## Acceptance Criteria

The module is acceptable when management can quickly see what needs attention across sales, delivery, resource and finance areas.

## Implementation Status

Current ConnectedOS delivery includes:

- `/reports` with linked Sales, Projects, Resources, Finance, Procurement and Helpdesk report routes.
- Executive aggregation over sales pipeline, pre-sales workload, project dashboard, resource schedule, finance dashboard, procurement and helpdesk.
- Permission-aware module report APIs under `/api/v1/reports/:module`.
- Finance, procurement and helpdesk operational summary cards for production testing.
