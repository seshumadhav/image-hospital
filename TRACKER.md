# image-hospital — Project Tracker

## 1. Core Idea (North Star)

image-hospital is a minimal service that allows users to upload an image and receive a short-lived URL that is valid for exactly 1 minute.

The core goal is **secure, temporary image access** with:
- strict expiry enforcement
- deny-by-default semantics
- simple UX
- clean, swappable architecture

This project intentionally prioritizes **correctness, clarity, and evolution-readiness** over features.

---

## 2. Current State (v1 — Complete)

### Functional Capabilities
- Upload image via HTTP endpoint
- Store image on local filesystem
- Generate cryptographically strong, opaque token
- Persist token metadata durably
- Enforce strict 60-second expiry
- Deny access on ambiguity (clock skew tolerated ±5s)
- Serve image via tokenized URL
- Minimal monochrome UI for upload and URL display
- CI validates tests on every push

### Non-Goals (Still True)
- No authentication or user accounts
- No permanent URLs
- No image processing or transformation
- No deletion or cleanup jobs
- No cloud-specific logic
- No CDN or caching layer

---

## 3. Architectural Principles (Frozen)

These principles must not be violated without explicit intent change.

- **Policy lives outside HTTP**
  - Expiry and access rules live in orchestration, not handlers.
- **Deny by default**
  - Missing or ambiguous state → access denied.
- **Async at I/O boundaries**
  - All storage and network interactions are async.
- **Thin adapters**
  - HTTP and UI layers translate inputs/outputs only.
- **Swappable infrastructure**
  - Blob storage and metadata store are abstracted.
- **Local-first, cloud-ready**
  - Local implementations today, cloud-ready seams preserved.

---

## 4. Module Breakdown (As Built)

### Backend
- `http-api`
  - Health check
  - Upload endpoint
  - Image access endpoint
  - No business logic

- `upload-orchestration`
  - Validates upload
  - Coordinates blob storage, token generation, metadata persistence

- `image-access-orchestration`
  - Centralized expiry enforcement
  - Deny-by-default access policy
  - Blob retrieval on allowed access only

- `token-service`
  - Cryptographically secure, opaque, URL-safe tokens
  - Exhaustive property-based tests

- `metadata-store`
  - Async, durable interface
  - Postgres-backed implementation
  - DB-agnostic contract

- `blob-storage`
  - Local filesystem implementation
  - Abstracted for future S3 swap

### UI
- Minimal React UI
- Monochrome
- Single-page upload + URL display
- No backend logic

---

## 5. Decisions Log (Summary)

- URLs expire exactly 60 seconds after creation
- Clock skew of ±5 seconds is acceptable
- When in doubt, access is denied
- No deletion logic required
- Backend must be safe behind a load balancer
- Metadata must be durable and shared
- If DB is used, Postgres is the default
- Interfaces must be storage-agnostic

(Authoritative details live in DECISIONS.md)

---

## 6. What Was Explicitly Validated

- Backend runs end-to-end
- Upload → access → expiry flow works correctly
- Access denied after expiry
- Token entropy and opacity verified
- CI runs green o
