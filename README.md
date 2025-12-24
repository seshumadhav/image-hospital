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

## Testing

### Local Testing

**1. Start the backend:**
```bash
npm run dev
```
The backend will start on `http://localhost:3000`

**2. Start the frontend (in a new terminal):**
```bash
cd ui
npm run dev
```
The frontend will start on `http://localhost:5173`

**3. Test the application:**
- Open `http://localhost:5173` in your browser
- Upload an image using the UI
- Verify the image URL is returned and works
- Test the clipboard copy button

**4. Test endpoints directly:**
```bash
# Health check
curl http://localhost:3000/health

# Upload an image (replace path/to/image.jpg with your image)
curl -X POST -F "file=@path/to/image.jpg" http://localhost:3000/upload

# Access uploaded image (replace TOKEN with token from upload response)
curl http://localhost:3000/image/TOKEN
```

### Production Testing (EC2)

**1. Deploy updates:**
```bash
# On EC2 instance
cd /home/ec2-user/image-hospital
./deploy.sh
```

**2. Test the application:**
- Open `http://YOUR_EC2_IP` or `http://your-domain.com` in your browser
- Upload an image using the UI
- Verify the image URL is returned and works
- Test the clipboard copy button

**3. Test endpoints directly:**
```bash
# Replace YOUR_EC2_IP with your actual EC2 public IP (e.g., 3.235.226.64)

# Health check
curl http://YOUR_EC2_IP/api/health

# Upload an image
curl -X POST -F "file=@path/to/image.jpg" http://YOUR_EC2_IP/api/upload

# Access uploaded image (replace TOKEN with token from upload response)
curl http://YOUR_EC2_IP/image/TOKEN
```

**4. Quick test commands (run from your local machine):**
```bash
# Replace with your actual EC2 public IP
EC2_IP="3.235.226.64"

# Test frontend
curl -s -o /dev/null -w "Status: %{http_code}\n" http://$EC2_IP

# Test health check
curl -s http://$EC2_IP/api/health

# Test upload endpoint (will return error for empty file, but confirms endpoint works)
curl -s -X POST -F "file=@/dev/null" http://$EC2_IP/api/upload

# Test with actual image file
curl -s -X POST -F "file=@/path/to/your/image.jpg" http://$EC2_IP/api/upload
```

**Example with actual EC2 IP:**
```bash
# Frontend status
curl -s -o /dev/null -w "Status: %{http_code}\n" http://3.235.226.64

# Health check
curl http://3.235.226.64/api/health

# Upload test
curl -X POST -F "file=@/path/to/image.jpg" http://3.235.226.64/api/upload
```


