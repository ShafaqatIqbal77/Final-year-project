<?php
require_once __DIR__ . '/backend/bootstrap.php';
header('Content-Type: text/plain');
echo "Session Status: " . session_status() . "\n";
echo "Session Name: " . session_name() . "\n";
echo "Session ID: " . session_id() . "\n";
echo "Session User ID: " . ($_SESSION['user_id'] ?? 'MISSING') . "\n";
echo "Headers:\n";
foreach (getallheaders() as $k => $v) {
    echo "  $k: $v\n";
}
echo "Server Vars:\n";
echo "  HTTP_X_SESSION_ID: " . ($_SERVER['HTTP_X_SESSION_ID'] ?? 'MISSING') . "\n";
echo "  HTTP_AUTHORIZATION: " . ($_SERVER['HTTP_AUTHORIZATION'] ?? 'MISSING') . "\n";
