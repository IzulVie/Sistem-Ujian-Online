<?php
try {
    $pdo = new PDO('mysql:host=127.0.0.1;port=3306', 'root', '');
    $pdo->exec('CREATE DATABASE IF NOT EXISTS cbt_ujian_online');
    echo "MYSQL_CONNECTED_AND_DATABASE_READY\n";
} catch (Exception $e) {
    echo "MYSQL_ERROR: " . $e->getMessage() . "\n";
}
