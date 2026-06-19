<?php
declare(strict_types=1);

$config = require __DIR__ . '/config.php';

/** Allow Vite on localhost or 127.0.0.1 (any port) — required when using credentials */
$reqOrigin = $_SERVER['HTTP_ORIGIN'] ?? '';
$corsOrigin = $config['cors_origin'];
if ($reqOrigin !== '' && preg_match('#^https?://(localhost|127\.0\.0\.1)(:\d+)?$#', $reqOrigin)) {
    $corsOrigin = $reqOrigin;
}

header('Access-Control-Allow-Origin: ' . $corsOrigin);
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Headers: Content-Type, X-Requested-With, X-Session-Id, Authorization');
header('Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS');

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method === 'OPTIONS') {
    http_response_code(204);
    exit;
}

try {
    require_once __DIR__ . '/bootstrap.php';
    require_once __DIR__ . '/handlers.php';
    require_once __DIR__ . '/audit_handlers.php';
    require_once __DIR__ . '/chatbot_handler.php';
    require_once __DIR__ . '/mailer.php';
    require_once __DIR__ . '/finance_handlers.php';
    require_once __DIR__ . '/finance_extended_handlers.php';

    $route = $_GET['route'] ?? '';
    if ($route === '') {
        $path = $_SERVER['PATH_INFO'] ?? $_SERVER['REQUEST_URI'] ?? '';
        $route = parse_url($path, PHP_URL_PATH) ?? '';
        $route = str_replace('/index.php', '', $route);
    }
    $route = trim((string) $route, '/');
    $key = strtoupper($method) . ' ' . $route;

    match ($key) {
        'POST auth/login' => handle_login($pdo),
        'POST auth/logout' => handle_logout($pdo),
        'GET auth/me' => handle_me($pdo),
        'POST auth/forgot-password' => handle_forgot_password($pdo, $config),
        'POST auth/reset-password' => handle_reset_password($pdo),

        'GET admin/stats' => handle_admin_stats($pdo),
        'GET admin/users' => handle_admin_users($pdo, 'GET'),
        'POST admin/users' => handle_admin_users($pdo, 'POST'),
        'PATCH admin/users' => handle_admin_users($pdo, 'PATCH'),
        'DELETE admin/users' => handle_admin_users($pdo, 'DELETE'),
        'GET admin/activity' => handle_activity($pdo),
        'GET admin/pending-results' => handle_pending_results_admin($pdo),

        'GET settings' => handle_settings($pdo, 'GET'),
        'PATCH settings' => handle_settings($pdo, 'PATCH'),

        'GET classes' => handle_classes_crud($pdo, 'GET'),
        'POST classes' => handle_classes_crud($pdo, 'POST'),
        'PATCH classes' => handle_classes_crud($pdo, 'PATCH'),
        'DELETE classes' => handle_classes_crud($pdo, 'DELETE'),

        'GET sections' => handle_sections($pdo, 'GET'),
        'POST sections' => handle_sections($pdo, 'POST'),
        'PATCH sections' => handle_sections($pdo, 'PATCH'),
        'DELETE sections' => handle_sections($pdo, 'DELETE'),

        'GET courses' => handle_courses_crud($pdo, 'GET'),
        'POST courses' => handle_courses_crud($pdo, 'POST'),
        'PATCH courses' => handle_courses_crud($pdo, 'PATCH'),
        'DELETE courses' => handle_courses_crud($pdo, 'DELETE'),

        'GET offerings' => handle_offerings($pdo, 'GET'),
        'POST offerings' => handle_offerings($pdo, 'POST'),
        'PATCH offerings' => handle_offerings($pdo, 'PATCH'),
        'DELETE offerings' => handle_offerings($pdo, 'DELETE'),

        'GET enrollments' => handle_enrollments($pdo, 'GET'),
        'POST enrollments' => handle_enrollments($pdo, 'POST'),

        'GET admin/enrollments' => handle_admin_enrollments($pdo, 'GET'),
        'POST admin/enrollments' => handle_admin_enrollments($pdo, 'POST'),

        'GET student/catalog' => handle_student_offerings($pdo),

        'GET assignments' => handle_assignments($pdo, $config, 'GET'),
        'POST assignments' => handle_assignments($pdo, $config, 'POST'),
        'POST assignments/upload' => handle_assignment_upload($pdo, $config),

        'POST submissions/upload' => handle_submission_upload($pdo, $config),
        'GET submissions' => handle_submissions_list($pdo, $config),
        'POST submissions/grade' => handle_grade_submission($pdo),

        'GET attendance' => handle_attendance($pdo, 'GET'),
        'POST attendance' => handle_attendance($pdo, 'POST'),

        'GET teacher/students' => handle_students_for_attendance($pdo),

        'GET marks' => handle_marks($pdo, 'GET'),
        'POST marks' => handle_marks($pdo, 'POST'),

        'GET final-results' => handle_final_results($pdo, 'GET'),
        'POST final-results' => handle_final_results($pdo, 'POST'),

        'POST chatbot' => handle_chatbot($pdo),

        // Audit and Monitoring endpoints
        'GET audit/activity-logs' => handle_activity_logs($pdo),
        'GET audit/login-history' => handle_login_history($pdo),
        'GET audit/security-alerts' => handle_security_alerts($pdo),
        'PATCH audit/security-alerts' => handle_security_alerts($pdo),
        'GET audit/stats' => handle_monitoring_stats($pdo),
        'GET audit/charts' => handle_monitoring_charts($pdo),
        'GET audit/export' => handle_export_logs($pdo),

        // Finance Module Routes
        'GET finance/dashboard' => handle_finance_dashboard($pdo),
        
        // Fee Management
        'GET finance/fees' => handle_fees($pdo, 'GET'),
        'POST finance/fees' => handle_fees($pdo, 'POST'),
        'PATCH finance/fees' => handle_fees($pdo, 'PATCH'),
        'DELETE finance/fees' => handle_fees($pdo, 'DELETE'),
        
        // Salary Management
        'GET finance/salaries' => handle_salaries($pdo, 'GET'),
        'POST finance/salaries' => handle_salaries($pdo, 'POST'),
        'PATCH finance/salaries' => handle_salaries($pdo, 'PATCH'),
        'DELETE finance/salaries' => handle_salaries($pdo, 'DELETE'),
        
        // Expense Management
        'GET finance/expenses' => handle_expenses($pdo, 'GET'),
        'POST finance/expenses' => handle_expenses($pdo, 'POST'),
        'PATCH finance/expenses' => handle_expenses($pdo, 'PATCH'),
        'DELETE finance/expenses' => handle_expenses($pdo, 'DELETE'),
        
        // Income Management
        'GET finance/incomes' => handle_incomes($pdo, 'GET'),
        'POST finance/incomes' => handle_incomes($pdo, 'POST'),
        'PATCH finance/incomes' => handle_incomes($pdo, 'PATCH'),
        'DELETE finance/incomes' => handle_incomes($pdo, 'DELETE'),
        
        // Finance Reports
        'GET finance/reports' => handle_finance_reports($pdo),
        
        // Teacher/Student Specific
        'GET finance/my-salary' => handle_my_salary($pdo),
        'GET finance/my-fees' => handle_my_fees($pdo),
        'GET finance/fee-receipt' => handle_fee_receipt($pdo),
        'GET finance/salary-slip' => handle_salary_slip($pdo),

        // Finance Extended Routes
        'POST finance/collect-fee' => handle_collect_fee($pdo),
        'GET finance/pending-dues' => handle_pending_dues($pdo),
        'POST finance/send-reminder' => handle_send_fee_reminder($pdo),
        'GET finance/fee-structures' => handle_fee_structures($pdo, 'GET'),
        'POST finance/fee-structures' => handle_fee_structures($pdo, 'POST'),
        'PATCH finance/fee-structures' => handle_fee_structures($pdo, 'PATCH'),
        'DELETE finance/fee-structures' => handle_fee_structures($pdo, 'DELETE'),
        'POST finance/assign-fee' => handle_assign_fee_from_structure($pdo),
        'GET finance/scholarships' => handle_scholarships($pdo, 'GET'),
        'POST finance/scholarships' => handle_scholarships($pdo, 'POST'),
        'PATCH finance/scholarships' => handle_scholarships($pdo, 'PATCH'),
        'DELETE finance/scholarships' => handle_scholarships($pdo, 'DELETE'),
        'GET finance/installments' => handle_installments($pdo, 'GET'),
        'POST finance/installments' => handle_installments($pdo, 'POST'),
        'GET finance/late-fee-rules' => handle_late_fee_rules($pdo, 'GET'),
        'POST finance/late-fee-rules' => handle_late_fee_rules($pdo, 'POST'),
        'PATCH finance/late-fee-rules' => handle_late_fee_rules($pdo, 'PATCH'),
        'GET finance/online-payments' => handle_online_payment($pdo, 'GET'),
        'POST finance/online-payments' => handle_online_payment($pdo, 'POST'),
        'GET finance/notifications' => handle_finance_notifications($pdo, 'GET'),
        'PATCH finance/notifications' => handle_finance_notifications($pdo, 'PATCH'),
        'GET finance/audit' => handle_finance_audit($pdo),
        'POST finance/approve-expense' => handle_approve_expense($pdo),
        'GET finance/fee-payments' => handle_fee_payments($pdo),

        default => json_out(['ok' => false, 'error' => 'Not found', 'route' => $route], 404),
    };
} catch (Throwable $e) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['ok' => false, 'error' => 'Server error']);
    error_log($e->getMessage() . "\n" . $e->getTraceAsString());
}
