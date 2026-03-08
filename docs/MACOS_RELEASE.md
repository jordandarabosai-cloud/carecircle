# CareCircle macOS Release Checklist

## Preflight
- [ ] `npm install`
- [ ] `npm run test:api`
- [ ] `npm --workspace @carecircle/desktop run check:mac`

## Required Apple environment (on macOS build host)
- `APPLE_ID`
- `APPLE_APP_SPECIFIC_PASSWORD`
- `APPLE_TEAM_ID`

## Build
- [ ] `npm --workspace @carecircle/desktop run pack:mac`
- [ ] Verify DMG exists in desktop `dist/`

## Signing & Notarization
- Hardened runtime enabled
- Entitlements file present (`apps/desktop/build/entitlements.mac.plist`)
- afterSign hook wired (`apps/desktop/scripts/notarize.js`)

## Manual QA
- [ ] Launch app on clean macOS account
- [ ] OTP login works
- [ ] Cases load
- [ ] Timeline/tasks/messages/documents tabs function
- [ ] Invites load/create where role allows

## Release notes template
- Version:
- Date:
- Highlights:
  -
  -
- Fixes:
  -
- Known issues:
  -
