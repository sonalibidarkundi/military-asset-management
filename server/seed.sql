-- AEGIS MAMS Seed Data

-- Clear existing non-user data
TRUNCATE TABLE audit_logs, expenditures, assignments, transfers, purchases, assets, equipment_types, bases RESTART IDENTITY CASCADE;

-- 1. Insert Bases
INSERT INTO bases (name, location, code) VALUES
('HQ Base', 'Central Command Sector 1', 'HQ-01'),
('North Base', 'Northern Perimeter Outpost', 'NB-02'),
('South Base', 'Southern Border Division', 'SB-03');

-- 2. Insert Equipment Types
INSERT INTO equipment_types (name, category, unit) VALUES
('Military Vehicle', 'Vehicle', 'units'),
('Assault Rifle', 'Weapon', 'units'),
('Ammunition', 'Ammunition', 'rounds'),
('Communication Equipment', 'Equipment', 'systems');

-- 3. Insert Initial Assets
INSERT INTO assets (equipment_type_id, base_id, serial_number, quantity, status) VALUES
(1, 1, 'VEH-HQ-001', 12, 'AVAILABLE'),
(2, 1, 'WPN-HQ-101', 150, 'AVAILABLE'),
(3, 1, 'AMM-HQ-501', 25000, 'AVAILABLE'),
(4, 1, 'COM-HQ-901', 20, 'AVAILABLE'),
(1, 2, 'VEH-NB-002', 8, 'AVAILABLE'),
(2, 2, 'WPN-NB-102', 85, 'AVAILABLE'),
(3, 2, 'AMM-NB-502', 12000, 'AVAILABLE'),
(4, 2, 'COM-NB-902', 12, 'AVAILABLE'),
(1, 3, 'VEH-SB-003', 6, 'AVAILABLE'),
(2, 3, 'WPN-SB-103', 60, 'AVAILABLE'),
(3, 3, 'AMM-SB-503', 8000, 'AVAILABLE');

-- 4. Insert Sample Purchases
INSERT INTO purchases (base_id, equipment_type_id, quantity, purchase_date, supplier, reference_number, notes) VALUES
(1, 1, 4, '2026-09-01', 'General Dynamics Corp', 'PO-2026-001', 'Tactical transport vehicles batch A'),
(1, 2, 50, '2026-09-10', 'Colt Defense Solutions', 'PO-2026-002', 'Standard issue rifles delivery'),
(2, 3, 5000, '2026-09-15', 'Federal Armaments Inc', 'PO-2026-003', '5.56mm standard round restock'),
(3, 4, 5, '2026-09-20', 'Harris Secure Comms', 'PO-2026-004', 'Encrypted radio tactical packs');

-- 5. Insert Sample Transfers
INSERT INTO transfers (from_base_id, to_base_id, equipment_type_id, quantity, transfer_date, status, reference_number, notes) VALUES
(1, 2, 2, 15, '2026-09-22', 'COMPLETED', 'TR-2026-088', 'Forward deployment rifle reinforcement'),
(1, 3, 3, 4000, '2026-09-25', 'IN_TRANSIT', 'TR-2026-089', 'Southern perimeter ammo dispatch');

-- 6. Insert Sample Assignments
INSERT INTO assignments (asset_id, personnel_name, base_id, quantity, assignment_date, purpose, status) VALUES
(2, 'Capt. John Miller', 1, 1, '2026-09-26', 'Patrol Leader personal sidearm & rifle assignment', 'ACTIVE'),
(6, 'Lt. Sarah Vance', 2, 1, '2026-09-28', 'North outpost perimeter watch', 'ACTIVE');

-- 7. Insert Sample Expenditures
INSERT INTO expenditures (asset_id, base_id, quantity, expenditure_date, reason) VALUES
(3, 1, 1200, '2026-09-27', 'Quarterly live-fire tactical training exercise'),
(7, 2, 500, '2026-09-29', 'Perimeter defense firing exercise');
