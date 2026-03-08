# CareCircle Web App (Vite + React MVP)

Web client covering core CareCircle workflows:
- OTP auth
- Case dashboard
- Timeline, Tasks, Messages, Documents, Invites

## Run
From repo root:

```bash
npm install
npm --workspace @carecircle/web run dev
```

## Build

```bash
npm --workspace @carecircle/web run build
```

## Notes
- Default API base comes from `VITE_API_BASE_URL` (fallback `http://localhost:4010`)
- API base, auth token, and user session are persisted in browser localStorage
- For deployed backend, set `VITE_API_BASE_URL` in hosting env for clean defaults
