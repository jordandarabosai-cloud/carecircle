# Auto-Deploy Setup (Vercel + Railway)

This repo now includes `.github/workflows/deploy-web-api.yml`.

It runs on:
- push to `master`
- manual run (`workflow_dispatch`)

## One-time setup

In GitHub repo settings, add these **Actions secrets**:

### Vercel secret
- `VERCEL_DEPLOY_HOOK_URL`

Get it from: **Vercel Project → Settings → Git → Deploy Hooks → Create Hook** (branch `master`).

### Railway secrets
- `RAILWAY_TOKEN`
- `RAILWAY_PROJECT_ID`
- `RAILWAY_ENVIRONMENT_ID`
- `RAILWAY_SERVICE_NAME`

Where to get values:
- `RAILWAY_TOKEN`: Railway account token
- `RAILWAY_PROJECT_ID`: from project URL
- `RAILWAY_ENVIRONMENT_ID`: production environment ID
- `RAILWAY_SERVICE_NAME`: service name (e.g. `@carecircle/api`)

## Behavior

- If Vercel hook secret is present, web deploy is triggered.
- If Railway token/id/name secrets are present, API redeploy is triggered via Railway CLI.
- Missing secrets skip that target (workflow still succeeds).
