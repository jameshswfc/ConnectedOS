# Projects Overview

Sprint 8 introduces the first usable ConnectedOS Projects module. Sprint 8.1 cleans up the initial QA feedback.

There is one project area in the app:

- Projects

The older `/project-management` placeholder redirects to `/projects`.

Projects are created from approved, sent or accepted quotes, with accepted quotes preferred. When a quote becomes accepted, ConnectedOS automatically creates a project if one does not already exist for that quote.

Sprint 8.1.1 also creates/syncs projects when an opportunity moves to Closed Won (PO Received). In that path ConnectedOS marks the latest linked approved/sent/accepted quote version as accepted, then uses the same project creation service as quote acceptance.

Project numbers use:

```text
PRJ-YYYY-0001
```

Implemented Sprint 8 scope:

- Project dashboard and list.
- Project creation from quote.
- Project overview, detail and edit pages.
- Tasks and task dependencies.
- Project task templates.
- Resource assignments and resource-day tracking.
- Working-day resource scheduling.
- Resource conflict detection and override logging.
- Project milestones.
- Baseline vs actual date tracking.
- PRINCE2-style stage gates.
- Budget tracking and purchase order placeholder entries.
- Budget variance and margin-at-risk visibility.
- Issues and actions log.
- Daily and weekly update records.
- Implementation document export.
- Change request records.
- Closure and support handover records.
- Branded PDF and Excel exports where required.
- Project notifications through the existing notification framework.
- Project auto-creation from accepted quotes.
- Project auto-creation from Closed Won opportunities.
- Quote accepted-status sync from Closed Won opportunities.
- Project type inherited from the linked opportunity.
- Marriott GPNS project type.
- Standard default project tasks.
- Resource-day budget calculated from quote line SKU/part codes beginning with `LAB`.
- Project completion percentage calculated from completed tasks.
- Resource budget and utilisation visibility on overview and budget sections.
- Pre-sales handover tab on project detail.
- Executive project dashboard cards for RAG, resource budget, open issues, closure and financial exposure.
- The main `/projects` dashboard now defaults to active delivery work only, with explicit `Active`, `Completed`, `Closed`, `Cancelled` and `All` views for historical tracking without cluttering live delivery oversight.

Deferred beyond Sprint 8:

- Live SharePoint folder creation.
- Live Microsoft Graph upload.
- Full procurement and purchase order generation.
- Central resource scheduling.
- Customer portal.
- Automated invoicing or accounting integration.
- AI project assistant.
