# Sage Accounting Integration and Project Invoice Requests

## Status

Implemented in the development branch, not deployed or connected to live Sage in this delivery. Both integration access and invoice creation default off. Existing browser sign-in to Sage is not an API connection. No real invoice was created during development or testing.

The observed product is Sage Accounting. This connector targets its v3.1 API, not Sage 50 or Intacct. The live business ID must be explicitly verified before configuration.

## Configuration

Use secure server configuration; never put client secrets or tokens in source control, browser JavaScript or chat.

| Setting | Purpose |
| --- | --- |
| `SAGE_ENABLED` | Defaults `false`; enables configured integration. |
| `SAGE_CLIENT_ID`, `SAGE_CLIENT_SECRET` | Sage application registration credentials. |
| `SAGE_REDIRECT_URI` | Exact registered callback, normally `https://portal.connectedhsp.com/api/v1/integrations/sage/callback`. HTTPS required outside local development. |
| `SAGE_BUSINESS_ID` | Explicit authorised accounting business. |
| `SAGE_TOKEN_ENCRYPTION_KEY` | Dedicated 32-byte key expressed as 64 hexadecimal characters; store and back up securely. Loss prevents decryption; reconnect is required. |
| `SAGE_ALLOW_INVOICE_CREATE` | Defaults `false`. Enabling requests Sage `full_access` consent on connection; otherwise `readonly`. Enabling this flag alone does not upgrade an existing token. |
| `PROJECT_INVOICE_APPROVER_USER_ID` | James's exact active ConnectedOS administrator ID. No name-based or arbitrary-admin approval fallback. |
| `SAGE_SALES_LEDGER_ACCOUNT_ID` | Verified sales ledger in the selected Sage business. |
| `SAGE_STANDARD_TAX_RATE_ID`, `SAGE_ZERO_TAX_RATE_ID` | Explicit approved codes; their percentages and visibility are checked against the invoice date before posting. |

Official references: [application registration](https://developer.sage.com/accounting/docs/v1.0.0/guides/learning/getting-started/client_app_registration), [OAuth authentication](https://developer.sage.com/accounting/docs/v1.0.0/guides/learning/authenticating/authentication), [v3.1 API](https://developer.sage.com/accounting/apis/sagebusinesscloudaccounting/3.1.0/accounting), [sales invoices](https://developer.sage.com/accounting/apis/sagebusinesscloudaccounting/3.1.0/accounting/groups/sales-transactions/tags/sales-invoices).

## Read-Only Financial Visibility

`/finance/sage` is available to administrators and users with `finance.read_all`. Connecting requires administrator/integration-management access. OAuth uses user-bound, expiring, single-use state and PKCE. Tokens and the verifier are encrypted with AES-256-GCM. Reconnection and refresh are audited; a lease prevents concurrent rotating-token operations.

Invoice requests use fixed Sage endpoints, bearer authentication and the configured `X-Business` header. Pagination never follows an arbitrary external next URL. Refresh validates the complete bounded result before replacing the snapshot. Failure retains previous data and its successful-refresh timestamp. A changed business configuration hides the old cache until the new business is connected.

The snapshot stores sales invoice number, customer name, status, currency, dates, total and outstanding amount. Totals exclude draft/void invoices and are grouped by currency. It does not label reductions in outstanding balance as cash collected, because credits and allocations may also affect that balance. It does not duplicate imported invoices into ConnectedOS `CustomerInvoice` or silently alter project budgets.

## PM Request -> James Approval -> Sage

1. An assigned Project Manager, Business Operations user with project-update access, or administrator opens **Request Invoice** from a project.
2. Select a completed milestone, completed stage gate or completed/closed project. Enter a customer-facing description, GBP net amount and 0%/20% VAT for review.
3. Server checks project access, current completion and aggregate request amounts against contract value in a serialisable transaction. It creates an audit record and notification for the configured active James administrator.
4. One request is allowed per project/trigger. Repeat submission returns the existing request. A rejected request may be corrected and resubmitted using the same trigger.
5. James reviews at `/finance/invoice-requests`. Only his configured administrator identity can approve or reject. Finance can read; other project viewers see only permitted linked requests.
6. When creation is enabled and write consent exists, James loads active GBP Sage customers, selects the correct customer, supplies invoice/due dates and explicitly confirms customer, completed work, amount and VAT.
7. The server rechecks completion and contract ceiling, validates Sage ledger/tax codes, and atomically claims the request as `creating` before one invoice POST. It stores the approved payload and a stable `COS-{requestId}` reference.
8. Confirmed success records the Sage ID/number, audits it and notifies the requester. It does not send the invoice to the customer, record a payment or allocate money.
9. Timeout, ambiguous response or persistence failure becomes `reconciliation_required`. A process interruption can leave `creating`. Both block a second automatic POST. Check Sage by the stable reference; do not reset/retry blindly.

Email uses the existing central service. Its SMTP implementation is still deferred, so in-app notifications are the dependable channel until real email delivery is separately configured and tested. Email failure does not undo the business transaction.

## Financial Limits and Pilot Gate

- Initial invoice creation is GBP only, one reviewed summary line, and VAT choices are limited to configured 0%/20% codes. Mixed VAT, credit notes, refunds, allocations and customer sending are not implemented.
- The request ceiling tracks requests in this workflow. It cannot detect all invoices created manually in Sage or previously billed through another system. James must reconcile existing billing before approval.
- Default project payment terms do not automatically determine the request amount; the PM proposes it and James confirms it.
- The `approved` database status is reserved; the current flow transitions from requested directly to creating under approval, then created/reconciliation required.
- There is no automatic retry worker or reconciliation reset button. An operator must investigate uncertain results. Add a reviewed reconciliation tool before broad rollout.
- No live Sage acceptance test has occurred. API contract/unit tests and local request workflow tests are not evidence of tenant-specific API consent, ledger mapping or real invoice success.

## Deployment and Acceptance

1. Back up production database and configuration; preserve the existing historical migration baseline.
2. Deploy the reviewed release and the two additive migrations. Keep Sage disabled initially.
3. Set James's approver ID; verify PM request, James rejection and resubmission in the portal.
4. Register Sage application and callback, confirm business, configure encryption and credentials privately. Obtain explicit connection consent.
5. Start read-only, refresh and reconcile a known invoice's reference, currency, amount and outstanding balance.
6. Confirm sales ledger and VAT mappings with James/Finance. Enable creation and reconnect for write scope only after approval.
7. With James present, approve one agreed completed-stage invoice, verify its Sage customer/amount/VAT/reference, then verify repeat approval cannot post twice. Customer sending remains a separate Sage action.

Do not run production-test seeds or cleanup against the live portal as part of this deployment.
