-- ==========================================
-- IT Asset Management (ITAM) / Mock Data Injection
-- ==========================================

-- 1. Insert Fake Users (Employees)
INSERT INTO users (id, name, department, email, status) VALUES 
('a1b2c3d4-e5f6-7890-1234-56789abcdef0', 'Ana Silva', 'Marketing', 'ana.silva@company.com', 'Active'),
('b2c3d4e5-f678-9012-3456-789abcdef012', 'Roberto Gomez', 'Sales', 'roberto.gomez@company.com', 'Active'),
('c3d4e5f6-7890-1234-5678-9abcdef01234', 'Carlos Mendes', 'Development', 'carlos.mendes@company.com', 'Active'),
('d4e5f678-9012-3456-789a-bcdef0123456', 'Julia Torres', 'HR', 'julia.torres@company.com', 'Terminated'),
('e5f67890-1234-5678-9abc-def012345678', 'Pedro Alves', 'IT Support', 'pedro.alves@company.com', 'Active');

-- 2. Insert Fake Inventory Assets (Notebooks & MacBooks)
INSERT INTO inventory_assets (id, asset_tag, serial_number, type_id, manufacturer, model, status, purchase_date, warranty_expiry, custom_attributes, current_user_id, notes) VALUES 
('11111111-2222-3333-4444-555555555551', 'NB-TI-042', 'PF38X9L2', 1, 'Dell', 'Latitude 5420', 'Assigned', '2023-11-15', '2026-11-15', '{"ram": "16GB", "cpu": "i7-1185G7", "storage": "512GB SSD"}', 'a1b2c3d4-e5f6-7890-1234-56789abcdef0', 'Standard Marketing Laptop'),
('11111111-2222-3333-4444-555555555552', 'NB-TI-088', 'LNV99X88', 1, 'Lenovo', 'ThinkPad T14', 'In_Stock', '2024-01-10', '2027-01-10', '{"ram": "32GB", "cpu": "Ryzen 7 Pro", "storage": "1TB SSD"}', NULL, 'Reserved for new DEV hire'),
('11111111-2222-3333-4444-555555555553', 'NB-TI-015', 'C02F9X88MD6M', 1, 'Apple', 'MacBook Pro M2', 'Maintenance', '2022-05-20', '2025-05-20', '{"ram": "16GB", "cpu": "M2 Pro", "storage": "512GB SSD"}', 'c3d4e5f6-7890-1234-5678-9abcdef01234', 'Screen flickering issue reported'),
('11111111-2222-3333-4444-555555555554', 'NB-TI-104', 'PF88Y2K1', 1, 'Dell', 'Latitude 3420', 'Assigned', '2021-08-01', '2024-08-01', '{"ram": "8GB", "cpu": "i5-1135G7", "storage": "256GB SSD"}', 'b2c3d4e5-f678-9012-3456-789abcdef012', 'Old generation, consider upgrade next cycle');

-- 3. Insert Assignment History (The Notebook timeline)
-- NB-TI-042 Timeline:
INSERT INTO assignment_history (asset_id, user_id, assigned_at, returned_at, condition_on_return, assigned_by, notes) VALUES 
('11111111-2222-3333-4444-555555555551', 'b2c3d4e5-f678-9012-3456-789abcdef012', '2024-01-05 09:00:00', '2025-10-10 14:30:00', 'Good, Formatted', 'Murilo Admin', 'Roberto returned it to get a lighter model.'),
('11111111-2222-3333-4444-555555555551', 'a1b2c3d4-e5f6-7890-1234-56789abcdef0', '2025-10-12 10:00:00', NULL, NULL, 'Murilo Admin', 'Assigned to Ana from Marketing.');

-- NB-TI-104 Timeline:
INSERT INTO assignment_history (asset_id, user_id, assigned_at, returned_at, condition_on_return, assigned_by, notes) VALUES 
('11111111-2222-3333-4444-555555555554', 'd4e5f678-9012-3456-789a-bcdef0123456', '2021-08-15 11:00:00', '2023-12-20 16:00:00', 'Scratched top cover', 'Pedro Alves', 'Julia left the company.'),
('11111111-2222-3333-4444-555555555554', 'b2c3d4e5-f678-9012-3456-789abcdef012', '2024-01-10 09:30:00', NULL, NULL, 'Murilo Admin', 'Given to Roberto as a temporary replacement.');


-- 4. Insert Maintenance / Incident Logs (Hardware issues)
INSERT INTO maintenance_logs (asset_id, issue_type, reported_date, resolved_date, description, resolution_notes, cost, handled_by) VALUES 
('11111111-2222-3333-4444-555555555551', 'Hardware Failure', '2025-09-28 10:15:00', '2025-09-30 16:45:00', 'Keyboard sticking. Keys A and S not responding.', 'Entire keyboard module was replaced under warranty. No cost to company.', 0.00, 'Tech Pedro'),
('11111111-2222-3333-4444-555555555553', 'Hardware Failure', '2026-03-01 08:30:00', NULL, 'Screen flickering when opened beyond 90 degrees.', 'Device sent to Apple Authorized Center for diagnosis on display cable.', 150.00, 'Murilo Admin');
