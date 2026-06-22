# Microsoft 365 Integration Requirements

## Purpose

ConnectedOS must integrate with Microsoft 365 because Connected Hospitality uses Microsoft tools for identity, files, calendar, email and communication.

## Integration Areas

### Microsoft Entra ID

Used for:

- User login.
- Identity.
- Future group mapping.

### SharePoint

Used for:

- File storage.
- Project folders.
- Pre-sales folders.
- Quote files.
- Expense receipt packs.

Required SharePoint actions:

- Create folder.
- Upload file.
- Read file metadata.
- Store folder URL.
- Link documents to system records.

### Outlook Calendar

Used for:

- Resource scheduling visibility.
- Avoiding double booking.
- Future calendar sync.

Required future actions:

- Read availability.
- Create calendar events where approved.
- Reflect leave bookings.
- Reflect project bookings.

### Teams

Used for:

- Notifications.
- Approval alerts.
- Deadline alerts.
- Project updates.

## Integration Principles

- Isolate Microsoft Graph logic in integration services.
- Store external IDs and URLs safely.
- Retry failed background jobs.
- Log integration errors.
- Do not block core user workflows unnecessarily if Microsoft API is temporarily unavailable.

## SharePoint Folder Naming

Project folder pattern:

```text
PROJECT-{project_number}-{account_name}-{project_name}
```

Pre-sales folder pattern:

```text
PRESALES-{request_number}-{account_name}-{short_description}
```

Quote folder pattern:

```text
QUOTE-{quote_number}-{account_name}
```

## Acceptance Criteria

Integration foundation is acceptable when the system has a clear service structure for Microsoft 365 and can later add real Graph calls without rewriting module logic.
