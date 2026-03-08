# Desktop App (Electron macOS-ready MVP)

CareCircle desktop client with API-backed flows:
- OTP login (`/auth/request-code`, `/auth/verify-code`)
- Case selection
- Timeline, Tasks, Messages, Documents, Invites tabs
- Task status updates from desktop UI

## Run (dev)
From repo root:

```bash
npm install
npm --workspace @carecircle/desktop run dev
```

## Build macOS package

```bash
npm --workspace @carecircle/desktop run pack:mac
```

Output will be generated in the desktop workspace dist folder.

## Notes
- Default API base is `http://localhost:4010`
- For deployed API, change base URL in the app before login.
