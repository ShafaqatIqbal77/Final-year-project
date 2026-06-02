<?php
/**
 * Run: php database/install.php (from project root)
 * Creates database and imports schema.sql
 */
$config = require dirname(__DIR__) . '/backend/config.php';
$c = $config['db'];

function cms_install_socket(): string
{
    $env = getenv('MYSQL_UNIX_SOCKET');
    if (is_string($env) && $env !== '') {
        return $env;
    }
    return '/Applications/XAMPP/xamppfiles/var/mysql/mysql.sock';
}

$mysqli = null;
try {
    $mysqli = new mysqli($c['host'], $c['user'], $c['pass'], '', (int) $c['port']);
} catch (mysqli_sql_exception $e) {
    $sock = cms_install_socket();
    try {
        $mysqli = new mysqli('localhost', $c['user'], $c['pass'], '', (int) $c['port'], $sock);
    } catch (mysqli_sql_exception $e2) {
        fwrite(STDERR, 'Connect failed: ' . $e->getMessage() . "\n");
        fwrite(STDERR, "Tip: start MySQL (XAMPP macOS: sudo /Applications/XAMPP/xamppfiles/xampp startmysql)\n");
        fwrite(STDERR, "Or set MYSQL_UNIX_SOCKET to your mysqld.sock path.\n");
        exit(1);
    }
}
if ($mysqli->connect_error) {
    fwrite(STDERR, 'Connect failed: ' . $mysqli->connect_error . "\n");
    exit(1);
}

$mysqli->set_charset($c['charset']);

$db = $mysqli->real_escape_string($c['name']);
$mysqli->query("CREATE DATABASE IF NOT EXISTS `$db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
$mysqli->select_db($c['name']);

$sql = file_get_contents(__DIR__ . '/schema.sql');
if ($sql === false) {
    fwrite(STDERR, "schema.sql not found\n");
    exit(1);
}

if (!$mysqli->multi_query($sql)) {
    fwrite(STDERR, 'multi_query failed: ' . $mysqli->error . "\n");
    exit(1);
}
do {
    if ($res = $mysqli->store_result()) {
        $res->free();
    }
} while ($mysqli->next_result());

if ($mysqli->error) {
    fwrite(STDERR, 'SQL error: ' . $mysqli->error . "\n");
    exit(1);
}

echo "OK: Database installed.\nDefault admin login: admin@cms.local / Admin@123\n";
$mysqli->close();
