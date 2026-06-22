# ConnectedOS Project Kick-Off Pack - Start Here

## What This Pack Is

This pack contains the starter documentation for the ConnectedOS internal business operations platform for Connected Hospitality.

It is designed so James can upload or commit the files into a new GitHub repository and then ask Codex to work from the documentation rather than re-explaining the project every time.

The pack includes:

- Root AGENTS.md orchestration file.
- Foundation architecture documents.
- Database standards and entity outline.
- Module specification files for CRM, quoting, pre-sales, project management, scheduling, leave, expenses, reporting, client portal, procurement and assets.
- Microsoft 365 integration requirements.
- Sprint plan and starting sprint files.
- A plain-English Codex start guide.

## James - Do This First

### Step 1 - Create the repository

Create a private GitHub repository called:

```text
connectedos
```

### Step 2 - Upload this pack

Upload all folders and files exactly as provided.

The repository root should contain:

```text
AGENTS.md
README-START-HERE.md
docs/
```

### Step 3 - Open the repo in Codex

Open the `connectedos` repository in Codex.

Do not ask Codex to build the whole platform.

### Step 4 - Give Codex the first prompt

Paste this into Codex:

```text
Read AGENTS.md, docs/foundation/*, docs/database/*, and docs/sprints/sprint-01-foundation.md.

Do not write application code yet.

Create a Sprint 1 implementation plan for the ConnectedOS platform foundation only.

Include:
1. Proposed repository structure.
2. Confirmed technology stack.
3. Initial database schema proposal.
4. Authentication approach.
5. Role-based access control approach.
6. Audit log approach.
7. Notification framework approach.
8. Risks, assumptions and questions.

Wait for approval before coding.
```

### Step 5 - Review Codex's plan

Check that Codex has not tried to build CRM, quoting, pre-sales or project management in Sprint 1.

Sprint 1 should only create the platform shell, authentication, roles, database foundation, audit logs, notification framework and base UI.

### Step 6 - Approve coding only after the plan is right

Once the plan is right, tell Codex:

```text
Approved. Implement Sprint 1 foundation only. Do not start CRM or any other module.
```

## Two-Minute Action

Create the private GitHub repository called `connectedos`, then upload this folder structure exactly as supplied.
