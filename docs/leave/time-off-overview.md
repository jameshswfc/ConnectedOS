# Time Off Management Module

## Purpose

The time off module allows staff to request leave and managers to approve or reject it, with visibility on team absence and scheduling conflicts.

## Leave Types

- Annual Leave.
- Sick Leave.
- TOIL / time off in lieu.
- Compassionate Leave.
- Unpaid Leave.
- Other.

## Request Fields

- User.
- Leave type.
- Start date.
- End date.
- Total days.
- Reason or notes.
- Status.
- Approver.
- Approval date.

## Statuses

- Draft.
- Submitted.
- Approved.
- Rejected.
- Cancelled.

## Workflow

1. User submits request.
2. Manager receives notification.
3. Manager reviews team calendar.
4. Manager approves or rejects.
5. User receives notification.
6. Approved leave appears in scheduling calendar.

## Acceptance Criteria

The module is acceptable when:

- Users can request leave.
- Managers can approve/reject.
- Approved leave blocks scheduling.
- Calendar view shows absences.

## Implementation Status

Current ConnectedOS delivery includes:

- `LeaveRequest` workflow with draft, submitted, approved, rejected and cancelled states.
- `/leave`, `/leave/new`, `/leave/calendar` and `/leave/approvals`.
- Approval routing to James Harrison where available, with administrator fallback.
- Leave approval routing now prefers James Harrison by known name or local admin email (`james@connectedhsp.com` / `me@jrharrison.com`) before falling back to Administrator and then Business Operations users.
- Notifications for submitted, approved and rejected requests.
- Leave rejection now requires a rejection reason, returns a friendly validation message when missing and still completes cleanly even if email sending fails.
- Approved and submitted leave participating in field-resource booking conflict checks.
- Approved and submitted leave now also blocks or warns project resource assignments when the linked central `Resource` belongs to an internal ConnectedOS user.
- `/leave/calendar` now uses the shared grid calendar with real leave records only, using active ConnectedOS users as the source of displayed people.
- Approved and submitted leave are visually distinguished in the calendar for scheduling review.
- Inactive or deactivated users are excluded from the live leave calendar and from new leave selectors where appropriate.
- Approved leave also appears in the Field Services scheduling context as an unavailable block for operational planning.
