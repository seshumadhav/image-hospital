# image-hospital

See `PRD.md` for what this app does and `ARCHITECTURE.md` / `DECISONS.md` for design constraints.

## Testing

Run `npm run test:all` before starting any code change and again after finishing it —
both to confirm you're starting from a green baseline and to catch regressions before
reporting the work as done. This currently runs the Jest suite (unit tests for each
orchestration module plus full HTTP request/response tests in
`src/modules/http-api/http-api.test.ts`); see `TODO.md` for planned browser-level E2E
coverage that will fold into the same command.

Requires a local Postgres reachable with the env vars `jest.global-setup.js` reads
(`PG_HOST`, `PG_PORT`, `PG_USER`, `PG_PASSWORD`, `PG_TEST_DATABASE`) — it creates and
tears down a scratch database per run.
