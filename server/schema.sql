-- AEGIS MAMS PostgreSQL Schema Definition

-- Drop tables if they exist (in reverse dependency order)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS expenditures CASCADE;
DROP TABLE IF EXISTS assignments CASCADE;
DROP TABLE IF EXISTS transfers CASCADE;
DROP TABLE IF EXISTS purchases CASCADE;
DROP TABLE IF EXISTS assets CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS equipment_types CASCADE;
DROP TABLE IF EXISTS bases CASCADE;

-- 1. Bases Table
CREATE TABLE bases (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    location VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Equipment Types Table
CREATE TABLE equipment_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    category VARCHAR(100) NOT NULL CHECK (category IN ('Vehicle', 'Weapon', 'Ammunition', 'Equipment', 'Communication', 'Medical', 'Supplies')),
    unit VARCHAR(50) NOT NULL DEFAULT 'units',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Users Table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'base_commander', 'logistics_officer')),
    base_id INTEGER REFERENCES bases(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Assets Table
CREATE TABLE assets (
    id SERIAL PRIMARY KEY,
    equipment_type_id INTEGER NOT NULL REFERENCES equipment_types(id) ON DELETE RESTRICT,
    base_id INTEGER NOT NULL REFERENCES bases(id) ON DELETE CASCADE,
    serial_number VARCHAR(100),
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 0),
    status VARCHAR(50) NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'ASSIGNED', 'EXPENDED', 'IN_TRANSIT')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Purchases Table
CREATE TABLE purchases (
    id SERIAL PRIMARY KEY,
    base_id INTEGER NOT NULL REFERENCES bases(id) ON DELETE CASCADE,
    equipment_type_id INTEGER NOT NULL REFERENCES equipment_types(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
    supplier VARCHAR(255) NOT NULL,
    reference_number VARCHAR(100) NOT NULL UNIQUE,
    notes TEXT,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Transfers Table
CREATE TABLE transfers (
    id SERIAL PRIMARY KEY,
    from_base_id INTEGER NOT NULL REFERENCES bases(id) ON DELETE CASCADE,
    to_base_id INTEGER NOT NULL REFERENCES bases(id) ON DELETE CASCADE,
    equipment_type_id INTEGER NOT NULL REFERENCES equipment_types(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    transfer_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED')),
    reference_number VARCHAR(100) NOT NULL UNIQUE,
    notes TEXT,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_different_bases CHECK (from_base_id != to_base_id)
);

-- 7. Assignments Table
CREATE TABLE assignments (
    id SERIAL PRIMARY KEY,
    asset_id INTEGER NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    personnel_name VARCHAR(255) NOT NULL,
    base_id INTEGER NOT NULL REFERENCES bases(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    assignment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    purpose TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'RETURNED', 'EXPENDED')),
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Expenditures Table
CREATE TABLE expenditures (
    id SERIAL PRIMARY KEY,
    asset_id INTEGER NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    base_id INTEGER NOT NULL REFERENCES bases(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    expenditure_date DATE NOT NULL DEFAULT CURRENT_DATE,
    reason TEXT NOT NULL,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Audit Logs Table
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id INTEGER,
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance & query filtering
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
