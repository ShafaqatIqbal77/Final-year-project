<?php
declare(strict_types=1);

$config = require __DIR__ . '/../backend/config.php';

try {
    $dbConfig = $config['db'];
    $dsn = "mysql:host={$dbConfig['host']};port={$dbConfig['port']};dbname={$dbConfig['name']};charset={$dbConfig['charset']}";
    $pdo = new PDO($dsn, $dbConfig['user'], $dbConfig['pass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);

    $sqlFile = __DIR__ . '/finance_extended_migration.sql';
    if (!file_exists($sqlFile)) {
        throw new Exception("Migration file not found: $sqlFile");
    }

    $sql = file_get_contents($sqlFile);
    $statements = [];
    $current = '';

    foreach (explode("\n", $sql) as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '--')) {
            continue;
        }
        $current .= $line . ' ';
        if (str_ends_with($line, ';')) {
            $statements[] = trim($current);
            $current = '';
        }
    }

    $applied = 0;
    $skipped = 0;

    foreach ($statements as $statement) {
        if ($statement === '') {
            continue;
        }
        try {
            $pdo->exec($statement);
            $applied++;
        } catch (PDOException $e) {
            $msg = $e->getMessage();
            if (
                str_contains($msg, 'Duplicate column')
                || str_contains($msg, 'already exists')
                || str_contains($msg, 'Duplicate entry')
            ) {
                $skipped++;
                continue;
            }
            throw $e;
        }
    }

    echo json_encode([
        'success' => true,
        'message' => "Finance extended migration completed ($applied statements, $skipped skipped).",
    ], JSON_PRETTY_PRINT);
} catch (Throwable $e) {
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
    ], JSON_PRETTY_PRINT);
}
