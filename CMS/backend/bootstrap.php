<?php
declare(strict_types=1);

$config = require __DIR__ . '/config.php';

session_name($config['session_name']);
session_set_cookie_params([
    'lifetime' => 86400 * 7,
    'path' => '/',
    'httponly' => true,
    'samesite' => 'Lax',
]);

/**
 * Session id from SPA (cookie often breaks with Vite proxy / different host:port).
 * Accept X-Session-Id, Authorization: Bearer <sid>, or getallheaders() fallback.
 */

// Ensure session directory exists and is writable
$sessDir = __DIR__ . '/sessions';
if (!is_dir($sessDir)) @mkdir($sessDir, 0777, true);
if (is_writable($sessDir)) session_save_path($sessDir);

function cms_read_client_session_id(): string
{
    $sid = $_SERVER['HTTP_X_SESSION_ID'] ?? '';
    if ($sid !== '') {
        return trim($sid);
    }
    $auth = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if ($auth !== '' && preg_match('/Bearer\s+(\S+)/i', $auth, $m)) {
        return trim($m[1]);
    }
    if (function_exists('getallheaders')) {
        $hdrs = getallheaders() ?: [];
        foreach ($hdrs as $k => $v) {
            $lk = strtolower((string) $k);
            if ($lk === 'x-session-id' && is_string($v)) {
                return trim($v);
            }
            if ($lk === 'authorization' && is_string($v) && preg_match('/Bearer\s+(\S+)/i', $v, $m)) {
                return trim($m[1]);
            }
        }
    }
    return '';
}

$hdrSid = cms_read_client_session_id();
if ($hdrSid !== '' && preg_match('/^[a-zA-Z0-9\-_,]{16,512}$/', $hdrSid)) {
    session_id($hdrSid);
}
if (session_status() === PHP_SESSION_NONE) {
    if (!session_start()) {
        $logMsg = date('[Y-m-d H:i:s]') . " ERROR: session_start() failed\n";
        file_put_contents(__DIR__ . '/debug.log', $logMsg, FILE_APPEND);
    }
}

// DEBUG LOGGING — only when enabled
if (!empty($config['debug'])) {
    $logFile = __DIR__ . '/debug.log';
    $logMsg = date('[Y-m-d H:i:s]') . " SID: " . session_id() . " UID: " . ($_SESSION['user_id'] ?? 'MISSING') . " HDR_SID: " . $hdrSid . " Method: " . ($_SERVER['REQUEST_METHOD'] ?? '??') . " Route: " . ($_GET['route'] ?? '??') . "\n";
    file_put_contents($logFile, $logMsg, FILE_APPEND);
}

$db = $config['db'];
$pdoOpts = [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
];

function cms_mysql_socket_fallback(): string
{
    $env = getenv('MYSQL_UNIX_SOCKET');
    if (is_string($env) && $env !== '') {
        return $env;
    }
    return '/Applications/XAMPP/xamppfiles/var/mysql/mysql.sock';
}

function cms_pdo_dsn(array $db, bool $useSocket, string $socketPath): string
{
    if ($useSocket) {
        return sprintf(
            'mysql:unix_socket=%s;dbname=%s;charset=%s',
            $socketPath,
            $db['name'],
            $db['charset']
        );
    }
    return sprintf(
        'mysql:host=%s;port=%d;dbname=%s;charset=%s',
        $db['host'],
        $db['port'],
        $db['name'],
        $db['charset']
    );
}

try {
    $dsn = cms_pdo_dsn($db, false, '');
    $pdo = new PDO($dsn, $db['user'], $db['pass'], $pdoOpts);
} catch (PDOException $e) {
    $msg = $e->getMessage();
    $retry = str_contains($msg, '2002') || str_contains($msg, 'Connection refused') || str_contains($msg, 'No such file');
    if (!$retry) {
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['ok' => false, 'error' => 'Database connection failed']);
        exit;
    }
    try {
        $sock = cms_mysql_socket_fallback();
        $dsn = cms_pdo_dsn($db, true, $sock);
        $pdo = new PDO($dsn, $db['user'], $db['pass'], $pdoOpts);
    } catch (PDOException $e2) {
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['ok' => false, 'error' => 'Database connection failed']);
        exit;
    }
}

function json_in(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === '' || $raw === false) {
        return [];
    }
    $d = json_decode($raw, true);
    return is_array($d) ? $d : [];
}

function json_out(array $data, int $code = 200): void
{
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    if (session_status() === PHP_SESSION_ACTIVE && !isset($data['session_id'])) {
        $data['session_id'] = session_id();
    }
    echo json_encode($data);
    exit;
}

function require_role(PDO $pdo, string ...$roles): array
{
    if (empty($_SESSION['user_id'])) {
        json_out(['ok' => false, 'error' => 'Unauthorized'], 401);
    }
    $st = $pdo->prepare('SELECT id, email, role, full_name, is_active FROM users WHERE id = ?');
    $st->execute([(int) $_SESSION['user_id']]);
    $u = $st->fetch();
    if (!$u || !(int) $u['is_active']) {
        json_out(['ok' => false, 'error' => 'Unauthorized'], 401);
    }
    if (!in_array($u['role'], $roles, true)) {
        json_out(['ok' => false, 'error' => 'Forbidden'], 403);
    }
    return $u;
}

function log_activity(PDO $pdo, ?int $userId, string $action, ?string $details = null, ?string $entityType = null, ?int $entityId = null, ?array $oldValues = null, ?array $newValues = null): void
{
    $ipAddress = get_client_ip();
    $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? '';
    
    $st = $pdo->prepare(
        'INSERT INTO activity_log (user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent, details) 
         VALUES (?,?,?,?,?,?,?,?,?)'
    );
    $st->execute([
        $userId,
        $action,
        $entityType,
        $entityId,
        $oldValues ? json_encode($oldValues) : null,
        $newValues ? json_encode($newValues) : null,
        $ipAddress,
        $userAgent,
        $details
    ]);
}

function log_login(PDO $pdo, int $userId, string $status = 'success', ?string $failureReason = null): void
{
    $ipAddress = get_client_ip();
    $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? '';
    $sessionId = session_id();
    
    $st = $pdo->prepare(
        'INSERT INTO login_history (user_id, ip_address, user_agent, status, failure_reason, session_id) 
         VALUES (?,?,?,?,?,?)'
    );
    $st->execute([$userId, $ipAddress, $userAgent, $status, $failureReason, $sessionId]);
    
    // Log security alert for failed logins
    if ($status === 'failed') {
        log_security_alert($pdo, $userId, 'failed_login', 'low', 'Failed login attempt', "Failed login from IP: $ipAddress", $ipAddress);
    }
}

function log_logout(PDO $pdo, int $userId): void
{
    $sessionId = session_id();
    $st = $pdo->prepare(
        'UPDATE login_history SET logout_at = NOW() WHERE user_id = ? AND session_id = ? AND logout_at IS NULL LIMIT 1'
    );
    $st->execute([$userId, $sessionId]);
}

function log_security_alert(PDO $pdo, ?int $userId, string $alertType, string $severity, string $title, ?string $description = null, ?string $ipAddress = null, ?string $entityType = null, ?int $entityId = null): void
{
    $ipAddress = $ipAddress ?: get_client_ip();
    
    $st = $pdo->prepare(
        'INSERT INTO security_alerts (user_id, alert_type, severity, title, description, ip_address, related_entity_type, related_entity_id) 
         VALUES (?,?,?,?,?,?,?,?)'
    );
    $st->execute([$userId, $alertType, $severity, $title, $description, $ipAddress, $entityType, $entityId]);
}

function get_client_ip(): string
{
    if (!empty($_SERVER['HTTP_CLIENT_IP'])) {
        $ip = $_SERVER['HTTP_CLIENT_IP'];
    } elseif (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        $ip = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR'])[0];
    } else {
        $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    }
    return trim($ip);
}

function ensure_upload_dir(string $dir): void
{
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
}
