<?php
// Simple router for PHP built-in server
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Strip leading slash and get segments
$path = ltrim($uri, '/');

// Serve api.php for all requests
require __DIR__ . '/api.php';
