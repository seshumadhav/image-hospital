image-hospital
===============

Minimal image upload service with 1-minute, anonymous, time-limited URLs.

Architecture is described in `ARCHITECTURE.md` and `DECISONS.md` and implemented as:

- TypeScript backend (Node.js + PostgreSQL for metadata)
- Local filesystem–style blob abstraction (currently in-memory, swappable later)
- React monochrome UI (via Vite) for a single-page uploader

## Prerequisites

- Node.js (v18+ recommended)
- npm
- PostgreSQL 16+ (installed via Homebrew in this setup)

Ensure PostgreSQL is running:

```bash
brew services start postgresql@16
```

## Backend

From the project root:

```bash
cd /Users/smc/coding-projects/personal-projects/image-hospital

# Install deps
npm install

# Run tests (metadata-store, token-service, upload + access orchestration)
npm test

# Start the server (port 3000)
PG_USER=$(whoami) npm run dev
```

Endpoints:

- `GET /health` → `{ "status": "ok" }`
- `POST /upload` → accepts multipart `file` (image). Returns:

  ```json
  {
    "url": "http://localhost:3000/image/<token>",
    "expiresAtEpochMs": 1234567890123
  }
  ```

- `GET /image/:token` → returns image bytes while the token is valid.

## UI (monochrome React)

The UI lives under `ui/` and talks to the backend’s `/upload` endpoint.

```bash
cd /Users/smc/coding-projects/personal-projects/image-hospital/ui

# Install UI deps
npm install

# Start Vite dev server (port 5173)
npm run dev
```

Then open:

- `http://localhost:5173`

Behavior:

- Single-page, monochrome (black/white/gray) UI.
- Pick a single image.
- Click “Upload” to POST to `/upload`.
- On success:
  - Shows the image URL.
  - Shows: “Valid for 1 minute.”
- On failure:
  - Shows a simple error message.

You can click the URL to open the image in your browser (served via `GET /image/:token`).


