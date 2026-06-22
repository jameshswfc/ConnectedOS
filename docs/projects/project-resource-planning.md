# Project Resource Planning

Sprint 8.2 keeps resource planning inside the Projects module only. A full central scheduling module remains deferred.

## Working Days

Scheduled resource days use working-day calculation:

- Monday to Friday count.
- Saturday and Sunday are excluded.
- Public holiday support is structured for later addition.

Examples:

- Monday to Friday = 5 days.
- Monday to Sunday = 5 days.
- Monday to next Monday = 6 days.
- Weekend-only ranges calculate as 0 working days.

## Resource Conflicts

When assigning a resource, ConnectedOS checks active project resource assignments for the same user and overlapping dates.

Conflicts show:

- Project number.
- Project name.
- Date range.
- Role.
- Scheduled days.

Administrator, Business Operations and Project Manager users can override where appropriate. Overrides record a note and audit entry.

## Resource Budget Visibility

Project overview and budget show:

- Allocated days from quote lines with SKU/part code beginning `LAB`.
- Scheduled days from resource assignments.
- Actual days used.
- Remaining days.
- Utilisation percentage.
