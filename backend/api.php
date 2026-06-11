<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once 'db.php';

$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
// Remove base path prefix
$path = preg_replace('#^/backend#', '', $path);
$path = preg_replace('#^/api\.php#', '', $path);
$path = trim($path, '/');
$segments = explode('/', $path);
$resource = $segments[0] ?? '';
$id = isset($segments[1]) && is_numeric($segments[1]) ? (int)$segments[1] : null;
$sub = $segments[1] ?? '';

$body = json_decode(file_get_contents('php://input'), true) ?? [];

function jsonResponse($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data);
    exit();
}

function getGrade($pct) {
    if ($pct >= 90) return 'Excellent';
    if ($pct >= 80) return 'Very Good';
    if ($pct >= 70) return 'Good';
    if ($pct >= 60) return 'Average';
    return 'Needs Improvement';
}

// ─── HEALTH ──────────────────────────────────────────────────────────────────
if ($resource === 'health') {
    jsonResponse(['status' => 'ok']);
}

// ─── EMPLOYEES ───────────────────────────────────────────────────────────────
if ($resource === 'employees') {
    if ($method === 'GET' && $id === null) {
        $rows = $pdo->query("SELECT * FROM employees ORDER BY name")->fetchAll();
        jsonResponse(['employees' => $rows]);
    }
    if ($method === 'GET' && $id) {
        $stmt = $pdo->prepare("SELECT * FROM employees WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) jsonResponse(['error' => 'Not found'], 404);
        jsonResponse(['employee' => $row]);
    }
    if ($method === 'POST') {
        $stmt = $pdo->prepare("INSERT INTO employees (name, department, position, employee_id) VALUES (?, ?, ?, ?)");
        $stmt->execute([$body['name'], $body['department'], $body['position'], $body['employee_id']]);
        $newId = $pdo->lastInsertId();
        $row = $pdo->query("SELECT * FROM employees WHERE id = $newId")->fetch();
        jsonResponse(['employee' => $row], 201);
    }
    if ($method === 'PUT' && $id) {
        $stmt = $pdo->prepare("UPDATE employees SET name=?, department=?, position=?, employee_id=? WHERE id=?");
        $stmt->execute([$body['name'], $body['department'], $body['position'], $body['employee_id'], $id]);
        $row = $pdo->query("SELECT * FROM employees WHERE id = $id")->fetch();
        jsonResponse(['employee' => $row]);
    }
    if ($method === 'DELETE' && $id) {
        $pdo->prepare("DELETE FROM employees WHERE id = ?")->execute([$id]);
        jsonResponse(['success' => true]);
    }
}

// ─── EVALUATIONS ─────────────────────────────────────────────────────────────
if ($resource === 'evaluations') {
    if ($method === 'GET' && $id === null && $sub === '') {
        $month = $_GET['month'] ?? '';
        $empId = $_GET['employeeId'] ?? '';
        $sql = "SELECT e.*, emp.name as employee_name, emp.department, emp.position, emp.employee_id as emp_code
                FROM evaluations e
                LEFT JOIN employees emp ON e.employee_id = emp.id
                WHERE 1=1";
        $params = [];
        if ($month) { $sql .= " AND e.month = ?"; $params[] = $month; }
        if ($empId) { $sql .= " AND e.employee_id = ?"; $params[] = $empId; }
        $sql .= " ORDER BY e.created_at DESC";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        jsonResponse(['evaluations' => $stmt->fetchAll()]);
    }
    if ($method === 'GET' && $id) {
        $stmt = $pdo->prepare("SELECT e.*, emp.name as employee_name, emp.department, emp.position, emp.employee_id as emp_code
                FROM evaluations e LEFT JOIN employees emp ON e.employee_id = emp.id WHERE e.id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) jsonResponse(['error' => 'Not found'], 404);
        jsonResponse(['evaluation' => $row]);
    }
    if ($method === 'POST') {
        $pct = $body['percentage'] ?? 0;
        $body['grade'] = getGrade($pct);
        $cols = implode(', ', array_keys($body));
        $placeholders = implode(', ', array_fill(0, count($body), '?'));
        $stmt = $pdo->prepare("INSERT INTO evaluations ($cols) VALUES ($placeholders)");
        $stmt->execute(array_values($body));
        $newId = $pdo->lastInsertId();
        $row = $pdo->query("SELECT * FROM evaluations WHERE id = $newId")->fetch();
        jsonResponse(['evaluation' => $row], 201);
    }
    if ($method === 'PUT' && $id) {
        $pct = $body['percentage'] ?? 0;
        $body['grade'] = getGrade($pct);
        $sets = implode(', ', array_map(fn($k) => "$k = ?", array_keys($body)));
        $stmt = $pdo->prepare("UPDATE evaluations SET $sets WHERE id = ?");
        $stmt->execute([...array_values($body), $id]);
        $row = $pdo->query("SELECT * FROM evaluations WHERE id = $id")->fetch();
        jsonResponse(['evaluation' => $row]);
    }
    if ($method === 'DELETE' && $id) {
        $pdo->prepare("DELETE FROM evaluations WHERE id = ?")->execute([$id]);
        jsonResponse(['success' => true]);
    }
}

// ─── DASHBOARD ───────────────────────────────────────────────────────────────
if ($resource === 'dashboard') {
    $month = $_GET['month'] ?? '';
    $employees = $pdo->query("SELECT * FROM employees")->fetchAll();
    $totalEmployees = count($employees);

    $sql = "SELECT * FROM evaluations" . ($month ? " WHERE month = ?" : "");
    $stmt = $pdo->prepare($sql);
    $stmt->execute($month ? [$month] : []);
    $evals = $stmt->fetchAll();

    $evaluatedCount = count($evals);
    $avgScore = $evaluatedCount > 0 ? array_sum(array_column($evals, 'percentage')) / $evaluatedCount : 0;
    $excellent = count(array_filter($evals, fn($e) => $e['percentage'] >= 90));
    $veryGood  = count(array_filter($evals, fn($e) => $e['percentage'] >= 80 && $e['percentage'] < 90));
    $good      = count(array_filter($evals, fn($e) => $e['percentage'] >= 70 && $e['percentage'] < 80));
    $average   = count(array_filter($evals, fn($e) => $e['percentage'] >= 60 && $e['percentage'] < 70));
    $needsImprovement = count(array_filter($evals, fn($e) => $e['percentage'] < 60));
    $attendanceIssues = count(array_filter($evals, fn($e) => $e['days_leave_taken'] >= 3));
    $disciplineIssues = count(array_filter($evals, fn($e) => $e['discipline_score'] < 6));
    $promotionCandidates = count(array_filter($evals, fn($e) => $e['recommendation'] === 'Promote'));
    $salaryIncrementCandidates = count(array_filter($evals, fn($e) => $e['percentage'] >= 80));

    $empMap = [];
    foreach ($employees as $emp) $empMap[$emp['id']] = $emp;

    $deptMap = [];
    foreach ($evals as $e) {
        $dept = $empMap[$e['employee_id']]['department'] ?? 'Unknown';
        if (!isset($deptMap[$dept])) $deptMap[$dept] = ['total' => 0, 'count' => 0];
        $deptMap[$dept]['total'] += $e['percentage'];
        $deptMap[$dept]['count']++;
    }
    $deptPerformance = array_map(fn($dept, $v) => [
        'department' => $dept,
        'avgScore' => round($v['total'] / $v['count']),
        'count' => $v['count'],
    ], array_keys($deptMap), $deptMap);

    $evalWithEmp = array_map(fn($e) => [
        ...$e,
        'employeeName' => $empMap[$e['employee_id']]['name'] ?? 'Unknown',
        'department' => $empMap[$e['employee_id']]['department'] ?? '',
    ], $evals);
    usort($evalWithEmp, fn($a, $b) => $b['percentage'] <=> $a['percentage']);
    $topEmployees = array_slice($evalWithEmp, 0, 10);

    $gradeDistribution = [
        ['grade' => 'Excellent', 'count' => $excellent, 'color' => '#2E7D32'],
        ['grade' => 'Very Good', 'count' => $veryGood, 'color' => '#1565C0'],
        ['grade' => 'Good', 'count' => $good, 'color' => '#F57C00'],
        ['grade' => 'Average', 'count' => $average, 'color' => '#6A1FA0'],
        ['grade' => 'Needs Improvement', 'count' => $needsImprovement, 'color' => '#C0001A'],
    ];

    jsonResponse(compact(
        'totalEmployees', 'evaluatedCount', 'avgScore', 'excellent', 'needsImprovement',
        'attendanceIssues', 'disciplineIssues', 'promotionCandidates', 'salaryIncrementCandidates',
        'deptPerformance', 'topEmployees', 'gradeDistribution'
    ));
}

// ─── REPORTS ─────────────────────────────────────────────────────────────────
if ($resource === 'reports') {
    $month = $_GET['month'] ?? '';
    $employees = $pdo->query("SELECT * FROM employees")->fetchAll();
    $empMap = [];
    foreach ($employees as $emp) $empMap[$emp['id']] = $emp;

    $sql = "SELECT * FROM evaluations" . ($month ? " WHERE month = ?" : "");
    $stmt = $pdo->prepare($sql);
    $stmt->execute($month ? [$month] : []);
    $evals = $stmt->fetchAll();

    $withEmp = array_map(fn($e) => [
        ...$e,
        'employeeName' => $empMap[$e['employee_id']]['name'] ?? 'Unknown',
        'department' => $empMap[$e['employee_id']]['department'] ?? '',
    ], $evals);

    switch ($sub) {
        case 'top-performers':
            usort($withEmp, fn($a, $b) => $b['percentage'] <=> $a['percentage']);
            jsonResponse(['data' => array_slice($withEmp, 0, 10)]);
        case 'attendance':
            $data = array_filter($withEmp, fn($e) => $e['days_leave_taken'] >= 2);
            usort($data, fn($a, $b) => $b['days_leave_taken'] <=> $a['days_leave_taken']);
            jsonResponse(['data' => array_values($data)]);
        case 'discipline':
            $data = array_filter($withEmp, fn($e) => $e['discipline_score'] < 7);
            usort($data, fn($a, $b) => $a['discipline_score'] <=> $b['discipline_score']);
            jsonResponse(['data' => array_values($data)]);
        case 'salary-increment':
            $data = array_filter($withEmp, fn($e) => $e['percentage'] >= 80);
            usort($data, fn($a, $b) => $b['percentage'] <=> $a['percentage']);
            jsonResponse(['data' => array_values($data)]);
        case 'training-needs':
            $data = array_filter($withEmp, fn($e) => $e['initiative_score'] < 6);
            usort($data, fn($a, $b) => $a['initiative_score'] <=> $b['initiative_score']);
            jsonResponse(['data' => array_values($data)]);
        case 'risk-employees':
            $data = array_filter($withEmp, fn($e) => $e['percentage'] < 60);
            usort($data, fn($a, $b) => $a['percentage'] <=> $b['percentage']);
            jsonResponse(['data' => array_values($data)]);
        default:
            jsonResponse(['error' => 'Unknown report'], 404);
    }
}

jsonResponse(['error' => 'Not found'], 404);
