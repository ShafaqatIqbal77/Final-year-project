-- Seeders with realistic dummy data

-- Expense Categories
INSERT INTO expense_categories (name, type, color, icon) VALUES
('Sales', 'income', '#10B981', 'trending-up'),
('Consulting', 'income', '#3B82F6', 'briefcase'),
('Software Subscriptions', 'expense', '#EF4444', 'code'),
('Office Supplies', 'expense', '#F59E0B', 'paperclip'),
('Salaries', 'expense', '#8B5CF6', 'users');

-- Payment Methods
INSERT INTO payment_methods (name, type) VALUES
('Meezan Bank', 'bank'),
('Stripe', 'online'),
('Petty Cash', 'cash'),
('Corporate Credit Card', 'card');

-- Transactions (20+ Dummy data)
DO $$
DECLARE
    sales_cat INT;
    sub_cat INT;
    bank_method INT;
    card_method INT;
    i INT;
BEGIN
    SELECT id INTO sales_cat FROM expense_categories WHERE name = 'Sales';
    SELECT id INTO sub_cat FROM expense_categories WHERE name = 'Software Subscriptions';
    SELECT id INTO bank_method FROM payment_methods WHERE name = 'Meezan Bank';
    SELECT id INTO card_method FROM payment_methods WHERE name = 'Corporate Credit Card';

    FOR i IN 1..15 LOOP
        INSERT INTO transactions (type, amount, category_id, payment_method_id, status, notes, created_at)
        VALUES ('income', floor(random() * 50000 + 10000), sales_cat, bank_method, 'completed', 'Invoice payment ' || i, NOW() - (i || ' days')::INTERVAL);
    END LOOP;

    FOR i IN 1..10 LOOP
        INSERT INTO transactions (type, amount, category_id, payment_method_id, status, notes, created_at)
        VALUES ('expense', floor(random() * 5000 + 500), sub_cat, card_method, 'completed', 'SaaS Subscription ' || i, NOW() - (i * 2 || ' days')::INTERVAL);
    END LOOP;
END $$;

-- Invoices (5 Dummy data)
INSERT INTO invoices (invoice_no, client_name, client_email, issue_date, due_date, items, subtotal, tax_rate, tax_amount, total, status) VALUES
('INV-2026-001', 'Acme Corp', 'billing@acme.com', CURRENT_DATE - 10, CURRENT_DATE + 20, '[{"desc": "Web Dev", "qty": 1, "price": 100000}]', 100000, 5, 5000, 105000, 'sent'),
('INV-2026-002', 'TechFlow', 'accounts@techflow.io', CURRENT_DATE - 5, CURRENT_DATE + 25, '[{"desc": "Consulting", "qty": 10, "price": 5000}]', 50000, 0, 0, 50000, 'draft'),
('INV-2026-003', 'Beta LLC', 'finance@betallc.net', CURRENT_DATE - 30, CURRENT_DATE - 5, '[{"desc": "App Maintenance", "qty": 1, "price": 25000}]', 25000, 5, 1250, 26250, 'overdue'),
('INV-2026-004', 'CloudSync', 'pay@cloudsync.co', CURRENT_DATE - 15, CURRENT_DATE + 15, '[{"desc": "SEO Services", "qty": 1, "price": 15000}]', 15000, 0, 0, 15000, 'paid'),
('INV-2026-005', 'DesignHub', 'hello@designhub.co', CURRENT_DATE, CURRENT_DATE + 30, '[{"desc": "UI Design", "qty": 5, "price": 8000}]', 40000, 5, 2000, 42000, 'sent');

-- Budgets (3 Dummy data)
INSERT INTO budgets (name, category_id, period, start_date, end_date, allocated_amount, spent_amount) VALUES
('Q3 Software Budget', (SELECT id FROM expense_categories WHERE name = 'Software Subscriptions'), 'quarterly', '2026-07-01', '2026-09-30', 50000, 12500),
('Monthly Office Supplies', (SELECT id FROM expense_categories WHERE name = 'Office Supplies'), 'monthly', '2026-06-01', '2026-06-30', 10000, 8500),
('Annual Salaries', (SELECT id FROM expense_categories WHERE name = 'Salaries'), 'yearly', '2026-01-01', '2026-12-31', 5000000, 2000000);
