<?php
require_once 'db.php';

$sql = "
CREATE TABLE IF NOT EXISTS employees (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    department VARCHAR(255) NOT NULL,
    position VARCHAR(255) NOT NULL,
    employee_id VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS evaluations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    month VARCHAR(7) NOT NULL,
    supervisor_name VARCHAR(255) NOT NULL,
    evaluation_date VARCHAR(20) NOT NULL,

    -- Attendance
    days_leave_taken INT NOT NULL DEFAULT 0,
    attendance_score INT NOT NULL DEFAULT 0,
    attendance_remark TEXT,

    -- Punctuality
    late_minutes INT NOT NULL DEFAULT 0,
    punctuality_score INT NOT NULL DEFAULT 0,
    punctuality_remark TEXT,

    -- Productivity (star rating)
    productivity_stars INT NOT NULL DEFAULT 0,
    productivity_score INT NOT NULL DEFAULT 0,
    productivity_remark TEXT,

    -- Quality (star rating)
    quality_stars INT NOT NULL DEFAULT 0,
    quality_score INT NOT NULL DEFAULT 0,
    quality_remark TEXT,

    -- Team Work (checkboxes)
    team_respect_supervisors TINYINT(1) NOT NULL DEFAULT 0,
    team_cooperation TINYINT(1) NOT NULL DEFAULT 0,
    team_follow_instructions TINYINT(1) NOT NULL DEFAULT 0,
    team_no_conflicts TINYINT(1) NOT NULL DEFAULT 0,
    teamwork_score INT NOT NULL DEFAULT 0,
    teamwork_remark TEXT,

    -- Initiative & Learning
    initiative_stars INT NOT NULL DEFAULT 0,
    initiative_score INT NOT NULL DEFAULT 0,
    initiative_remark TEXT,

    -- Discipline
    discipline_phone_stars INT NOT NULL DEFAULT 0,
    discipline_activities_stars INT NOT NULL DEFAULT 0,
    discipline_behaviour_stars INT NOT NULL DEFAULT 0,
    discipline_score DECIMAL(5,2) NOT NULL DEFAULT 0,
    discipline_remark TEXT,

    -- Totals
    total_score DECIMAL(8,2) NOT NULL DEFAULT 0,
    percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
    grade VARCHAR(50) NOT NULL DEFAULT '',

    -- Recommendation
    recommendation VARCHAR(100) DEFAULT 'No Action',
    supervisor_comment TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
";

try {
    $pdo->exec($sql);
    echo json_encode(['status' => 'Migration complete']);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
