# CareCircle

Shared case coordination platform for foster parents, biological parents, case workers, and GAL/CASA.

## Goals
- Keep everyone informed with one timeline
- Clarify expectations and responsibilities
- Securely share documents and case updates
- Preserve accountability with audit trails

## Monorepo Layout
- `apps/mobile` - iOS/Android app (Expo MVP)
- `apps/desktop` - desktop app (Electron MVP)
- `apps/web` - web app (Vite + React MVP)
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

### S3 end-to-end check
(Requires S3 env vars and `STORAGE_MODE=s3` context in script)

```bash
npm run test:s3
```

Expected output includes:
- `S3_E2E=PASS`

### API spec
- OpenAPI file: `services/api/openapi.json`

### Deployment runbook
- `docs/DEPLOYMENT.md`

### Document upload/storage
- Request upload target: `POST /cases/:caseId/documents/presign`
- Upload file:
  - local mode: `PUT` to returned `uploadUrl` (served via `/files/...`)
  - s3 mode: `PUT` to returned **signed URL** (15-minute expiry)
- Register document metadata: `POST /cases/:caseId/documents`

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
- request throttling: max 5 OTP requests per 15 minutes per user (`AUTH_RATE_LIMIT_BYPASS=true` can disable for local automation/tests)
- verify lockout: max 5 failed attempts per issued code
- OTP delivery adapter via `AUTH_CODE_DELIVERY_MODE`:
  - `dev` → returns `devCode` in response (local only)
  - `log` → logs code to server logs
  - `smtp` → sends real email using SMTP settings (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, optional `SMTP_FROM`)

### Implemented endpoints
- `GET /health`
- `GET /ready`
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
- `GET /cases/:caseId/tasks`
- `POST /cases/:caseId/tasks`
- `PATCH /cases/:caseId/tasks/:taskId`
- `GET /cases/:caseId/messages`
- `POST /cases/:caseId/messages`
- `POST /cases/:caseId/documents/presign`
- `GET /cases/:caseId/documents`
- `POST /cases/:caseId/documents`
- `GET /cases/:caseId/timeline`
- `POST /cases/:caseId/timeline`
- `GET /cases/:caseId/audit` (gal/case_worker/admin)

## Status
MVP scaffold implemented for core auth + role-aware case timeline flow with Postgres-backed persistence.

## Web production note
Set API CORS allowlist in backend env:
- `ALLOWED_ORIGINS=https://carecircle.darabostech.com`
(you can include multiple comma-separated origins)
