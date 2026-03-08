# Mobile App (Expo MVP)

CareCircle mobile client MVP with API-backed flows:
- OTP login (`/auth/request-code`, `/auth/verify-code`)
- Case loading
- Timeline list + quick post
- Tasks list + quick create
- Messages list + quick send
- Documents list

## Run
From repo root:

```bash
npm install
npm --workspace @carecircle/mobile run dev
```

Then open in Expo Go / emulator.

## Notes
- Default API base is `http://localhost:4010`
- On physical device, replace localhost with your machine LAN IP.
