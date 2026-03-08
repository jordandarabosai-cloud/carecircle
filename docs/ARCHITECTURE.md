# Architecture Draft

## Frontend
- Mobile: React Native (Expo)
- Desktop: Electron + React

## Backend
- API: Node.js (NestJS or Fastify)
- DB: PostgreSQL
- Realtime: WebSocket or Supabase Realtime equivalent
- Storage: S3-compatible object storage

## Security
- RBAC at case + resource level
- Row-level data filtering in API
- Encryption in transit (TLS) and at rest
- Immutable audit trail for critical actions
- Least-privilege access model

## Core Data Domains
- users
- cases
- case_members
- timeline_events
- messages
- tasks
- documents
- audit_events

## Suggested Deployment (early)
- API + DB on managed cloud
- Object storage for files
- Push notifications via Expo/FCM/APNs
