# CrossDesk Workbench

CrossDesk is a desktop workbench for cross-border ecommerce teams. It now uses user-created local Chrome browser identities instead of fixed demo stores, embedded Google login, or credential forms.

## Browser Preview

Serve the static UI locally:

```bash
npx serve .
```

Then open:

```text
http://localhost:3000
```

The browser preview is for UI inspection only. Real account login requires the Electron desktop shell.

## Desktop App

Install dependencies:

```bash
npm install
```

Run the Electron desktop shell:

```bash
npm start
```

## Perfume Inventory API

This workspace also includes a local inventory service for the perfume supply sheet. It parses the supplier workbook, stores the latest inventory snapshot, exposes API endpoints for other agents, and serves a browser page where a new file can be uploaded to refresh inventory.

Import the current desktop workbook once:

```bash
npm run inventory:import
```

Start the API and documentation page:

```bash
npm run inventory
```

Then open the procurement platform:

```text
http://localhost:4100/
```

Public pages:

```text
/              B2B procurement homepage
/catalog       Product catalog for sellers
/dropship      One-piece dropshipping workflow
/api-center    Inventory, product-content, and dropship API center
/products/:sku Independent product detail page
/admin         Inventory upload and local management
```

Useful endpoints:

```text
GET  /api/agent/inventory
GET  /api/inventory
GET  /api/products?q=lattafa&limit=50
GET  /api/products/:sku
GET  /api/products/:sku/pack
GET  /api/stock?sku=YKW-LA-FEN
GET  /api/policy
GET  /api/catalog-pack?format=json
GET  /api/catalog-pack?format=csv
POST /api/dropship/quote
POST /api/dropship/orders
POST /api/upload
```

The upload endpoint accepts multipart form data with a `file` field. Supported formats are `.xlsx`, `.xls`, and `.csv`. Uploaded source files stay local under `data/uploads/`; the current parsed snapshot is stored in `data/inventory-state.json`.

For `.xlsx` files exported by WPS/Excel with `DISPIMG("ID_...")` cell images, the importer also extracts embedded product images into `inventory-public/product-images/` and stores the mapping in `data/image-map.json`.

The browser page at `http://localhost:4100/` acts as a B2B wholesale catalog for the full imported product feed. Each product has an independent route such as:

```text
http://localhost:4100/products/YKW-LA-FEN
```

Those product pages include listing-ready copy, product image links, fragrance notes when verified, tiered wholesale prices, stock, dropshipping flags, and download links for single-product packs. The catalog pack endpoints export the full enriched product feed for ecommerce listing workflows. Products without manual perfume-database research are labeled `catalog-generated` and can be refined later with the perfume enrichment skill.

## Local Browser Identities

Users can create any number of browser identities from the app. Each identity stores only a local label and an isolated Chrome profile directory:

```text
<Electron userData>/chrome-identities/<profile-id>
```

That means cookies, cache, local storage, and login state are separated per identity. Users log in to Google and ecommerce platforms directly in their system Google Chrome. This avoids Google's embedded-browser login block. CrossDesk does not bypass captchas, platform risk controls, or authorization rules.

## Credential Privacy

CrossDesk does not ask users to type Google passwords, platform passwords, API keys, webhook secrets, OAuth tokens, or token references into app forms.

The app may store:

- local browser identity labels
- session partition IDs
- imported knowledge files or pasted text
- local audit events

Deleting a browser identity clears the corresponding local Chrome profile data.

## Real Data Policy

The app no longer ships with mock conversations, mock orders, fixed demo stores, or preset knowledge base entries.

Real customer messages, orders, inventory, and shipping data must come from future official OAuth or approved platform-app authorization. This prototype does not collect raw API credentials or webhook secrets in the UI, so those modules show empty states until a proper authorization integration exists.

Knowledge base content comes from user-imported files or pasted text.

## Useful Commands

```bash
npm run check
```

Checks JavaScript syntax for the renderer script and Electron files.

```bash
npm run smoke
```

Runs a hidden desktop smoke test that verifies dynamic browser identity creation, real-data empty states, knowledge import, credential-input removal, privacy boundary messaging, and browser controls.
