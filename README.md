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
1) Start Postgres (local) and create DB `carecircle`
2) Set `DATABASE_URL` (optional if using default below)
3) Install and run API

```bash
npm install
npm run dev:api
```

Default DB URL used by API if none provided:
`postgres://postgres:postgres@localhost:5432/carecircle`

On startup, API automatically:
- runs SQL migrations in `services/api/migrations`
- seeds demo users/case data

Server starts at `http://localhost:4010`.

### Windows local Postgres (manual)
If Postgres is not installed, one easy path is:

```powershell
winget install -e --id PostgreSQL.PostgreSQL.16
```

Then create the DB (in psql):

```sql
CREATE DATABASE carecircle;
```

### Smoke test script
After Postgres is running:

```powershell
./scripts/smoke-test.ps1
```

Expected output includes:
- `HEALTH_OK=True`
- `CASES_COUNT=...`
- `TIMELINE_COUNT=...`

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
MVP scaffold implemented for core auth + role-aware case timeline flow with Postgres-backed persistence.
