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
