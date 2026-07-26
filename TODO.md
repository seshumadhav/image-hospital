# TODO

## Browser (E2E) tests — not yet implemented

API-level tests exist (`src/modules/http-api/http-api.test.ts`), but there is no automated
browser-driven test of the actual UI. Plan, when picked back up:

1. Install `@playwright/test` as a root devDependency; install the Chromium browser binary.
2. Add `playwright.config.ts` at repo root:
   - `testDir: ./e2e`
   - `webServer`: array of two entries, both started for the test run:
     - backend: `npm run dev` (root), with `PG_DATABASE` and `BLOB_STORAGE_DIR` env vars
       pointed at an isolated e2e database/temp dir (not the jest test DB, not real dev data)
     - frontend: `npm run dev` (in `ui/`), which already proxies `/api` and `/image` to the
       backend on port 3000 (see `ui/vite.config.ts`) — no proxy changes needed
   - Add a Playwright `globalSetup`/`globalTeardown` (mirroring `jest.global-setup.js`) that
     creates/drops a fresh Postgres database for the e2e run.
3. `e2e/upload.spec.ts` covering:
   - Page title and `<h1>` read "Image Hospital"
   - Selecting a file shows a preview with `filter: none` (real color), not the grayscale
     `.art-image` decorative filter
   - Submitting the form shows the success state with a `/image/:token` URL and the
     "Valid for 1 minute." note
   - Opening the returned URL loads the actual image (status 200, image content-type)
   - Navigating to `/?error=...` shows the dismissible error banner
   - (Optional/slow) an expired or unknown token redirects home with the error banner
4. Add `npm run test:e2e` (root) and fold it into `test:all` alongside the Jest suite.
5. Add an E2E job to `.github/workflows/ci.yml` (needs a Postgres service like the existing
   test job, plus `npm ci` in both root and `ui/`, plus `npx playwright install --with-deps
   chromium`).
