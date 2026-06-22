# Project Controls

Sprint 8.2 adds project-control foundations for Connected Hospitality delivery.

## Baseline Vs Actual

Projects store:

- Baseline start.
- Baseline finish.
- Current start.
- Current finish.
- Actual start.
- Actual finish.

When a project is created, baseline dates default from the current project dates. Normal project edits update current dates. Baseline date edits are restricted to Administrator and Business Operations users.

Schedule variance is calculated as:

```text
actual or current date - baseline date
```

The UI shows:

- On time.
- X days ahead.
- X days delayed.

## Milestones

Every new project receives default milestones:

1. Customer Kick Off
2. Equipment Delivered
3. Deployment Start
4. UAT Complete
5. Handover
6. Closure

Sprint 8.4 sets milestone default dates from the project start date:

- Customer Kick Off: start + 7 days
- Equipment Delivered: start + 14 days
- Deployment Start: start + 21 days
- UAT Complete: start + 56 days
- Handover: start + 64 days
- Closure: start + 70 days

If project start date is missing, ConnectedOS falls back to today and allows the user to edit the generated dates immediately.

Milestones are separate from tasks and appear in overview, schedule, Gantt and weekly exports.

Sprint 8.3 clarifies milestone completion logic. Milestones can be completed manually or automatically when linked project tasks are completed:

- Kick Off completes when `Customer Kick Off Call` is complete.
- Equipment Delivered completes when `Equipment Order` is complete or can be manually completed.
- Deployment Start completes when `Deployment Commenced` is complete.
- UAT Complete completes when `Marriott GPNS Certificate Issued` is complete for Marriott GPNS projects, otherwise it is manually completed.
- Handover completes when `Handover to Support Completed` is complete.
- Closure completes when `Project Closure Document & Sign Off` is complete.

The project detail page shows the linked task for each milestone and includes a manual complete action.

Project Managers, Business Operations and Administrators can edit milestone title, milestone date, status, owner and commentary directly on the project detail page. Manual date edits do not disable milestone or stage-gate automation.

Sprint 8.4.5 adds milestone baseline and manual-override behaviour:

- Locking the project plan stores the current milestone date as the milestone baseline date.
- Milestones linked to shifted tasks still move automatically unless the milestone has been manually overridden.
- When a milestone is manually overridden, dependency rescheduling leaves it in place and records that the milestone was manually set.

## Gantt Layout Rules

Sprint 8.4.2 improves the Gantt header layout so week labels remain readable.

- Week columns keep enough width for the label instead of collapsing into unreadable text.
- Compact labels such as `WC 10 Jun` are used where space is tight.
- The Gantt view favours horizontal scrolling over shrinking the timeline beyond readability.
- Task bars and milestone markers remain aligned to the actual chart dates.

Sprint 8.4.3 extends this into the PDF export. The Gantt PDF is now a visual export rather than a summary table:

- landscape A4
- fixed task-name column
- week columns across the top
- task bars positioned by date
- milestone markers positioned by date
- status legend
- horizontal pagination across multiple parts where the project timeline is wider than one landscape page

## Task Actual Days Completion Rule

Project tasks now require explicit delivery-effort capture when they are completed.

- When a Project Manager, Business Operations user or Administrator clicks Complete, ConnectedOS prompts for actual days used.
- The suggested value defaults to the current actual days if present, otherwise to estimated days, otherwise `1`.
- Tasks with estimated days greater than `0` cannot be completed with `0` actual days.
- Reopening a task does not clear actual days.

Rollup distinction:

- Task actual days track delivery effort logged against tasks.
- Resource actual days track resource-assignment usage.
- These are shown separately so project summaries do not double-count effort.

Sprint 8.4.4 extends this into a clearer effort rollup on the project overview and budget views:

- Estimated Task Days
- Actual Task Days
- Task Days Variance
- Resource Scheduled Days
- Resource Actual Days
- Resource Remaining Days

Task Days Variance is calculated as:

```text
Actual Task Days - Estimated Task Days
```

ConnectedOS labels the result as:

- Under estimate
- On estimate
- Over estimate

When actual task effort exceeds estimate, the UI shows a visible `Task effort over estimate` warning badge.

## Dependency-Driven Scheduling

Sprint 8.4.4 adds dependency scheduling foundations to project tasks.

Supported dependency types:

- Finish-to-Start (`FS`)
- Start-to-Start (`SS`)
- Finish-to-Finish (`FF`)
- Start-to-Finish (`SF`)

Each dependency stores:

- predecessor task
- successor task
- dependency type
- lag days

Default dependency type is `FS`. Lag days default to `0`.

Scheduling behaviour:

- When a predecessor task date changes, ConnectedOS recalculates dependent successor dates.
- Successor task duration is preserved when dates move.
- Changes cascade to downstream successors.
- Milestones linked to moved tasks are updated to stay aligned with their linked task.
- Schedule changes are audited.

ConnectedOS prevents circular dependencies. If a user creates a dependency loop, the UI/API returns:

```text
This dependency would create a circular schedule relationship.
```

Current scheduling foundation uses working-day date movement for dependency lag and cascade logic. Public-holiday exclusion remains deferred.

Sprint 8.4.5 completes the dependency-edit path in the working project plan:

- Editing a predecessor task date in the web app now triggers the dependency scheduling service.
- Successor tasks are rescheduled using the dependency rule and lag days.
- Downstream successor chains cascade automatically.
- Linked milestones follow the linked task end date unless manually overridden.
- The UI shows `Dependent tasks were rescheduled.` after a successful cascading change.

Sprint 8.4.5b adds the default dependency foundation so the cascade has something real to work from:

- new projects create the standard default task chain as Finish-to-Start (`FS`) dependencies with `0` lag days
- Marriott GPNS projects insert the UAT dependency chain after Deployment Commenced
- `Handover Documentation Created` depends on `Marriott GPNS Certificate Issued` for Marriott GPNS work instead of depending directly on Deployment Commenced
- existing projects can use `Add Missing Default Dependencies` to backfill any missing standard dependency links without duplicating existing ones

## Task Forecast And Baseline Days

Task forecast days no longer rely on a hard-coded default of `1`.

- Forecast days are derived from working days between task start and end dates, inclusive.
- Same weekday = `1`.
- Monday to Friday = `5`.
- Monday to Sunday = `5`.
- Friday to Monday = `2`.

Project Managers, Business Operations and Administrators can still override forecast days manually where the delivery plan needs a different estimate.

## Lock Project Plan

Sprint 8.4.5 adds a simple `Lock Project Plan` action for Administrator, Business Operations and Project Manager users.

When the plan is locked, ConnectedOS stores:

- project baseline start and finish
- each task baseline start, finish and baseline forecast days
- each milestone baseline date
- the user and timestamp that locked the plan

After locking:

- forecast dates and forecast days may still be edited
- actual days are logged during delivery
- project comparisons can use baseline vs forecast vs actual values

## Automatic Status Progression

Projects start in Initiation.

Rules:

- First active/in-progress task moves the project to Active.
- All active tasks complete moves the project to Completed.
- Closure form exists moves the project to Closed.
- On Hold, Cancelled and Closed statuses are not auto-progressed.

## Stage Gates

Every project receives stage gates:

1. Initiation
2. Planning
3. Delivery
4. Validation
5. Handover
6. Closure

Stage gate statuses are:

- Not started.
- In progress.
- Complete.
- Blocked.

Blocked stage gates notify the Project Manager.

Sprint 8.3 clarifies stage-gate automation. Stage gates follow PRINCE2-style governance and update automatically where linked tasks, milestones or forms prove completion, but Project Managers can manually mark gates in progress, complete or blocked.

Default completion conditions:

- Initiation completes when the Customer Kick Off milestone is complete.
- Planning completes when `Resource Scheduling` and `Equipment Order` tasks are complete.
- Delivery completes when `Deployment Commenced` is complete.
- Validation completes when the UAT Complete milestone is complete, or can be manually completed where no UAT milestone is required.
- Handover completes when the Handover milestone is complete.
- Closure completes when the Closure milestone is complete and a closure form exists.

Manual complete and blocked states are preserved by the automatic rollup process.
