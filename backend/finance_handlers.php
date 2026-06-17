<?php
declare(strict_types=1);

// ==================== FINANCE DASHBOARD ====================

function handle_finance_dashboard(PDO $pdo): void
{
    $user = require_role($pdo, 'admin');
    
    // Total Income (fees collected + other income)
    $st = $pdo->prepare('SELECT COALESCE(SUM(paid_amount), 0) as total FROM fees WHERE status IN ("paid", "partially_paid")');
    $st->execute();
    $feesIncome = $st->fetch()['total'] ?? 0;
    
    $st = $pdo->prepare('SELECT COALESCE(SUM(amount), 0) as total FROM incomes');
    $st->execute();
    $otherIncome = $st->fetch()['total'] ?? 0;
    
    $totalIncome = $feesIncome + $otherIncome;
    
    // Total Expenses
    $st = $pdo->prepare('SELECT COALESCE(SUM(amount), 0) as total FROM expenses');
    $st->execute();
    $totalExpenses = $st->fetch()['total'] ?? 0;
    
    // Total Salaries Paid
    $st = $pdo->prepare('SELECT COALESCE(SUM(amount), 0) as total FROM salaries WHERE status = "paid"');
    $st->execute();
    $totalSalaries = $st->fetch()['total'] ?? 0;
    
    // Net Balance
    $netBalance = $totalIncome - $totalExpenses - $totalSalaries;
    
    // Pending Student Dues
    $st = $pdo->prepare('SELECT COALESCE(SUM(remaining_amount), 0) as total FROM fees WHERE status IN ("unpaid", "partially_paid")');
    $st->execute();
    $pendingDues = $st->fetch()['total'] ?? 0;
    
    // Monthly Revenue Analytics (last 12 months)
    $st = $pdo->prepare('
        SELECT 
            DATE_FORMAT(created_at, "%Y-%m") as month,
            SUM(paid_amount) as revenue
        FROM fees
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
        GROUP BY DATE_FORMAT(created_at, "%Y-%m")
        ORDER BY month ASC
    ');
    $st->execute();
    $monthlyRevenue = $st->fetchAll();
    
    // Monthly Expense Analytics (last 12 months)
    $st = $pdo->prepare('
        SELECT 
            DATE_FORMAT(expense_date, "%Y-%m") as month,
            SUM(amount) as expense
        FROM expenses
        WHERE expense_date >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
        GROUP BY DATE_FORMAT(expense_date, "%Y-%m")
        ORDER BY month ASC
    ');
    $st->execute();
    $monthlyExpenses = $st->fetchAll();
    
    // Recent Transactions (last 10)
    $st = $pdo->prepare('
        SELECT 
            "fee" as type,
            f.id,
            f.amount,
            f.paid_amount,
            f.created_at,
            u.full_name as student_name,
            f.status
        FROM fees f
        JOIN users u ON f.student_id = u.id
        WHERE f.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        
        UNION ALL
        
        SELECT 
            "expense" as type,
            e.id,
            e.amount,
            e.amount as paid_amount,
            e.created_at,
            e.title as student_name,
            "completed" as status
        FROM expenses e
        WHERE e.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        
        ORDER BY created_at DESC
        LIMIT 10
    ');
    $st->execute();
    $recentTransactions = $st->fetchAll();
    
    json_out([
        'ok' => true,
        'stats' => [
            'total_income' => (float) $totalIncome,
            'total_expenses' => (float) $totalExpenses,
            'total_salaries' => (float) $totalSalaries,
            'net_balance' => (float) $netBalance,
            'pending_dues' => (float) $pendingDues,
        ],
        'monthly_revenue' => $monthlyRevenue,
        'monthly_expenses' => $monthlyExpenses,
        'recent_transactions' => $recentTransactions,
    ]);
}

// ==================== FEE MANAGEMENT ====================

function handle_fees(PDO $pdo, string $method): void
{
    $user = require_role($pdo, 'admin');
    
    switch ($method) {
        case 'GET':
            handle_get_fees($pdo);
            break;
        case 'POST':
            handle_create_fee($pdo, $user);
            break;
        case 'PATCH':
            handle_update_fee($pdo, $user);
            break;
        case 'DELETE':
            handle_delete_fee($pdo, $user);
            break;
        default:
            json_out(['ok' => false, 'error' => 'Method not allowed'], 405);
    }
}

function handle_get_fees(PDO $pdo): void
{
    $params = $_GET;
    $where = ['1=1'];
    $bindings = [];
    
    // Filters
    if (!empty($params['student_name'])) {
        $where[] = 'u.full_name LIKE ?';
        $bindings[] = '%' . $params['student_name'] . '%';
    }
    
    if (!empty($params['student_code'])) {
        $where[] = 'u.student_code = ?';
        $bindings[] = $params['student_code'];
    }
    
    if (!empty($params['fee_type'])) {
        $where[] = 'f.fee_type = ?';
        $bindings[] = $params['fee_type'];
    }
    
    if (!empty($params['status'])) {
        $where[] = 'f.status = ?';
        $bindings[] = $params['status'];
    }
    
    if (!empty($params['date_from'])) {
        $where[] = 'f.due_date >= ?';
        $bindings[] = $params['date_from'];
    }
    
    if (!empty($params['date_to'])) {
        $where[] = 'f.due_date <= ?';
        $bindings[] = $params['date_to'];
    }
    
    // Pagination
    $page = (int) ($params['page'] ?? 1);
    $limit = (int) ($params['limit'] ?? 20);
    $offset = ($page - 1) * $limit;
    
    $sql = '
        SELECT 
            f.*,
            u.full_name as student_name,
            u.student_code,
            u.email as student_email
        FROM fees f
        JOIN users u ON f.student_id = u.id
        WHERE ' . implode(' AND ', $where) . '
        ORDER BY f.created_at DESC
        LIMIT ? OFFSET ?
    ';
    
    $bindings[] = $limit;
    $bindings[] = $offset;
    
    $st = $pdo->prepare($sql);
    $st->execute($bindings);
    $fees = $st->fetchAll();
    
    // Count total
    $countSql = '
        SELECT COUNT(*) as total
        FROM fees f
        JOIN users u ON f.student_id = u.id
        WHERE ' . implode(' AND ', $where) . '
    ';
    $countBindings = array_slice($bindings, 0, -2);
    $st = $pdo->prepare($countSql);
    $st->execute($countBindings);
    $total = $st->fetch()['total'];
    
    json_out([
        'ok' => true,
        'fees' => $fees,
        'pagination' => [
            'page' => $page,
            'limit' => $limit,
            'total' => (int) $total,
            'pages' => ceil($total / $limit),
        ],
    ]);
}

function handle_create_fee(PDO $pdo, array $user): void
{
    $in = json_in();
    
    $studentId = (int) ($in['student_id'] ?? 0);
    $feeType = $in['fee_type'] ?? 'tuition';
    $amount = (float) ($in['amount'] ?? 0);
    $discount = (float) ($in['discount'] ?? 0);
    $fine = (float) ($in['fine'] ?? 0);
    $dueDate = $in['due_date'] ?? '';
    $remarks = $in['remarks'] ?? null;
    
    if ($studentId <= 0) {
        json_out(['ok' => false, 'error' => 'Student ID is required'], 422);
    }
    
    if ($amount <= 0) {
        json_out(['ok' => false, 'error' => 'Amount must be greater than 0'], 422);
    }
    
    if ($dueDate === '') {
        json_out(['ok' => false, 'error' => 'Due date is required'], 422);
    }
    
    // Verify student exists
    $st = $pdo->prepare('SELECT id, full_name FROM users WHERE id = ? AND role = "student"');
    $st->execute([$studentId]);
    $student = $st->fetch();
    
    if (!$student) {
        json_out(['ok' => false, 'error' => 'Student not found'], 404);
    }
    
    $remainingAmount = $amount - $discount;
    $status = $remainingAmount > 0 ? 'unpaid' : 'paid';
    
    $pdo->beginTransaction();
    try {
        $st = $pdo->prepare('
            INSERT INTO fees (student_id, fee_type, amount, discount, fine, paid_amount, remaining_amount, due_date, status, remarks, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ');
        $st->execute([
            $studentId,
            $feeType,
            $amount,
            $discount,
            $fine,
            0,
            $remainingAmount,
            $dueDate,
            $status,
            $remarks,
            $user['id'],
        ]);
        
        $feeId = (int) $pdo->lastInsertId();
        
        log_activity($pdo, $user['id'], 'create_fee', "Created fee record for student: {$student['full_name']}", 'fee', $feeId);
        
        $pdo->commit();
        
        json_out(['ok' => true, 'fee_id' => $feeId, 'message' => 'Fee record created successfully']);
    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }
}

function handle_update_fee(PDO $pdo, array $user): void
{
    $in = json_in();
    
    $feeId = (int) ($in['id'] ?? 0);
    $paidAmount = (float) ($in['paid_amount'] ?? 0);
    $status = $in['status'] ?? null;
    $remarks = $in['remarks'] ?? null;
    
    if ($feeId <= 0) {
        json_out(['ok' => false, 'error' => 'Fee ID is required'], 422);
    }
    
    // Get current fee
    $st = $pdo->prepare('SELECT * FROM fees WHERE id = ?');
    $st->execute([$feeId]);
    $fee = $st->fetch();
    
    if (!$fee) {
        json_out(['ok' => false, 'error' => 'Fee record not found'], 404);
    }
    
    $pdo->beginTransaction();
    try {
        $updates = [];
        $bindings = [];
        
        if ($paidAmount > 0) {
            $newPaidAmount = $fee['paid_amount'] + $paidAmount;
            $newRemainingAmount = $fee['amount'] - $fee['discount'] + $fee['fine'] - $newPaidAmount;
            $newStatus = $newRemainingAmount <= 0 ? 'paid' : ($newPaidAmount > 0 ? 'partially_paid' : 'unpaid');
            
            $updates[] = 'paid_amount = ?';
            $bindings[] = $newPaidAmount;
            $updates[] = 'remaining_amount = ?';
            $bindings[] = $newRemainingAmount;
            $updates[] = 'status = ?';
            $bindings[] = $newStatus;
            
            if ($newStatus === 'paid') {
                $updates[] = 'payment_date = CURDATE()';
            }
        }
        
        if ($status !== null) {
            $updates[] = 'status = ?';
            $bindings[] = $status;
            
            if ($status === 'paid') {
                $updates[] = 'payment_date = CURDATE()';
                $updates[] = 'remaining_amount = 0';
                $updates[] = 'paid_amount = amount - discount + fine';
            }
        }
        
        if ($remarks !== null) {
            $updates[] = 'remarks = ?';
            $bindings[] = $remarks;
        }
        
        if (empty($updates)) {
            json_out(['ok' => false, 'error' => 'No fields to update'], 422);
        }
        
        $bindings[] = $feeId;
        
        $sql = 'UPDATE fees SET ' . implode(', ', $updates) . ' WHERE id = ?';
        $st = $pdo->prepare($sql);
        $st->execute($bindings);
        
        log_activity($pdo, $user['id'], 'update_fee', "Updated fee record ID: $feeId", 'fee', $feeId, $fee, ['paid_amount' => $paidAmount, 'status' => $status]);
        
        $pdo->commit();
        
        json_out(['ok' => true, 'message' => 'Fee record updated successfully']);
    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }
}

function handle_delete_fee(PDO $pdo, array $user): void
{
    $in = json_in();
    $feeId = (int) ($in['id'] ?? 0);
    
    if ($feeId <= 0) {
        json_out(['ok' => false, 'error' => 'Fee ID is required'], 422);
    }
    
    $st = $pdo->prepare('SELECT * FROM fees WHERE id = ?');
    $st->execute([$feeId]);
    $fee = $st->fetch();
    
    if (!$fee) {
        json_out(['ok' => false, 'error' => 'Fee record not found'], 404);
    }
    
    $st = $pdo->prepare('DELETE FROM fees WHERE id = ?');
    $st->execute([$feeId]);
    
    log_activity($pdo, $user['id'], 'delete_fee', "Deleted fee record ID: $feeId", 'fee', $feeId, $fee);
    
    json_out(['ok' => true, 'message' => 'Fee record deleted successfully']);
}

// ==================== SALARY MANAGEMENT ====================

function handle_salaries(PDO $pdo, string $method): void
{
    $user = require_role($pdo, 'admin');
    
    switch ($method) {
        case 'GET':
            handle_get_salaries($pdo);
            break;
        case 'POST':
            handle_create_salary($pdo, $user);
            break;
        case 'PATCH':
            handle_update_salary($pdo, $user);
            break;
        case 'DELETE':
            handle_delete_salary($pdo, $user);
            break;
        default:
            json_out(['ok' => false, 'error' => 'Method not allowed'], 405);
    }
}

function handle_get_salaries(PDO $pdo): void
{
    $params = $_GET;
    $where = ['1=1'];
    $bindings = [];
    
    // Filters
    if (!empty($params['employee_name'])) {
        $where[] = 'u.full_name LIKE ?';
        $bindings[] = '%' . $params['employee_name'] . '%';
    }
    
    if (!empty($params['employee_code'])) {
        $where[] = 'u.employee_code = ?';
        $bindings[] = $params['employee_code'];
    }
    
    if (!empty($params['status'])) {
        $where[] = 's.status = ?';
        $bindings[] = $params['status'];
    }
    
    if (!empty($params['month'])) {
        $where[] = 's.month = ?';
        $bindings[] = $params['month'];
    }
    
    if (!empty($params['year'])) {
        $where[] = 's.year = ?';
        $bindings[] = $params['year'];
    }
    
    // Pagination
    $page = (int) ($params['page'] ?? 1);
    $limit = (int) ($params['limit'] ?? 20);
    $offset = ($page - 1) * $limit;
    
    $sql = '
        SELECT 
            s.*,
            u.full_name as employee_name,
            u.employee_code,
            u.email as employee_email,
            u.role as employee_role
        FROM salaries s
        JOIN users u ON s.employee_id = u.id
        WHERE ' . implode(' AND ', $where) . '
        ORDER BY s.year DESC, s.month DESC
        LIMIT ? OFFSET ?
    ';
    
    $bindings[] = $limit;
    $bindings[] = $offset;
    
    $st = $pdo->prepare($sql);
    $st->execute($bindings);
    $salaries = $st->fetchAll();
    
    // Count total
    $countSql = '
        SELECT COUNT(*) as total
        FROM salaries s
        JOIN users u ON s.employee_id = u.id
        WHERE ' . implode(' AND ', $where) . '
    ';
    $countBindings = array_slice($bindings, 0, -2);
    $st = $pdo->prepare($countSql);
    $st->execute($countBindings);
    $total = $st->fetch()['total'];
    
    json_out([
        'ok' => true,
        'salaries' => $salaries,
        'pagination' => [
            'page' => $page,
            'limit' => $limit,
            'total' => (int) $total,
            'pages' => ceil($total / $limit),
        ],
    ]);
}

function handle_create_salary(PDO $pdo, array $user): void
{
    $in = json_in();
    
    $employeeId = (int) ($in['employee_id'] ?? 0);
    $month = (int) ($in['month'] ?? 0);
    $year = (int) ($in['year'] ?? 0);
    $amount = (float) ($in['amount'] ?? 0);
    $remarks = $in['remarks'] ?? null;
    
    if ($employeeId <= 0) {
        json_out(['ok' => false, 'error' => 'Employee ID is required'], 422);
    }
    
    if ($month < 1 || $month > 12) {
        json_out(['ok' => false, 'error' => 'Invalid month'], 422);
    }
    
    if ($year < 2000 || $year > 2100) {
        json_out(['ok' => false, 'error' => 'Invalid year'], 422);
    }
    
    if ($amount <= 0) {
        json_out(['ok' => false, 'error' => 'Amount must be greater than 0'], 422);
    }
    
    // Verify employee exists
    $st = $pdo->prepare('SELECT id, full_name, role FROM users WHERE id = ? AND role IN ("teacher", "admin")');
    $st->execute([$employeeId]);
    $employee = $st->fetch();
    
    if (!$employee) {
        json_out(['ok' => false, 'error' => 'Employee not found'], 404);
    }
    
    // Check for duplicate
    $st = $pdo->prepare('SELECT id FROM salaries WHERE employee_id = ? AND month = ? AND year = ?');
    $st->execute([$employeeId, $month, $year]);
    if ($st->fetch()) {
        json_out(['ok' => false, 'error' => 'Salary record already exists for this month and year'], 409);
    }
    
    $pdo->beginTransaction();
    try {
        $st = $pdo->prepare('
            INSERT INTO salaries (employee_id, month, year, amount, status, remarks, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ');
        $st->execute([
            $employeeId,
            $month,
            $year,
            $amount,
            'unpaid',
            $remarks,
            $user['id'],
        ]);
        
        $salaryId = (int) $pdo->lastInsertId();
        
        log_activity($pdo, $user['id'], 'create_salary', "Created salary record for employee: {$employee['full_name']}", 'salary', $salaryId);
        
        $pdo->commit();
        
        json_out(['ok' => true, 'salary_id' => $salaryId, 'message' => 'Salary record created successfully']);
    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }
}

function handle_update_salary(PDO $pdo, array $user): void
{
    $in = json_in();
    
    $salaryId = (int) ($in['id'] ?? 0);
    $status = $in['status'] ?? null;
    $amount = $in['amount'] ?? null;
    $remarks = $in['remarks'] ?? null;
    
    if ($salaryId <= 0) {
        json_out(['ok' => false, 'error' => 'Salary ID is required'], 422);
    }
    
    // Get current salary
    $st = $pdo->prepare('SELECT * FROM salaries WHERE id = ?');
    $st->execute([$salaryId]);
    $salary = $st->fetch();
    
    if (!$salary) {
        json_out(['ok' => false, 'error' => 'Salary record not found'], 404);
    }
    
    $pdo->beginTransaction();
    try {
        $updates = [];
        $bindings = [];
        
        if ($status !== null) {
            $updates[] = 'status = ?';
            $bindings[] = $status;
            
            if ($status === 'paid') {
                $updates[] = 'payment_date = CURDATE()';
            }
        }
        
        if ($amount !== null) {
            $updates[] = 'amount = ?';
            $bindings[] = $amount;
        }
        
        if ($remarks !== null) {
            $updates[] = 'remarks = ?';
            $bindings[] = $remarks;
        }
        
        if (empty($updates)) {
            json_out(['ok' => false, 'error' => 'No fields to update'], 422);
        }
        
        $bindings[] = $salaryId;
        
        $sql = 'UPDATE salaries SET ' . implode(', ', $updates) . ' WHERE id = ?';
        $st = $pdo->prepare($sql);
        $st->execute($bindings);
        
        log_activity($pdo, $user['id'], 'update_salary', "Updated salary record ID: $salaryId", 'salary', $salaryId, $salary, ['status' => $status, 'amount' => $amount]);
        
        $pdo->commit();
        
        json_out(['ok' => true, 'message' => 'Salary record updated successfully']);
    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }
}

function handle_delete_salary(PDO $pdo, array $user): void
{
    $in = json_in();
    $salaryId = (int) ($in['id'] ?? 0);
    
    if ($salaryId <= 0) {
        json_out(['ok' => false, 'error' => 'Salary ID is required'], 422);
    }
    
    $st = $pdo->prepare('SELECT * FROM salaries WHERE id = ?');
    $st->execute([$salaryId]);
    $salary = $st->fetch();
    
    if (!$salary) {
        json_out(['ok' => false, 'error' => 'Salary record not found'], 404);
    }
    
    $st = $pdo->prepare('DELETE FROM salaries WHERE id = ?');
    $st->execute([$salaryId]);
    
    log_activity($pdo, $user['id'], 'delete_salary', "Deleted salary record ID: $salaryId", 'salary', $salaryId, $salary);
    
    json_out(['ok' => true, 'message' => 'Salary record deleted successfully']);
}

// ==================== EXPENSE MANAGEMENT ====================

function handle_expenses(PDO $pdo, string $method): void
{
    $user = require_role($pdo, 'admin');
    
    switch ($method) {
        case 'GET':
            handle_get_expenses($pdo);
            break;
        case 'POST':
            handle_create_expense($pdo, $user);
            break;
        case 'PATCH':
            handle_update_expense($pdo, $user);
            break;
        case 'DELETE':
            handle_delete_expense($pdo, $user);
            break;
        default:
            json_out(['ok' => false, 'error' => 'Method not allowed'], 405);
    }
}

function handle_get_expenses(PDO $pdo): void
{
    $params = $_GET;
    $where = ['1=1'];
    $bindings = [];
    
    // Filters
    if (!empty($params['category'])) {
        $where[] = 'category = ?';
        $bindings[] = $params['category'];
    }
    
    if (!empty($params['date_from'])) {
        $where[] = 'expense_date >= ?';
        $bindings[] = $params['date_from'];
    }
    
    if (!empty($params['date_to'])) {
        $where[] = 'expense_date <= ?';
        $bindings[] = $params['date_to'];
    }
    
    // Pagination
    $page = (int) ($params['page'] ?? 1);
    $limit = (int) ($params['limit'] ?? 20);
    $offset = ($page - 1) * $limit;
    
    $sql = '
        SELECT 
            e.*,
            u.full_name as created_by_name
        FROM expenses e
        LEFT JOIN users u ON e.created_by = u.id
        WHERE ' . implode(' AND ', $where) . '
        ORDER BY e.expense_date DESC
        LIMIT ? OFFSET ?
    ';
    
    $bindings[] = $limit;
    $bindings[] = $offset;
    
    $st = $pdo->prepare($sql);
    $st->execute($bindings);
    $expenses = $st->fetchAll();
    
    // Count total
    $countSql = 'SELECT COUNT(*) as total FROM expenses WHERE ' . implode(' AND ', $where);
    $countBindings = array_slice($bindings, 0, -2);
    $st = $pdo->prepare($countSql);
    $st->execute($countBindings);
    $total = $st->fetch()['total'];
    
    json_out([
        'ok' => true,
        'expenses' => $expenses,
        'pagination' => [
            'page' => $page,
            'limit' => $limit,
            'total' => (int) $total,
            'pages' => ceil($total / $limit),
        ],
    ]);
}

function handle_create_expense(PDO $pdo, array $user): void
{
    $in = json_in();
    
    $title = trim($in['title'] ?? '');
    $category = $in['category'] ?? 'miscellaneous';
    $amount = (float) ($in['amount'] ?? 0);
    $expenseDate = $in['expense_date'] ?? '';
    $description = $in['description'] ?? null;
    
    if ($title === '') {
        json_out(['ok' => false, 'error' => 'Title is required'], 422);
    }
    
    if ($amount <= 0) {
        json_out(['ok' => false, 'error' => 'Amount must be greater than 0'], 422);
    }
    
    if ($expenseDate === '') {
        json_out(['ok' => false, 'error' => 'Expense date is required'], 422);
    }
    
    $pdo->beginTransaction();
    try {
        $st = $pdo->prepare('
            INSERT INTO expenses (title, category, amount, expense_date, description, created_by)
            VALUES (?, ?, ?, ?, ?, ?)
        ');
        $st->execute([
            $title,
            $category,
            $amount,
            $expenseDate,
            $description,
            $user['id'],
        ]);
        
        $expenseId = (int) $pdo->lastInsertId();
        
        log_activity($pdo, $user['id'], 'create_expense', "Created expense: $title", 'expense', $expenseId);
        
        $pdo->commit();
        
        json_out(['ok' => true, 'expense_id' => $expenseId, 'message' => 'Expense created successfully']);
    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }
}

function handle_update_expense(PDO $pdo, array $user): void
{
    $in = json_in();
    
    $expenseId = (int) ($in['id'] ?? 0);
    $title = $in['title'] ?? null;
    $category = $in['category'] ?? null;
    $amount = $in['amount'] ?? null;
    $expenseDate = $in['expense_date'] ?? null;
    $description = $in['description'] ?? null;
    
    if ($expenseId <= 0) {
        json_out(['ok' => false, 'error' => 'Expense ID is required'], 422);
    }
    
    // Get current expense
    $st = $pdo->prepare('SELECT * FROM expenses WHERE id = ?');
    $st->execute([$expenseId]);
    $expense = $st->fetch();
    
    if (!$expense) {
        json_out(['ok' => false, 'error' => 'Expense not found'], 404);
    }
    
    $pdo->beginTransaction();
    try {
        $updates = [];
        $bindings = [];
        
        if ($title !== null) {
            $updates[] = 'title = ?';
            $bindings[] = $title;
        }
        
        if ($category !== null) {
            $updates[] = 'category = ?';
            $bindings[] = $category;
        }
        
        if ($amount !== null) {
            $updates[] = 'amount = ?';
            $bindings[] = $amount;
        }
        
        if ($expenseDate !== null) {
            $updates[] = 'expense_date = ?';
            $bindings[] = $expenseDate;
        }
        
        if ($description !== null) {
            $updates[] = 'description = ?';
            $bindings[] = $description;
        }
        
        if (empty($updates)) {
            json_out(['ok' => false, 'error' => 'No fields to update'], 422);
        }
        
        $bindings[] = $expenseId;
        
        $sql = 'UPDATE expenses SET ' . implode(', ', $updates) . ' WHERE id = ?';
        $st = $pdo->prepare($sql);
        $st->execute($bindings);
        
        log_activity($pdo, $user['id'], 'update_expense', "Updated expense ID: $expenseId", 'expense', $expenseId, $expense, ['title' => $title, 'amount' => $amount]);
        
        $pdo->commit();
        
        json_out(['ok' => true, 'message' => 'Expense updated successfully']);
    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }
}

function handle_delete_expense(PDO $pdo, array $user): void
{
    $in = json_in();
    $expenseId = (int) ($in['id'] ?? 0);
    
    if ($expenseId <= 0) {
        json_out(['ok' => false, 'error' => 'Expense ID is required'], 422);
    }
    
    $st = $pdo->prepare('SELECT * FROM expenses WHERE id = ?');
    $st->execute([$expenseId]);
    $expense = $st->fetch();
    
    if (!$expense) {
        json_out(['ok' => false, 'error' => 'Expense not found'], 404);
    }
    
    $st = $pdo->prepare('DELETE FROM expenses WHERE id = ?');
    $st->execute([$expenseId]);
    
    log_activity($pdo, $user['id'], 'delete_expense', "Deleted expense ID: $expenseId", 'expense', $expenseId, $expense);
    
    json_out(['ok' => true, 'message' => 'Expense deleted successfully']);
}

// ==================== INCOME MANAGEMENT ====================

function handle_incomes(PDO $pdo, string $method): void
{
    $user = require_role($pdo, 'admin');
    
    switch ($method) {
        case 'GET':
            handle_get_incomes($pdo);
            break;
        case 'POST':
            handle_create_income($pdo, $user);
            break;
        case 'PATCH':
            handle_update_income($pdo, $user);
            break;
        case 'DELETE':
            handle_delete_income($pdo, $user);
            break;
        default:
            json_out(['ok' => false, 'error' => 'Method not allowed'], 405);
    }
}

function handle_get_incomes(PDO $pdo): void
{
    $params = $_GET;
    $where = ['1=1'];
    $bindings = [];
    
    // Filters
    if (!empty($params['source'])) {
        $where[] = 'source = ?';
        $bindings[] = $params['source'];
    }
    
    if (!empty($params['date_from'])) {
        $where[] = 'income_date >= ?';
        $bindings[] = $params['date_from'];
    }
    
    if (!empty($params['date_to'])) {
        $where[] = 'income_date <= ?';
        $bindings[] = $params['date_to'];
    }
    
    // Pagination
    $page = (int) ($params['page'] ?? 1);
    $limit = (int) ($params['limit'] ?? 20);
    $offset = ($page - 1) * $limit;
    
    $sql = '
        SELECT 
            i.*,
            u.full_name as created_by_name
        FROM incomes i
        LEFT JOIN users u ON i.created_by = u.id
        WHERE ' . implode(' AND ', $where) . '
        ORDER BY i.income_date DESC
        LIMIT ? OFFSET ?
    ';
    
    $bindings[] = $limit;
    $bindings[] = $offset;
    
    $st = $pdo->prepare($sql);
    $st->execute($bindings);
    $incomes = $st->fetchAll();
    
    // Count total
    $countSql = 'SELECT COUNT(*) as total FROM incomes WHERE ' . implode(' AND ', $where);
    $countBindings = array_slice($bindings, 0, -2);
    $st = $pdo->prepare($countSql);
    $st->execute($countBindings);
    $total = $st->fetch()['total'];
    
    json_out([
        'ok' => true,
        'incomes' => $incomes,
        'pagination' => [
            'page' => $page,
            'limit' => $limit,
            'total' => (int) $total,
            'pages' => ceil($total / $limit),
        ],
    ]);
}

function handle_create_income(PDO $pdo, array $user): void
{
    $in = json_in();
    
    $source = $in['source'] ?? 'other';
    $amount = (float) ($in['amount'] ?? 0);
    $incomeDate = $in['income_date'] ?? '';
    $description = $in['description'] ?? null;
    
    if ($amount <= 0) {
        json_out(['ok' => false, 'error' => 'Amount must be greater than 0'], 422);
    }
    
    if ($incomeDate === '') {
        json_out(['ok' => false, 'error' => 'Income date is required'], 422);
    }
    
    $pdo->beginTransaction();
    try {
        $st = $pdo->prepare('
            INSERT INTO incomes (source, amount, income_date, description, created_by)
            VALUES (?, ?, ?, ?, ?)
        ');
        $st->execute([
            $source,
            $amount,
            $incomeDate,
            $description,
            $user['id'],
        ]);
        
        $incomeId = (int) $pdo->lastInsertId();
        
        log_activity($pdo, $user['id'], 'create_income', "Created income: $source", 'income', $incomeId);
        
        $pdo->commit();
        
        json_out(['ok' => true, 'income_id' => $incomeId, 'message' => 'Income created successfully']);
    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }
}

function handle_update_income(PDO $pdo, array $user): void
{
    $in = json_in();
    
    $incomeId = (int) ($in['id'] ?? 0);
    $source = $in['source'] ?? null;
    $amount = $in['amount'] ?? null;
    $incomeDate = $in['income_date'] ?? null;
    $description = $in['description'] ?? null;
    
    if ($incomeId <= 0) {
        json_out(['ok' => false, 'error' => 'Income ID is required'], 422);
    }
    
    // Get current income
    $st = $pdo->prepare('SELECT * FROM incomes WHERE id = ?');
    $st->execute([$incomeId]);
    $income = $st->fetch();
    
    if (!$income) {
        json_out(['ok' => false, 'error' => 'Income not found'], 404);
    }
    
    $pdo->beginTransaction();
    try {
        $updates = [];
        $bindings = [];
        
        if ($source !== null) {
            $updates[] = 'source = ?';
            $bindings[] = $source;
        }
        
        if ($amount !== null) {
            $updates[] = 'amount = ?';
            $bindings[] = $amount;
        }
        
        if ($incomeDate !== null) {
            $updates[] = 'income_date = ?';
            $bindings[] = $incomeDate;
        }
        
        if ($description !== null) {
            $updates[] = 'description = ?';
            $bindings[] = $description;
        }
        
        if (empty($updates)) {
            json_out(['ok' => false, 'error' => 'No fields to update'], 422);
        }
        
        $bindings[] = $incomeId;
        
        $sql = 'UPDATE incomes SET ' . implode(', ', $updates) . ' WHERE id = ?';
        $st = $pdo->prepare($sql);
        $st->execute($bindings);
        
        log_activity($pdo, $user['id'], 'update_income', "Updated income ID: $incomeId", 'income', $incomeId, $income, ['source' => $source, 'amount' => $amount]);
        
        $pdo->commit();
        
        json_out(['ok' => true, 'message' => 'Income updated successfully']);
    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }
}

function handle_delete_income(PDO $pdo, array $user): void
{
    $in = json_in();
    $incomeId = (int) ($in['id'] ?? 0);
    
    if ($incomeId <= 0) {
        json_out(['ok' => false, 'error' => 'Income ID is required'], 422);
    }
    
    $st = $pdo->prepare('SELECT * FROM incomes WHERE id = ?');
    $st->execute([$incomeId]);
    $income = $st->fetch();
    
    if (!$income) {
        json_out(['ok' => false, 'error' => 'Income not found'], 404);
    }
    
    $st = $pdo->prepare('DELETE FROM incomes WHERE id = ?');
    $st->execute([$incomeId]);
    
    log_activity($pdo, $user['id'], 'delete_income', "Deleted income ID: $incomeId", 'income', $incomeId, $income);
    
    json_out(['ok' => true, 'message' => 'Income deleted successfully']);
}

// ==================== FINANCE REPORTS ====================

function handle_finance_reports(PDO $pdo): void
{
    $user = require_role($pdo, 'admin');
    
    $reportType = $_GET['report_type'] ?? '';
    $dateFrom = $_GET['date_from'] ?? date('Y-m-01');
    $dateTo = $_GET['date_to'] ?? date('Y-m-t');
    $format = $_GET['format'] ?? 'json';
    
    switch ($reportType) {
        case 'daily_collection':
            $data = handle_daily_collection_report($pdo, $dateFrom, $dateTo);
            break;
        case 'monthly_collection':
            $data = handle_monthly_collection_report($pdo, $dateFrom, $dateTo);
            break;
        case 'yearly_collection':
            $data = handle_yearly_collection_report($pdo);
            break;
        case 'outstanding_fees':
            $data = handle_outstanding_fees_report($pdo);
            break;
        case 'salary_report':
            $data = handle_salary_report($pdo, $dateFrom, $dateTo);
            break;
        case 'expense_report':
            $data = handle_expense_report($pdo, $dateFrom, $dateTo);
            break;
        case 'profit_loss':
            $data = handle_profit_loss_report($pdo, $dateFrom, $dateTo);
            break;
        default:
            json_out(['ok' => false, 'error' => 'Invalid report type'], 400);
    }
    
    // Generate Excel if requested
    if ($format === 'excel') {
        generate_report_excel($reportType, $data, $dateFrom, $dateTo);
        return;
    }
    
    json_out(['ok' => true, 'report_type' => $reportType, 'data' => $data, 'date_range' => ['from' => $dateFrom, 'to' => $dateTo]]);
}

function handle_daily_collection_report(PDO $pdo, string $dateFrom, string $dateTo): array
{
    $st = $pdo->prepare('
        SELECT 
            DATE(payment_date) as date,
            COUNT(*) as transactions,
            SUM(paid_amount) as total_collected
        FROM fees
        WHERE payment_date BETWEEN ? AND ?
        GROUP BY DATE(payment_date)
        ORDER BY date ASC
    ');
    $st->execute([$dateFrom, $dateTo]);
    return $st->fetchAll();
}

function handle_monthly_collection_report(PDO $pdo, string $dateFrom, string $dateTo): array
{
    $st = $pdo->prepare('
        SELECT 
            DATE_FORMAT(payment_date, "%Y-%m") as month,
            COUNT(*) as transactions,
            SUM(paid_amount) as total_collected
        FROM fees
        WHERE payment_date BETWEEN ? AND ?
        GROUP BY DATE_FORMAT(payment_date, "%Y-%m")
        ORDER BY month ASC
    ');
    $st->execute([$dateFrom, $dateTo]);
    return $st->fetchAll();
}

function handle_yearly_collection_report(PDO $pdo): array
{
    $st = $pdo->prepare('
        SELECT 
            YEAR(payment_date) as year,
            COUNT(*) as transactions,
            SUM(paid_amount) as total_collected
        FROM fees
        WHERE payment_date IS NOT NULL
        GROUP BY YEAR(payment_date)
        ORDER BY year ASC
    ');
    $st->execute();
    return $st->fetchAll();
}

function handle_outstanding_fees_report(PDO $pdo): array
{
    $st = $pdo->prepare('
        SELECT 
            f.*,
            u.full_name as student_name,
            u.student_code,
            u.email as student_email
        FROM fees f
        JOIN users u ON f.student_id = u.id
        WHERE f.status IN ("unpaid", "partially_paid")
        ORDER BY f.due_date ASC
    ');
    $st->execute();
    return $st->fetchAll();
}

function handle_salary_report(PDO $pdo, string $dateFrom, string $dateTo): array
{
    $st = $pdo->prepare('
        SELECT 
            s.*,
            u.full_name as employee_name,
            u.employee_code,
            u.role as employee_role
        FROM salaries s
        JOIN users u ON s.employee_id = u.id
        WHERE s.payment_date BETWEEN ? AND ?
        ORDER BY s.payment_date DESC
    ');
    $st->execute([$dateFrom, $dateTo]);
    return $st->fetchAll();
}

function handle_expense_report(PDO $pdo, string $dateFrom, string $dateTo): array
{
    $st = $pdo->prepare('
        SELECT 
            e.*,
            u.full_name as created_by_name
        FROM expenses e
        LEFT JOIN users u ON e.created_by = u.id
        WHERE e.expense_date BETWEEN ? AND ?
        ORDER BY e.expense_date DESC
    ');
    $st->execute([$dateFrom, $dateTo]);
    return $st->fetchAll();
}

function handle_profit_loss_report(PDO $pdo, string $dateFrom, string $dateTo): array
{
    // Total Income
    $st = $pdo->prepare('
        SELECT COALESCE(SUM(paid_amount), 0) as total
        FROM fees
        WHERE payment_date BETWEEN ? AND ?
    ');
    $st->execute([$dateFrom, $dateTo]);
    $feeIncome = $st->fetch()['total'];
    
    $st = $pdo->prepare('
        SELECT COALESCE(SUM(amount), 0) as total
        FROM incomes
        WHERE income_date BETWEEN ? AND ?
    ');
    $st->execute([$dateFrom, $dateTo]);
    $otherIncome = $st->fetch()['total'];
    
    $totalIncome = $feeIncome + $otherIncome;
    
    // Total Expenses
    $st = $pdo->prepare('
        SELECT COALESCE(SUM(amount), 0) as total
        FROM expenses
        WHERE expense_date BETWEEN ? AND ?
    ');
    $st->execute([$dateFrom, $dateTo]);
    $totalExpenses = $st->fetch()['total'];
    
    // Total Salaries
    $st = $pdo->prepare('
        SELECT COALESCE(SUM(amount), 0) as total
        FROM salaries
        WHERE payment_date BETWEEN ? AND ?
    ');
    $st->execute([$dateFrom, $dateTo]);
    $totalSalaries = $st->fetch()['total'];
    
    $totalOutflow = $totalExpenses + $totalSalaries;
    $netProfit = $totalIncome - $totalOutflow;
    
    return [
        'income' => [
            'fees' => (float) $feeIncome,
            'other' => (float) $otherIncome,
            'total' => (float) $totalIncome,
        ],
        'expenses' => [
            'operations' => (float) $totalExpenses,
            'salaries' => (float) $totalSalaries,
            'total' => (float) $totalOutflow,
        ],
        'net_profit' => (float) $netProfit,
    ];
}

// ==================== TEACHER/STUDENT SPECIFIC ENDPOINTS ====================

function handle_my_salary(PDO $pdo): void
{
    $user = require_role($pdo, 'teacher');
    
    $st = $pdo->prepare('
        SELECT 
            s.*,
            u.full_name as employee_name,
            u.employee_code
        FROM salaries s
        JOIN users u ON s.employee_id = u.id
        WHERE s.employee_id = ?
        ORDER BY s.year DESC, s.month DESC
    ');
    $st->execute([$user['id']]);
    $salaries = $st->fetchAll();
    
    json_out(['ok' => true, 'salaries' => $salaries]);
}

function handle_my_fees(PDO $pdo): void
{
    $user = require_role($pdo, 'student');
    
    $st = $pdo->prepare('
        SELECT 
            f.*,
            u.full_name as student_name,
            u.student_code
        FROM fees f
        JOIN users u ON f.student_id = u.id
        WHERE f.student_id = ?
        ORDER BY f.due_date DESC
    ');
    $st->execute([$user['id']]);
    $fees = $st->fetchAll();
    
    // Calculate summary
    $totalAmount = 0;
    $totalPaid = 0;
    $totalRemaining = 0;
    
    foreach ($fees as $fee) {
        $totalAmount += $fee['amount'];
        $totalPaid += $fee['paid_amount'];
        $totalRemaining += $fee['remaining_amount'];
    }
    
    json_out([
        'ok' => true,
        'fees' => $fees,
        'summary' => [
            'total_amount' => (float) $totalAmount,
            'total_paid' => (float) $totalPaid,
            'total_remaining' => (float) $totalRemaining,
        ],
    ]);
}

function handle_fee_receipt(PDO $pdo): void
{
    $user = require_role($pdo, 'admin', 'student');
    
    $feeId = (int) ($_GET['id'] ?? 0);
    $format = $_GET['format'] ?? 'json';
    
    if ($feeId <= 0) {
        json_out(['ok' => false, 'error' => 'Fee ID is required'], 422);
    }
    
    // If student, only allow viewing their own fees
    if ($user['role'] === 'student') {
        $st = $pdo->prepare('SELECT * FROM fees WHERE id = ? AND student_id = ?');
        $st->execute([$feeId, $user['id']]);
    } else {
        $st = $pdo->prepare('SELECT * FROM fees WHERE id = ?');
        $st->execute([$feeId]);
    }
    
    $fee = $st->fetch();
    
    if (!$fee) {
        json_out(['ok' => false, 'error' => 'Fee not found'], 404);
    }
    
    // Get student details
    $st = $pdo->prepare('SELECT id, full_name, student_code, email, phone FROM users WHERE id = ?');
    $st->execute([$fee['student_id']]);
    $student = $st->fetch();
    
    // Generate PDF if requested
    if ($format === 'pdf') {
        generate_fee_receipt_pdf($fee, $student);
        return;
    }
    
    json_out([
        'ok' => true,
        'fee' => $fee,
        'student' => $student,
    ]);
}

function handle_salary_slip(PDO $pdo): void
{
    $user = require_role($pdo, 'admin', 'teacher');
    
    $salaryId = (int) ($_GET['id'] ?? 0);
    $format = $_GET['format'] ?? 'json';
    
    if ($salaryId <= 0) {
        json_out(['ok' => false, 'error' => 'Salary ID is required'], 422);
    }
    
    // If teacher, only allow viewing their own salaries
    if ($user['role'] === 'teacher') {
        $st = $pdo->prepare('SELECT * FROM salaries WHERE id = ? AND employee_id = ?');
        $st->execute([$salaryId, $user['id']]);
    } else {
        $st = $pdo->prepare('SELECT * FROM salaries WHERE id = ?');
        $st->execute([$salaryId]);
    }
    
    $salary = $st->fetch();
    
    if (!$salary) {
        json_out(['ok' => false, 'error' => 'Salary not found'], 404);
    }
    
    // Get employee details
    $st = $pdo->prepare('SELECT id, full_name, employee_code, email, phone, role FROM users WHERE id = ?');
    $st->execute([$salary['employee_id']]);
    $employee = $st->fetch();
    
    // Generate PDF if requested
    if ($format === 'pdf') {
        generate_salary_slip_pdf($salary, $employee);
        return;
    }
    
    json_out([
        'ok' => true,
        'salary' => $salary,
        'employee' => $employee,
    ]);
}

// ==================== PDF GENERATION FUNCTIONS ====================

function generate_fee_receipt_pdf(array $fee, array $student): void
{
    // Generate HTML for PDF
    $monthName = date('F', mktime(0, 0, 0, (int) date('m', strtotime($fee['due_date'])), 1));
    $year = date('Y', strtotime($fee['due_date']));
    
    $html = '
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Fee Receipt #' . $fee['id'] . '</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
        .container { max-width: 800px; margin: 0 auto; border: 2px solid #333; padding: 30px; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
        .header h1 { margin: 0; color: #333; }
        .header p { margin: 5px 0; color: #666; }
        .receipt-info { display: flex; justify-content: space-between; margin-bottom: 20px; }
        .receipt-info div { flex: 1; }
        .student-info { background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .student-info h3 { margin: 0 0 10px 0; color: #333; }
        .student-info p { margin: 5px 0; }
        .fee-details { margin-bottom: 20px; }
        .fee-details table { width: 100%; border-collapse: collapse; }
        .fee-details th, .fee-details td { border: 1px solid #ddd; padding: 10px; text-align: left; }
        .fee-details th { background: #f5f5f5; }
        .total { font-size: 18px; font-weight: bold; text-align: right; margin-top: 20px; }
        .status { text-align: center; padding: 10px; margin-top: 20px; border-radius: 5px; font-weight: bold; }
        .status.paid { background: #d4edda; color: #155724; }
        .status.partially_paid { background: #fff3cd; color: #856404; }
        .status.unpaid { background: #f8d7da; color: #721c24; }
        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>COLLEGE MANAGEMENT SYSTEM</h1>
            <p>Fee Receipt</p>
        </div>
        
        <div class="receipt-info">
            <div>
                <p><strong>Receipt No:</strong> #' . $fee['id'] . '</p>
                <p><strong>Date:</strong> ' . ($fee['payment_date'] ? date('F j, Y', strtotime($fee['payment_date'])) : date('F j, Y')) . '</p>
            </div>
            <div style="text-align: right;">
                <p><strong>Academic Year:</strong> ' . $year . '</p>
                <p><strong>Month:</strong> ' . $monthName . '</p>
            </div>
        </div>
        
        <div class="student-info">
            <h3>Student Information</h3>
            <p><strong>Name:</strong> ' . htmlspecialchars($student['full_name']) . '</p>
            <p><strong>Student Code:</strong> ' . htmlspecialchars($student['student_code']) . '</p>
            <p><strong>Email:</strong> ' . htmlspecialchars($student['email']) . '</p>
            <p><strong>Phone:</strong> ' . ($student['phone'] ?: 'N/A') . '</p>
        </div>
        
        <div class="fee-details">
            <table>
                <tr>
                    <th>Description</th>
                    <th>Amount</th>
                </tr>
                <tr>
                    <td>' . ucfirst(str_replace('_', ' ', $fee['fee_type'])) . ' Fee</td>
                    <td>$' . number_format($fee['amount'], 2) . '</td>
                </tr>';
    
    if ($fee['discount'] > 0) {
        $html .= '
                <tr>
                    <td>Discount</td>
                    <td style="color: green;">-$' . number_format($fee['discount'], 2) . '</td>
                </tr>';
    }
    
    if ($fee['fine'] > 0) {
        $html .= '
                <tr>
                    <td>Late Fine</td>
                    <td style="color: red;">+$' . number_format($fee['fine'], 2) . '</td>
                </tr>';
    }
    
    $html .= '
            </table>
            <div class="total">
                Total Amount: $' . number_format($fee['amount'] - $fee['discount'] + $fee['fine'], 2) . '
            </div>
            <div style="margin-top: 15px;">
                <p><strong>Amount Paid:</strong> $' . number_format($fee['paid_amount'], 2) . '</p>
                <p><strong>Remaining Amount:</strong> $' . number_format($fee['remaining_amount'], 2) . '</p>
            </div>
        </div>
        
        <div class="status ' . $fee['status'] . '">
            Status: ' . ucfirst(str_replace('_', ' ', $fee['status'])) . '
        </div>
        
        <div class="footer">
            <p>This is a computer-generated receipt. No signature required.</p>
            <p>Generated on: ' . date('F j, Y g:i A') . '</p>
        </div>
    </div>
</body>
</html>';
    
    // Set headers for PDF download
    header('Content-Type: application/pdf');
    header('Content-Disposition: attachment; filename="fee_receipt_' . $fee['id'] . '.pdf"');
    header('Content-Length: ' . strlen($html));
    
    // For simplicity, we'll output HTML that can be printed to PDF
    // In production, you would use a library like TCPDF or DomPDF
    echo $html;
    exit;
}

// ==================== EXCEL GENERATION FUNCTIONS ====================

function generate_report_excel(string $reportType, array $data, string $dateFrom, string $dateTo): void
{
    $filename = str_replace('_', '_', $reportType) . '_report_' . date('Y-m-d') . '.csv';
    
    header('Content-Type: text/csv');
    header('Content-Disposition: attachment; filename="' . $filename . '"');
    header('Pragma: no-cache');
    header('Expires: 0');
    
    $output = fopen('php://output', 'w');
    
    switch ($reportType) {
        case 'daily_collection':
            fputcsv($output, ['Date', 'Transactions', 'Total Collected']);
            foreach ($data as $row) {
                fputcsv($output, [$row['date'], $row['transactions'], $row['total_collected']]);
            }
            break;
            
        case 'monthly_collection':
            fputcsv($output, ['Month', 'Transactions', 'Total Collected']);
            foreach ($data as $row) {
                fputcsv($output, [$row['month'], $row['transactions'], $row['total_collected']]);
            }
            break;
            
        case 'yearly_collection':
            fputcsv($output, ['Year', 'Transactions', 'Total Collected']);
            foreach ($data as $row) {
                fputcsv($output, [$row['year'], $row['transactions'], $row['total_collected']]);
            }
            break;
            
        case 'outstanding_fees':
            fputcsv($output, ['ID', 'Student Name', 'Student Code', 'Fee Type', 'Amount', 'Discount', 'Fine', 'Paid', 'Remaining', 'Due Date', 'Status']);
            foreach ($data as $row) {
                fputcsv($output, [
                    $row['id'],
                    $row['student_name'],
                    $row['student_code'],
                    $row['fee_type'],
                    $row['amount'],
                    $row['discount'],
                    $row['fine'],
                    $row['paid_amount'],
                    $row['remaining_amount'],
                    $row['due_date'],
                    $row['status']
                ]);
            }
            break;
            
        case 'salary_report':
            fputcsv($output, ['ID', 'Employee Name', 'Employee Code', 'Role', 'Month', 'Year', 'Amount', 'Payment Date', 'Status']);
            foreach ($data as $row) {
                fputcsv($output, [
                    $row['id'],
                    $row['employee_name'],
                    $row['employee_code'],
                    $row['employee_role'],
                    $row['month'],
                    $row['year'],
                    $row['amount'],
                    $row['payment_date'],
                    $row['status']
                ]);
            }
            break;
            
        case 'expense_report':
            fputcsv($output, ['ID', 'Title', 'Category', 'Amount', 'Expense Date', 'Description', 'Created By']);
            foreach ($data as $row) {
                fputcsv($output, [
                    $row['id'],
                    $row['title'],
                    $row['category'],
                    $row['amount'],
                    $row['expense_date'],
                    $row['description'],
                    $row['created_by_name']
                ]);
            }
            break;
            
        case 'profit_loss':
            fputcsv($output, ['Category', 'Subcategory', 'Amount']);
            fputcsv($output, ['Income', 'Fees', $data['income']['fees']]);
            fputcsv($output, ['Income', 'Other', $data['income']['other']]);
            fputcsv($output, ['Income', 'Total', $data['income']['total']]);
            fputcsv($output, ['Expenses', 'Operations', $data['expenses']['operations']]);
            fputcsv($output, ['Expenses', 'Salaries', $data['expenses']['salaries']]);
            fputcsv($output, ['Expenses', 'Total', $data['expenses']['total']]);
            fputcsv($output, ['Net Profit/Loss', '', $data['net_profit']]);
            break;
            
        default:
            fputcsv($output, ['Error', 'Invalid report type']);
    }
    
    fclose($output);
    exit;
}
function generate_salary_slip_pdf(array $salary, array $employee): void
{
    $monthName = date('F', mktime(0, 0, 0, $salary['month'], 1));
    
    $html = '
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Salary Slip #' . $salary['id'] . '</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
        .container { max-width: 800px; margin: 0 auto; border: 2px solid #333; padding: 30px; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
        .header h1 { margin: 0; color: #333; }
        .header p { margin: 5px 0; color: #666; }
        .slip-info { display: flex; justify-content: space-between; margin-bottom: 20px; }
        .slip-info div { flex: 1; }
        .employee-info { background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .employee-info h3 { margin: 0 0 10px 0; color: #333; }
        .employee-info p { margin: 5px 0; }
        .salary-details { margin-bottom: 20px; }
        .salary-details table { width: 100%; border-collapse: collapse; }
        .salary-details th, .salary-details td { border: 1px solid #ddd; padding: 10px; text-align: left; }
        .salary-details th { background: #f5f5f5; }
        .total { font-size: 24px; font-weight: bold; text-align: right; margin-top: 20px; color: #333; }
        .status { text-align: center; padding: 15px; margin-top: 20px; border-radius: 5px; font-weight: bold; font-size: 18px; }
        .status.paid { background: #d4edda; color: #155724; }
        .status.unpaid { background: #f8d7da; color: #721c24; }
        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>COLLEGE MANAGEMENT SYSTEM</h1>
            <p>Salary Slip</p>
        </div>
        
        <div class="slip-info">
            <div>
                <p><strong>Slip No:</strong> #' . $salary['id'] . '</p>
                <p><strong>Period:</strong> ' . $monthName . ' ' . $salary['year'] . '</p>
            </div>
            <div style="text-align: right;">
                <p><strong>Generated:</strong> ' . date('F j, Y') . '</p>
            </div>
        </div>
        
        <div class="employee-info">
            <h3>Employee Information</h3>
            <p><strong>Name:</strong> ' . htmlspecialchars($employee['full_name']) . '</p>
            <p><strong>Employee Code:</strong> ' . htmlspecialchars($employee['employee_code']) . '</p>
            <p><strong>Role:</strong> ' . ucfirst($employee['role']) . '</p>
            <p><strong>Email:</strong> ' . htmlspecialchars($employee['email']) . '</p>
            <p><strong>Phone:</strong> ' . ($employee['phone'] ?: 'N/A') . '</p>
        </div>
        
        <div class="salary-details">
            <table>
                <tr>
                    <th>Description</th>
                    <th>Amount</th>
                </tr>
                <tr>
                    <td>Basic Salary</td>
                    <td>$' . number_format($salary['amount'], 2) . '</td>
                </tr>
                <tr>
                    <td colspan="2" style="text-align: center; padding: 20px;">
                        <em>No additional deductions or bonuses for this period</em>
                    </td>
                </tr>
            </table>
            <div class="total">
                Net Salary: $' . number_format($salary['amount'], 2) . '
            </div>
        </div>';
    
    if ($salary['payment_date']) {
        $html .= '
        <div style="text-align: center; margin-top: 20px;">
            <p><strong>Payment Date:</strong> ' . date('F j, Y', strtotime($salary['payment_date'])) . '</p>
        </div>';
    }
    
    if ($salary['remarks']) {
        $html .= '
        <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin-top: 20px;">
            <p><strong>Remarks:</strong> ' . htmlspecialchars($salary['remarks']) . '</p>
        </div>';
    }
    
    $html .= '
        <div class="status ' . $salary['status'] . '">
            Payment Status: ' . ucfirst($salary['status']) . '
        </div>
        
        <div class="footer">
            <p>This is a computer-generated salary slip. No signature required.</p>
            <p>Generated on: ' . date('F j, Y g:i A') . '</p>
        </div>
    </div>
</body>
</html>';
    
    // Set headers for PDF download
    header('Content-Type: application/pdf');
    header('Content-Disposition: attachment; filename="salary_slip_' . $salary['id'] . '.pdf"');
    header('Content-Length: ' . strlen($html));
    
    // For simplicity, we'll output HTML that can be printed to PDF
    // In production, you would use a library like TCPDF or DomPDF
    echo $html;
    exit;
}
