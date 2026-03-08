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

### Integration tests

```bash
npm run test:api
```

Expected output includes:
- `INTEGRATION_TESTS=PASS`

### API spec
- OpenAPI file: `services/api/openapi.json`

### Seed accounts (for OTP auth)
Request/verify auth code with one of:
- `admin@carecircle.dev`
- `worker@carecircle.dev`
- `foster@carecircle.dev`
- `bio@carecircle.dev`
- `gal@carecircle.dev`

Flow:
1. `POST /auth/request-code` with email
2. `POST /auth/verify-code` with email + code
3. Use returned token as `Authorization: Bearer <token>`

`POST /auth/login` is now dev-only and requires `ALLOW_DEV_LOGIN=true`.

Auth hardening added:
- request throttling: max 5 OTP requests per 15 minutes per user
- verify lockout: max 5 failed attempts per issued code
- `AUTH_CODE_DELIVERY_MODE=dev` controls whether `devCode` is returned in responses

### Implemented endpoints
- `GET /health`
- `GET /roles`
- `POST /auth/request-code`
- `POST /auth/verify-code`
- `POST /auth/login` (dev-only, gated)
- `POST /invites/accept` (invite onboarding)
- `GET /me`
- `GET /cases`
- `POST /cases` (admin/case_worker)
- `POST /cases/:caseId/members` (admin/case_worker)
- `GET /cases/:caseId/invites` (admin/case_worker/gal)
- `POST /cases/:caseId/invites` (admin/case_worker)
- `GET /cases/:caseId/messages`
- `POST /cases/:caseId/messages`
- `GET /cases/:caseId/documents`
- `POST /cases/:caseId/documents`
- `GET /cases/:caseId/timeline`
- `POST /cases/:caseId/timeline`
- `GET /cases/:caseId/audit` (gal/case_worker/admin)

## Status
MVP scaffold implemented for core auth + role-aware case timeline flow with Postgres-backed persistence.
