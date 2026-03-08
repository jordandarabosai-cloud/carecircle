# CareCircle Deployment Runbook (MVP)

## 1) Required environment variables
- `DATABASE_URL`
- `JWT_SECRET`
- `AUTH_CODE_DELIVERY_MODE` (`dev`, `log`, or `smtp`)

If `AUTH_CODE_DELIVERY_MODE=smtp`, also set:
- `SMTP_HOST`
- `SMTP_PORT` (default `587`)
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM` (optional)

Storage vars:
- `STORAGE_MODE` (`local` or `s3`)
- local mode: `LOCAL_STORAGE_PATH`, `PUBLIC_BASE_URL`
- s3 mode: `S3_BUCKET`, `S3_REGION`, optional `S3_PUBLIC_BASE_URL`

## 2) Startup checklist
1. Ensure PostgreSQL is reachable from the API host.
2. Set environment variables.
3. Run `npm install`.
4. Start API: `npm run dev:api` (or `npm --workspace @carecircle/api run start`).
5. Verify:
   - `GET /health`
   - `GET /ready`

## 3) Smoke tests
- Run: `./scripts/smoke-test.ps1`
- Run: `npm run test:api`

## 4) Security notes
- Keep `ALLOW_DEV_LOGIN=false` in deployed environments.
- Keep `AUTH_RATE_LIMIT_BYPASS=false` in deployed environments.
- Use a strong `JWT_SECRET`.
- Store credentials in 1Password (already set up for this project).

## 5) Rollback
- Re-deploy previous commit.
- Ensure DB migrations are backward-compatible before deploy.
- Re-run health + smoke checks.
