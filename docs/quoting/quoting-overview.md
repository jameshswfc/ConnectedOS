# Quoting and BoM Module

## Purpose

The quoting module allows Connected Hospitality to build quotes and bills of materials using uploaded pricing sheets, product catalogues, labour lines, professional services and controlled margins.

The module should use James's existing quote tool as a workflow reference when available.

## Objectives

- Import supplier/product price sheets.
- Maintain product catalogue.
- Build BoMs quickly.
- Apply margin and discount rules.
- Create quote versions.
- Export professional PDF quotes.
- Export Excel BoMs.
- Convert accepted quotes into projects and project budgets.

## Core Features

### Product Catalogue

Products must include:

- SKU.
- Manufacturer.
- Supplier.
- Category.
- Description.
- Cost price.
- Sell price.
- Margin percentage.
- Lead time.
- Active/inactive status.

Categories may include:

- Wireless access points.
- Switches.
- Firewalls.
- Controllers.
- Gateways.
- IPTV equipment.
- Cabling.
- Licences.
- Support.
- Labour.
- Professional services.

### Pricing Sheet Upload

Users must be able to upload XLSX/CSV pricing sheets.

Import workflow:

1. Upload file.
2. Preview detected columns.
3. Map columns to product fields.
4. Validate rows.
5. Show import errors.
6. Confirm import.
7. Update product catalogue.
8. Record price import history.

### Quote Builder

Users must be able to:

- Create quote from opportunity.
- Add products.
- Add labour.
- Add professional services.
- Add notes.
- Add discounts.
- Change quantities.
- Override sell price where permitted.
- Apply margin to line, section or whole quote.
- Clone quote.
- Create new version.

### Labour and Professional Services

Labour must be itemised rather than bundled.

Possible lines:

- Project management.
- Pre-sales design.
- Wireless survey.
- Engineering day rate.
- Installation.
- Configuration.
- Documentation.
- Handover.
- Travel.

### Quote Workflow

Statuses:

- Draft.
- Internal Review.
- Approved.
- Rejected.
- Sent.
- Accepted.
- Declined.
- Expired.
- Converted to Project.

### Approval Workflow

Approval required when:

- Discount exceeds threshold.
- Margin below threshold.
- Quote value above threshold.
- Manual price override used.

### Outputs

- PDF quote.
- Excel BoM.
- Internal margin sheet.
- Project budget on conversion.

## Permissions

Sales users can create quotes for their opportunities.

Sales managers can approve normal quotes.

Directors can approve high-value or low-margin quotes.

Finance can view quote financials.

## Dashboards

Quote dashboard should show:

- Draft quotes.
- Quotes awaiting approval.
- Quotes sent.
- Quotes accepted.
- Quote value by month.
- Average margin.

## Acceptance Criteria

The quoting module is acceptable when:

- Products can be imported and maintained.
- Quotes can be built with itemised lines.
- Margin is calculated correctly.
- PDF and Excel exports work.
- Accepted quote can create a project.
- Audit and approval flows work.

## Sprint 4 Quote/BoM MVP

Implemented scope:

- Product catalogue with supplier + SKU uniqueness.
- Product list and create/edit UI.
- CSV-only supplier price import.
- Price import history with row counts, successful rows, failed rows, status and error summary.
- Quotes linked to accounts and optional CRM opportunities.
- Quote number format `Q-YYYY-0001`.
- Quote versions.
- Quote lines for products, labour, services and notes.
- Unit sell price override on quote lines.
- Service-layer quote calculations for line totals, quote totals and margin.
- Opportunity detail linked quote list and Create Quote action.
- Server-side quote permissions using `quotes.read_all`, `quotes.read_own`, `quotes.create`, `quotes.update`, `quotes.delete`, `quotes.approve` and `quotes.export`.
- Audit logging for quote, quote version and quote line service actions.

Deferred from Sprint 4:

- PDF quote export.
- Excel BoM export.
- Approval workflow.
- Accepted quote to project conversion.
- Procurement/supplier ordering workflow.
- Configurable quote templates.
- SharePoint document generation.

## Sprint 5 Quote Outputs and Approvals

Implemented scope:

- Customer-facing PDF quote export generated from server-side HTML.
- Excel BoM export for purchasing and delivery planning.
- Internal Excel margin sheet for management and finance review.
- Quote export history for PDF, BoM and margin sheet generation.
- Quote approval requests linked to quote versions.
- Seeded approval rules:
  - Low margin below 25%.
  - High value above GBP 50,000.
  - Product line sell price reduced below catalogue default sell price.
- Quote status workflow:
  - Draft to Internal Review.
  - Internal Review to Approved or Rejected.
  - Approved to Sent.
  - Sent to Accepted, Declined or Expired.
- Server-side validation prevents invalid quote status transitions.
- Approved quote versions are locked and cannot have lines added, changed or removed.
- Historical quote versions can still be exported.
- Accepted quotes linked to opportunities update the CRM opportunity to Closed Won (PO Received).

Customer PDF content:

- Cover page fields.
- Customer information.
- Quote details.
- Product, labour, service and note lines.
- Customer-facing totals.

Customer PDF exclusions:

- Cost prices.
- Margin values.
- Internal calculations.

Internal BoM export fields:

- SKU.
- Manufacturer.
- Supplier.
- Description.
- Quantity.
- Lead time.
- Cost price.
- Sell price.

Internal margin sheet fields:

- SKU.
- Description.
- Quantity.
- Cost.
- Sell.
- Margin.
- Margin percentage.
- Supplier.

Accepted quote to project conversion design:

- Project creation remains deferred until the project management sprint is explicitly approved.
- The future conversion should use an accepted quote as the commercial source of truth.
- The future conversion should create a project linked to the quote, opportunity and account.
- Quote line totals should become the starting project budget.
- Product, labour and service lines should map into project budget categories rather than procurement or scheduling records during initial conversion.
- The conversion must be audited and should not be available for unaccepted quotes.

Deferred from Sprint 5:

- Actual project creation.
- SharePoint storage of generated PDF and Excel files.
- Customer portal quote sharing.
- Approval rule administration UI.
- Configurable quote templates.
- Cover page imagery, vendor logos and terms and conditions library.
- Procurement or supplier ordering from BoM lines.

## Sprint 5.1 Quote Workflow, Product Upload, Branding and Approval Fixes

Implemented scope:

- Quote creation is tied to CRM opportunities.
- New quotes require an opportunity, a contact linked to the opportunity account, a quote title/project name and High Level Scope.
- Quote creation derives account/customer details from CRM account, contact and opportunity records.
- Free-text customer and hotel entry is not used on quote creation.
- New quote creation redirects users directly to the quote builder for version 1.
- Quote creation logs a completed CRM note activity against the linked account and opportunity.
- Quote notes have been replaced in the workflow by compulsory High Level Scope.
- Product catalogue items now support item types: product, labour and service.
- CSV price imports now upload product, labour and service catalogue items.
- Quote line builder supports adding product, labour and service lines from the catalogue.
- Price Imports page shows required columns, allowed item types, an example row, import errors and a sample CSV download.
- Customer PDF export uses Connected Hospitality purple/orange branding and includes account, contact, address, project, quote reference, version, prepared by/date, High Level Scope, line items, totals and terms placeholder.
- Customer PDF excludes cost, margin and internal calculations.
- Excel BoM export uses branded headers, grouped sections, section subtotals and grand total structure.
- Internal margin sheet uses branded headers, grouped sections and includes cost, sell, margin and margin percentage.
- Submit for Approval always creates a pending approval request and moves the quote to Internal Review.
- Submit for Approval no longer auto-approves quotes.
- Approval submission creates in-app notifications for users with `quotes.approve`.
- Approval submission sends through the email stub to `james@connectedhsp.com`.
- Accepted quotes update the linked CRM opportunity to Closed Won (PO Received), set opportunity status to won, update opportunity value and weighted value to the accepted quote total, and log a completed CRM activity.
- Account and Opportunity detail pages show linked quote status, approval status, value, latest version and quote links.

Current CSV columns:

```text
supplier,sku,manufacturer,category,description,item_type,unit_cost,unit_sell,lead_time_days
```

Allowed `item_type` values:

- `product`.
- `labour`.
- `service`.

Example CSV:

```csv
supplier,sku,manufacturer,category,description,item_type,unit_cost,unit_sell,lead_time_days
Connected Hospitality,LAB-PM-DAY,Connected Hospitality,Professional Services,Project Management Day,labour,450,750,0
Connected Hospitality,LAB-ENG-DAY,Connected Hospitality,Engineering,Engineering Day Rate,labour,350,650,0
Connected Hospitality,SVC-WIFI-DESIGN,Connected Hospitality,Design Services,WiFi Design Service,service,500,950,0
Ruckus,AP-001,Ruckus,Wireless AP,Ruckus Test Access Point,product,100,150,7
```

Approval workflow:

1. Draft quote is submitted for approval.
2. Quote status becomes Internal Review.
3. Approval request is created with Pending status.
4. Approvers receive in-app notification.
5. Email stub sends approval request to `james@connectedhsp.com`.
6. Approver approves or rejects.
7. Approved quote versions become locked.
8. Rejection requires a reason.

Deferred from Sprint 5.1:

- Live email provider integration.
- Confirming production spelling/recipient for `james@connectedhsp.com`.
- Embedding the final uploaded image logo in exports; current output uses branded Connected Hospitality text/header styling.
- Full visual match to a supplied BoM file if an asset is later added to the repository.

Required CSV columns:

```text
supplier,sku,manufacturer,category,description,item_type,unit_cost,unit_sell,lead_time_days
```

Quote line calculations:

- `lineCostTotal = quantity x unitCost`.
- `lineSellTotal = quantity x unitSell`.
- `lineMargin = lineSellTotal - lineCostTotal`.
- `lineMarginPercent = lineMargin / lineSellTotal`.
- Quote totals are the sum of non-deleted quote lines.
- Divide-by-zero margin results return `0%`.

## Sprint 5.3 Quote Builder, Approval and Export Fixes

Implemented scope:

- Quote line quantities are integer-only with a minimum of `1`.
- Quantity inputs increment in whole numbers and display as integers.
- Existing quote lines can be edited from the quote builder.
- Existing quote lines can be deleted from the quote builder after user confirmation.
- Quote line edit and delete operations recalculate quote/version totals and margins in the service layer.
- Quote line edit and delete operations are audited with explicit quote-line audit actions.
- Customer PDF export uses server-side PDF generation with Connected Hospitality branding, customer/project sections, High Level Scope, grouped product/labour/service/note commercial sections, totals and editable terms.
- PDF export logs quote/version/logo context on failures and tolerates missing optional contact phone, address and project fields.
- Quote approval prevents users approving their own quote unless they have `quotes.approve_own`.
- `quotes.approve_own` is seeded for Director and System Administrator roles by default.
- Sales Manager can approve other users' quotes but does not receive `quotes.approve_own` by default.
- Quote dashboard uses status tabs with counts for Draft, Awaiting Approval, Approved, Sent, Accepted, Declined and Expired.
- Quote status badges are shown on quote list, quote detail, account quote panels and opportunity quote panels.
- Sent quotes expire automatically after 30 days when quote lists are evaluated, with audit and owner notification records created.

Deferred:

- Hosted cron/scheduler configuration for quote expiry outside app traffic.
- A separate database status for changes requested; Request Changes currently follows the rejected/rework path with comments and audit logging.

## Sprint 5.4 Quote Terms and Long-Form Proposal Output

Implemented scope:

- Quote terms are stored on `QuoteVersion` so historical versions retain the wording used at export time.
- New quote versions default to the standard Connected Hospitality terms wording.
- Sales users can edit quote-version terms from the quote builder before export.
- Short-form customer PDF exports include the editable terms and use `sales@connectedhsp.com` in the footer.
- Short-form PDF Customer Details and Project Details panels are taller and allow wrapped contact/address/project text.
- Long-form proposal PPTX export uses the five-page Connected Hospitality template at:

```text
public/templates/connected-hospitality-long-form-proposal-template.pptx
```

- Long-form proposal PDF output is deferred from the user interface; long-form proposal export is PPTX-only for now.
- Long-form page 1 populates linked Account name and quote/project/opportunity name.
- Long-form page 5 populates commercial category totals and keeps the template acceptance/signature area clear.
- Long-form page 6 is added during PPTX generation for editable quote terms under `Terms & Commercial Notes`.
- Pages 2-4 remain fixed Connected Hospitality proposal content for this sprint.
- Quote export actions are shown as primary workflow buttons: `Export Quote`, `Export Proposal`, `Export Quote Excel` and `Export Internal`.

Commercial category mapping:

- Product line item type `product` maps to Hardware, Software & Licensing.
- Labour/service lines with category containing `installation` or `cabling` map to Installation & Cabling.
- Labour/service lines with category containing `project management` map to Project Management.
- Other labour/service lines map to Professional Services.
- Lines where category cannot be determined map to Hardware, Software & Licensing.
- Zero-value commercial category rows are hidden from the long-form page 5 output.

Deferred:

- Opportunity-type-specific customisation of long-form pages 2-4.
- Server-side conversion from populated PPTX to PDF using an office rendering engine.
- User-facing long-form proposal PDF export.

## Sprint 7A Quote Ownership

Implemented scope:

- Quotes have explicit owner visibility through `Quote.ownerId`.
- New quotes inherit the owner from the linked CRM opportunity.
- Existing quotes keep their current owner if opportunity ownership changes later.
- Quote list shows Owner and Salesperson columns.
- Quote list supports Salesperson filtering for Administrator and Business Operations users.
- Quote list supports a My Quotes filter.
- CRM My Work includes My Quotes.
- Sales users are scoped to their own quotes server-side.
