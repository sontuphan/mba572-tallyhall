# TallyHall — Local Prototype

Open `dist/index.html` in Chrome, Edge, or Safari. No build or server is needed to use it.

## Quick Walkthrough
1. On **Today**, open a To-Do topic, then click Maya Chen to check her invoices and history.
2. Prepare her reminder with tuition months, amounts and overdue days. Review and copy/export it. After sending it yourself, use **Record sent** to confirm the date.
3. Record Maya's remaining $200 with a checked source.
4. See collection marked **Done** and the local balance updated.
5. Review Noah's pending approval; no family reminder is generated.
6. Try **Tuition CSV import** and the unmatched-receipt review.

## Architecture & Scope
- **Data storage**: Saved in the browser's local storage. Back up via *Data & preferences*.
- **Privacy & network**: All example students and contacts are fictional. No network services or external systems are called.
- **AI Assistant**: A deterministic local intent demo running in a persistent right sidebar. Supported intents include overdue balances, funding, summaries, student lookups, draft requests, and payment requests (e.g. *"Record $200 for Student A"*). Mutations always require user review.
- **Invoices**: Multiple tuition months per student. Confirmed receipts are allocated oldest first. Existing backups without invoice details remain supported. Add a month from the student account.
- **Communication history**: Drafts, staff-confirmed sending and follow-up notes stay distinct. Sent records retain the invoice amounts at sending.

## Development & Checks
- **Source**: `shell.html`, `style.css`, `app.js`, `model.js`, `build.mjs`.
- **Build**: `node build.mjs` (compiles Anatomy isometric geometry and settles painter's depth).
- **Checks**: `node model.test.cjs` (business logic and reconciliation test suite).
- **Theme**: Light only.

## External tools mockup
The External tools page previews Brightwheel, Venmo, Zelle, and Revolut connections. Connect/Manage/Disconnect only change a separate local demo preference. They never request credentials, call provider APIs, sync data, or change tuition records. Provider access and compatibility still need assessment.

## Icons
[Lucide](https://lucide.dev/) SVG subset, bundled locally with no runtime download. Source revision: `9fcde889d8ed0c6f739cff76e086c27e072e83ec`. License: `LUCIDE-LICENSE.txt`.

## Typography
Inter variable fonts (regular and italic), embedded for offline use. Source: https://github.com/rsms/inter/tree/353b61b9f4430d5f420d56605a6e7993e0941470. License: `fonts/OFL.txt`.
