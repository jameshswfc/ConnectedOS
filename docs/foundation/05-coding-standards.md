# Coding Standards

## General Rules

- Use TypeScript.
- Prefer explicit types for service inputs and outputs.
- Keep business logic out of UI components.
- Validate server-side input.
- Use reusable components for common UI patterns.
- Use shared services for audit, notifications, documents and permissions.

## Naming Standards

Variables and functions:

```text
camelCase
```

Components, classes and types:

```text
PascalCase
```

Database columns:

```text
snake_case
```

Files:

Use clear kebab-case filenames where practical.

## API Standards

APIs should be predictable and versioned where practical.

Examples:

```text
GET /api/v1/accounts
POST /api/v1/accounts
GET /api/v1/accounts/:id
PATCH /api/v1/accounts/:id
DELETE /api/v1/accounts/:id
```

Delete operations should usually soft delete records.

## API Response Format

Use a consistent response style:

```json
{
  "success": true,
  "data": {},
  "errors": []
}
```

For errors:

```json
{
  "success": false,
  "data": null,
  "errors": [
    {
      "code": "ERROR_CODE",
      "message": "Human readable message"
    }
  ]
}
```

## Testing Requirements

Critical workflows require tests:

- Permissions.
- Audit logging.
- Opportunity workflow.
- Quote calculations.
- Approval workflow.
- Resource conflict detection.
- Expense receipt PDF generation.

## Migration Rules

Prisma migrations must be committed.

Do not manually alter the production database outside migrations.

## Documentation Rules

When adding or changing major functionality, update the relevant docs file.

Codex must not silently change architecture or data models without updating documentation.
