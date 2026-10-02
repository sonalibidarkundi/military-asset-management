# Production Deployment Checklist for AEGIS MAMS

Use this checklist before and after executing a production deployment of AEGIS MAMS.

---

## PRE-DEPLOYMENT CHECKLIST

- [ ] **Database Setup**: PostgreSQL production instance provisioned and accessible over secure connection.
- [ ] **Database Schema**: Executed `server/schema.sql` and `server/seed.sql` on the production database instance.
- [ ] **Database Backup**: Generated initial baseline snapshot dump (`pg_dump`).
- [ ] **Environment Configuration**:
  - [ ] `NODE_ENV=production`
  - [ ] `PORT` specified (e.g. `5000` or hosting provider dynamically assigned port)
  - [ ] `DATABASE_URL` configured with secure credentials
  - [ ] `JWT_SECRET` set to a long, high-entropy random key
  - [ ] `CLIENT_URL` configured to the exact production web domain (e.g. `https://aegis.mil`)
  - [ ] `VITE_API_URL` set to target production API endpoint (e.g. `https://api.aegis.mil/api` or `/api`)
- [ ] **Secrets Verification**: Scanned repository to confirm no `.env` or plaintext passwords are in Git.
- [ ] **CORS Settings**: Verified `cors` origin restricts traffic strictly to `CLIENT_URL`.
- [ ] **Security Headers**: Verified `helmet` middleware is active in `server/server.js`.
- [ ] **Frontend Build**: Successfully ran `cd client && npm run build` producing `client/dist`.
- [ ] **SPA Routing Fallback**: Configured Nginx / hosting provider rewrite rule (`try_files $uri /index.html;`) for SPA page routing.

---

## POST-DEPLOYMENT CHECKLIST

- [ ] **Health Check Endpoint**: Verified `GET /api/health` returns `{ "success": true, "message": "AEGIS MAMS API is running" }`.
- [ ] **Authentication**: Verified Login page authenticates Admin, Base Commander, and Logistics Officer accounts correctly.
- [ ] **Dashboard Metrics**: Confirmed real-time cards, calculations, and movement breakdown charts match live PostgreSQL inventory totals.
- [ ] **Assets Management**: Tested asset filtering, search, modal creation, and stock updates.
- [ ] **Purchases Operations**: Tested procurement recording and verified automatic inventory stock increment.
- [ ] **Transfers Operations**: Verified inter-base relocation updates source and destination base inventories transactionally.
- [ ] **Assignments Operations**: Verified personnel assignment deducts stock and return operation restores stock.
- [ ] **Expenditures Operations**: Verified inventory consumption and negative stock prevention.
- [ ] **Reports & Analytics**: Tested summary filters, equipment breakdown table, base breakdown table, and CSV file download.
- [ ] **Audit Logging**: Verified system mutations create append-only audit log records viewable by Admin users.
- [ ] **RBAC & Base Scope Security**: Verified Base Commander users are strictly isolated to their command base and rejected (403) from unauthorized cross-base endpoints.
- [ ] **Mobile & Responsive UI**: Confirmed sidebar drawer, filter toolbars, and scrollable tables function on tablet and mobile viewports.
- [ ] **Error Handling**: Confirmed 500 errors display generic sanitized messages without leaking stack traces or database connection parameters.
