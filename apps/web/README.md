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
- Default API base: `http://localhost:4010`
- For deployed backend, change API base in the app UI.
