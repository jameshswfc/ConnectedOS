# Asset Management Module

## Purpose

The asset management module tracks installed or managed technology assets such as access points, switches, firewalls, TVs, controllers, gateways and licences.

## Core Features

- Asset register.
- Serial numbers.
- Asset tags.
- Customer/project/location links.
- Warranty dates.
- Support dates.
- Status.
- Reuse/disposal notes.

## Asset Categories

- Wireless access point.
- Network switch.
- Firewall.
- Gateway.
- Controller.
- IPTV headend.
- TV.
- Licence.
- Other.

## Asset Statuses

- Ordered.
- In Stock.
- Installed.
- In Service.
- Removed.
- Reused.
- Disposed.
- Faulty.

## ISO 14001 Link

The asset module should eventually help support equipment lifecycle tracking, reuse and WEEE disposal evidence.

## Acceptance Criteria

The module is acceptable when assets can be linked to projects/customers and their lifecycle can be tracked.

## Implementation Status

Current ConnectedOS delivery includes:

- `Asset` numbering using `AST-YYYY-0001`.
- Links from assets to projects, accounts, purchase-order lines and products.
- `/assets`, `/assets/new` and `/assets/:id`.
- Asset creation from procurement goods receipts where PO lines are received.
- Lifecycle status, serial, MAC, warranty and location tracking for production testing.
