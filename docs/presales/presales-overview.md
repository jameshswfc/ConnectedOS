# Pre-Sales Management Module

## Purpose

The pre-sales module controls internal requests for technical input, design support, document review, RFP analysis, surveys, consultancy and quote support.

## Request Types

- Wi-Fi design.
- IPTV design.
- Structured cabling.
- ELV.
- Consultancy.
- Survey.
- RFP analysis.
- Design review.
- BoM review.
- Proposal support.

## Required Request Fields

- Request number.
- Customer/account.
- Opportunity if applicable.
- Requested by.
- Requested date.
- Required deadline.
- Priority.
- Request type.
- Description.
- Uploaded files.
- Assigned engineer.
- Status.

## Request Statuses

- Submitted.
- Triage.
- Assigned.
- In Progress.
- Query Raised.
- Waiting Customer.
- Internal Review.
- Complete.
- Cancelled.

## Workflow

1. Sales user submits request.
2. System creates request number.
3. User uploads supporting files.
4. System creates or links SharePoint folder.
5. Pre-sales manager reviews and assigns engineer.
6. Engineer works request.
7. Engineer adds output files and notes.
8. Request moves to complete.
9. Sales user is notified.

## SLA and Deadline Alerts

Alerts required:

- New unassigned request.
- Deadline approaching.
- Deadline missed.
- Query raised.
- Request completed.

## SharePoint Automation

When a request is submitted, the system should create a SharePoint folder using a naming pattern such as:

```text
PRESALES-{request_number}-{account_name}-{short_description}
```

The folder URL must be stored against the request.

## Future AI Integration

This module should later connect to the AI pre-sales assistant to:

- Read RFP documents.
- Review floorplans.
- Compare against brand standards.
- Generate draft BoMs.
- Create proposal drafts.

## Acceptance Criteria

The module is acceptable when:

- Requests can be logged online.
- Files can be uploaded.
- Engineers can be assigned.
- Deadlines and alerts work.
- SharePoint folder links are stored.
- Request history is auditable.

## Sprint 6 Pre-Sales Requests MVP

Implemented scope:

- Pre-sales request management with request numbers in `PS-YYYY-0001` format.
- Pre-sales requests link to Account, optional Opportunity and optional Quote.
- One quote can have many pre-sales requests.
- Quote-created requests store quote value and quote version snapshots.
- Opportunity creation or stage movement into `Pre-Sales / Solution Design` auto-creates a linked pre-sales request where no active request already exists.
- Requests include category, type, priority, commercial priority, status, SLA status, RAG status, requested delivery date, internal deadline, estimated hours and actual hours.
- Request statuses are controlled: Submitted, Triage, Assigned, In Progress, Query Raised, Waiting Customer, Internal Review, Complete and Cancelled.
- RAG rules:
  - Green: more than 48 hours remaining.
  - Amber: 48 hours or less remaining.
  - Red: overdue.
- Request assignment supports Pre-Sales Engineer and manager work queues.
- Request tasks can be created, assigned and completed.
- Document metadata can be attached to pre-sales requests using the existing document framework.
- Real supporting files and deliverables can be uploaded to pre-sales requests.
- Comments/notes can be added using the shared comment pattern.
- Account, Opportunity and Quote detail pages show linked pre-sales requests.
- CRM activities are created for request creation, assignment, status changes and completion.
- In-app notifications are created for submitted, assigned, query raised, due soon, overdue and complete events.
- SharePoint folder design is represented by a `presales-document-folder-service` stub only.

## Sprint 6.2 Auto-Creation and File Upload Fixes

Implemented scope:

- New opportunities created directly in the `Pre-Sales / Solution Design` stage now trigger pre-sales request creation from the opportunity service layer.
- Existing opportunity stage changes into `Pre-Sales / Solution Design` continue to trigger request creation.
- Active request duplicate prevention applies to both initial opportunity creation and later stage changes.
- Auto-created requests generate standard task templates based on linked opportunity type.
- Auto-created requests create CRM activity, audit history and in-app notification entries.
- Pre-sales request detail supports real file uploads.
- Supported upload types: PDF, DOCX, XLSX, PPTX, PNG, JPG/JPEG, CSV and TXT.
- Maximum upload size: 25MB per file.
- Files are stored locally in development under:

```text
storage/presales/{year}/{requestNumber}/
```

- Uploaded file metadata is stored in the shared `Document` framework.
- Stored document `externalId` points to the local development storage path.
- The UI displays a `SharePoint target path` for each file using the existing folder design stub.
- The SharePoint target path is a future target only; Sprint 6.2 does not upload files to SharePoint and does not call Microsoft Graph.
- File downloads are served through authenticated, permission-checked API routes.
- File names are sanitized, path traversal is rejected and unsupported extensions are blocked.
- Completing a request without files is allowed for now, but the detail page shows:

```text
No deliverable files have been attached.
```

API routes added:

- `POST /api/v1/presales-requests/:id/files`
- `GET /api/v1/presales-requests/:id/files`
- `GET /api/v1/presales-requests/:id/files/:fileId/download`

## Sprint 6.1 Pre-Sales Engineers and Standard Task Templates

Implemented scope:

- Seeded local Pre-Sales Engineer users:
  - Eman Nwokoro: `eman.nwokoro@example.local`.
  - Artur Kellner: `artur.kellner@example.local`.
  - Richard Mumford: `richard.mumford@example.local`.
- These `example.local` addresses are development placeholders only.
- If a matching user already exists by placeholder email or display name, seed assigns the Pre-Sales Engineer role and keeps the existing user identity details.
- Pre-sales engineer dropdowns include active users with the Pre-Sales Engineer role.
- Pre-sales request creation automatically creates standard task templates based on linked opportunity type.
- Template generation runs for requests created from:
  - CRM opportunity stage movement into Pre-Sales / Solution Design.
  - Opportunity detail page.
  - Quote detail page.
  - `/presales/new`.
- If no linked opportunity type is available, no type-specific tasks are created.
- Template tasks are generated once on request creation and duplicate titles are skipped.
- Opportunity type changes do not rewrite existing request tasks.

Template coverage:

- Guest WiFi.
- IPTV.
- MATV & TV Headend.
- Fibre & Broadband.
- Structured Cabling & Racks.
- PBX & Telephony.

BoM task behaviour:

- Tasks matching BoM or Bill of Materials include:

```text
Create or update the Bill of Materials in the connected Quote Builder.
```

- If the request is linked to a quote, the BoM task includes an Open Quote Builder link.
- If the request is linked to an opportunity but has no quote, the BoM task prompts Create Quote from that opportunity.
- Request detail displays task descriptions and BoM task actions clearly.

Routes:

- `/presales`
- `/presales/my-work`
- `/presales/new`
- `/presales/:id`

API routes:

- `GET /api/v1/presales-requests`
- `POST /api/v1/presales-requests`
- `GET /api/v1/presales-requests/:id`
- `PATCH /api/v1/presales-requests/:id`
- `DELETE /api/v1/presales-requests/:id`
- `POST /api/v1/presales-requests/:id/assign`
- `POST /api/v1/presales-requests/:id/change-status`
- `POST /api/v1/presales-requests/:id/tasks`
- `PATCH /api/v1/presales-tasks/:id`
- `POST /api/v1/presales-tasks/:id/complete`
- `POST /api/v1/presales-requests/:id/documents`
- `POST /api/v1/presales-requests/:id/comments`

Permissions:

- `presales.read_all`
- `presales.read_assigned`
- `presales.create`
- `presales.assign`
- `presales.update`
- `presales.complete`
- `presales.delete`

Assignment rights:

- System Administrator.
- Director.
- Sales Manager.
- Pre-Sales Manager.

Engineer rights:

- Pre-Sales Engineer can view assigned requests, update status, manage tasks, attach documents, add comments and mark complete.
- Pre-Sales Engineer cannot delete requests, change commercial priority or change request ownership.

SharePoint design stub:

```text
PreSales
  └── 2026
      └── PS-2026-0001 Hilton Manchester Airport WiFi Upgrade
```

Deferred:

- Microsoft Graph integration.
- Live SharePoint folder creation.
- Live SharePoint file upload.
- AI RFP/floorplan analysis.

## Sprint 7A Pre-Sales Deliverables and Operational Visibility

Implemented scope:

- Added expected pre-sales deliverables for supported opportunity types.
- Deliverables are tracked separately from tasks so engineering outputs can be uploaded, replaced and downloaded.
- Deliverable types include heatmaps, AP locations, network diagrams, port matrices, BoMs, survey outputs, channel lists, bandwidth assessments, GUI/casting/application scope items, telephony design and structured cabling schedules.
- Request detail shows deliverable progress as uploaded/required with a progress bar.
- Request completion remains allowed when expected deliverables are missing, but the detail page warns: `Not all expected deliverables have been uploaded.`
- Deliverable files use the existing local pre-sales upload and shared `Document` framework.
- Pre-sales dashboard includes assigned requests, unassigned requests, due this week, overdue requests, waiting customer, internal review and completed this month cards.
- Pre-sales dashboard shows simple Requests by Engineer and Workload by Engineer summaries.
- CRM My Work includes My Pre-Sales Requests for sales-owned visibility.

Database additions:

- `PresalesDeliverable`.
- `PresalesDeliverableType`.

API additions:

- `POST /api/v1/presales-requests/:id/deliverables`

Still deferred:

- Live SharePoint/Graph upload.
- AI-assisted document analysis.
- Project creation or handoff.

## Sprint 7A.1 Tasks and Deliverables Merge

Implemented scope:

- The pre-sales request UI now shows Deliverables only as the operational checklist.
- The separate visible Tasks section has been removed from `/presales/:id`.
- The old `PresalesTask` database model remains for historical/API safety, but standard checklist generation now creates `PresalesDeliverable` records.
- Existing task rows are copied into deliverables by migration where a matching deliverable title does not already exist.
- Existing uploaded deliverable files remain linked to their deliverable records.
- Deliverables now support status: Open, In Progress, Complete and Not Required.
- Deliverables may carry description/instructions, assigned engineer and due date fields.
- Uploading or replacing a deliverable file automatically marks that deliverable Complete.
- Deliverables can be marked Complete or reopened from the request detail page.
- Deliverable progress displays as complete/required with a progress bar.
- Bill of Materials deliverables show:

```text
Create or update the Bill of Materials in the connected Quote Builder.
```

- If the request is linked to a quote, the BoM deliverable shows Open Quote Builder.
- If the request is linked to an opportunity but no quote, the BoM deliverable shows Create Quote.

Standard deliverables are generated by opportunity type:

- Guest WiFi.
- IPTV.
- MATV & TV Headend.
- Fibre & Broadband.
- Structured Cabling & Racks.
- PBX & Telephony.
- Resource scheduling.
- Project creation.
- Customer portal access.
