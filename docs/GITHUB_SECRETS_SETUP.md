# GitHub Secrets Setup (CareCircle macOS Desktop CI)

Use this guide to configure secrets for signed/notarized macOS builds.

## Required secrets
Add these in GitHub → Repo → Settings → Secrets and variables → Actions.

1. `APPLE_ID`
   - Your Apple developer account email.

2. `APPLE_APP_SPECIFIC_PASSWORD`
   - App-specific password from Apple ID security settings.

3. `APPLE_TEAM_ID`
   - Apple Developer Team ID.

4. `CSC_LINK`
   - Base64-encoded `.p12` signing certificate (recommended) OR supported file URL.

5. `CSC_KEY_PASSWORD`
   - Password used when exporting the `.p12` certificate.

## Creating CSC_LINK (base64 p12)
On macOS (terminal):

```bash
# export cert from Keychain as cert.p12 first
base64 -i cert.p12 | pbcopy
```

Paste clipboard contents into GitHub secret `CSC_LINK`.

On Windows PowerShell:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\path\to\cert.p12")) | Set-Clipboard
```

Paste clipboard contents into `CSC_LINK`.

## Common pitfalls
- Extra whitespace/newlines in `CSC_LINK` can break decode.
- Wrong `CSC_KEY_PASSWORD` will fail signing.
- Missing Apple notarization envs will switch workflow to unsigned fallback.

## Verification flow
1. Add secrets.
2. Trigger `desktop-macos` workflow manually.
3. Confirm logs show signed path (not fallback).
4. Download artifacts and verify app opens on clean macOS.

## Fast rollback
If signing fails in CI:
- Keep workflow as-is (it will still build unsigned fallback).
- Fix secrets and re-run workflow.
