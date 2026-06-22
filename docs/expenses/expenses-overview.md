# Expenses Module

## Purpose

The expenses module allows users to submit expenses with receipts, route them for approval, and generate a single PDF receipt pack.

## Core Features

- Create expense claim.
- Add expense lines.
- Upload receipt images or PDFs.
- Link expense to project, customer or internal category.
- Submit for approval.
- Approve, reject or query.
- Generate receipt pack PDF.
- Export for finance.

## Expense Claim Fields

- Claim number.
- Claimant.
- Status.
- Total amount.
- Project if applicable.
- Customer if applicable.
- Submitted date.
- Approved by.
- Paid date.

## Expense Line Fields

- Category.
- Description.
- Date.
- Amount.
- VAT/tax amount where relevant.
- Receipt attachment.

## Categories

- Travel.
- Hotel.
- Meals.
- Parking.
- Mileage.
- Materials.
- Other.

## Workflow

Statuses:

- Draft.
- Submitted.
- Queried.
- Approved.
- Rejected.
- Paid.

## Receipt PDF Pack

When a claim is submitted or approved, the system should generate a single PDF containing all receipt images/PDFs in order.

The pack should include:

- Claim summary page.
- Line item summary.
- Receipt images.
- Original filenames.

## Acceptance Criteria

The module is acceptable when:

- Users can upload receipts.
- Claims can be submitted and approved.
- Receipt PDF packs are generated.
- Finance can export claim data.

## Implementation Status

Current ConnectedOS delivery includes:

- `ExpenseClaim` and `ExpenseLine` with `EXP-YYYY-0001` numbering.
- Mileage support with configurable per-line rate input and a default `0.45` GBP per mile.
- Receipt uploads through the shared SharePoint-style fallback document service.
- `/expenses`, `/expenses/new`, `/expenses/:id`, `/expenses/approvals` and `/expenses/payment-runs`.
- Approval, query, rejection and payment transitions with audit logs and notifications.
- Receipt pack PDF generation using the claim summary, lines and linked receipt metadata.
