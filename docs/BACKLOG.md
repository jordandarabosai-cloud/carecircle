# Backlog (Near-term)

## Done in scaffold
1. ✅ Add database schema: `users`, `cases`, `case_members`, `timeline_events`, `audit_events`
2. ✅ Add auth scaffold (JWT login + bearer auth middleware)
3. ✅ Add role-based guards in API
4. ✅ Add create/list timeline endpoints
5. ✅ Add audit logging middleware and audit endpoints
6. ✅ Bootstrap Expo app shell
7. ✅ Bootstrap Electron app shell
8. ✅ Add PostgreSQL persistence + SQL migration runner + seed data

## Next priorities
1. ✅ Add real onboarding/invite flow (case invites + accept endpoint)
2. ✅ Add automated integration tests + OpenAPI spec
3. ✅ Add documents + messaging domains (DB + endpoints)
4. ✅ Add tasks/expectations domain (DB + endpoints)
5. ✅ Add OTP-style auth scaffold (`/auth/request-code`, `/auth/verify-code`) with rate limiting/lockout + delivery adapter (`dev`/`log`/`smtp`)
6. ✅ Mobile app MVP client wired (OTP auth, case/timeline/tasks/messages/documents views)
7. ✅ Desktop macOS-ready MVP client wired (Electron auth/case/timeline/tasks/messages/documents/invites)
8. Next: production delivery integration (email provider), richer role-specific UI polish, and native desktop packaging validation on macOS
