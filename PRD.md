# Image Hospital — Product Requirements

## Overview

Image Hospital is a minimal, anonymous, temporary image hosting service. A user uploads an
image and receives a shareable URL. Anyone with that URL can view/download the image — but
only for a strict, short window after upload. There are no accounts, no permanent storage,
and no image processing.

## Key Functionality

### 1. Upload an image
- User selects a JPEG or PNG file via the web UI (or POSTs directly to the API).
- Supported types are configurable server-side (default: `jpeg, jpg, png, webp`); anything
  else is rejected with a 400 and a descriptive error.
- Successful upload returns a relative URL (`/image/:token`) and the exact expiry timestamp
  (`expiresAtEpochMs`).
- The web UI shows a live preview of the selected file **in its real color** before/after
  upload — this is a photo the user is about to share, not decorative art, so it must not be
  forced into the app's monochrome theme.

### 2. Time-limited access via tokenized URL
- Every upload gets a cryptographically strong, opaque, URL-safe token.
- The URL is valid for **exactly 60 seconds** from creation.
- A clock skew tolerance of **±5 seconds** is allowed across nodes.
- **Deny-by-default**: any ambiguity (unknown token, expired token, missing metadata) results
  in access being denied — never a false allow.

### 3. View / download the image
- `GET /image/:token` returns the original image bytes with the original `Content-Type`,
  byte-for-byte identical to what was uploaded.
- An invalid or expired token redirects to the home page with a visible, dismissible error
  banner explaining the link is invalid or has expired.
- This must work from a fresh browser/session with no cookies or prior state — the token
  alone is the credential.

### 4. No accounts, no persistence beyond the window
- No login, no user identity, no per-user history.
- Nothing is deleted proactively; expiry is enforced purely by denying access after the
  window closes (metadata and blobs may remain on disk, but are permanently inaccessible
  through the app).

### 5. Operational basics
- `GET /health` reports service health for load balancers / uptime checks.
- Blob storage (local filesystem today, S3-ready) and metadata storage (Postgres) are both
  behind swappable interfaces — the app must run correctly behind a load balancer with
  multiple instances sharing one metadata store.

## Non-Goals
- No authentication, accounts, or per-user history
- No permanent URLs or opt-in retention
- No image transformation/processing (resize, compress, etc.)
- No deletion or cleanup jobs
- No cloud-specific logic baked into business logic (storage is abstracted)

## Test Coverage Map

| Functionality | Covered by |
|---|---|
| Upload validation, expiry computation, token generation | `src/modules/upload-orchestration/*.test.ts`, `src/modules/token-service/*.test.ts` |
| Deny-by-default expiry/clock-skew logic | `src/modules/image-access-orchestration/*.test.ts` |
| Metadata durability | `src/modules/metadata-store/*.test.ts` |
| Full HTTP request/response behavior (`/health`, `/upload`, `/image/:token`) | `src/modules/http-api/http-api.test.ts` |
| End-to-end browser flow (upload → preview color → success state → viewing the link → error banner) | `e2e/*.spec.ts` (Playwright) |

Run the full suite with `npm run test:all` — see `CLAUDE.md` for when this is required.
