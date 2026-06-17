-- Finance Module Migration for College Management System
-- Run this to add finance tables to existing database

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- Drop existing finance tables if they exist
DROP TABLE IF EXISTS fees;
DROP TABLE IF EXISTS salaries;
DROP TABLE IF EXISTS expenses;
DROP TABLE IF EXISTS incomes;

SET FOREIGN_KEY_CHECKS = 1;

-- Fees table
CREATE TABLE fees (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  student_id INT UNSIGNED NOT NULL,
  fee_type ENUM('tuition','library','lab','sports','transport','examination','admission','other') NOT NULL DEFAULT 'tuition',
  amount DECIMAL(10,2) NOT NULL,
  discount DECIMAL(10,2) DEFAULT 0.00,
  fine DECIMAL(10,2) DEFAULT 0.00,
  paid_amount DECIMAL(10,2) DEFAULT 0.00,
  remaining_amount DECIMAL(10,2) NOT NULL,
  due_date DATE NOT NULL,
  payment_date DATE DEFAULT NULL,
  status ENUM('unpaid','partially_paid','paid') NOT NULL DEFAULT 'unpaid',
  remarks TEXT,
  created_by INT UNSIGNED,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_student_id (student_id),
  INDEX idx_status (status),
  INDEX idx_due_date (due_date),
  INDEX idx_fee_type (fee_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Salaries table
CREATE TABLE salaries (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  employee_id INT UNSIGNED NOT NULL,
  month TINYINT NOT NULL,
  year INT UNSIGNED NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_date DATE DEFAULT NULL,
  status ENUM('unpaid','paid') NOT NULL DEFAULT 'unpaid',
  remarks TEXT,
  created_by INT UNSIGNED,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY uq_employee_month_year (employee_id, month, year),
  INDEX idx_employee_id (employee_id),
  INDEX idx_status (status),
  INDEX idx_month_year (month, year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Expenses table
CREATE TABLE expenses (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  category ENUM('utilities','maintenance','equipment','office_supplies','salaries','miscellaneous') NOT NULL DEFAULT 'miscellaneous',
  amount DECIMAL(10,2) NOT NULL,
  expense_date DATE NOT NULL,
  attachment VARCHAR(500) DEFAULT NULL,
  description TEXT,
  created_by INT UNSIGNED,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_category (category),
  INDEX idx_expense_date (expense_date),
  INDEX idx_created_by (created_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Incomes table
CREATE TABLE incomes (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  source ENUM('donations','grants','fees','other') NOT NULL DEFAULT 'other',
  amount DECIMAL(10,2) NOT NULL,
  income_date DATE NOT NULL,
  description TEXT,
  created_by INT UNSIGNED,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_source (source),
  INDEX idx_income_date (income_date),
  INDEX idx_created_by (created_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Success message
SELECT 'Finance module tables created successfully!' AS message;
