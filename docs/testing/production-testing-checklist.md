# Production Testing Checklist

Use this checklist for ConnectedOS browser QA from a seeded local environment.

## Setup

1. Run `npm run prisma:seed`
2. Run `npm run cleanup:production-test-data`
3. Run `npm run seed:production-test`
4. Start the app with `npm run dev`
5. Sign in with an administrator and confirm dashboard cards load
6. If the app still looks cluttered after old test runs, repeat `npm run cleanup:production-test-data` before reseeding. The cleanup script only targets deterministic production-test/demo records and is safe to rerun.

## Admin Login

1. Open `/login`
2. Sign in with the configured local administrator
3. Confirm dashboard, notifications, search and settings are visible
4. Confirm `/admin/users`, `/admin/roles` and `/admin/permissions` load
5. Confirm `/admin/audit` loads and shows audit history

## User Creation

1. Open `/admin/users`
2. Create a local user with an initial password
3. Confirm role selection is available
4. Confirm password reset works
5. Confirm newly created user is forced to change password on first login

## Sales Flow

1. Open `/crm/leads` and confirm sample leads/opportunities are visible
2. Open `/crm/opportunities`
3. Confirm owner, stage, value and next action fields display
4. Confirm `/crm/my-work` shows leads, opportunities, activities, quotes and pre-sales
5. Confirm `/crm/pipeline` and `/crm/forecast` filters work

## Quote Flow

1. Open `/quotes`
2. Confirm sent and accepted sample quotes are visible
3. Open a quote detail page
4. Confirm linked account, contact, opportunity and project linkage
5. Export quote PDF, BoM Excel and internal export
6. Confirm quote approval actions create in-app and email notifications where applicable

## Pre-Sales Flow

1. Open `/presales`
2. Open a sample request
3. Confirm deliverables render with progress
4. Confirm linked opportunity, quote and account are visible
5. Confirm file upload area loads and existing document metadata renders

## Project Flow

1. Open `/projects`
2. Open seeded projects
3. Confirm overview, tasks, milestones, resources, budget and forms tabs load
4. Confirm accepted quote linkage, pre-sales linkage and billing schedule are visible
5. Export weekly report, implementation document and change request PDF
6. Confirm the project audit panel renders on the detail page

## Scheduling Flow

1. Open `/field-services/resources`
2. Confirm the list defaults to active resources only and use the toggle to reveal inactive resources
3. Confirm internal resources and subcontractors are visible from the same central repository
4. Open `/field-services/schedule`
5. Confirm the default view is a calendar grid rather than a list
6. Switch between month, week, day and resource views and confirm bookings remain visible
7. Confirm both direct Field Services bookings and project resource assignments render in the same schedule
8. Confirm approved leave appears as unavailable time where applicable
9. Try creating an overlapping booking against approved leave and confirm warning or block behaviour
10. Create a booking from a helpdesk ticket and confirm ticket reference or prefill carries through
11. Deactivate a resource with future bookings and confirm future bookings are cancelled while historic bookings remain visible
12. Confirm inactive resources and inactive-user-backed resources do not appear in new assignment selectors unless you deliberately switch to a historic view

## Leave Flow

1. Open `/leave`
2. Confirm own requests appear
3. Open `/leave/approvals` as administrator or approver
4. Reject a request with a clear rejection reason and confirm the requester sees the updated status without a generic error page
5. Confirm leave submission notifies James Harrison where available, with administrator fallback
6. Open `/leave/calendar` and confirm only real ConnectedOS users and real leave requests appear
7. Confirm approved and submitted leave display differently
8. Confirm leave appears in the schedule context
9. Confirm approver email notifications are written to console or sent via configured provider

## Expense Flow

1. Open `/expenses`
2. Confirm seeded claims and statuses are visible
3. Open a claim and confirm lines and receipts render
4. Submit or approve a claim
5. Export the receipt pack PDF
6. Confirm submit/approve/reject/paid transitions create in-app and email notifications

## Procurement Flow

1. Open `/procurement/suppliers`
2. Confirm supplier detail and edit pages expose contact details, account manager, categories supplied and active status
3. Open `/procurement/purchase-orders`
4. Create a new PO and confirm supplier selection auto-fills supplier address and contact details
5. Confirm delivery address, delivery date and notes can be set or manually overridden
6. If linked to a quote, import product lines and confirm labour lines are hidden by default unless explicitly shown
7. Confirm a product line linked to a supplier suggests the correct supplier automatically on the PO form
8. Confirm seeded POs, lines, supplier invoices and receipt records load
9. Open a PO PDF export and confirm supplier, delivery, notes, tax and totals render cleanly
10. Confirm long supplier addresses, delivery addresses and line descriptions wrap cleanly inside the PO PDF without clipping
11. Confirm project budget linkage appears where relevant
12. Confirm PO submit/approve transitions produce notifications and email events

## Resource Delete Safety

1. Open a test resource detail page
2. Use the in-app deactivate confirmation panel instead of a browser confirm dialog
3. Confirm the action returns to `/field-services/resources`
4. Open the deleted or deactivated resource URL manually and confirm the friendly not-found card appears instead of a server error

## Finance Flow

1. Open `/finance`
2. Confirm invoice totals, collected values and outstanding values render
3. Open `/finance/invoices`
4. Record a payment against a sample invoice
5. Confirm billing schedules appear for seeded projects

## Asset Flow

1. Open `/assets`
2. Confirm seeded assets are visible with project/account references
3. Open an asset detail page
4. Confirm serial, MAC, status and linked project/customer render
5. Confirm asset audit history renders on the detail page

## Helpdesk Flow

1. Open `/helpdesk`
2. Confirm SLA cards render
3. Open `/helpdesk/tickets`
4. Start a new ticket and confirm contact, project and asset selectors stay disabled until an account is chosen
5. Select an account and confirm dependent selectors only show records linked to that account
6. Open a seeded ticket and add an internal comment
7. Add a customer-visible comment
8. Upload an allowed attachment and confirm it appears in the file list
9. Change status to `Waiting Customer` or `Waiting Third Party` and confirm SLA pause messaging
10. Resolve a ticket with a required resolution note, then close and reopen it
11. Use `Create Field Booking` and confirm booking prefill works
12. If linked to a project, use `Create Project Issue`
13. Confirm linked account, project and asset relationships are intact
14. Confirm the default ticket list hides resolved and closed items until the matching view tab is selected

## Active vs Historical Visibility

1. Confirm `/helpdesk/tickets` defaults to the `Active` view
2. Switch to `Resolved`, `Closed` and `All` and confirm historical tickets appear only in those views
3. Confirm `/projects` defaults to active delivery projects only
4. Switch to `Completed`, `Closed`, `Cancelled` and `All` to review historical projects
5. Confirm inactive resources remain visible on historic records but are hidden from new scheduling selectors

## Email Notification Testing

1. Set `EMAIL_PROVIDER=console` for local testing
2. Trigger a leave submission and confirm an approver email logs to the server console
3. Trigger an expense approval and confirm claimant email output
4. Create an urgent or critical helpdesk ticket and confirm escalation email output
5. Submit a quote for approval and confirm the owner or approver email output

## Audit Viewer Testing

1. Open `/admin/audit` as Administrator
2. Filter by module, user and record type
3. Open an account, quote, project, expense, asset and helpdesk ticket detail page
4. Confirm the audit panel shows relevant record history

## Global Search Testing

1. Search by account name
2. Search by quote number
3. Search by project number
4. Search by ticket number
5. Search by asset serial number
6. Sign in as a restricted user and confirm private records do not appear in results

## Reports

1. Open `/reports`
2. Confirm executive summary cards load
3. Open Sales, Projects, Resources, Finance, Procurement and Helpdesk reports
4. Confirm seeded records affect totals
5. Confirm dashboard cards link to real filtered pages and not dead-end placeholders

## Permissions

1. Sign in as a non-admin test user
2. Confirm sidebar hides inaccessible modules
3. Manually open a restricted route such as `/admin/users`
4. Confirm friendly Access Denied renders
5. Confirm APIs still return JSON 401/403 for restricted operations
6. Confirm global search does not reveal restricted records

## Documents

1. Confirm upload forms load in Pre-Sales, Expenses, Procurement and Helpdesk
2. Upload an allowed test file
3. Confirm file metadata is stored
4. Confirm the SharePoint-style fallback message is understandable when live SharePoint is not configured
5. Confirm unauthorised users cannot download attachments they should not access
