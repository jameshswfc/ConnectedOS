# Project Permissions

Sprint 8 uses the existing role and permission model.

Seeded permissions:

- projects.read_all
- projects.read_assigned
- projects.create
- projects.update
- projects.delete
- projects.manage_tasks
- projects.manage_resources
- projects.manage_budget
- projects.export
- projects.forms
- projects.close

## Role Behaviour

Administrator has full project access.

Business Operations can read all projects and manage projects, tasks, resources, budget fields, forms and exports.

Project Manager can create projects and manage assigned projects, tasks, resources, forms and exports.

Only active users with the Project Manager role appear in the Project Manager selector.

Project Engineer can view assigned projects and update assigned project work.

Field Engineer can view assigned projects and update assigned field/project work.

Sales can read projects linked to their opportunities or quotes.

Pre-Sales can read projects linked to their pre-sales requests.

Restricted pages render friendly Access Denied. API routes continue returning JSON 401/403 responses.

Project exports require `projects.export`. Project forms require project update/forms permissions through the existing server-side project access checks.

Sprint 8.2 controls follow the same model:

- Administrator and Business Operations can manage all project controls.
- Project Managers can manage controls on assigned projects.
- Project Engineer and Field Engineer users can update assigned work only.
- Sales and Pre-Sales users retain read-only linked project visibility.
- API routes keep returning JSON 401/403 responses.
- Pages render friendly Access Denied.
