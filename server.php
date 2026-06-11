<?php
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// API routes → api.php
$apiRoutes = ['employees', 'evaluations', 'dashboard', 'reports', 'health'];
$first = explode('/', ltrim($uri, '/'))[0];

if (in_array($first, $apiRoutes)) {
    require __DIR__ . '/backend/api.php';
    exit();
}

// Static files from dist
$file = __DIR__ . '/frontend/dist' . $uri;
if ($uri !== '/' && file_exists($file) && is_file($file)) {
    return false; // let PHP built-in server handle it
}

// SPA fallback → index.html
$index = __DIR__ . '/frontend/dist/index.html';
header('Content-Type: text/html');
readfile($index);
