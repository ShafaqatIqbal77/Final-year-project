<?php
declare(strict_types=1);

// ==================== FEE COLLECTION ====================

function handle_collect_fee(PDO $pdo): void
{
    $user = require_role($pdo, 'admin');
    $in = json_in();

    $feeId = (int) ($in['fee_id'] ?? 0);
    $amount = (float) ($in['amount'] ?? 0);
    $paymentMethod = $in['payment_method'] ?? 'cash';
    $notes = $in['notes'] ?? null;

    if ($feeId <= 0 || $amount <= 0) {
        json_out(['ok' => false, 'error' => 'Fee ID and amount are required'], 422);
    }

    $validMethods = ['cash', 'bank_transfer', 'online', 'card', 'stripe', 'paypal', 'razorpay', 'jazzcash', 'easypaisa'];
    if (!in_array($paymentMethod, $validMethods, true)) {
        json_out(['ok' => false, 'error' => 'Invalid payment method'], 422);
    }

    $st = $pdo->prepare('SELECT * FROM fees WHERE id = ?');
    $st->execute([$feeId]);
    $fee = $st->fetch();
    if (!$fee) {
        json_out(['ok' => false, 'error' => 'Fee not found'], 404);
    }

    if ($amount > (float) $fee['remaining_amount']) {
        json_out(['ok' => false, 'error' => 'Amount exceeds remaining balance'], 422);
    }

    $pdo->beginTransaction();
    try {
        $newPaid = (float) $fee['paid_amount'] + $amount;
        $newRemaining = (float) $fee['amount'] - (float) $fee['discount'] + (float) $fee['fine'] - $newPaid;
        $newStatus = $newRemaining <= 0 ? 'paid' : 'partially_paid';
        $receiptNum = 'RCP-' . date('Ymd') . '-' . str_pad((string) $feeId, 5, '0', STR_PAD_LEFT);

        $st = $pdo->prepare('
            INSERT INTO fee_payments (fee_id, student_id, amount, payment_method, payment_status, receipt_number, notes, collected_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ');
        $st->execute([$feeId, $fee['student_id'], $amount, $paymentMethod, 'success', $receiptNum, $notes, $user['id']]);
        $paymentId = (int) $pdo->lastInsertId();

        $st = $pdo->prepare('
            UPDATE fees SET paid_amount = ?, remaining_amount = ?, status = ?, payment_method = ?,
            payment_date = CASE WHEN ? = "paid" THEN CURDATE() ELSE payment_date END WHERE id = ?
        ');
        $st->execute([$newPaid, max(0, $newRemaining), $newStatus, $paymentMethod, $newStatus, $feeId]);

        finance_create_notification($pdo, (int) $fee['student_id'], 'payment_success',
            'Payment Received', "Payment of \${$amount} received for {$fee['fee_type']} fee.", 'fee', $feeId);

        log_activity($pdo, $user['id'], 'collect_fee', "Collected \${$amount} for fee #$feeId via $paymentMethod", 'fee_payment', $paymentId);

        $pdo->commit();
        json_out(['ok' => true, 'payment_id' => $paymentId, 'receipt_number' => $receiptNum, 'message' => 'Payment collected successfully']);
    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }
}

// ==================== PENDING DUES ====================

function handle_pending_dues(PDO $pdo): void
{
    require_role($pdo, 'admin');

    $st = $pdo->query('
        SELECT f.*, u.full_name AS student_name, u.student_code, u.email AS student_email, u.phone AS student_phone
        FROM fees f
        JOIN users u ON f.student_id = u.id
        WHERE f.status IN ("unpaid", "partially_paid")
        ORDER BY f.due_date ASC
    ');
    $dues = $st->fetchAll();

    $rules = $pdo->query('SELECT * FROM late_fee_rules WHERE is_active = 1 ORDER BY days_after_due ASC')->fetchAll();

    foreach ($dues as &$due) {
        $due['calculated_fine'] = finance_calculate_late_fine($due, $rules);
        $due['total_due'] = (float) $due['remaining_amount'] + (float) $due['calculated_fine'];
        $due['days_overdue'] = max(0, (int) ((time() - strtotime($due['due_date'])) / 86400));
    }
    unset($due);

    json_out(['ok' => true, 'pending_dues' => $dues, 'total_pending' => array_sum(array_column($dues, 'remaining_amount'))]);
}

function finance_calculate_late_fine(array $fee, array $rules): float
{
    if ($fee['status'] === 'paid') {
        return 0.0;
    }
    $daysOverdue = max(0, (int) ((time() - strtotime($fee['due_date'])) / 86400));
    $fine = 0.0;
    foreach ($rules as $rule) {
        if ($daysOverdue >= (int) $rule['days_after_due']) {
            if ($rule['fine_type'] === 'percentage') {
                $fine = (float) $fee['remaining_amount'] * ((float) $rule['fine_value'] / 100);
            } else {
                $fine = (float) $rule['fine_value'];
            }
        }
    }
    return round($fine, 2);
}

function handle_send_fee_reminder(PDO $pdo): void
{
    $user = require_role($pdo, 'admin');
    $in = json_in();
    $feeId = (int) ($in['fee_id'] ?? 0);
    $channel = $in['channel'] ?? 'notification';

    if ($feeId <= 0) {
        json_out(['ok' => false, 'error' => 'Fee ID is required'], 422);
    }

    $st = $pdo->prepare('
        SELECT f.*, u.full_name, u.email, u.phone FROM fees f
        JOIN users u ON f.student_id = u.id WHERE f.id = ?
    ');
    $st->execute([$feeId]);
    $fee = $st->fetch();
    if (!$fee) {
        json_out(['ok' => false, 'error' => 'Fee not found'], 404);
    }

    $msg = "Reminder: You have a pending {$fee['fee_type']} fee of \${$fee['remaining_amount']} due on {$fee['due_date']}.";
    finance_create_notification($pdo, (int) $fee['student_id'], 'fee_due', 'Fee Payment Reminder', $msg, 'fee', $feeId);

    log_activity($pdo, $user['id'], 'fee_reminder', "Sent $channel reminder for fee #$feeId", 'fee', $feeId);

    json_out(['ok' => true, 'message' => ucfirst($channel) . ' reminder sent successfully', 'simulated' => in_array($channel, ['sms', 'email'], true)]);
}

// ==================== FEE STRUCTURES ====================

function handle_fee_structures(PDO $pdo, string $method): void
{
    require_role($pdo, 'admin');
    match ($method) {
        'GET' => handle_get_fee_structures($pdo),
        'POST' => handle_create_fee_structure($pdo),
        'PATCH' => handle_update_fee_structure($pdo),
        'DELETE' => handle_delete_fee_structure($pdo),
        default => json_out(['ok' => false, 'error' => 'Method not allowed'], 405),
    };
}

function handle_get_fee_structures(PDO $pdo): void
{
    $active = $_GET['active'] ?? null;
    $where = '1=1';
    $bindings = [];
    if ($active !== null) {
        $where .= ' AND is_active = ?';
        $bindings[] = (int) $active;
    }
    $st = $pdo->prepare("SELECT * FROM fee_structures WHERE $where ORDER BY fee_type, name");
    $st->execute($bindings);
    json_out(['ok' => true, 'structures' => $st->fetchAll()]);
}

function handle_create_fee_structure(PDO $pdo): void
{
    $user = require_role($pdo, 'admin');
    $in = json_in();
    $name = trim($in['name'] ?? '');
    $feeType = $in['fee_type'] ?? 'tuition';
    $amount = (float) ($in['amount'] ?? 0);

    if ($name === '' || $amount <= 0) {
        json_out(['ok' => false, 'error' => 'Name and amount are required'], 422);
    }

    $st = $pdo->prepare('INSERT INTO fee_structures (name, fee_type, amount, semester, class_id, description, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)');
    $st->execute([
        $name, $feeType, $amount,
        $in['semester'] ?? null,
        !empty($in['class_id']) ? (int) $in['class_id'] : null,
        $in['description'] ?? null,
        $user['id'],
    ]);
    json_out(['ok' => true, 'id' => (int) $pdo->lastInsertId(), 'message' => 'Fee structure created']);
}

function handle_update_fee_structure(PDO $pdo): void
{
    require_role($pdo, 'admin');
    $in = json_in();
    $id = (int) ($in['id'] ?? 0);
    if ($id <= 0) {
        json_out(['ok' => false, 'error' => 'ID required'], 422);
    }
    $fields = [];
    $bindings = [];
    foreach (['name', 'fee_type', 'amount', 'semester', 'description', 'is_active'] as $f) {
        if (array_key_exists($f, $in)) {
            $fields[] = "$f = ?";
            $bindings[] = $in[$f];
        }
    }
    if (empty($fields)) {
        json_out(['ok' => false, 'error' => 'No fields to update'], 422);
    }
    $bindings[] = $id;
    $pdo->prepare('UPDATE fee_structures SET ' . implode(', ', $fields) . ' WHERE id = ?')->execute($bindings);
    json_out(['ok' => true, 'message' => 'Fee structure updated']);
}

function handle_delete_fee_structure(PDO $pdo): void
{
    require_role($pdo, 'admin');
    $id = (int) (json_in()['id'] ?? 0);
    if ($id <= 0) {
        json_out(['ok' => false, 'error' => 'ID required'], 422);
    }
    $pdo->prepare('DELETE FROM fee_structures WHERE id = ?')->execute([$id]);
    json_out(['ok' => true, 'message' => 'Fee structure deleted']);
}

function handle_assign_fee_from_structure(PDO $pdo): void
{
    $user = require_role($pdo, 'admin');
    $in = json_in();
    $structureId = (int) ($in['structure_id'] ?? 0);
    $studentId = (int) ($in['student_id'] ?? 0);
    $dueDate = $in['due_date'] ?? date('Y-m-d', strtotime('+30 days'));
    $discount = (float) ($in['discount'] ?? 0);

    if ($structureId <= 0 || $studentId <= 0) {
        json_out(['ok' => false, 'error' => 'Structure and student are required'], 422);
    }

    $st = $pdo->prepare('SELECT * FROM fee_structures WHERE id = ? AND is_active = 1');
    $st->execute([$structureId]);
    $structure = $st->fetch();
    if (!$structure) {
        json_out(['ok' => false, 'error' => 'Fee structure not found'], 404);
    }

    $remaining = (float) $structure['amount'] - $discount;
    $st = $pdo->prepare('
        INSERT INTO fees (student_id, fee_type, semester, amount, discount, fine, paid_amount, remaining_amount, due_date, status, remarks, created_by)
        VALUES (?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?, ?)
    ');
    $st->execute([
        $studentId, $structure['fee_type'], $structure['semester'], $structure['amount'], $discount,
        $remaining, $dueDate, $remaining > 0 ? 'unpaid' : 'paid',
        "Assigned from structure: {$structure['name']}", $user['id'],
    ]);
    json_out(['ok' => true, 'fee_id' => (int) $pdo->lastInsertId(), 'message' => 'Fee assigned from structure']);
}

// ==================== SCHOLARSHIPS ====================

function handle_scholarships(PDO $pdo, string $method): void
{
    require_role($pdo, 'admin');
    match ($method) {
        'GET' => handle_get_scholarships($pdo),
        'POST' => handle_create_scholarship($pdo),
        'PATCH' => handle_update_scholarship($pdo),
        'DELETE' => handle_delete_scholarship($pdo),
        default => json_out(['ok' => false, 'error' => 'Method not allowed'], 405),
    };
}

function handle_get_scholarships(PDO $pdo): void
{
    $st = $pdo->query('
        SELECT s.*, u.full_name AS student_name, u.student_code
        FROM scholarships s JOIN users u ON s.student_id = u.id
        ORDER BY s.created_at DESC
    ');
    json_out(['ok' => true, 'scholarships' => $st->fetchAll()]);
}

function handle_create_scholarship(PDO $pdo): void
{
    $user = require_role($pdo, 'admin');
    $in = json_in();
    $studentId = (int) ($in['student_id'] ?? 0);
    $name = trim($in['name'] ?? '');
    $value = (float) ($in['discount_value'] ?? 0);

    if ($studentId <= 0 || $name === '' || $value <= 0) {
        json_out(['ok' => false, 'error' => 'Student, name, and discount value are required'], 422);
    }

    $st = $pdo->prepare('
        INSERT INTO scholarships (student_id, name, discount_type, discount_value, semester, valid_from, valid_to, remarks, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ');
    $st->execute([
        $studentId, $name, $in['discount_type'] ?? 'fixed', $value,
        $in['semester'] ?? null, $in['valid_from'] ?? null, $in['valid_to'] ?? null,
        $in['remarks'] ?? null, $user['id'],
    ]);
    json_out(['ok' => true, 'id' => (int) $pdo->lastInsertId(), 'message' => 'Scholarship created']);
}

function handle_update_scholarship(PDO $pdo): void
{
    require_role($pdo, 'admin');
    $in = json_in();
    $id = (int) ($in['id'] ?? 0);
    if ($id <= 0) {
        json_out(['ok' => false, 'error' => 'ID required'], 422);
    }
    $fields = [];
    $bindings = [];
    foreach (['name', 'discount_type', 'discount_value', 'semester', 'status', 'valid_from', 'valid_to', 'remarks'] as $f) {
        if (array_key_exists($f, $in)) {
            $fields[] = "$f = ?";
            $bindings[] = $in[$f];
        }
    }
    if (empty($fields)) {
        json_out(['ok' => false, 'error' => 'No fields to update'], 422);
    }
    $bindings[] = $id;
    $pdo->prepare('UPDATE scholarships SET ' . implode(', ', $fields) . ' WHERE id = ?')->execute($bindings);
    json_out(['ok' => true, 'message' => 'Scholarship updated']);
}

function handle_delete_scholarship(PDO $pdo): void
{
    require_role($pdo, 'admin');
    $id = (int) (json_in()['id'] ?? 0);
    $pdo->prepare('DELETE FROM scholarships WHERE id = ?')->execute([$id]);
    json_out(['ok' => true, 'message' => 'Scholarship deleted']);
}

// ==================== INSTALLMENTS ====================

function handle_installments(PDO $pdo, string $method): void
{
    require_role($pdo, 'admin', 'student');
    match ($method) {
        'GET' => handle_get_installments($pdo),
        'POST' => handle_create_installment($pdo),
        default => json_out(['ok' => false, 'error' => 'Method not allowed'], 405),
    };
}

function handle_get_installments(PDO $pdo): void
{
    $user = require_role($pdo, 'admin', 'student');
    $where = '1=1';
    $bindings = [];
    if ($user['role'] === 'student') {
        $where .= ' AND ip.student_id = ?';
        $bindings[] = $user['id'];
    }
    $st = $pdo->prepare("
        SELECT ip.*, u.full_name AS student_name, f.fee_type, f.remaining_amount
        FROM installment_plans ip
        JOIN users u ON ip.student_id = u.id
        JOIN fees f ON ip.fee_id = f.id
        WHERE $where ORDER BY ip.created_at DESC
    ");
    $st->execute($bindings);
    json_out(['ok' => true, 'installments' => $st->fetchAll()]);
}

function handle_create_installment(PDO $pdo): void
{
    $user = require_role($pdo, 'admin');
    $in = json_in();
    $feeId = (int) ($in['fee_id'] ?? 0);
    $numInstallments = (int) ($in['num_installments'] ?? 3);

    if ($feeId <= 0 || $numInstallments < 2) {
        json_out(['ok' => false, 'error' => 'Fee ID and at least 2 installments required'], 422);
    }

    $st = $pdo->prepare('SELECT * FROM fees WHERE id = ?');
    $st->execute([$feeId]);
    $fee = $st->fetch();
    if (!$fee) {
        json_out(['ok' => false, 'error' => 'Fee not found'], 404);
    }

    $total = (float) $fee['remaining_amount'];
    $installmentAmount = round($total / $numInstallments, 2);

    $st = $pdo->prepare('
        INSERT INTO installment_plans (fee_id, student_id, total_amount, num_installments, installment_amount, next_due_date, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ');
    $st->execute([
        $feeId, $fee['student_id'], $total, $numInstallments, $installmentAmount,
        date('Y-m-d', strtotime('+30 days')), $user['id'],
    ]);
    $planId = (int) $pdo->lastInsertId();
    $pdo->prepare('UPDATE fees SET installment_plan_id = ? WHERE id = ?')->execute([$planId, $feeId]);
    json_out(['ok' => true, 'id' => $planId, 'installment_amount' => $installmentAmount, 'message' => 'Installment plan created']);
}

// ==================== LATE FEE RULES ====================

function handle_late_fee_rules(PDO $pdo, string $method): void
{
    require_role($pdo, 'admin');
    match ($method) {
        'GET' => json_out(['ok' => true, 'rules' => $pdo->query('SELECT * FROM late_fee_rules ORDER BY days_after_due')->fetchAll()]),
        'POST' => handle_create_late_fee_rule($pdo),
        'PATCH' => handle_update_late_fee_rule($pdo),
        default => json_out(['ok' => false, 'error' => 'Method not allowed'], 405),
    };
}

function handle_create_late_fee_rule(PDO $pdo): void
{
    $in = json_in();
    $st = $pdo->prepare('INSERT INTO late_fee_rules (name, days_after_due, fine_type, fine_value) VALUES (?, ?, ?, ?)');
    $st->execute([$in['name'] ?? 'Rule', (int) ($in['days_after_due'] ?? 7), $in['fine_type'] ?? 'fixed', (float) ($in['fine_value'] ?? 0)]);
    json_out(['ok' => true, 'id' => (int) $pdo->lastInsertId()]);
}

function handle_update_late_fee_rule(PDO $pdo): void
{
    $in = json_in();
    $id = (int) ($in['id'] ?? 0);
    $pdo->prepare('UPDATE late_fee_rules SET name=?, days_after_due=?, fine_type=?, fine_value=?, is_active=? WHERE id=?')
        ->execute([$in['name'], (int) $in['days_after_due'], $in['fine_type'], (float) $in['fine_value'], (int) ($in['is_active'] ?? 1), $id]);
    json_out(['ok' => true, 'message' => 'Rule updated']);
}

// ==================== ONLINE PAYMENTS ====================

function handle_online_payment(PDO $pdo, string $method): void
{
    if ($method === 'GET') {
        $user = require_role($pdo, 'admin', 'student');
        $where = '1=1';
        $bindings = [];
        if ($user['role'] === 'student') {
            $where .= ' AND op.student_id = ?';
            $bindings[] = $user['id'];
        }
        $st = $pdo->prepare("
            SELECT op.*, u.full_name AS student_name, f.fee_type
            FROM online_payments op
            JOIN users u ON op.student_id = u.id
            JOIN fees f ON op.fee_id = f.id
            WHERE $where ORDER BY op.created_at DESC LIMIT 50
        ");
        $st->execute($bindings);
        json_out(['ok' => true, 'payments' => $st->fetchAll()]);
        return;
    }

    $user = require_role($pdo, 'student');
    $in = json_in();
    $feeId = (int) ($in['fee_id'] ?? 0);
    $gateway = $in['gateway'] ?? 'stripe';
    $amount = (float) ($in['amount'] ?? 0);

    if ($feeId <= 0 || $amount <= 0) {
        json_out(['ok' => false, 'error' => 'Fee ID and amount required'], 422);
    }

    $validGateways = ['stripe', 'paypal', 'razorpay', 'jazzcash', 'easypaisa', 'bank_transfer'];
    if (!in_array($gateway, $validGateways, true)) {
        json_out(['ok' => false, 'error' => 'Invalid gateway'], 422);
    }

    $st = $pdo->prepare('SELECT * FROM fees WHERE id = ? AND student_id = ?');
    $st->execute([$feeId, $user['id']]);
    $fee = $st->fetch();
    if (!$fee) {
        json_out(['ok' => false, 'error' => 'Fee not found'], 404);
    }
    if ($amount > (float) $fee['remaining_amount']) {
        json_out(['ok' => false, 'error' => 'Amount exceeds remaining balance'], 422);
    }

    $txnId = strtoupper($gateway) . '-' . time() . '-' . random_int(1000, 9999);
    $simulatedSuccess = !in_array($gateway, ['jazzcash', 'easypaisa'], true) || random_int(0, 10) > 1;

    $pdo->beginTransaction();
    try {
        $status = $simulatedSuccess ? 'success' : 'failed';
        $st = $pdo->prepare('INSERT INTO online_payments (fee_id, student_id, gateway, amount, status, transaction_id, gateway_response) VALUES (?, ?, ?, ?, ?, ?, ?)');
        $st->execute([$feeId, $user['id'], $gateway, $amount, $status, $txnId, json_encode(['simulated' => true, 'gateway' => $gateway])]);
        $paymentId = (int) $pdo->lastInsertId();

        if ($simulatedSuccess) {
            $newPaid = (float) $fee['paid_amount'] + $amount;
            $newRemaining = (float) $fee['amount'] - (float) $fee['discount'] + (float) $fee['fine'] - $newPaid;
            $newStatus = $newRemaining <= 0 ? 'paid' : 'partially_paid';

            $pdo->prepare('INSERT INTO fee_payments (fee_id, student_id, amount, payment_method, payment_status, transaction_ref, collected_by) VALUES (?, ?, ?, ?, ?, ?, NULL)')
                ->execute([$feeId, $user['id'], $amount, $gateway, 'success', $txnId]);

            $pdo->prepare('UPDATE fees SET paid_amount=?, remaining_amount=?, status=?, payment_method=?, payment_date=CASE WHEN ?="paid" THEN CURDATE() ELSE payment_date END WHERE id=?')
                ->execute([$newPaid, max(0, $newRemaining), $newStatus, $gateway, $newStatus, $feeId]);

            finance_create_notification($pdo, $user['id'], 'payment_success', 'Payment Successful', "Your \${$amount} payment via {$gateway} was successful.", 'online_payment', $paymentId);
        } else {
            finance_create_notification($pdo, $user['id'], 'payment_failed', 'Payment Failed', "Your payment via {$gateway} could not be processed.", 'online_payment', $paymentId);
        }

        $pdo->commit();
        json_out([
            'ok' => true,
            'payment_id' => $paymentId,
            'transaction_id' => $txnId,
            'status' => $status,
            'message' => $simulatedSuccess ? 'Payment processed successfully' : 'Payment failed — please try again',
        ]);
    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }
}

// ==================== NOTIFICATIONS ====================

function finance_create_notification(PDO $pdo, int $userId, string $type, string $title, string $message, ?string $relatedType = null, ?int $relatedId = null): void
{
    try {
        $st = $pdo->prepare('INSERT INTO finance_notifications (user_id, type, title, message, related_type, related_id) VALUES (?, ?, ?, ?, ?, ?)');
        $st->execute([$userId, $type, $title, $message, $relatedType, $relatedId]);
    } catch (PDOException) {
        /* table may not exist yet */
    }
}

function handle_finance_notifications(PDO $pdo, string $method): void
{
    $user = require_role($pdo, 'admin', 'teacher', 'student');

    if ($method === 'PATCH') {
        $in = json_in();
        $id = (int) ($in['id'] ?? 0);
        if ($id > 0) {
            $pdo->prepare('UPDATE finance_notifications SET is_read = 1 WHERE id = ? AND user_id = ?')->execute([$id, $user['id']]);
        } elseif (!empty($in['mark_all'])) {
            $pdo->prepare('UPDATE finance_notifications SET is_read = 1 WHERE user_id = ?')->execute([$user['id']]);
        }
        json_out(['ok' => true, 'message' => 'Notifications updated']);
        return;
    }

    $st = $pdo->prepare('SELECT * FROM finance_notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50');
    $st->execute([$user['id']]);
    $notifications = $st->fetchAll();
    $unread = count(array_filter($notifications, fn($n) => !$n['is_read']));

    json_out(['ok' => true, 'notifications' => $notifications, 'unread_count' => $unread]);
}

// ==================== FINANCE AUDIT LOGS ====================

function handle_finance_audit(PDO $pdo): void
{
    require_role($pdo, 'admin');
    $action = $_GET['action'] ?? null;
    $dateFrom = $_GET['date_from'] ?? date('Y-m-01');
    $dateTo = $_GET['date_to'] ?? date('Y-m-d');

    $where = ['created_at BETWEEN ? AND ?'];
    $bindings = [$dateFrom . ' 00:00:00', $dateTo . ' 23:59:59'];

    $financeActions = ['create_fee', 'update_fee', 'delete_fee', 'collect_fee', 'create_salary', 'update_salary', 'delete_salary', 'create_expense', 'update_expense', 'delete_expense', 'create_income', 'update_income', 'delete_income', 'fee_reminder'];
    $placeholders = implode(',', array_fill(0, count($financeActions), '?'));

    if ($action) {
        $where[] = 'action = ?';
        $bindings[] = $action;
    } else {
        $where[] = "action IN ($placeholders)";
        $bindings = array_merge($bindings, $financeActions);
    }

    $st = $pdo->prepare('
        SELECT al.*, u.full_name AS user_name, u.role AS user_role
        FROM activity_log al
        LEFT JOIN users u ON al.user_id = u.id
        WHERE ' . implode(' AND ', $where) . '
        ORDER BY al.created_at DESC LIMIT 100
    ');
    $st->execute($bindings);
    json_out(['ok' => true, 'logs' => $st->fetchAll()]);
}

// ==================== ENHANCED DASHBOARD STATS ====================

function finance_get_enhanced_dashboard(PDO $pdo): array
{
    $stats = [];

    $st = $pdo->query('SELECT COALESCE(SUM(paid_amount), 0) AS t FROM fees WHERE status IN ("paid","partially_paid")');
    $collectedFees = (float) $st->fetch()['t'];

    $st = $pdo->query('SELECT COALESCE(SUM(remaining_amount), 0) AS t FROM fees WHERE status IN ("unpaid","partially_paid")');
    $pendingFees = (float) $st->fetch()['t'];

    $st = $pdo->query('SELECT COALESCE(SUM(amount), 0) AS t FROM fees');
    $totalStudentFees = (float) $st->fetch()['t'];

    $st = $pdo->query('SELECT COALESCE(SUM(amount), 0) AS t FROM incomes');
    $otherIncome = (float) $st->fetch()['t'];

    $totalRevenue = $collectedFees + $otherIncome;

    $st = $pdo->query('SELECT COALESCE(SUM(amount), 0) AS t FROM expenses WHERE status = "approved" OR status IS NULL');
    $totalExpenses = (float) $st->fetch()['t'];

    $st = $pdo->query('
        SELECT COALESCE(SUM(s.amount), 0) AS t FROM salaries s
        JOIN users u ON s.employee_id = u.id WHERE u.role = "teacher"
    ');
    $teacherSalaries = (float) $st->fetch()['t'];

    $st = $pdo->query('
        SELECT COALESCE(SUM(s.amount), 0) AS t FROM salaries s
        JOIN users u ON s.employee_id = u.id WHERE u.role = "admin"
    ');
    $staffSalaries = (float) $st->fetch()['t'];

    $st = $pdo->query('SELECT COALESCE(SUM(amount), 0) AS t FROM salaries WHERE status = "paid"');
    $paidSalaries = (float) $st->fetch()['t'];

    $monthStart = date('Y-m-01');
    $monthEnd = date('Y-m-t');

    $st = $pdo->prepare('SELECT COALESCE(SUM(paid_amount), 0) AS t FROM fees WHERE payment_date BETWEEN ? AND ?');
    $st->execute([$monthStart, $monthEnd]);
    $monthlyIncome = (float) $st->fetch()['t'];

    $st = $pdo->prepare('SELECT COALESCE(SUM(amount), 0) AS t FROM expenses WHERE expense_date BETWEEN ? AND ?');
    $st->execute([$monthStart, $monthEnd]);
    $monthlyExpenses = (float) $st->fetch()['t'];

    $profitLoss = $totalRevenue - $totalExpenses - $paidSalaries;
    $cashFlow = $collectedFees - $totalExpenses - $paidSalaries;

    $st = $pdo->query('
        SELECT s.*, u.full_name AS employee_name FROM salaries s
        JOIN users u ON s.employee_id = u.id
        WHERE s.status = "unpaid" ORDER BY s.year, s.month LIMIT 5
    ');
    $upcomingSalaries = $st->fetchAll();

    $st = $pdo->query('
        SELECT f.*, u.full_name AS student_name FROM fees f
        JOIN users u ON f.student_id = u.id
        WHERE f.status IN ("unpaid","partially_paid") AND f.due_date <= DATE_ADD(CURDATE(), INTERVAL 7 DAY)
        ORDER BY f.due_date LIMIT 10
    ');
    $dueAlerts = $st->fetchAll();

    $st = $pdo->query('
        SELECT fee_type, SUM(paid_amount) AS total FROM fees WHERE paid_amount > 0 GROUP BY fee_type
    ');
    $feeCollectionChart = $st->fetchAll();

    $st = $pdo->query('
        SELECT category, SUM(amount) AS total FROM expenses GROUP BY category
    ');
    $expenseChart = $st->fetchAll();

    $st = $pdo->query('
        SELECT DATE_FORMAT(payment_date, "%Y-%m") AS month, SUM(paid_amount) AS revenue
        FROM fees WHERE payment_date >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
        GROUP BY DATE_FORMAT(payment_date, "%Y-%m") ORDER BY month
    ');
    $revenueTrends = $st->fetchAll();

    $st = $pdo->query('
        SELECT u.role, SUM(s.amount) AS total FROM salaries s
        JOIN users u ON s.employee_id = u.id GROUP BY u.role
    ');
    $salaryDistribution = $st->fetchAll();

    return [
        'total_revenue' => $totalRevenue,
        'total_expenses' => $totalExpenses,
        'total_student_fees' => $totalStudentFees,
        'pending_fees' => $pendingFees,
        'collected_fees' => $collectedFees,
        'teacher_salaries' => $teacherSalaries,
        'staff_salaries' => $staffSalaries,
        'monthly_income' => $monthlyIncome,
        'monthly_expenses' => $monthlyExpenses,
        'profit_loss' => $profitLoss,
        'cash_flow' => $cashFlow,
        'upcoming_salary_payments' => $upcomingSalaries,
        'due_fee_alerts' => $dueAlerts,
        'fee_collection_chart' => $feeCollectionChart,
        'expense_chart' => $expenseChart,
        'revenue_trends' => $revenueTrends,
        'salary_distribution' => $salaryDistribution,
    ];
}

// ==================== EXPENSE APPROVAL ====================

function handle_approve_expense(PDO $pdo): void
{
    $user = require_role($pdo, 'admin');
    $in = json_in();
    $id = (int) ($in['id'] ?? 0);
    $status = $in['status'] ?? 'approved';

    if ($id <= 0 || !in_array($status, ['approved', 'rejected'], true)) {
        json_out(['ok' => false, 'error' => 'Invalid request'], 422);
    }

    $st = $pdo->prepare('SELECT * FROM expenses WHERE id = ?');
    $st->execute([$id]);
    $expense = $st->fetch();
    if (!$expense) {
        json_out(['ok' => false, 'error' => 'Expense not found'], 404);
    }

    $pdo->prepare('UPDATE expenses SET status = ?, approved_by = ?, approved_at = NOW() WHERE id = ?')
        ->execute([$status, $user['id'], $id]);

    if ($expense['created_by']) {
        finance_create_notification($pdo, (int) $expense['created_by'], 'expense_approved',
            'Expense ' . ucfirst($status), "Your expense \"{$expense['title']}\" has been {$status}.", 'expense', $id);
    }

    log_activity($pdo, $user['id'], 'approve_expense', "Expense #$id $status", 'expense', $id);
    json_out(['ok' => true, 'message' => "Expense {$status}"]);
}

// ==================== FEE PAYMENTS HISTORY ====================

function handle_fee_payments(PDO $pdo): void
{
    require_role($pdo, 'admin');
    $feeId = (int) ($_GET['fee_id'] ?? 0);
    $where = '1=1';
    $bindings = [];
    if ($feeId > 0) {
        $where .= ' AND fp.fee_id = ?';
        $bindings[] = $feeId;
    }
    $st = $pdo->prepare("
        SELECT fp.*, u.full_name AS student_name, f.fee_type
        FROM fee_payments fp
        JOIN users u ON fp.student_id = u.id
        JOIN fees f ON fp.fee_id = f.id
        WHERE $where ORDER BY fp.created_at DESC LIMIT 50
    ");
    $st->execute($bindings);
    json_out(['ok' => true, 'payments' => $st->fetchAll()]);
}
