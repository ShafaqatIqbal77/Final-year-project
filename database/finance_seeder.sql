-- Finance Module Seeder for College Management System
-- This file inserts sample data for testing the finance module
-- Run this AFTER running the finance_migration.sql

SET NAMES utf8mb4;

-- Insert sample fee records
-- Note: These assume you have students in the users table with role='student'
-- Adjust the student_id values based on your actual student IDs

INSERT INTO fees (student_id, fee_type, amount, discount, fine, paid_amount, remaining_amount, due_date, payment_date, status, remarks, created_by) VALUES
(1, 'tuition', 5000.00, 500.00, 0.00, 4500.00, 0.00, '2025-09-30', '2025-09-15', 'paid', 'Full tuition payment with scholarship discount', 1),
(2, 'tuition', 5000.00, 0.00, 0.00, 2500.00, 2500.00, '2025-09-30', '2025-09-20', 'partially_paid', 'Partial payment', 1),
(3, 'tuition', 5000.00, 0.00, 0.00, 0.00, 5000.00, '2025-09-30', NULL, 'unpaid', 'Pending payment', 1),
(1, 'library', 200.00, 0.00, 0.00, 200.00, 0.00, '2025-09-30', '2025-09-10', 'paid', 'Library fee', 1),
(2, 'library', 200.00, 0.00, 0.00, 0.00, 200.00, '2025-09-30', NULL, 'unpaid', 'Library fee pending', 1),
(3, 'lab', 300.00, 0.00, 0.00, 300.00, 0.00, '2025-09-30', '2025-09-12', 'paid', 'Lab fee', 1),
(1, 'sports', 150.00, 0.00, 0.00, 150.00, 0.00, '2025-09-30', '2025-09-08', 'paid', 'Sports fee', 1),
(2, 'transport', 400.00, 0.00, 50.00, 400.00, 0.00, '2025-09-30', '2025-09-25', 'paid', 'Transport fee with late fine', 1),
(3, 'examination', 250.00, 0.00, 0.00, 0.00, 250.00, '2025-12-15', NULL, 'unpaid', 'Exam fee due in December', 1);

-- Insert sample salary records
-- Note: These assume you have teachers in the users table with role='teacher' or 'admin'
-- Adjust the employee_id values based on your actual teacher/admin IDs

INSERT INTO salaries (employee_id, month, year, amount, payment_date, status, remarks, created_by) VALUES
(1, 9, 2025, 4000.00, '2025-09-30', 'paid', 'September salary', 1),
(1, 10, 2025, 4000.00, '2025-10-31', 'paid', 'October salary', 1),
(1, 11, 2025, 4000.00, '2025-11-30', 'paid', 'November salary', 1),
(1, 12, 2025, 4000.00, NULL, 'unpaid', 'December salary pending', 1),
(2, 9, 2025, 3500.00, '2025-09-30', 'paid', 'September salary', 1),
(2, 10, 2025, 3500.00, '2025-10-31', 'paid', 'October salary', 1),
(2, 11, 2025, 3500.00, NULL, 'unpaid', 'November salary pending', 1);

-- Insert sample expense records

INSERT INTO expenses (title, category, amount, expense_date, attachment, description, created_by) VALUES
('Electricity Bill - September', 'utilities', 1500.00, '2025-09-25', NULL, 'Monthly electricity payment', 1),
('Water Bill - September', 'utilities', 300.00, '2025-09-25', NULL, 'Monthly water payment', 1),
('Building Maintenance', 'maintenance', 2000.00, '2025-09-20', NULL, 'General building repairs', 1),
('Computer Lab Equipment', 'equipment', 5000.00, '2025-09-15', NULL, 'New computers for lab', 1),
('Office Supplies - Paper', 'office_supplies', 200.00, '2025-09-10', NULL, 'A4 paper purchase', 1),
('Office Supplies - Stationery', 'office_supplies', 150.00, '2025-09-10', NULL, 'Pens, notebooks, folders', 1),
('Internet Service', 'utilities', 800.00, '2025-09-05', NULL, 'Monthly internet bill', 1),
('Cleaning Services', 'maintenance', 1000.00, '2025-09-01', NULL, 'Monthly cleaning contract', 1),
('Furniture Purchase', 'equipment', 3000.00, '2025-08-25', NULL, 'New desks and chairs', 1),
('Security Services', 'miscellaneous', 2500.00, '2025-08-20', NULL, 'Monthly security guard services', 1);

-- Insert sample income records

INSERT INTO incomes (source, amount, income_date, description, created_by) VALUES
('fees', 15000.00, '2025-09-30', 'Total fees collected in September', 1),
('fees', 12000.00, '2025-10-31', 'Total fees collected in October', 1),
('fees', 13500.00, '2025-11-30', 'Total fees collected in November', 1),
('donations', 5000.00, '2025-09-15', 'Donation from local business', 1),
('donations', 3000.00, '2025-10-20', 'Alumni donation', 1),
('grants', 20000.00, '2025-08-01', 'Government education grant', 1),
('other', 1000.00, '2025-09-10', 'Income from facility rental', 1),
('other', 800.00, '2025-10-15', 'Income from event hosting', 1);

-- Success message
SELECT 'Finance module sample data inserted successfully!' AS message;
SELECT 'Note: Adjust student_id and employee_id values to match your actual user IDs' AS reminder;
