# Resource Scheduling Module

## Purpose

The scheduling module manages staff allocation across projects, pre-sales work, internal tasks and leave.

## Core Features

- Staff calendar.
- Day/week/month views.
- Resource view.
- Project view.
- Booking by day, half-day or hours.
- Conflict detection.
- Availability checking.
- Utilisation reporting.

## Booking Types

- Project delivery.
- Pre-sales.
- Survey.
- Internal meeting.
- Training.
- Leave.
- Sick leave.
- Admin.

## Conflict Rules

The system must warn or prevent:

- Double booking.
- Booking over approved leave.
- Booking outside working hours.
- Booking beyond available capacity.
- Booking person with mismatched skill if skills are implemented.

## Calendar Views

Required views:

- My schedule.
- Team schedule.
- Project schedule.
- Resource utilisation.

## Outlook Integration

Future integration should sync or reflect Outlook availability.

## Acceptance Criteria

The module is acceptable when:

- Users can book staff to projects.
- Double booking warnings work.
- Leave conflicts are visible.
- Managers can see utilisation.

## Implementation Status

Current ConnectedOS delivery includes:

- `Resource` and `ResourceBooking` records for internal users, subcontractors, agencies and supplier resources.
- Field Services routes for resource list/detail/create and booking list/detail/create.
- Working-day booking calculations using the shared project working calendar.
- Conflict detection against existing bookings and approved/submitted leave.
- Override support for blocked bookings with an explicit override reason.
- Project, account and opportunity linkage on bookings for downstream reporting and billing context.
- `/field-services/schedule` now defaults to a true calendar grid with month, week, day and resource-grid views rather than a plain list.
- Field Services acts as the central schedule surface by showing both direct `ResourceBooking` records and project resource assignments created inside Projects.
- Project resource assignments now reference the central `Resource` repository, with legacy user-linked assignments backfilled for compatibility.
- Approved leave renders as unavailable time in the Field Services calendar and submitted leave can be surfaced as a pending warning block.
- Active ConnectedOS users are synchronised into `Resource` records as `internal_user` resources so they are schedulable without manual re-entry.
- Resources can now be edited from the UI and deactivated safely from a single central repository used by Projects, Field Services, reporting and leave checks.
- Resource deactivation now keeps historic bookings intact, cancels future direct bookings, removes future project resource assignments from the live schedule, audits the change and notifies affected project managers for linked project work.
- The Resources list defaults to active records and can optionally reveal inactive resources for historic master-data review.
- The Field Services calendar hides inactive-resource future work by default and can optionally reveal inactive history for audit and QA review.
- New assignment selectors now hide inactive users and inactive resources by default so only schedulable operational records appear in live booking and project-resource forms.
