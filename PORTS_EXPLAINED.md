# Understanding Ports 3000 and 5173

## Quick Summary

- **Port 3000**: Backend API server (Node.js/TypeScript)
- **Port 5173**: Frontend development server (Vite/React)

## Port 3000: Backend API Server

### What It Is
- **Technology**: Node.js server running TypeScript
- **Purpose**: Handles all backend logic (API endpoints, database, file storage)
- **Code Location**: `src/server.ts` and `src/modules/http-api/`

### What It Does
1. **API Endpoints**:
   - `POST /upload` - Accepts image uploads
   - `GET /image/:token` - Serves uploaded images
   - `GET /health` - Health check endpoint

2. **Backend Services**:
   - Connects to PostgreSQL database
   - Stores image files (blob storage)
   - Generates tokens for image URLs
   - Manages image expiration (1 minute)

3. **Configuration**:
   - Port defined in `config/config.json` → `server.port` (default: 3000)
   - Can be overridden with environment variable `PORT`

### How to Run
```bash
# From project root
npm run dev          # Development mode (uses ts-node)
npm run build && npm start  # Production mode
```

### Access
- **Local**: `http://localhost:3000`
- **Direct API call**: `curl http://localhost:3000/health`
- **In production**: Not directly accessible (behind Nginx on port 80/443)

---

## Port 5173: Frontend Development Server

### What It Is
- **Technology**: Vite (modern build tool and dev server)
- **Purpose**: Serves React frontend during development
- **Code Location**: `ui/` directory

### What It Does
1. **Serves Frontend**:
   - React application (single-page app)
   - Static assets (images, CSS, JavaScript)
   - Hot Module Replacement (HMR) - instant updates when you change code

2. **Development Features**:
   - Fast refresh (see changes instantly)
   - Source maps (debugging)
   - Development optimizations

3. **Proxy Configuration**:
   - Proxies `/api/*` requests to backend (port 3000)
   - Proxies `/image/*` requests to backend (port 3000)
   - Serves static files from `ui/public/` directly

### How to Run
```bash
# From ui/ directory
cd ui
npm run dev
```

### Access
- **Local**: `http://localhost:5173`
- **This is what you open in your browser during development**

---

## How They Work Together

### Development Flow

```
Browser (you)
    ↓
    http://localhost:5173  (Frontend - Vite)
    ↓
    [User clicks "Upload"]
    ↓
    Frontend makes request to: /api/upload
    ↓
    Vite Proxy intercepts /api/*
    ↓
    Forwards to: http://localhost:3000/upload
    ↓
    Backend (Node.js on port 3000)
    ↓
    Processes upload, saves to database
    ↓
    Returns: { url: "/image/token123" }
    ↓
    Response goes back through proxy
    ↓
    Frontend receives response
    ↓
    Displays image URL to user
```

### Example Request Flow

**1. User uploads image:**
```
Browser → http://localhost:5173/api/upload
         ↓ (Vite proxy)
         → http://localhost:3000/upload
         ↓ (Backend processes)
         ← { url: "/image/abc123" }
         ↓ (Vite proxy)
         ← Response to browser
```

**2. User accesses image:**
```
Browser → http://localhost:5173/image/abc123
         ↓ (Vite proxy)
         → http://localhost:3000/image/abc123
         ↓ (Backend serves image)
         ← Image bytes
         ↓ (Vite proxy)
         ← Image displayed in browser
```

---

## Why Two Ports?

### Separation of Concerns
- **Frontend (5173)**: UI, user interaction, presentation
- **Backend (3000)**: Business logic, data, file handling

### Development Benefits
1. **Independent Development**: 
   - Frontend and backend can be developed separately
   - Different teams can work on each
   - Different technologies (React vs Node.js)

2. **Hot Reload**:
   - Frontend changes: Instant refresh (Vite HMR)
   - Backend changes: Restart backend server

3. **Testing**:
   - Test backend API directly: `curl http://localhost:3000/health`
   - Test frontend separately
   - Mock backend responses during frontend development

4. **Production Flexibility**:
   - Frontend can be served from CDN
   - Backend can be scaled independently
   - Can deploy frontend and backend to different servers

---

## Production vs Development

### Development (Local)
```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │ http://localhost:5173
       ↓
┌─────────────┐
│ Vite (5173) │ ← Frontend Dev Server
└──────┬──────┘
       │ Proxy /api/* → localhost:3000
       ↓
┌─────────────┐
│ Node (3000) │ ← Backend API
└─────────────┘
```

### Production (EC2)
```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │ https://thegreyward.duckdns.org
       ↓
┌─────────────┐
│   Nginx      │ ← Web Server (port 80/443)
│  (port 80)   │   Serves static files + proxies
└──────┬──────┘
       │
       ├─→ / (root) → Serves ui/dist/* (built frontend)
       │
       └─→ /api/* → Proxy to localhost:3000
                    /image/* → Proxy to localhost:3000
       ↓
┌─────────────┐
│ Node (3000) │ ← Backend API (same as dev)
└─────────────┘
```

**Key Difference**: In production, there's no Vite dev server. Instead:
- Frontend is **built** (`npm run build`) into static files in `ui/dist/`
- Nginx serves these static files directly
- Nginx proxies API requests to the backend (same as Vite did in dev)

---

## Port Configuration

### Backend Port (3000)
**Config File**: `config/config.json`
```json
{
  "server": {
    "port": 3000
  }
}
```

**Override with environment variable**:
```bash
PORT=4000 npm run dev  # Runs on port 4000 instead
```

### Frontend Port (5173)
**Config File**: `ui/vite.config.ts`
```typescript
server: {
  port: 5173,  // Vite default is 5173
}
```

**Override with environment variable**:
```bash
PORT=8080 npm run dev  # Runs on port 8080 instead
```

---

## Common Scenarios

### Scenario 1: "I changed backend code, but changes aren't showing"
**Solution**: Restart the backend server
```bash
# Stop current server (Ctrl+C)
# Then restart:
npm run dev
```

### Scenario 2: "I changed frontend code, but changes aren't showing"
**Solution**: Vite should auto-reload. If not:
- Check browser console for errors
- Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
- Restart Vite: Stop (Ctrl+C) and run `npm run dev` again in `ui/` directory

### Scenario 3: "API calls are failing"
**Check**:
1. Is backend running? `curl http://localhost:3000/health`
2. Is frontend proxy configured? Check `ui/vite.config.ts`
3. Are you accessing via port 5173? (not 3000 directly)

### Scenario 4: "I want to test backend directly"
**Solution**: Use curl or Postman
```bash
# Test health endpoint
curl http://localhost:3000/health

# Test upload
curl -X POST -F "file=@image.jpg" http://localhost:3000/upload
```

---

## Key Takeaways

1. **Port 3000 = Backend**: Handles all server-side logic
2. **Port 5173 = Frontend**: Development server for React app
3. **They communicate**: Vite proxies API requests from 5173 → 3000
4. **Production**: Only port 3000 runs (Nginx serves frontend files)
5. **Both needed in dev**: Frontend (5173) for UI, Backend (3000) for API

---

## Visual Diagram

```
┌─────────────────────────────────────────┐
│         DEVELOPMENT MODE                 │
├─────────────────────────────────────────┤
│                                         │
│  Browser                                │
│    │                                    │
│    │ http://localhost:5173              │
│    ↓                                    │
│  ┌──────────────┐                       │
│  │ Vite (5173)  │ ← Frontend Dev Server │
│  │              │   - Serves React app  │
│  │  Proxy:      │   - Hot reload        │
│  │  /api → 3000 │   - Development tools │
│  └──────┬───────┘                       │
│         │                                │
│         │ Proxies API calls              │
│         ↓                                │
│  ┌──────────────┐                       │
│  │ Node (3000)  │ ← Backend API         │
│  │              │   - Handles uploads   │
│  │  Endpoints:  │   - Serves images     │
│  │  /upload     │   - Database access   │
│  │  /image/:id  │   - Business logic    │
│  │  /health     │                       │
│  └──────────────┘                       │
│                                         │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│         PRODUCTION MODE                 │
├─────────────────────────────────────────┤
│                                         │
│  Browser                                │
│    │                                    │
│    │ https://thegreyward.duckdns.org   │
│    ↓                                    │
│  ┌──────────────┐                       │
│  │ Nginx (80/443)│ ← Web Server         │
│  │              │   - Serves static     │
│  │  Serves:     │     files (ui/dist)  │
│  │  / → dist/*  │   - Proxies API       │
│  │  /api → 3000 │   - SSL/HTTPS         │
│  └──────┬───────┘                       │
│         │                                │
│         │ Proxies API calls              │
│         ↓                                │
│  ┌──────────────┐                       │
│  │ Node (3000)  │ ← Backend API         │
│  │              │   (Same as dev)       │
│  └──────────────┘                       │
│                                         │
└─────────────────────────────────────────┘
```

---

## Summary

- **3000**: Your backend API - handles data, files, database
- **5173**: Your frontend dev server - serves React app during development
- **In production**: Only 3000 runs (Nginx serves built frontend files)
- **They work together**: Frontend makes API calls, backend responds
- **Proxy magic**: Vite (dev) or Nginx (prod) routes requests correctly

Think of it like a restaurant:
- **Port 5173 (Frontend)**: The dining room where customers sit
- **Port 3000 (Backend)**: The kitchen where food is prepared
- **Proxy**: The waiter who takes orders from dining room to kitchen

