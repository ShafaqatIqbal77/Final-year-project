<?php
declare(strict_types=1);

/**
 * Audit and Monitoring handlers
 * Provides endpoints for activity logs, login history, security alerts, and analytics
 */

function handle_activity_logs(PDO $pdo): void
{
    ensure_admin($pdo);
    
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    
    if ($method === 'GET') {
        handle_get_activity_logs($pdo);
    } else {
        json_out(['ok' => false, 'error' => 'Method not allowed'], 405);
    }
}

function handle_get_activity_logs(PDO $pdo): void
{
    $limit = (int) ($_GET['limit'] ?? 50);
    $offset = (int) ($_GET['offset'] ?? 0);
    $action = trim((string) ($_GET['action'] ?? ''));
    $userId = (int) ($_GET['user_id'] ?? 0);
    $entityType = trim((string) ($_GET['entity_type'] ?? ''));
    $startDate = trim((string) ($_GET['start_date'] ?? ''));
    $endDate = trim((string) ($_GET['end_date'] ?? ''));
    
    $limit = min($limit, 500);
    $offset = max(0, $offset);
    
    $query = 'SELECT al.id, al.user_id, al.action, al.entity_type, al.entity_id, al.details, al.ip_address, al.created_at, u.full_name, u.email FROM activity_log al LEFT JOIN users u ON al.user_id = u.id WHERE 1=1';
    $params = [];
    
    if ($action !== '') {
        $query .= ' AND al.action = ?';
        $params[] = $action;
    }
    if ($userId > 0) {
        $query .= ' AND al.user_id = ?';
        $params[] = $userId;
    }
    if ($entityType !== '') {
        $query .= ' AND al.entity_type = ?';
        $params[] = $entityType;
    }
    if ($startDate !== '') {
        $query .= ' AND al.created_at >= ?';
        $params[] = $startDate . ' 00:00:00';
    }
    if ($endDate !== '') {
        $query .= ' AND al.created_at <= ?';
        $params[] = $endDate . ' 23:59:59';
    }
    
    // Get total count
    $countQuery = 'SELECT COUNT(*) as count FROM activity_log al WHERE 1=1';
    $countParams = [];
    if ($action !== '') {
        $countQuery .= ' AND al.action = ?';
        $countParams[] = $action;
    }
    if ($userId > 0) {
        $countQuery .= ' AND al.user_id = ?';
        $countParams[] = $userId;
    }
    if ($entityType !== '') {
        $countQuery .= ' AND al.entity_type = ?';
        $countParams[] = $entityType;
    }
    if ($startDate !== '') {
        $countQuery .= ' AND al.created_at >= ?';
        $countParams[] = $startDate . ' 00:00:00';
    }
    if ($endDate !== '') {
        $countQuery .= ' AND al.created_at <= ?';
        $countParams[] = $endDate . ' 23:59:59';
    }
    
    $countStmt = $pdo->prepare($countQuery);
    $countStmt->execute($countParams);
    $total = (int) $countStmt->fetch()['count'];
    
    $query .= ' ORDER BY al.created_at DESC LIMIT ' . (int)$limit . ' OFFSET ' . (int)$offset;
    
    $st = $pdo->prepare($query);
    $st->execute($params);
    $logs = $st->fetchAll();
    
    json_out([
        'ok' => true,
        'data' => $logs,
        'total' => $total,
        'limit' => $limit,
        'offset' => $offset
    ]);
}

function handle_login_history(PDO $pdo): void
{
    ensure_admin($pdo);
    
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    
    if ($method === 'GET') {
        handle_get_login_history($pdo);
    } else {
        json_out(['ok' => false, 'error' => 'Method not allowed'], 405);
    }
}

function handle_get_login_history(PDO $pdo): void
{
    $limit = (int) ($_GET['limit'] ?? 50);
    $offset = (int) ($_GET['offset'] ?? 0);
    $userId = (int) ($_GET['user_id'] ?? 0);
    $status = trim((string) ($_GET['status'] ?? ''));
    $startDate = trim((string) ($_GET['start_date'] ?? ''));
    $endDate = trim((string) ($_GET['end_date'] ?? ''));
    
    $limit = min($limit, 500);
    $offset = max(0, $offset);
    
    $query = 'SELECT lh.id, lh.user_id, lh.login_at, lh.logout_at, lh.ip_address, lh.status, lh.failure_reason, u.full_name, u.email FROM login_history lh LEFT JOIN users u ON lh.user_id = u.id WHERE 1=1';
    $params = [];
    
    if ($userId > 0) {
        $query .= ' AND lh.user_id = ?';
        $params[] = $userId;
    }
    if ($status !== '') {
        $query .= ' AND lh.status = ?';
        $params[] = $status;
    }
    if ($startDate !== '') {
        $query .= ' AND lh.login_at >= ?';
        $params[] = $startDate . ' 00:00:00';
    }
    if ($endDate !== '') {
        $query .= ' AND lh.login_at <= ?';
        $params[] = $endDate . ' 23:59:59';
    }
    
    // Get total count
    $countQuery = 'SELECT COUNT(*) as count FROM login_history lh WHERE 1=1';
    $countParams = [];
    if ($userId > 0) {
        $countQuery .= ' AND lh.user_id = ?';
        $countParams[] = $userId;
    }
    if ($status !== '') {
        $countQuery .= ' AND lh.status = ?';
        $countParams[] = $status;
    }
    if ($startDate !== '') {
        $countQuery .= ' AND lh.login_at >= ?';
        $countParams[] = $startDate . ' 00:00:00';
    }
    if ($endDate !== '') {
        $countQuery .= ' AND lh.login_at <= ?';
        $countParams[] = $endDate . ' 23:59:59';
    }
    
    $countStmt = $pdo->prepare($countQuery);
    $countStmt->execute($countParams);
    $total = (int) $countStmt->fetch()['count'];
    
    $query .= ' ORDER BY lh.login_at DESC LIMIT ' . (int)$limit . ' OFFSET ' . (int)$offset;
    
    $st = $pdo->prepare($query);
    $st->execute($params);
    $logs = $st->fetchAll();
    
    json_out([
        'ok' => true,
        'data' => $logs,
        'total' => $total,
        'limit' => $limit,
        'offset' => $offset
    ]);
}

function handle_security_alerts(PDO $pdo): void
{
    ensure_admin($pdo);
    
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    
    if ($method === 'GET') {
        handle_get_security_alerts($pdo);
    } elseif ($method === 'PATCH') {
        handle_acknowledge_alert($pdo);
    } else {
        json_out(['ok' => false, 'error' => 'Method not allowed'], 405);
    }
}

function handle_get_security_alerts(PDO $pdo): void
{
    $limit = (int) ($_GET['limit'] ?? 50);
    $offset = (int) ($_GET['offset'] ?? 0);
    $severity = trim((string) ($_GET['severity'] ?? ''));
    $alertType = trim((string) ($_GET['alert_type'] ?? ''));
    $unreadOnly = (bool) ($_GET['unread_only'] ?? false);
    $startDate = trim((string) ($_GET['start_date'] ?? ''));
    $endDate = trim((string) ($_GET['end_date'] ?? ''));
    
    $limit = min($limit, 500);
    $offset = max(0, $offset);
    
    $query = 'SELECT sa.id, sa.user_id, sa.alert_type, sa.severity, sa.title, sa.description, sa.ip_address, sa.is_acknowledged, sa.acknowledged_at, sa.resolved_at, sa.created_at, u.full_name, u.email FROM security_alerts sa LEFT JOIN users u ON sa.user_id = u.id WHERE 1=1';
    $params = [];
    
    if ($severity !== '') {
        $query .= ' AND sa.severity = ?';
        $params[] = $severity;
    }
    if ($alertType !== '') {
        $query .= ' AND sa.alert_type = ?';
        $params[] = $alertType;
    }
    if ($unreadOnly) {
        $query .= ' AND sa.is_acknowledged = 0 AND sa.resolved_at IS NULL';
    }
    if ($startDate !== '') {
        $query .= ' AND sa.created_at >= ?';
        $params[] = $startDate . ' 00:00:00';
    }
    if ($endDate !== '') {
        $query .= ' AND sa.created_at <= ?';
        $params[] = $endDate . ' 23:59:59';
    }
    
    // Get total count
    $countQuery = 'SELECT COUNT(*) as count FROM security_alerts sa WHERE 1=1';
    $countParams = [];
    if ($severity !== '') {
        $countQuery .= ' AND sa.severity = ?';
        $countParams[] = $severity;
    }
    if ($alertType !== '') {
        $countQuery .= ' AND sa.alert_type = ?';
        $countParams[] = $alertType;
    }
    if ($unreadOnly) {
        $countQuery .= ' AND sa.is_acknowledged = 0 AND sa.resolved_at IS NULL';
    }
    if ($startDate !== '') {
        $countQuery .= ' AND sa.created_at >= ?';
        $countParams[] = $startDate . ' 00:00:00';
    }
    if ($endDate !== '') {
        $countQuery .= ' AND sa.created_at <= ?';
        $countParams[] = $endDate . ' 23:59:59';
    }
    
    $countStmt = $pdo->prepare($countQuery);
    $countStmt->execute($countParams);
    $total = (int) $countStmt->fetch()['count'];
    
    $query .= ' ORDER BY sa.created_at DESC LIMIT ' . (int)$limit . ' OFFSET ' . (int)$offset;
    
    $st = $pdo->prepare($query);
    $st->execute($params);
    $alerts = $st->fetchAll();
    
    json_out([
        'ok' => true,
        'data' => $alerts,
        'total' => $total,
        'limit' => $limit,
        'offset' => $offset
    ]);
}

function handle_acknowledge_alert(PDO $pdo): void
{
    $in = json_in();
    $alertId = (int) ($in['alert_id'] ?? 0);
    $userId = (int) ($_SESSION['user_id'] ?? 0);
    
    if ($alertId <= 0) {
        json_out(['ok' => false, 'error' => 'Alert ID is required'], 422);
    }
    
    $st = $pdo->prepare('UPDATE security_alerts SET is_acknowledged = 1, acknowledged_by = ?, acknowledged_at = NOW() WHERE id = ?');
    $st->execute([$userId, $alertId]);
    
    json_out(['ok' => true, 'message' => 'Alert acknowledged']);
}

function handle_monitoring_stats(PDO $pdo): void
{
    ensure_admin($pdo);
    
    // Total activities
    $st = $pdo->prepare('SELECT COUNT(*) as count FROM activity_log WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)');
    $st->execute();
    $totalActivities = (int) $st->fetch()['count'];
    
    // Total logins
    $st = $pdo->prepare('SELECT COUNT(*) as count FROM login_history WHERE login_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)');
    $st->execute();
    $totalLogins = (int) $st->fetch()['count'];
    
    // Failed logins
    $st = $pdo->prepare('SELECT COUNT(*) as count FROM login_history WHERE status = "failed" AND login_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)');
    $st->execute();
    $failedLogins = (int) $st->fetch()['count'];
    
    // Unresolved alerts
    $st = $pdo->prepare('SELECT COUNT(*) as count FROM security_alerts WHERE resolved_at IS NULL');
    $st->execute();
    $unresolvedAlerts = (int) $st->fetch()['count'];
    
    // Active users (logged in last 24 hours)
    $st = $pdo->prepare('SELECT COUNT(DISTINCT user_id) as count FROM login_history WHERE login_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)');
    $st->execute();
    $activeUsers = (int) $st->fetch()['count'];
    
    json_out([
        'ok' => true,
        'data' => [
            'total_activities' => $totalActivities,
            'total_logins' => $totalLogins,
            'failed_logins' => $failedLogins,
            'unresolved_alerts' => $unresolvedAlerts,
            'active_users' => $activeUsers
        ]
    ]);
}

function handle_monitoring_charts(PDO $pdo): void
{
    ensure_admin($pdo);
    
    $type = trim((string) ($_GET['type'] ?? 'activities'));
    $days = (int) ($_GET['days'] ?? 30);
    $days = min($days, 365);
    
    if ($type === 'activities') {
        handle_activities_chart($pdo, $days);
    } elseif ($type === 'logins') {
        handle_logins_chart($pdo, $days);
    } elseif ($type === 'alerts') {
        handle_alerts_chart($pdo, $days);
    } elseif ($type === 'actions') {
        handle_actions_chart($pdo, $days);
    } else {
        json_out(['ok' => false, 'error' => 'Invalid chart type'], 422);
    }
}

function handle_activities_chart(PDO $pdo, int $days): void
{
    $st = $pdo->prepare(
        'SELECT DATE(created_at) as date, COUNT(*) as count FROM activity_log WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY) GROUP BY DATE(created_at) ORDER BY date'
    );
    $st->execute([$days]);
    $data = $st->fetchAll();
    
    json_out(['ok' => true, 'data' => $data]);
}

function handle_logins_chart(PDO $pdo, int $days): void
{
    $st = $pdo->prepare(
        'SELECT DATE(login_at) as date, status, COUNT(*) as count FROM login_history WHERE login_at >= DATE_SUB(NOW(), INTERVAL ? DAY) GROUP BY DATE(login_at), status ORDER BY date'
    );
    $st->execute([$days]);
    $data = $st->fetchAll();
    
    json_out(['ok' => true, 'data' => $data]);
}

function handle_alerts_chart(PDO $pdo, int $days): void
{
    $st = $pdo->prepare(
        'SELECT severity, COUNT(*) as count FROM security_alerts WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY) GROUP BY severity'
    );
    $st->execute([$days]);
    $data = $st->fetchAll();
    
    json_out(['ok' => true, 'data' => $data]);
}

function handle_actions_chart(PDO $pdo, int $days): void
{
    $st = $pdo->prepare(
        'SELECT action, COUNT(*) as count FROM activity_log WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY) GROUP BY action ORDER BY count DESC LIMIT 10'
    );
    $st->execute([$days]);
    $data = $st->fetchAll();
    
    json_out(['ok' => true, 'data' => $data]);
}

function handle_export_logs(PDO $pdo): void
{
    ensure_admin($pdo);
    
    $format = trim((string) ($_GET['format'] ?? 'csv'));
    $type = trim((string) ($_GET['type'] ?? 'activity'));
    $startDate = trim((string) ($_GET['start_date'] ?? ''));
    $endDate = trim((string) ($_GET['end_date'] ?? ''));
    
    if ($type === 'activity') {
        export_activity_logs($pdo, $format, $startDate, $endDate);
    } elseif ($type === 'login') {
        export_login_history($pdo, $format, $startDate, $endDate);
    } elseif ($type === 'alerts') {
        export_security_alerts($pdo, $format, $startDate, $endDate);
    } else {
        json_out(['ok' => false, 'error' => 'Invalid export type'], 422);
    }
}

function export_activity_logs(PDO $pdo, string $format, string $startDate, string $endDate): void
{
    $query = 'SELECT al.id, u.full_name, al.action, al.entity_type, al.entity_id, al.ip_address, al.created_at FROM activity_log al LEFT JOIN users u ON al.user_id = u.id WHERE 1=1';
    $params = [];
    
    if ($startDate !== '') {
        $query .= ' AND al.created_at >= ?';
        $params[] = $startDate . ' 00:00:00';
    }
    if ($endDate !== '') {
        $query .= ' AND al.created_at <= ?';
        $params[] = $endDate . ' 23:59:59';
    }
    
    $query .= ' ORDER BY al.created_at DESC LIMIT 10000';
    
    $st = $pdo->prepare($query);
    $st->execute($params);
    $data = $st->fetchAll();
    
    if ($format === 'csv') {
        export_to_csv($data, 'activity_logs_' . date('Y-m-d'));
    } else {
        json_out(['ok' => false, 'error' => 'Unsupported format'], 422);
    }
}

function export_login_history(PDO $pdo, string $format, string $startDate, string $endDate): void
{
    $query = 'SELECT lh.id, u.full_name, u.email, lh.login_at, lh.logout_at, lh.ip_address, lh.status FROM login_history lh LEFT JOIN users u ON lh.user_id = u.id WHERE 1=1';
    $params = [];
    
    if ($startDate !== '') {
        $query .= ' AND lh.login_at >= ?';
        $params[] = $startDate . ' 00:00:00';
    }
    if ($endDate !== '') {
        $query .= ' AND lh.login_at <= ?';
        $params[] = $endDate . ' 23:59:59';
    }
    
    $query .= ' ORDER BY lh.login_at DESC LIMIT 10000';
    
    $st = $pdo->prepare($query);
    $st->execute($params);
    $data = $st->fetchAll();
    
    if ($format === 'csv') {
        export_to_csv($data, 'login_history_' . date('Y-m-d'));
    } else {
        json_out(['ok' => false, 'error' => 'Unsupported format'], 422);
    }
}

function export_security_alerts(PDO $pdo, string $format, string $startDate, string $endDate): void
{
    $query = 'SELECT sa.id, u.full_name, sa.alert_type, sa.severity, sa.title, sa.ip_address, sa.created_at FROM security_alerts sa LEFT JOIN users u ON sa.user_id = u.id WHERE 1=1';
    $params = [];
    
    if ($startDate !== '') {
        $query .= ' AND sa.created_at >= ?';
        $params[] = $startDate . ' 00:00:00';
    }
    if ($endDate !== '') {
        $query .= ' AND sa.created_at <= ?';
        $params[] = $endDate . ' 23:59:59';
    }
    
    $query .= ' ORDER BY sa.created_at DESC LIMIT 10000';
    
    $st = $pdo->prepare($query);
    $st->execute($params);
    $data = $st->fetchAll();
    
    if ($format === 'csv') {
        export_to_csv($data, 'security_alerts_' . date('Y-m-d'));
    } else {
        json_out(['ok' => false, 'error' => 'Unsupported format'], 422);
    }
}

function export_to_csv(array $data, string $filename): void
{
    if (empty($data)) {
        json_out(['ok' => false, 'error' => 'No data to export'], 422);
    }
    
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="' . $filename . '.csv"');
    
    $output = fopen('php://output', 'w');
    
    // Write header
    $headers = array_keys((array) $data[0]);
    fputcsv($output, $headers);
    
    // Write data
    foreach ($data as $row) {
        fputcsv($output, (array) $row);
    }
    
    fclose($output);
    exit;
}

function ensure_admin(PDO $pdo): void
{
    if (empty($_SESSION['user_id'])) {
        json_out(['ok' => false, 'error' => 'Unauthorized'], 401);
    }
    
    $st = $pdo->prepare('SELECT role FROM users WHERE id = ? AND is_active = 1');
    $st->execute([(int) $_SESSION['user_id']]);
    $user = $st->fetch();
    
    if (!$user || $user['role'] !== 'admin') {
        json_out(['ok' => false, 'error' => 'Admin access required'], 403);
    }
}
