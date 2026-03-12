-- ==========================================
-- IT Asset Management (ITAM) / Inventory Schema
-- ==========================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Asset Categories / Types
CREATE TABLE asset_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(50) NOT NULL -- e.g., 'EUC' (End User Computing), 'Peripherals'
);

INSERT INTO asset_types (name, category) VALUES 
('Notebook', 'EUC'),
('Desktop', 'EUC'),
('Monitor', 'Peripherals'),
('Mobile/Smartphone', 'EUC');

-- 2. Employees / Users 
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    department VARCHAR(100),
    email VARCHAR(255) UNIQUE,
    status VARCHAR(50) DEFAULT 'Active' -- Active, Terminated
);

-- 3. The Hardware Inventory (The main table)
CREATE TABLE inventory_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_tag VARCHAR(50) UNIQUE NOT NULL, -- e.g. "NB-TI-001"
    serial_number VARCHAR(100) UNIQUE NOT NULL,
    type_id INTEGER NOT NULL REFERENCES asset_types(id),
    manufacturer VARCHAR(100) NOT NULL, -- Dell, Lenovo, Apple
    model VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'In_Stock', -- In_Stock, Assigned, Maintenance, Broken, Retired, Lost
    purchase_date DATE,
    warranty_expiry DATE,
    custom_attributes JSONB DEFAULT '{}'::jsonb, -- Store specs: {"ram": "16GB", "cpu": "i7", "storage": "512GB SSD"}
    current_user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Who currently has it
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_inventory_tags ON inventory_assets (asset_tag);

-- 4. Assignment History (The "Who had this before?" requirement)
CREATE TABLE assignment_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID NOT NULL REFERENCES inventory_assets(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    ticket_number VARCHAR(50), -- Chamado de referência
    justification TEXT, -- Motivo da movimentação (obrigatório para novos registros via API)
    previous_user_id UUID REFERENCES users(id) ON DELETE SET NULL, 
    movement_type VARCHAR(50) DEFAULT 'assignment', -- transfer, return, assignment, etc.
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    returned_at TIMESTAMP WITH TIME ZONE,
    condition_on_return VARCHAR(100), -- Good, Damaged, Needs format
    assigned_by VARCHAR(100), -- Admin name who did the handoff
    notes TEXT
);

-- 5. Incident & Maintenance Log (The "Problems" requirement)
CREATE TABLE maintenance_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID NOT NULL REFERENCES inventory_assets(id) ON DELETE CASCADE,
    issue_type VARCHAR(50) NOT NULL, -- Hardware Failure, Software Issue, Upgrade, Routine Check
    reported_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_date TIMESTAMP WITH TIME ZONE,
    description TEXT NOT NULL,
    resolution_notes TEXT,
    cost DECIMAL(10, 2), -- If a screen broke and was paid to fix
    handled_by VARCHAR(100) -- Tech who fixed it
);

-- 6. Trigger to auto-update 'updated_at' on inventory table
CREATE OR REPLACE FUNCTION update_inventory_modtime()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = CURRENT_TIMESTAMP;
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_inventory_timestamp
BEFORE UPDATE ON inventory_assets
FOR EACH ROW
EXECUTE FUNCTION update_inventory_modtime();
