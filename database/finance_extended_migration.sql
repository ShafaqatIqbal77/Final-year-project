-- Finance Module Extended Migration (additive — safe to run on existing CMS DB)
SET NAMES utf8mb4;

-- ── Extend fees table ──
ALTER TABLE fees ADD COLUMN payment_method ENUM('cash','bank_transfer','online','card','stripe','paypal','razorpay','jazzcash','easypaisa') DEFAULT NULL AFTER status;
ALTER TABLE fees ADD COLUMN semester VARCHAR(50) DEFAULT NULL AFTER fee_type;
ALTER TABLE fees ADD COLUMN scholarship_id INT UNSIGNED DEFAULT NULL AFTER discount;
ALTER TABLE fees ADD COLUMN installment_plan_id INT UNSIGNED DEFAULT NULL AFTER scholarship_id;

-- ── Extend salaries with breakdown ──
ALTER TABLE salaries ADD COLUMN basic_salary DECIMAL(10,2) DEFAULT NULL AFTER amount;
ALTER TABLE salaries ADD COLUMN allowances DECIMAL(10,2) DEFAULT 0.00 AFTER basic_salary;
ALTER TABLE salaries ADD COLUMN bonus DECIMAL(10,2) DEFAULT 0.00 AFTER allowances;
ALTER TABLE salaries ADD COLUMN overtime DECIMAL(10,2) DEFAULT 0.00 AFTER bonus;
ALTER TABLE salaries ADD COLUMN deductions DECIMAL(10,2) DEFAULT 0.00 AFTER overtime;
ALTER TABLE salaries ADD COLUMN tax DECIMAL(10,2) DEFAULT 0.00 AFTER deductions;
ALTER TABLE salaries ADD COLUMN net_salary DECIMAL(10,2) DEFAULT NULL AFTER tax;
ALTER TABLE salaries ADD COLUMN bank_info VARCHAR(255) DEFAULT NULL AFTER remarks;

-- ── Extend expenses with approval workflow ──
ALTER TABLE expenses ADD COLUMN status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'approved' AFTER amount;
ALTER TABLE expenses ADD COLUMN approved_by INT UNSIGNED DEFAULT NULL AFTER created_by;
ALTER TABLE expenses ADD COLUMN approved_at TIMESTAMP NULL DEFAULT NULL AFTER approved_by;

-- ── Fee payment history ──
CREATE TABLE IF NOT EXISTS fee_payments (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  fee_id INT UNSIGNED NOT NULL,
  student_id INT UNSIGNED NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_method ENUM('cash','bank_transfer','online','card','stripe','paypal','razorpay','jazzcash','easypaisa') NOT NULL DEFAULT 'cash',
  transaction_ref VARCHAR(100) DEFAULT NULL,
  payment_status ENUM('pending','success','failed','refunded') NOT NULL DEFAULT 'success',
  receipt_number VARCHAR(50) DEFAULT NULL,
  notes TEXT,
  collected_by INT UNSIGNED DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (fee_id) REFERENCES fees(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (collected_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_fee_id (fee_id),
  INDEX idx_student_id (student_id),
  INDEX idx_payment_status (payment_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Fee structure templates ──
CREATE TABLE IF NOT EXISTS fee_structures (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  fee_type ENUM('tuition','semester','admission','registration','examination','library','hostel','transport','laboratory','lab','sports','miscellaneous','other') NOT NULL DEFAULT 'tuition',
  amount DECIMAL(10,2) NOT NULL,
  semester VARCHAR(50) DEFAULT NULL,
  class_id INT UNSIGNED DEFAULT NULL,
  description TEXT,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_by INT UNSIGNED DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (class_id) REFERENCES school_classes(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_fee_type (fee_type),
  INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Scholarships ──
CREATE TABLE IF NOT EXISTS scholarships (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  student_id INT UNSIGNED NOT NULL,
  name VARCHAR(150) NOT NULL,
  discount_type ENUM('fixed','percentage') NOT NULL DEFAULT 'fixed',
  discount_value DECIMAL(10,2) NOT NULL,
  semester VARCHAR(50) DEFAULT NULL,
  status ENUM('active','expired','revoked') NOT NULL DEFAULT 'active',
  valid_from DATE DEFAULT NULL,
  valid_to DATE DEFAULT NULL,
  remarks TEXT,
  created_by INT UNSIGNED DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_student_id (student_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Late fee rules ──
CREATE TABLE IF NOT EXISTS late_fee_rules (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  days_after_due INT UNSIGNED NOT NULL DEFAULT 7,
  fine_type ENUM('fixed','percentage') NOT NULL DEFAULT 'fixed',
  fine_value DECIMAL(10,2) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Installment plans ──
CREATE TABLE IF NOT EXISTS installment_plans (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  fee_id INT UNSIGNED NOT NULL,
  student_id INT UNSIGNED NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  num_installments INT UNSIGNED NOT NULL DEFAULT 3,
  installment_amount DECIMAL(10,2) NOT NULL,
  paid_installments INT UNSIGNED NOT NULL DEFAULT 0,
  next_due_date DATE DEFAULT NULL,
  status ENUM('active','completed','defaulted') NOT NULL DEFAULT 'active',
  created_by INT UNSIGNED DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (fee_id) REFERENCES fees(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_fee_id (fee_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Online payments ──
CREATE TABLE IF NOT EXISTS online_payments (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  fee_id INT UNSIGNED NOT NULL,
  student_id INT UNSIGNED NOT NULL,
  gateway ENUM('stripe','paypal','razorpay','jazzcash','easypaisa','bank_transfer') NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status ENUM('pending','success','failed','refunded') NOT NULL DEFAULT 'pending',
  transaction_id VARCHAR(100) DEFAULT NULL,
  gateway_response TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (fee_id) REFERENCES fees(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_status (status),
  INDEX idx_student_id (student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Finance notifications ──
CREATE TABLE IF NOT EXISTS finance_notifications (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  type ENUM('fee_due','salary_paid','pending_salary','low_cash','budget_exceeded','expense_approved','payment_success','payment_failed') NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  related_type VARCHAR(50) DEFAULT NULL,
  related_id INT UNSIGNED DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_is_read (is_read),
  INDEX idx_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Seed default late fee rule ──
INSERT IGNORE INTO late_fee_rules (id, name, days_after_due, fine_type, fine_value, is_active)
VALUES (1, 'Standard Late Fee', 7, 'fixed', 50.00, 1);

-- ── Seed default fee structures ──
INSERT IGNORE INTO fee_structures (id, name, fee_type, amount, description, is_active) VALUES
(1, 'Semester Fee', 'semester', 5000.00, 'Standard semester tuition fee', 1),
(2, 'Admission Fee', 'admission', 2000.00, 'One-time admission fee', 1),
(3, 'Registration Fee', 'registration', 500.00, 'Course registration fee', 1),
(4, 'Examination Fee', 'examination', 300.00, 'Examination charges', 1),
(5, 'Library Fee', 'library', 200.00, 'Annual library membership', 1),
(6, 'Hostel Fee', 'hostel', 3000.00, 'Monthly hostel charges', 1),
(7, 'Transport Fee', 'transport', 800.00, 'Monthly transport charges', 1),
(8, 'Laboratory Fee', 'laboratory', 400.00, 'Lab equipment and materials', 1);

SELECT 'Finance extended migration completed!' AS message;
