<?php
// Finance Module Seeder
// This script populates sample finance data for testing

$config = require __DIR__ . '/../backend/config.php';

try {
    $dbConfig = $config['db'];
    $dsn = "mysql:host={$dbConfig['host']};port={$dbConfig['port']};dbname={$dbConfig['name']};charset={$dbConfig['charset']}";
    $pdo = new PDO($dsn, $dbConfig['user'], $dbConfig['pass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);

    // Get existing users to use as references
    $students = $pdo->query("SELECT id, full_name FROM users WHERE role = 'student' LIMIT 3")->fetchAll();
    $teachers = $pdo->query("SELECT id, full_name FROM users WHERE role IN ('teacher', 'admin') LIMIT 2")->fetchAll();
    $admin = $pdo->query("SELECT id FROM users WHERE role = 'admin' LIMIT 1")->fetch();

    if (!$admin) {
        throw new Exception("No admin user found. Please create an admin user first.");
    }

    $adminId = $admin['id'];
    $inserted = 0;

    // Insert sample fee records
    if (!empty($students)) {
        foreach ($students as $index => $student) {
            $feeTypes = ['tuition', 'library', 'lab', 'sports', 'transport', 'examination', 'admission', 'other'];
            $feeType = $feeTypes[$index % count($feeTypes)];
            $amount = rand(500, 5000);
            $discount = rand(0, 500);
            $paid = rand(0, 1) ? $amount - $discount : rand(0, $amount - $discount);
            
            $stmt = $pdo->prepare("INSERT INTO fees (student_id, fee_type, amount, discount, fine, paid_amount, remaining_amount, due_date, payment_date, status, remarks, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $student['id'],
                $feeType,
                $amount,
                $discount,
                0,
                $paid,
                $amount - $discount - $paid,
                date('Y-m-d', strtotime('+30 days')),
                $paid > 0 ? date('Y-m-d') : null,
                $paid >= $amount - $discount ? 'paid' : ($paid > 0 ? 'partially_paid' : 'unpaid'),
                'Sample fee record',
                $adminId
            ]);
            $inserted++;
        }
    }

    // Insert sample salary records
    if (!empty($teachers)) {
        foreach ($teachers as $teacher) {
            for ($month = 1; $month <= 3; $month++) {
                $amount = rand(3000, 5000);
                $isPaid = rand(0, 1);
                
                $stmt = $pdo->prepare("INSERT INTO salaries (employee_id, month, year, amount, payment_date, status, remarks, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
                $stmt->execute([
                    $teacher['id'],
                    $month,
                    2025,
                    $amount,
                    $isPaid ? date('Y-m-d') : null,
                    $isPaid ? 'paid' : 'unpaid',
                    'Sample salary record',
                    $adminId
                ]);
                $inserted++;
            }
        }
    }

    // Insert sample expense records
    $expenseCategories = ['utilities', 'maintenance', 'equipment', 'office_supplies', 'salaries', 'miscellaneous'];
    $expenseTitles = ['Electricity Bill', 'Water Bill', 'Building Maintenance', 'Computer Equipment', 'Office Supplies', 'Internet Service', 'Cleaning Services', 'Security Services'];
    
    foreach ($expenseTitles as $index => $title) {
        $stmt = $pdo->prepare("INSERT INTO expenses (title, category, amount, expense_date, description, created_by) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $title,
            $expenseCategories[$index % count($expenseCategories)],
            rand(200, 5000),
            date('Y-m-d', strtotime('-' . rand(1, 90) . ' days')),
            'Sample expense record',
            $adminId
        ]);
        $inserted++;
    }

    // Insert sample income records
    $incomeSources = ['fees', 'donations', 'grants', 'other'];
    $incomeDescriptions = ['Fee collection', 'Donation from alumni', 'Government grant', 'Facility rental income'];
    
    foreach ($incomeDescriptions as $index => $description) {
        $stmt = $pdo->prepare("INSERT INTO incomes (source, amount, income_date, description, created_by) VALUES (?, ?, ?, ?, ?)");
        $stmt->execute([
            $incomeSources[$index % count($incomeSources)],
            rand(1000, 20000),
            date('Y-m-d', strtotime('-' . rand(1, 90) . ' days')),
            $description,
            $adminId
        ]);
        $inserted++;
    }

    echo json_encode([
        'success' => true,
        'message' => "Finance module seeder completed successfully! Inserted $inserted records.",
        'records_inserted' => $inserted
    ]);
    
} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage()
    ]);
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Error: ' . $e->getMessage()
    ]);
}
