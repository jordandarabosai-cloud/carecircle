# GitHub Actions: macOS Desktop Build

Workflow file:
- `.github/workflows/desktop-macos.yml`

## Trigger
- Pushes to `master` that change `apps/desktop/**`
- Manual run via `workflow_dispatch`

## Required GitHub Secrets
For signed/notarized builds, configure these repository secrets:
- `APPLE_ID`
- `APPLE_APP_SPECIFIC_PASSWORD`
- `APPLE_TEAM_ID`
- `CSC_LINK` (base64 .p12 cert or file URL, per electron-builder docs)
- `CSC_KEY_PASSWORD`

If Apple/cert secrets are missing, build may still produce unsigned artifacts depending on electron-builder behavior, but notarization/signing will be skipped/fail.

## Runbook
1. Add/update secrets in GitHub repo settings.
2. Run workflow manually (`Actions` → `desktop-macos` → `Run workflow`) or push desktop changes.
3. Download artifacts from the workflow run.
4. Validate install on a clean macOS account.

## Notes
- Workflow also runs `npm run test:api` before packaging.
- mac config validation runs via `npm --workspace @carecircle/desktop run check:mac`.
