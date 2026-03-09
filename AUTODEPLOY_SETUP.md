# Auto-Deploy Setup (Vercel + Railway)

This repo now includes `.github/workflows/deploy-web-api.yml`.

It runs on:
- push to `master`
- manual run (`workflow_dispatch`)

## One-time setup

In GitHub repo settings, add these **Actions secrets**:

- `VERCEL_DEPLOY_HOOK_URL`
- `RAILWAY_DEPLOY_HOOK_URL`

### Where to get the hook URLs

- **Vercel**: Project → Settings → Git / Deploy Hooks → Create Hook
- **Railway**: Service → Deployments / Settings → Deploy Hook

## Behavior

- If a secret is present, that deploy is triggered.
- If missing, that target is skipped (workflow still succeeds).
