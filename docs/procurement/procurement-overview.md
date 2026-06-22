# Procurement Module

## Purpose

The procurement module tracks supplier purchasing, purchase orders, lead times, deliveries and supplier performance.

This module is recommended because Connected Hospitality quotes and projects will involve hardware, licences, subcontractors and delivery dependencies.

## Core Features

- Suppliers.
- Purchase orders.
- Purchase order lines.
- Project-linked purchasing.
- Delivery status.
- Lead time tracking.
- Supplier performance.

## Supplier Fields

- Supplier name.
- Contact details.
- Account manager.
- Payment terms.
- Categories supplied.
- Status.

## Purchase Order Fields

- PO number.
- Supplier.
- Project.
- Status.
- Order date.
- Expected delivery date.
- Actual delivery date.
- Total value.

## PO Statuses

- Draft.
- Submitted.
- Confirmed.
- Part Delivered.
- Delivered.
- Cancelled.

## Acceptance Criteria

The module is acceptable when project teams can see what has been ordered, what is outstanding and what may affect project delivery.

## Implementation Status

Current ConnectedOS delivery includes:

- `Supplier`, `PurchaseOrder`, `PurchaseOrderLine`, `GoodsReceipt` and `SupplierInvoice`.
- Purchase order numbering using `PO-YYYY-0001`.
- `/procurement`, `/procurement/suppliers`, `/procurement/suppliers/new`, `/procurement/suppliers/:id`, `/procurement/suppliers/:id/edit`, `/procurement/purchase-orders`, `/procurement/purchase-orders/new` and `/procurement/purchase-orders/:id`.
- Goods receipt workflow that creates asset records from PO lines where no asset exists yet.
- Supplier invoice attachment upload through the shared SharePoint-style fallback document service.
- Branded purchase order PDF output for production testing.
- Suppliers now act as central procurement master data, carrying account manager, categories supplied, payment terms, active status and editable contact details.
- Purchase Order create flow now supports supplier snapshot fields, supplier-contact autofill, delivery address and delivery date capture.
- Purchase Order lines now support SKU, manufacturer, quantity, unit cost, tax rate, tax amount and total including tax.
- Quote-linked PO creation can import product and hardware lines from visible quote versions while excluding labour and service lines by default.
- Product catalogue items can now optionally link to a central Supplier record so ConnectedOS can suggest the supplier automatically when building a PO from quote or product lines.
- Inactive suppliers are hidden from the new PO supplier selector, while the supplier master-data area still retains historic inactive records for review.
- Purchase Order detail and PDF output now show supplier, delivery, quote/project linkage, line-level tax and full subtotal/VAT/total summaries.
- Purchase Order PDF layout now follows the same safe wrapping rules as ConnectedOS project PDFs so long supplier addresses, delivery details, notes and line descriptions stay inside printable boundaries without trailing blank pages.
