# Database Entity Outline

## Purpose

This document defines the initial shared entity model for ConnectedOS. It is not the final Prisma schema, but it gives Codex the business objects that must exist and how modules should share them.

## Global Fields

Most major business tables should include:

- id
- created_at
- created_by_id
- updated_at
- updated_by_id
- deleted_at
- deleted_by_id
- status

Soft delete should be used for major business records.

## Core Platform Entities

### User

Represents an internal or customer user.

Fields:

- id
- microsoft_id
- display_name
- email
- job_title
- department
- role_id
- is_active
- user_type: internal or customer

### Role

Defines user role.

Examples:

- System Administrator
- Director
- Sales Manager
- Sales User
- Pre-Sales Manager
- Pre-Sales Engineer
- Project Manager
- Engineer
- Finance User
- Customer User

### Permission

Defines granular actions.

Examples:

- crm.account.read
- crm.account.create
- crm.opportunity.read_all
- quotes.approve
- expenses.approve
- projects.manage_assigned

### RolePermission

Links roles to permissions.

### AuditLog

Stores critical change history.

### Notification

Stores in-app notifications and metadata for email/Teams alerts.

### Document

Stores references to files held in SharePoint or other storage.

### Comment

Reusable comments linked to module records.

### Activity

Reusable activity record for calls, emails, meetings, tasks and notes.

## CRM Entities

### Account

Customer or prospect organisation.

Fields:

- id
- name
- account_type: prospect, customer, partner, supplier, former_customer
- website
- phone
- address
- city
- country
- industry
- account_owner_id
- status
- notes

### Contact

Person linked to an account.

Fields:

- id
- account_id
- first_name
- last_name
- job_title
- email
- phone
- mobile
- linkedin_url
- relationship_strength
- is_primary
- status

### Lead

Unqualified sales lead.

Fields:

- id
- account_id optional
- contact_id optional
- source
- lead_status
- estimated_value
- owner_id
- next_action_date

### Opportunity

Sales opportunity/deal.

Fields:

- id
- account_id
- primary_contact_id
- opportunity_name
- owner_id
- stage
- value
- margin_percent
- probability_percent
- weighted_value
- expected_close_date
- source
- competitor
- lost_reason
- won_date
- lost_date
- status

### SalesActivity

CRM activity such as call, email, meeting or note.

Fields:

- id
- account_id
- contact_id optional
- opportunity_id optional
- activity_type
- subject
- description
- due_date
- completed_at
- owner_id

## Quoting Entities

### Product

Product catalogue item imported from pricing sheets or created manually.

Fields:

- id
- sku
- manufacturer
- supplier
- category
- description
- cost_price
- sell_price
- margin_percent
- lead_time_days
- is_active

### PriceImport

Tracks uploaded supplier price sheets.

### Quote

Commercial quote linked to an account and opportunity.

Fields:

- id
- quote_number
- account_id
- opportunity_id
- owner_id
- quote_status
- version
- subtotal_cost
- subtotal_sell
- discount_amount
- total_sell
- gross_margin_amount
- gross_margin_percent
- valid_until
- created_by_id
- approved_by_id

### QuoteLine

Individual line item.

Fields:

- id
- quote_id
- product_id optional
- line_type: product, labour, service, discount, note
- description
- quantity
- unit_cost
- unit_sell
- margin_percent
- total_cost
- total_sell

## Pre-Sales Entities

### PresalesRequest

Request for technical assistance.

Fields:

- id
- request_number
- account_id
- opportunity_id optional
- requested_by_id
- assigned_to_id
- request_type
- priority
- description
- deadline
- status
- sla_status
- sharepoint_folder_url

### PresalesTask

Task linked to a pre-sales request.

### PresalesDeliverable

Expected or uploaded engineering output linked to a pre-sales request.

Fields:

- id
- presales_request_id
- deliverable_type
- title
- document_id optional
- uploaded_by_id optional
- uploaded_at
- created_at
- updated_at

## Project Entities

### Project

Delivery project.

Fields:

- id
- project_number
- account_id
- opportunity_id optional
- quote_id optional
- project_name
- project_manager_id
- status
- start_date
- target_end_date
- actual_end_date
- contract_value
- budget_cost
- forecast_cost
- actual_cost
- health_status

### ProjectMilestone

### ProjectTask

### ProjectRisk

### ProjectIssue

### ChangeRequest

### ProjectBudgetLine

## Scheduling Entities

### ResourceBooking

Books staff time against projects, pre-sales, leave or other activities.

Fields:

- id
- user_id
- project_id optional
- presales_request_id optional
- booking_type
- start_datetime
- end_datetime
- hours
- status
- notes

## Leave Entities

### LeaveRequest

Fields:

- id
- user_id
- leave_type
- start_date
- end_date
- total_days
- reason
- status
- approver_id
- approved_at
- rejected_at

## Expenses Entities

### ExpenseClaim

Fields:

- id
- claimant_id
- project_id optional
- account_id optional
- claim_number
- status
- total_amount
- submitted_at
- approved_by_id
- approved_at
- paid_at

### ExpenseLine

Fields:

- id
- claim_id
- category
- description
- amount
- tax_amount
- transaction_date
- receipt_document_id

### ReceiptPack

Generated PDF containing all receipts for an expense claim.

## Procurement Entities

### PurchaseOrder

### PurchaseOrderLine

### Supplier

## Asset Entities

### Asset

Tracks equipment such as access points, switches, firewalls, TVs and controllers.

Fields:

- id
- asset_tag
- serial_number
- manufacturer
- model
- category
- status
- account_id optional
- project_id optional
- location
- purchase_order_id optional

## Reporting Entities

Reporting should generally use transactional tables rather than duplicate data. Aggregation tables may be added later for performance.
