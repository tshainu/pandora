CREATE TABLE IF NOT EXISTS employees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  department TEXT NOT NULL,
  position TEXT NOT NULL,
  employee_id TEXT NOT NULL UNIQUE,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS evaluations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL,
  month TEXT NOT NULL,
  supervisor_name TEXT NOT NULL,
  evaluation_date TEXT NOT NULL,

  days_leave_taken INTEGER NOT NULL DEFAULT 0,
  attendance_score INTEGER NOT NULL DEFAULT 0,
  attendance_remark TEXT,

  late_minutes INTEGER NOT NULL DEFAULT 0,
  punctuality_score INTEGER NOT NULL DEFAULT 0,
  punctuality_remark TEXT,

  productivity_stars INTEGER NOT NULL DEFAULT 0,
  productivity_score INTEGER NOT NULL DEFAULT 0,
  productivity_remark TEXT,

  quality_stars INTEGER NOT NULL DEFAULT 0,
  quality_score INTEGER NOT NULL DEFAULT 0,
  quality_remark TEXT,

  team_respect_supervisors INTEGER NOT NULL DEFAULT 0,
  team_cooperation INTEGER NOT NULL DEFAULT 0,
  team_follow_instructions INTEGER NOT NULL DEFAULT 0,
  team_no_conflicts INTEGER NOT NULL DEFAULT 0,
  teamwork_score REAL NOT NULL DEFAULT 0,
  teamwork_remark TEXT,

  initiative_stars INTEGER NOT NULL DEFAULT 0,
  initiative_score INTEGER NOT NULL DEFAULT 0,
  initiative_remark TEXT,

  discipline_phone_stars INTEGER NOT NULL DEFAULT 0,
  discipline_activities_stars INTEGER NOT NULL DEFAULT 0,
  discipline_behaviour_stars INTEGER NOT NULL DEFAULT 0,
  discipline_score REAL NOT NULL DEFAULT 0,
  discipline_remark TEXT,

  total_score REAL NOT NULL DEFAULT 0,
  percentage REAL NOT NULL DEFAULT 0,
  grade TEXT NOT NULL DEFAULT '',

  recommendation TEXT DEFAULT 'No Action',
  supervisor_comment TEXT,

  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);
