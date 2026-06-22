# Project Budget Controls

Sprint 8.2 adds budget visibility and margin-at-risk foundations.

## Revenue

Projects show:

- Contract value.
- Invoiced amount.
- Collected amount.
- Outstanding amount.

## Costs

Projects show:

- Resource cost.
- Purchase order placeholder cost.
- Other cost.
- Total forecast cost.
- Actual cost.

Resource cost uses simple default internal day-cost constants until a settings module exists.

## Margin

Projects calculate:

- Expected margin.
- Current forecast margin.
- Margin variance.

Margin-at-risk is shown when forecast margin drops materially below expected margin or below zero.

## Quote Changes After Project Creation

If a quote linked to an existing project changes after project creation, ConnectedOS creates a project change request instead of silently syncing the project budget.

The change request records:

- Quote number.
- Project number.
- Old total.
- New total.
- Difference.
- Reason: Quote changed after project creation.
- Status: Pending review.

The Project Manager and Business Operations users are notified.
