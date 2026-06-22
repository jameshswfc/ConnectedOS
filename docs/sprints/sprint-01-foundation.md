# Sprint 1 - Platform Foundation

## Goal

Create the technical and operational foundation for ConnectedOS.

Do not build CRM, quoting, pre-sales or project management features in this sprint.

## Scope

Build:

- Next.js application shell.
- TypeScript configuration.
- TailwindCSS and shadcn/ui setup.
- Base navigation layout.
- Microsoft authentication structure.
- User and role data model.
- Permission framework.
- Audit log data model and service.
- Notification data model and service.
- Document metadata model.
- Core database setup with Prisma.
- Seed data.

## Required Pages

- Login page or Microsoft sign-in route.
- Dashboard placeholder.
- Users page for administrators.
- Roles/permissions page or admin data seed.
- Notifications page.
- Settings placeholder.

## Required Services

- Auth service.
- User service.
- Permission service.
- Audit service.
- Notification service.
- Document service skeleton.

## Required Database Models

- User.
- Role.
- Permission.
- RolePermission.
- AuditLog.
- Notification.
- Document.
- Comment if practical.

## Acceptance Criteria

Sprint 1 is complete when:

- Application runs locally.
- Database migrations run successfully.
- Users and roles can be seeded.
- Permission checks can be performed server-side.
- Audit records can be created.
- Notifications can be created and displayed.
- Navigation shell exists.
- Documentation is updated.

## Codex Warning

Do not build CRM screens in this sprint. Only add CRM navigation placeholder if useful.
