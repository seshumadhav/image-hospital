# image-hospital — Architecture

## Product Semantics
- User uploads an image via a simple UI
- Server stores the image locally
- Server returns a unique URL
- URL is valid for exactly 1 minute from creation
- If there is any ambiguity (clock skew, metadata uncertainty), deny access
- User can re-upload

## Key Constraints
- Backend: TypeScript
- UI: React (minimal, monochrome)
- Storage: Local filesystem
- Deployed behind a load balancer / proxy
- Metadata must be durable and shared across instances
- No deletion logic
- Clock skew of ±5 seconds is acceptable

## Core Modules
- HTTP API Layer
- Upload Orchestration Module
- Image Access Orchestration Module
- Blob Storage Interface (local now, S3 later)
- Metadata Store Interface (durable, shared)
- Token Service
- UI Layer

## Explicit Non-Goals
- No authentication or user accounts
- No permanent URLs
- No image processing or transformation
- No cloud-specific implementation yet

