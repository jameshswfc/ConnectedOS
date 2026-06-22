# Project Workflows

## Quote To Project

A project can be created from a quote when:

- Quote status is approved, sent or accepted.
- Quote is linked to an opportunity.
- Quote is linked to an account.
- Quote has a quote version.

Project creation now uses one shared `ProjectCreationService` path for:

- Manual Create Project from quote.
- Quote status changing to Accepted.
- Opportunity stage changing to Closed Won (PO Received).

When a quote status changes to Accepted:

- The linked opportunity is moved to Closed Won (PO Received).
- A project is created automatically if one does not already exist for the quote.
- Duplicate projects are prevented by checking for an existing active project linked to the quote.
- The quote detail page shows the created project and Open Project link.

When a quote status changes to Sent:

- The linked opportunity is moved to Proposal Sent when it is still in an open stage.
- Probability and weighted value are recalculated from the CRM stage model.
- Opportunity stage history is written only when the stage actually changes.
- Closed Won (PO Received) and Lost opportunities are not moved backwards.
- The CRM stage change is audited from the shared quote-status workflow.

When an opportunity stage changes to Closed Won (PO Received):

- ConnectedOS finds the latest linked approved/sent/accepted quote version.
- The linked quote is marked Accepted if it is not already accepted.
- Pending approval requests for that quote version are marked approved.
- The existing accepted-quote project creation workflow is used.
- Duplicate projects are prevented by checking active projects linked to the quote.

When created, the project inherits:

- Account.
- Opportunity.
- Quote and quote version.
- Related pre-sales request where available.
- Project name from quote or opportunity.
- Scope from the quote high-level scope.
- Salesperson from the linked opportunity owner.
- Quote reference from the linked quote.
- Expected close date, opportunity name and opportunity type from the linked opportunity.
- Budget cost, sell and commercial value from quote totals.
- Payment terms from quote version terms.
- Project type from the linked opportunity.
- Resource day budget from quote lines where catalogue SKU/part code starts with `LAB`.
- Pre-sales request reference, engineer, request type, deliverables, hours and notes where available.
- Baseline start and finish dates from the initial project dates.
- Default milestones and default stage gates.

If no `LAB` lines exist, resource day budget defaults to 0 and can be manually edited by permitted users.

## Project Status

Project statuses:

- Draft
- Initiation
- Planning
- Active
- On hold
- At risk
- Completed
- Closed
- Cancelled

## RAG Rules

Green:

- Remaining resource days are above 25% of budget.
- Project is not overdue.
- No critical task is overdue.

Amber:

- Remaining resource days are between 1% and 25% of budget.
- Target end date is within 7 days and project is not complete.

Red:

- Remaining resource days are 0 or below.
- Target end date is overdue and project is not complete.
- A non-complete task is overdue.

## Tasks And Templates

Administrators and Business Operations users can create task templates. When a project is created, a selected template copies its template items into project tasks.

Sprint 8 supports simple dependencies, task status, assignee, start date, end date, estimated days and actual days.

Every new project also receives standard default tasks:

1. Project Documentation Review
2. Pre-Sales Handover Call
3. Customer Kick Off Call
4. Resource Scheduling
5. Equipment Order
6. Accommodation & Travel Arranged
7. Deployment Commenced
8. Handover Documentation Created
9. Handover to Support Completed
10. Project Closure Call
11. Project Closure Document & Sign Off

If project type is Marriott GPNS, these extra tasks are added:

1. Marriott GPNS UAT Data Collection
2. Marriott GPNS UAT Booked
3. Marriott GPNS Certificate Issued

Default task generation avoids duplicates. Existing projects can use Add Missing Default Tasks from the project detail page.

Sprint 8.4 makes task schedules practical from first creation. Default task dates are generated from project start date:

- Project Documentation Review: start + 2 days
- Pre-Sales Handover Call: start + 4 days
- Customer Kick Off Call: start + 7 days
- Resource Scheduling: start + 7 days
- Equipment Order: start + 7 days
- Accommodation & Travel Arranged: start + 7 days
- Deployment Commenced: start + 21 days
- Handover Documentation Created: start + 60 days
- Handover to Support Completed: start + 64 days
- Project Closure Call: start + 70 days
- Project Closure Document & Sign Off: start + 70 days

Marriott GPNS extra tasks use:

- Marriott GPNS UAT Data Collection: start + 50 days
- Marriott GPNS UAT Booked: start + 50 days
- Marriott GPNS Certificate Issued: start + 70 days

Project Managers, Business Operations and Administrators can now edit project tasks directly on the project detail page, including title, description, assignee, dates, status and actual days.

Sprint 8.4.5 extends task planning so forecast days are tied to the real schedule:

- task forecast days are derived from working days between start and end date
- users can still override forecast days manually when needed
- locking the project plan stores the current task start/end/forecast values as task baselines
- project task rows now show baseline, forecast, actual and variance values together

Sprint 8.4.4 adds dependency management to this workflow:

- Users can create task dependencies from the project detail page.
- Dependencies use `FS`, `SS`, `FF` or `SF` labels plus optional lag days.
- ConnectedOS auto-reschedules dependent tasks when predecessor dates move.
- Dependent-task duration is preserved during auto-shift.
- Circular relationships are rejected.
- Dependent milestone dates are shifted when they are linked to a moved task.

Dependency summaries are also surfaced in the weekly report so schedule-driven movement is visible in customer-facing governance outputs.

Sprint 8.4.5 ensures the dependency logic runs from the real web edit flow as well as from unit-tested scheduling helpers. Editing a predecessor task from the project detail page now triggers successor task rescheduling and linked milestone movement, while manually overridden milestones are preserved in place.

Sprint 8.4.5b closes the missing-link gap in that workflow:

- default project tasks are now created with a default `FS + 0d` dependency chain
- Marriott GPNS projects add the UAT data collection, booking and certificate chain after Deployment Commenced
- existing projects can backfill missing standard dependencies from the project detail page
- the current project task inline edit flow is the shared task-date edit path and uses the same dependency scheduling service for all visible project task edits

## Gantt View And Export

The in-app Gantt view now positions tasks and milestones from their real dates instead of using placeholder spacing.

- Timeline headers use week-based labels.
- Header cells switch to compact `WC dd MMM` labels when space is tight.
- Horizontal scrolling is preferred over squeezing week columns too small.
- Timeline bars remain aligned to the underlying project dates.

Projects also support Gantt PDF export from the project detail page. The export includes:

- Connected Hospitality logo and standard project PDF styling.
- Project number, name, customer, Project Manager and date range.
- Week-level Gantt timeline summary.
- Tasks, milestones and dependency references where available.

## Resource Scheduling

Sprint 8.2 calculates scheduled resource days from start and end dates using working days.

Example:

```text
Monday to Friday = 5 scheduled days
Monday to Sunday = 5 scheduled days
Monday to next Monday = 6 scheduled days
```

Weekends are excluded. Public holiday exclusion is deferred but the working calendar helper allows it later.

Project overview and budget views show:

- Allocated days from quote `LAB` line quantities.
- Scheduled days from resource assignments.
- Actual days used.
- Remaining days.
- Utilisation percentage.
- Estimated task days.
- Actual task days.
- Task days variance.

Task effort and resource usage are intentionally kept separate:

- task actual days = delivery effort logged against project tasks
- resource actual days = usage logged against resource assignments

## Completion Percentage

Project completion is computed from active tasks:

```text
completed tasks / total active tasks x 100
```

Completed tasks count as 100%. Incomplete tasks count as 0%. Cancelled tasks are ignored.

Progress percentage is visible on the project list, project overview, project dashboard and weekly update export.

## Budget

The budget tab shows quote commercial values, invoiced amount, collected amount, outstanding amount and lightweight financial entries. Purchase order placeholders are stored as project financial entries until procurement is implemented.

## Quote Changes After Project Creation

Quote line changes after a project exists do not silently rewrite the project. ConnectedOS creates a project change request with the old total, new total, difference, resource-day impact, hardware/equipment impact and pending-review status.

When a quote-change project change request is created, ConnectedOS sends a `Project Change Request Created` notification to:

- The assigned Project Manager.
- Business Operations users.
- Administrator users if no Project Manager is assigned.

The notification links back to the project Change Requests tab.

Project Managers, Business Operations and Administrators can approve or reject the change request from the project detail page. Approval applies the delta once only:

- Additional sell value increases project commercial value, budget sell and outstanding amount.
- Additional `LAB` day impact increases the resource day budget.
- Product/hardware impacts create lightweight project equipment items.
- Hardware impacts create an `Order Additional Hardware` project task when one does not already exist.

Rejected and already-approved requests cannot be applied again. Approval and rejection actions are audited and notify the Project Manager and Business Operations.

Sprint 8.4 changes the manual commercial path for project variations:

- A project change request is still created first.
- The user then creates a linked change quote from that change request.
- The change quote opens in the normal quote builder and becomes the source of truth for scope, commercial value, `LAB` resource-day impact and hardware/equipment impact.
- The project change request stores the linked change quote reference and the latest current-version pricing summary.
- Approving the project change request applies the linked quote deltas to the project once only.

Sprint 8.4.3 tightens the first-step UX for this flow:

- Create Change Request shows a loading state while the API request is running.
- Duplicate submissions are blocked until the request resolves.
- Success reloads the project back to the Change Requests section.
- Failure shows a friendly message:

```text
Unable to create change request. Please try again or contact an administrator.
```

- Failed creation attempts log project ID, user ID, attempted payload and exception message.
