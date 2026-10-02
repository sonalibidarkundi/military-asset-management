# AEGIS MAMS — Military Asset Management System

A full-stack, enterprise-grade Military Asset Management System (AEGIS MAMS) built for real-time asset tracking, logistics movement, personnel assignments, operational expenditures, comprehensive reports, and audit logging.

---

## 1. Overview

AEGIS MAMS provides command staff and logistics personnel with centralized, real-time visibility over military equipment across bases. All business logic, stock deductions, relocations, and analytics are calculated directly against a PostgreSQL database with strict multi-base RBAC isolation and transaction safety.

---

## 2. Features

- **Command Dashboard**: Real-time summary metrics (Opening Balance, Purchases, Transfer In, Transfer Out, Net Movement, Assigned, Expended, Closing Balance) with itemized breakdown modals and bar charts.
- **Assets Catalog**: Itemized inventory tracking per base and equipment category with status tracking (`AVAILABLE`, `ASSIGNED`, `EXPENDED`, `IN_TRANSIT`).
- **Purchases Module**: Procure new inventory with automatic stock increments in atomic database transactions.
- **Transfers Module**: Inter-base asset relocations with multi-base validation, stock deduction at source base, and stock creation/increment at destination base.
- **Assignments Module**: Active duty personnel asset check-outs with stock deduction and automatic stock restoration upon return.
- **Expenditures Module**: Track consumed inventory, training loss, and ammunition expenditures with negative stock protection.
- **Audit Logs**: Immutable, append-only system audit trail recording every state change with IP logging and detailed JSON diffs.
- **Reports & Analytics**: Comprehensive date-range, base, and equipment-type filtering, equipment breakdown table, base breakdown table, and CSV export.
- **RBAC & Base Scope Isolation**: Strict backend enforcement isolating Base Commanders to their assigned base while granting system-wide control to Administrators.

---

## 3. Technology Stack

- **Frontend**: React 18, React Router v7, Axios, Lucide React Icons, Vanilla CSS Design System, Vite.
- **Backend**: Node.js, Express, PostgreSQL (`pg` pool), JWT Authentication, BcryptJS, Helmet Security, Morgan Logger.
- **Database**: PostgreSQL with transactional queries, row-level locking (`FOR UPDATE`), foreign keys, and indexes.

---

## 4. Project Structure

```
Military Asset Management System/
├── client/                     # React Frontend Application
│   ├── public/                 # Static Assets
│   ├── src/
│   │   ├── components/         # Shared Components (Layout, Modals, Cards)
│   │   ├── context/            # AuthContext & State Management
│   │   ├── hooks/              # Custom React Hooks (useAuth)
│   │   ├── pages/              # Page Views (Dashboard, Assets, Reports, etc.)
│   │   ├── services/           # Axios REST API Service Wrappers
│   │   ├── index.css           # Tactical Dark Design System Styles
│   │   └── App.jsx             # React Router Configuration
│   ├── package.json
│   ├── vite.config.js
│   └── .env.example
├── server/                     # Node.js Express REST API Server
│   ├── config/                 # PostgreSQL Database Pool Configuration
│   ├── controllers/            # Business Logic & REST Controllers
│   ├── middleware/             # Auth JWT, RBAC, and Error Handlers
│   ├── routes/                 # Express API Route Definition Rules
│   ├── utils/                  # Audit Logger & JWT Token Generator
│   ├── schema.sql              # PostgreSQL DDL Schema Script
│   ├── seed.sql                # Initial Reference Data Seed Script
│   ├── seed-users.js           # Development User Account Seeder Script
│   ├── server.js               # Main Express Server Entrypoint
│   └── .env.example
├── docs/                       # Project Documentation & Guides
│   ├── database.md             # Schema Architecture Reference
│   ├── database-backup.md      # Database Backup & Recovery Guide
│   └── deployment-checklist.md # Production Deployment Checklist
├── package.json                # Root Workspace Configuration
├── .gitignore                  # Git Exclusion Rules
└── README.md                   # System Documentation Guide
```

---

## 5. Local Setup

### Prerequisites
- **Node.js**: v18+ or v20+ installed
- **PostgreSQL**: v14+ or v16+ installed and running locally
- **Git**: Installed

### Step 1: Clone Repository & Install Dependencies
```bash
# Install root workspace dependencies
npm run install:all
```

---

## 6. PostgreSQL Setup

1. Create PostgreSQL database:
```sql
CREATE DATABASE aegis_mams;
```

2. Execute database schema and reference data scripts:
```bash
psql -U postgres -d aegis_mams -f server/schema.sql
psql -U postgres -d aegis_mams -f server/seed.sql
```

3. Seed development user accounts:
```bash
cd server
npm run seed
```

---

## 7. Environment Variables

### Backend (`server/.env`)
Copy `server/.env.example` to `server/.env` and update credentials:
```env
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://postgres:YOUR_DB_PASSWORD@localhost:5432/aegis_mams
JWT_SECRET=your_long_random_jwt_secret_key_here
CLIENT_URL=http://localhost:5173
```

### Frontend (`client/.env`)
Copy `client/.env.example` to `client/.env`:
```env
VITE_API_URL=http://localhost:5000/api
```

---

## 8. Running Backend

```bash
cd server
npm run dev
```
The API server will run at `http://localhost:5000`. Test health status at `http://localhost:5000/api/health`.

---

## 9. Running Frontend

```bash
cd client
npm run dev
```
The Vite development server will launch at `http://localhost:5173`.

---

## 10. Demo/Development Users

> [!NOTE]
> These credentials are generated by `seed-users.js` for development testing only.

| Role | Email | Password | Assigned Base Scope |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@aegis.local` | `Password@123` | All Bases (Global) |
| **Base Commander** | `commander@aegis.local` | `Password@123` | North Base (NB-02) |
| **Logistics Officer** | `logistics@aegis.local` | `Password@123` | HQ Base (HQ-01) |

---

## 11. API Overview

| Endpoint | Method | Role Access | Description |
| :--- | :---: | :--- | :--- |
| `/api/auth/login` | `POST` | Public | Authenticate user & issue JWT token |
| `/api/auth/me` | `GET` | Authenticated | Retrieve logged-in user profile |
| `/api/dashboard/summary` | `GET` | Authenticated | Get dashboard summary metrics |
| `/api/dashboard/movement` | `GET` | Authenticated | Get movement chart data |
| `/api/assets` | `GET` | Authenticated | List equipment assets (scoped) |
| `/api/assets` | `POST` | Admin, Logistics, Commander | Create asset item |
| `/api/assets/:id` | `DELETE` | Admin | Delete asset item |
| `/api/purchases` | `GET` / `POST` | Admin, Logistics | Procure equipment & add stock |
| `/api/transfers` | `GET` / `POST` | Admin, Logistics, Commander | Relocate stock between bases |
| `/api/assignments` | `GET` / `POST` | Admin, Logistics, Commander | Assign asset to personnel |
| `/api/assignments/:id/return`| `PUT` | Admin, Logistics, Commander | Return assignment & restore stock |
| `/api/expenditures` | `GET` / `POST` | Admin, Logistics, Commander | Record equipment consumption |
| `/api/reports/summary` | `GET` | Authenticated | Detailed equipment & base analytics |
| `/api/audit` | `GET` | Admin | System audit trail records |

---

## 12. RBAC & Base Scope Security

AEGIS MAMS enforces authorization at the backend REST layer:
1. **Admin**: Unrestricted access to all modules, bases, and audit logs.
2. **Base Commander**: Restricted strictly to their assigned `base_id`. Attempts to access or mutate another base's records return `HTTP 403 Forbidden`.
3. **Logistics Officer**: Authorized for logistics mutations (Purchases, Transfers, Assignments, Expenditures); restricted from administrative audit logs.

---

## 13. Database Backup

Refer to [`docs/database-backup.md`](docs/database-backup.md) for complete instructions.

Example backup command:
```bash
pg_dump -U postgres -d aegis_mams -F c -f aegis_mams_backup.dump
```

Example restore command:
```bash
pg_restore -U postgres -d aegis_mams aegis_mams_backup.dump
```

---

## 14. Production Deployment Notes

1. **Build Static Frontend**: Run `cd client && npm run build` to generate production assets in `client/dist`.
2. **SPA Router Fallback**: Configure Nginx or hosting provider to rewrite static route requests to `/index.html`.
3. **Production Backend**: Run backend using `NODE_ENV=production node server.js`.
4. **Environment Variables**: Configure high-entropy `JWT_SECRET`, exact `CLIENT_URL`, and production `DATABASE_URL` in your hosting provider configuration.

---

## 15. Security Notes

- **Password Storage**: Passwords are saved as standard Bcrypt hashes (`saltRounds = 10`). Plaintext passwords and hash strings are strictly omitted from API responses and logs.
- **SQL Injection Prevention**: All queries use parameterized PostgreSQL input parameters (`$1, $2`).
- **Transaction Safety**: Inventory updates use PostgreSQL transactions (`BEGIN`/`COMMIT`/`ROLLBACK`) and row locks (`FOR UPDATE`) to prevent race conditions and negative inventory.
- **HTTP Security**: Protected via Helmet security headers, CORS origin restrictions, and sanitized error responses.
