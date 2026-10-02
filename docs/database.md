# AEGIS MAMS Database Architecture & Schema Reference

## Overview
The AEGIS Military Asset Management System database (`aegis_mams`) is built on **PostgreSQL** to maintain strict relational integrity, transaction safety, and audit traceability for military inventory operations.

---

## 1. Relational Schema Summary

```
                      +-------------------+
                      |       bases       |
                      +-------------------+
                                | 1
                                |
             +------------------+------------------+
             | *                | *                | *
      +--------------+   +--------------+   +--------------+
      |    users     |   |    assets    |   |  purchases   |
      +--------------+   +--------------+   +--------------+
                                | 1                | 1
                                |                  |
                         +------+------+           |
                         | *           | *         | *
                  +--------------+ +--------------+
                  | assignments  | | expenditures |
                  +--------------+ +--------------+
```

---

## 2. Table Specifications

### 1. `bases`
Command stations and military bases.
- `id`: `SERIAL PRIMARY KEY`
- `name`: `VARCHAR(255) NOT NULL UNIQUE`
- `location`: `VARCHAR(255) NOT NULL`
- `code`: `VARCHAR(50) NOT NULL UNIQUE`
- `created_at`: `TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP`

### 2. `equipment_types`
Master catalog of military equipment categories and items.
- `id`: `SERIAL PRIMARY KEY`
- `name`: `VARCHAR(255) NOT NULL UNIQUE`
- `category`: `VARCHAR(100) NOT NULL CHECK (category IN ('Vehicle', 'Weapon', 'Ammunition', 'Equipment', 'Communication', 'Medical', 'Supplies'))`
- `unit`: `VARCHAR(50) NOT NULL DEFAULT 'units'`
- `created_at`: `TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP`

### 3. `users`
System personnel accounts with role-based access control.
- `id`: `SERIAL PRIMARY KEY`
- `name`: `VARCHAR(255) NOT NULL`
- `email`: `VARCHAR(255) NOT NULL UNIQUE`
- `password_hash`: `VARCHAR(255) NOT NULL` (Bcrypt encrypted)
- `role`: `VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'base_commander', 'logistics_officer'))`
- `base_id`: `INTEGER REFERENCES bases(id) ON DELETE SET NULL`
- `created_at`, `updated_at`: `TIMESTAMP WITH TIME ZONE`

### 4. `assets`
Physical inventory counts tracked per base and equipment category.
- `id`: `SERIAL PRIMARY KEY`
- `equipment_type_id`: `INTEGER NOT NULL REFERENCES equipment_types(id)`
- `base_id`: `INTEGER NOT NULL REFERENCES bases(id) ON DELETE CASCADE`
- `serial_number`: `VARCHAR(100)`
- `quantity`: `INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 0)`
- `status`: `VARCHAR(50) NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'ASSIGNED', 'EXPENDED', 'IN_TRANSIT'))`
- `created_at`, `updated_at`: `TIMESTAMP WITH TIME ZONE`

### 5. `purchases`
Procurement transactions updating inventory balances.
- `id`: `SERIAL PRIMARY KEY`
- `base_id`: `INTEGER NOT NULL REFERENCES bases(id)`
- `equipment_type_id`: `INTEGER NOT NULL REFERENCES equipment_types(id)`
- `quantity`: `INTEGER NOT NULL CHECK (quantity > 0)`
- `purchase_date`: `DATE NOT NULL DEFAULT CURRENT_DATE`
- `supplier`: `VARCHAR(255) NOT NULL`
- `reference_number`: `VARCHAR(100) NOT NULL UNIQUE`
- `notes`: `TEXT`
- `created_by`: `INTEGER REFERENCES users(id)`
- `created_at`: `TIMESTAMP WITH TIME ZONE`

### 6. `transfers`
Inter-base asset relocation requests and completed transactions.
- `id`: `SERIAL PRIMARY KEY`
- `from_base_id`: `INTEGER NOT NULL REFERENCES bases(id)`
- `to_base_id`: `INTEGER NOT NULL REFERENCES bases(id)`
- `equipment_type_id`: `INTEGER NOT NULL REFERENCES equipment_types(id)`
- `quantity`: `INTEGER NOT NULL CHECK (quantity > 0)`
- `transfer_date`: `DATE NOT NULL DEFAULT CURRENT_DATE`
- `status`: `VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED'))`
- `reference_number`: `VARCHAR(100) NOT NULL UNIQUE`
- `notes`: `TEXT`
- `created_by`: `INTEGER REFERENCES users(id)`
- `created_at`: `TIMESTAMP WITH TIME ZONE`

### 7. `assignments`
Personnel asset check-outs and active duty assignments.
- `id`: `SERIAL PRIMARY KEY`
- `asset_id`: `INTEGER NOT NULL REFERENCES assets(id)`
- `personnel_name`: `VARCHAR(255) NOT NULL`
- `base_id`: `INTEGER NOT NULL REFERENCES bases(id)`
- `quantity`: `INTEGER NOT NULL CHECK (quantity > 0)`
- `assignment_date`: `DATE NOT NULL DEFAULT CURRENT_DATE`
- `purpose`: `TEXT NOT NULL`
- `status`: `VARCHAR(50) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'RETURNED', 'EXPENDED'))`
- `created_by`: `INTEGER REFERENCES users(id)`
- `created_at`: `TIMESTAMP WITH TIME ZONE`

### 8. `expenditures`
Equipment consumption, training loss, and operational expenditures.
- `id`: `SERIAL PRIMARY KEY`
- `asset_id`: `INTEGER NOT NULL REFERENCES assets(id)`
- `base_id`: `INTEGER NOT NULL REFERENCES bases(id)`
- `quantity`: `INTEGER NOT NULL CHECK (quantity > 0)`
- `expenditure_date`: `DATE NOT NULL DEFAULT CURRENT_DATE`
- `reason`: `TEXT NOT NULL`
- `created_by`: `INTEGER REFERENCES users(id)`
- `created_at`: `TIMESTAMP WITH TIME ZONE`

### 9. `audit_logs`
Immutable system audit trail recording every state mutation.
- `id`: `SERIAL PRIMARY KEY`
- `user_id`: `INTEGER REFERENCES users(id)`
- `action`: `VARCHAR(100) NOT NULL`
- `entity_type`: `VARCHAR(100) NOT NULL`
- `entity_id`: `INTEGER`
- `details`: `JSONB`
- `ip_address`: `VARCHAR(45)`
- `created_at`: `TIMESTAMP WITH TIME ZONE`

---

## 3. Performance Indexes

```sql
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_assets_base_id ON assets(base_id);
CREATE INDEX idx_assets_status ON assets(status);
CREATE INDEX idx_purchases_base_id ON purchases(base_id);
CREATE INDEX idx_transfers_from_base ON transfers(from_base_id);
CREATE INDEX idx_transfers_to_base ON transfers(to_base_id);
CREATE INDEX idx_assignments_asset_id ON assignments(asset_id);
CREATE INDEX idx_expenditures_asset_id ON expenditures(asset_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
```
