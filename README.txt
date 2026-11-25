TallyHall — local prototype
Open dist/index.html in Chrome, Edge, or Safari. No build or server is needed to use it.

Try:
1. On Today, prepare Maya Chen's tuition reminder.
2. Review it and mark it ready. Copy/export it for manual sending.
3. Record Maya's remaining $200 with a checked source.
4. See collection marked Done and the local balance updated.
5. Review Noah's pending approval; no family reminder is generated.
6. Try Tuition CSV import and the unmatched-receipt review.

Data is saved in this browser's local storage. Back up via Data & preferences.
All example students and contacts are fictional. No network services are called.

The assistant is a deterministic local intent demo, not a connected AI model.
Supported: overdue balances, funding, summaries, student lookups, draft requests,
and payment requests like "Record $200 for Student A". Mutations require review.
This is a single-billing-cycle prototype, not a production financial system.

Source: shell.html, style.css, app.js, model.js, build.mjs.
Build: node build.mjs (uses the locally installed Anatomy kit).
Checks: node model.test.cjs.
Dark preview: dist/index-dark.html. Theme can also be toggled in the sidebar.
