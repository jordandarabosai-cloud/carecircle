# CareCircle

Shared case coordination platform for foster parents, biological parents, case workers, and GAL/CASA.

## Goals
- Keep everyone informed with one timeline
- Clarify expectations and responsibilities
- Securely share documents and case updates
- Preserve accountability with audit trails

## Monorepo Layout
- `apps/mobile` - iOS/Android app shell (Expo scaffold)
- `apps/desktop` - desktop app shell (Electron scaffold)
- `services/api` - backend API and auth/permissions scaffold
- `packages` - shared types/ui/utils
- `docs` - product and technical documentation

## API Quickstart
```bash
npm install
npm run dev:api
```

Server starts at `http://localhost:4010`.

### Seed login accounts
Use `POST /auth/login` with one of:
- `admin@carecircle.dev`
- `worker@carecircle.dev`
- `foster@carecircle.dev`
- `bio@carecircle.dev`
- `gal@carecircle.dev`

Pass returned token as `Authorization: Bearer <token>`.

### Implemented endpoints
- `GET /health`
- `GET /roles`
- `POST /auth/login`
- `GET /me`
- `GET /cases`
- `POST /cases` (admin/case_worker)
- `POST /cases/:caseId/members` (admin/case_worker)
- `GET /cases/:caseId/timeline`
- `POST /cases/:caseId/timeline`
- `GET /cases/:caseId/audit` (gal/case_worker/admin)

## Status
MVP scaffold implemented for core auth + role-aware case timeline flow (in-memory data). Next step is Postgres persistence and production auth.
