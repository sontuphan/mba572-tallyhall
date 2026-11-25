# TallyHall — Local Prototype

Open `dist/index.html` in Chrome, Edge, or Safari. No build or server is needed to use it.

## Quick Walkthrough
1. On **Today**, prepare Maya Chen's tuition reminder.
2. Review it and mark it ready. Copy/export it for manual sending.
3. Record Maya's remaining $200 with a checked source.
4. See collection marked **Done** and the local balance updated.
5. Review Noah's pending approval; no family reminder is generated.
6. Try **Tuition CSV import** and the unmatched-receipt review.

## Architecture & Scope
- **Data storage**: Saved in the browser's local storage. Back up via *Data & preferences*.
- **Privacy & network**: All example students and contacts are fictional. No network services or external systems are called.
- **AI Assistant**: A deterministic local intent demo running in a persistent right sidebar. Supported intents include overdue balances, funding, summaries, student lookups, draft requests, and payment requests (e.g. *"Record $200 for Student A"*). Mutations always require user review.
- **Single cycle**: Single-billing-cycle prototype for microschool tuition coordination.

## Development & Checks
- **Source**: `shell.html`, `style.css`, `app.js`, `model.js`, `build.mjs`.
- **Build**: `node build.mjs` (compiles Anatomy isometric geometry and settles painter's depth).
- **Checks**: `node model.test.cjs` (business logic and reconciliation test suite).
- **Dark preview**: `dist/index-dark.html` (theme can also be toggled in the profile panel).
