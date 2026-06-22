# Project Management Module

## Sprint 8 Status

Sprint 8 adds the first usable Projects module. Projects now start from approved, sent or accepted quotes and connect delivery back to CRM, quoting and pre-sales records.

Sprint 8.1 keeps a single visible project area called Projects. The old `/project-management` placeholder redirects to `/projects`.

Detailed Sprint 8 documentation:

- `docs/projects/projects-overview.md`
- `docs/projects/project-workflows.md`
- `docs/projects/project-forms.md`
- `docs/projects/project-permissions.md`

## Purpose

The project management module tracks project delivery from accepted quote through completion, including tasks, milestones, budgets, risks, issues, dependencies, resources and reporting.

It takes inspiration from Microsoft Project and Asana, but must be tailored to Connected Hospitality delivery workflows.

## Core Objects

- Project.
- Milestone.
- Task.
- Subtask.
- Dependency.
- Risk.
- Issue.
- Change request.
- Budget line.
- Resource booking.
- Project document.

## Project Fields

- Project number.
- Project name.
- Customer/account.
- Linked opportunity.
- Linked quote.
- Project manager.
- Status.
- Start date.
- Target end date.
- Actual end date.
- Contract value.
- Budget cost.
- Forecast cost.
- Actual cost.
- Health status.

## Project Statuses

- Pending Kick-Off.
- Active.
- On Hold.
- At Risk.
- Complete.
- Closed.
- Cancelled.

## Project Views

Required views:

- List view.
- Board view.
- Calendar view.
- Gantt chart.
- Budget view.
- Resource view.
- Risk and issue log.

## Task Requirements

Tasks must include:

- Title.
- Description.
- Owner.
- Start date.
- Due date.
- Priority.
- Status.
- Estimated hours.
- Actual hours.
- Dependencies.
- Related milestone.

Task statuses:

- Not Started.
- In Progress.
- Blocked.
- Waiting Customer.
- Complete.

## Gantt Chart

Gantt chart must show:

- Milestones.
- Tasks.
- Start and end dates.
- Dependencies.
- Progress.
- Assigned resources.

## Budget Tracking

Track:

- Contract value.
- Budgeted cost.
- Forecast cost.
- Actual cost.
- Gross margin.
- Variance.

Costs should include:

- Product cost.
- Labour cost.
- Professional services.
- Expenses.
- Subcontractor cost.

## Risks and Issues

Risk fields:

- Description.
- Probability.
- Impact.
- Owner.
- Mitigation.
- Status.

Issue fields:

- Description.
- Severity.
- Owner.
- Due date.
- Status.
- Resolution.

## Change Requests

Change requests should include:

- Description.
- Reason.
- Cost impact.
- Time impact.
- Approval status.
- Approved by.

## Acceptance Criteria

The module is acceptable when:

- Projects can be created from accepted quotes.
- Project managers can create tasks and milestones.
- Gantt view shows project plan.
- Budgets can be tracked.
- Risks, issues and changes can be recorded.
- Project dashboards show health and risk.
