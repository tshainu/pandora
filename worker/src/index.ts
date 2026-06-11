export interface Env {
  pandora_db: D1Database;
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

function err(msg: string, status = 400) {
  return json({ error: msg }, status);
}

function calcGrade(pct: number): string {
  if (pct >= 90) return 'Excellent';
  if (pct >= 75) return 'Good';
  if (pct >= 60) return 'Satisfactory';
  if (pct >= 40) return 'Needs Improvement';
  return 'Poor';
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    // ─── EMPLOYEES ──────────────────────────────────────────────────────────

    // GET /employees
    if (method === 'GET' && path === '/employees') {
      const rows = await env.pandora_db.prepare(
        'SELECT * FROM employees ORDER BY created_at DESC'
      ).all();
      return json({ employees: rows.results });
    }

    // POST /employees
    if (method === 'POST' && path === '/employees') {
      const body = await request.json() as any;
      const { name, department, position, employee_id } = body;
      if (!name || !department || !position || !employee_id)
        return err('name, department, position, employee_id required');

      const existing = await env.pandora_db.prepare(
        'SELECT id FROM employees WHERE employee_id = ?'
      ).bind(employee_id).first();
      if (existing) return err('Employee ID already exists', 409);

      const result = await env.pandora_db.prepare(
        'INSERT INTO employees (name, department, position, employee_id) VALUES (?,?,?,?)'
      ).bind(name, department, position, employee_id).run();

      const emp = await env.pandora_db.prepare(
        'SELECT * FROM employees WHERE id = ?'
      ).bind(result.meta.last_row_id).first();
      return json({ employee: emp }, 201);
    }

    // GET /employees/:id
    const empMatch = path.match(/^\/employees\/(\d+)$/);
    if (empMatch) {
      const id = Number(empMatch[1]);
      if (method === 'GET') {
        const emp = await env.pandora_db.prepare(
          'SELECT * FROM employees WHERE id = ?'
        ).bind(id).first();
        if (!emp) return err('Employee not found', 404);
        return json({ employee: emp });
      }
      if (method === 'PUT') {
        const body = await request.json() as any;
        const { name, department, position, employee_id } = body;
        if (!name || !department || !position || !employee_id)
          return err('name, department, position, employee_id required');

        const conflict = await env.pandora_db.prepare(
          'SELECT id FROM employees WHERE employee_id = ? AND id != ?'
        ).bind(employee_id, id).first();
        if (conflict) return err('Employee ID already used by another employee', 409);

        await env.pandora_db.prepare(
          'UPDATE employees SET name=?, department=?, position=?, employee_id=? WHERE id=?'
        ).bind(name, department, position, employee_id, id).run();

        const emp = await env.pandora_db.prepare(
          'SELECT * FROM employees WHERE id = ?'
        ).bind(id).first();
        return json({ employee: emp });
      }
      if (method === 'DELETE') {
        const emp = await env.pandora_db.prepare(
          'SELECT id FROM employees WHERE id = ?'
        ).bind(id).first();
        if (!emp) return err('Employee not found', 404);
        await env.pandora_db.prepare('DELETE FROM employees WHERE id = ?').bind(id).run();
        return json({ message: 'Deleted' });
      }
    }

    // ─── EVALUATIONS ────────────────────────────────────────────────────────

    // GET /evaluations
    if (method === 'GET' && path === '/evaluations') {
      const month = url.searchParams.get('month');
      const employeeId = url.searchParams.get('employeeId');

      let q = `
        SELECT ev.*, emp.name as employee_name, emp.department, emp.position, emp.employee_id as emp_code
        FROM evaluations ev
        JOIN employees emp ON emp.id = ev.employee_id
      `;
      const params: any[] = [];
      const wheres: string[] = [];
      if (month) { wheres.push('ev.month = ?'); params.push(month); }
      if (employeeId) { wheres.push('ev.employee_id = ?'); params.push(Number(employeeId)); }
      if (wheres.length) q += ' WHERE ' + wheres.join(' AND ');
      q += ' ORDER BY ev.created_at DESC';

      const rows = await env.pandora_db.prepare(q).bind(...params).all();
      return json({ evaluations: rows.results });
    }

    // POST /evaluations
    if (method === 'POST' && path === '/evaluations') {
      const b = await request.json() as any;

      // Verify employee exists
      const emp = await env.pandora_db.prepare(
        'SELECT id FROM employees WHERE id = ?'
      ).bind(b.employee_id).first();
      if (!emp) return err('Employee not found', 404);

      // Check duplicate month
      const dup = await env.pandora_db.prepare(
        'SELECT id FROM evaluations WHERE employee_id = ? AND month = ?'
      ).bind(b.employee_id, b.month).first();
      if (dup) return err('Evaluation already exists for this employee and month', 409);

      const teamwork_score = (
        (b.team_respect_supervisors ? 1 : 0) +
        (b.team_cooperation ? 1 : 0) +
        (b.team_follow_instructions ? 1 : 0) +
        (b.team_no_conflicts ? 1 : 0)
      ) * 2.5;

      const discipline_score = parseFloat(
        (((b.discipline_phone_stars + b.discipline_activities_stars + b.discipline_behaviour_stars) / 15) * 10).toFixed(2)
      );

      const total_score =
        (b.attendance_score || 0) +
        (b.punctuality_score || 0) +
        (b.productivity_score || 0) +
        (b.quality_score || 0) +
        teamwork_score +
        (b.initiative_score || 0) +
        discipline_score;

      const percentage = parseFloat(((total_score / 70) * 100).toFixed(2));
      const grade = calcGrade(percentage);

      const result = await env.pandora_db.prepare(`
        INSERT INTO evaluations (
          employee_id, month, supervisor_name, evaluation_date,
          days_leave_taken, attendance_score, attendance_remark,
          late_minutes, punctuality_score, punctuality_remark,
          productivity_stars, productivity_score, productivity_remark,
          quality_stars, quality_score, quality_remark,
          team_respect_supervisors, team_cooperation, team_follow_instructions, team_no_conflicts,
          teamwork_score, teamwork_remark,
          initiative_stars, initiative_score, initiative_remark,
          discipline_phone_stars, discipline_activities_stars, discipline_behaviour_stars,
          discipline_score, discipline_remark,
          total_score, percentage, grade, recommendation, supervisor_comment
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      `).bind(
        b.employee_id, b.month, b.supervisor_name, b.evaluation_date,
        b.days_leave_taken || 0, b.attendance_score || 0, b.attendance_remark || null,
        b.late_minutes || 0, b.punctuality_score || 0, b.punctuality_remark || null,
        b.productivity_stars || 0, b.productivity_score || 0, b.productivity_remark || null,
        b.quality_stars || 0, b.quality_score || 0, b.quality_remark || null,
        b.team_respect_supervisors ? 1 : 0,
        b.team_cooperation ? 1 : 0,
        b.team_follow_instructions ? 1 : 0,
        b.team_no_conflicts ? 1 : 0,
        teamwork_score, b.teamwork_remark || null,
        b.initiative_stars || 0, b.initiative_score || 0, b.initiative_remark || null,
        b.discipline_phone_stars || 0, b.discipline_activities_stars || 0, b.discipline_behaviour_stars || 0,
        discipline_score, b.discipline_remark || null,
        total_score, percentage, grade,
        b.recommendation || 'No Action', b.supervisor_comment || null
      ).run();

      const ev = await env.pandora_db.prepare(
        'SELECT * FROM evaluations WHERE id = ?'
      ).bind(result.meta.last_row_id).first();
      return json({ evaluation: ev }, 201);
    }

    // GET/PUT/DELETE /evaluations/:id
    const evMatch = path.match(/^\/evaluations\/(\d+)$/);
    if (evMatch) {
      const id = Number(evMatch[1]);

      if (method === 'GET') {
        const ev = await env.pandora_db.prepare(`
          SELECT ev.*, emp.name as employee_name, emp.department, emp.position, emp.employee_id as emp_code
          FROM evaluations ev
          JOIN employees emp ON emp.id = ev.employee_id
          WHERE ev.id = ?
        `).bind(id).first();
        if (!ev) return err('Evaluation not found', 404);
        return json({ evaluation: ev });
      }

      if (method === 'PUT') {
        const b = await request.json() as any;

        const existing = await env.pandora_db.prepare(
          'SELECT id FROM evaluations WHERE id = ?'
        ).bind(id).first();
        if (!existing) return err('Evaluation not found', 404);

        const dup = await env.pandora_db.prepare(
          'SELECT id FROM evaluations WHERE employee_id = ? AND month = ? AND id != ?'
        ).bind(b.employee_id, b.month, id).first();
        if (dup) return err('Evaluation already exists for this employee and month', 409);

        const teamwork_score = (
          (b.team_respect_supervisors ? 1 : 0) +
          (b.team_cooperation ? 1 : 0) +
          (b.team_follow_instructions ? 1 : 0) +
          (b.team_no_conflicts ? 1 : 0)
        ) * 2.5;

        const discipline_score = parseFloat(
          (((b.discipline_phone_stars + b.discipline_activities_stars + b.discipline_behaviour_stars) / 15) * 10).toFixed(2)
        );

        const total_score =
          (b.attendance_score || 0) +
          (b.punctuality_score || 0) +
          (b.productivity_score || 0) +
          (b.quality_score || 0) +
          teamwork_score +
          (b.initiative_score || 0) +
          discipline_score;

        const percentage = parseFloat(((total_score / 70) * 100).toFixed(2));
        const grade = calcGrade(percentage);

        await env.pandora_db.prepare(`
          UPDATE evaluations SET
            employee_id=?, month=?, supervisor_name=?, evaluation_date=?,
            days_leave_taken=?, attendance_score=?, attendance_remark=?,
            late_minutes=?, punctuality_score=?, punctuality_remark=?,
            productivity_stars=?, productivity_score=?, productivity_remark=?,
            quality_stars=?, quality_score=?, quality_remark=?,
            team_respect_supervisors=?, team_cooperation=?, team_follow_instructions=?, team_no_conflicts=?,
            teamwork_score=?, teamwork_remark=?,
            initiative_stars=?, initiative_score=?, initiative_remark=?,
            discipline_phone_stars=?, discipline_activities_stars=?, discipline_behaviour_stars=?,
            discipline_score=?, discipline_remark=?,
            total_score=?, percentage=?, grade=?, recommendation=?, supervisor_comment=?
          WHERE id=?
        `).bind(
          b.employee_id, b.month, b.supervisor_name, b.evaluation_date,
          b.days_leave_taken || 0, b.attendance_score || 0, b.attendance_remark || null,
          b.late_minutes || 0, b.punctuality_score || 0, b.punctuality_remark || null,
          b.productivity_stars || 0, b.productivity_score || 0, b.productivity_remark || null,
          b.quality_stars || 0, b.quality_score || 0, b.quality_remark || null,
          b.team_respect_supervisors ? 1 : 0,
          b.team_cooperation ? 1 : 0,
          b.team_follow_instructions ? 1 : 0,
          b.team_no_conflicts ? 1 : 0,
          teamwork_score, b.teamwork_remark || null,
          b.initiative_stars || 0, b.initiative_score || 0, b.initiative_remark || null,
          b.discipline_phone_stars || 0, b.discipline_activities_stars || 0, b.discipline_behaviour_stars || 0,
          discipline_score, b.discipline_remark || null,
          total_score, percentage, grade,
          b.recommendation || 'No Action', b.supervisor_comment || null,
          id
        ).run();

        const ev = await env.pandora_db.prepare(
          'SELECT * FROM evaluations WHERE id = ?'
        ).bind(id).first();
        return json({ evaluation: ev });
      }

      if (method === 'DELETE') {
        const existing = await env.pandora_db.prepare(
          'SELECT id FROM evaluations WHERE id = ?'
        ).bind(id).first();
        if (!existing) return err('Evaluation not found', 404);
        await env.pandora_db.prepare('DELETE FROM evaluations WHERE id = ?').bind(id).run();
        return json({ message: 'Deleted' });
      }
    }

    // ─── DASHBOARD ──────────────────────────────────────────────────────────

    if (method === 'GET' && path === '/dashboard') {
      const month = url.searchParams.get('month');
      const monthFilter = month ? 'WHERE ev.month = ?' : '';
      const params = month ? [month] : [];

      const totalEmployees = await env.pandora_db.prepare(
        'SELECT COUNT(*) as count FROM employees'
      ).first<{ count: number }>();

      const evalCount = await env.pandora_db.prepare(
        `SELECT COUNT(*) as count FROM evaluations ${month ? 'WHERE month = ?' : ''}`
      ).bind(...params).first<{ count: number }>();

      const avgScore = await env.pandora_db.prepare(
        `SELECT AVG(percentage) as avg FROM evaluations ${month ? 'WHERE month = ?' : ''}`
      ).bind(...params).first<{ avg: number }>();

      const gradeDist = await env.pandora_db.prepare(
        `SELECT grade, COUNT(*) as count FROM evaluations ${month ? 'WHERE month = ?' : ''} GROUP BY grade`
      ).bind(...params).all();

      const topPerformers = await env.pandora_db.prepare(`
        SELECT ev.*, emp.name as employee_name, emp.department, emp.employee_id as emp_code
        FROM evaluations ev
        JOIN employees emp ON emp.id = ev.employee_id
        ${monthFilter}
        ORDER BY ev.percentage DESC
        LIMIT 5
      `).bind(...params).all();

      const deptAvg = await env.pandora_db.prepare(`
        SELECT emp.department, AVG(ev.percentage) as avg_score, COUNT(*) as count
        FROM evaluations ev
        JOIN employees emp ON emp.id = ev.employee_id
        ${monthFilter}
        GROUP BY emp.department
      `).bind(...params).all();

      const recentEvals = await env.pandora_db.prepare(`
        SELECT ev.*, emp.name as employee_name, emp.department, emp.employee_id as emp_code
        FROM evaluations ev
        JOIN employees emp ON emp.id = ev.employee_id
        ORDER BY ev.created_at DESC
        LIMIT 10
      `).all();

      return json({
        total_employees: totalEmployees?.count ?? 0,
        total_evaluations: evalCount?.count ?? 0,
        average_score: avgScore?.avg ? Number(avgScore.avg).toFixed(2) : '0.00',
        grade_distribution: gradeDist.results,
        top_performers: topPerformers.results,
        department_averages: deptAvg.results,
        recent_evaluations: recentEvals.results,
      });
    }

    // ─── REPORTS ────────────────────────────────────────────────────────────

    const reportMatch = path.match(/^\/reports\/([a-z_]+)$/);
    if (method === 'GET' && reportMatch) {
      const type = reportMatch[1];
      const month = url.searchParams.get('month');
      const monthFilter = month ? 'WHERE ev.month = ?' : '';
      const params = month ? [month] : [];

      if (type === 'monthly_summary') {
        const rows = await env.pandora_db.prepare(`
          SELECT ev.month,
            COUNT(*) as total_evaluations,
            AVG(ev.percentage) as avg_percentage,
            MAX(ev.percentage) as max_percentage,
            MIN(ev.percentage) as min_percentage,
            SUM(CASE WHEN ev.grade='Excellent' THEN 1 ELSE 0 END) as excellent_count,
            SUM(CASE WHEN ev.grade='Good' THEN 1 ELSE 0 END) as good_count,
            SUM(CASE WHEN ev.grade='Satisfactory' THEN 1 ELSE 0 END) as satisfactory_count,
            SUM(CASE WHEN ev.grade='Needs Improvement' THEN 1 ELSE 0 END) as needs_improvement_count,
            SUM(CASE WHEN ev.grade='Poor' THEN 1 ELSE 0 END) as poor_count
          FROM evaluations ev
          GROUP BY ev.month
          ORDER BY ev.month DESC
        `).all();
        return json({ data: rows.results });
      }

      if (type === 'top_performers') {
        const rows = await env.pandora_db.prepare(`
          SELECT ev.*, emp.name as employee_name, emp.department, emp.position, emp.employee_id as emp_code
          FROM evaluations ev
          JOIN employees emp ON emp.id = ev.employee_id
          ${monthFilter}
          ORDER BY ev.percentage DESC
          LIMIT 20
        `).bind(...params).all();
        return json({ data: rows.results });
      }

      if (type === 'department_performance') {
        const rows = await env.pandora_db.prepare(`
          SELECT emp.department,
            COUNT(*) as total_evaluations,
            AVG(ev.percentage) as avg_percentage,
            AVG(ev.attendance_score) as avg_attendance,
            AVG(ev.punctuality_score) as avg_punctuality,
            AVG(ev.productivity_score) as avg_productivity,
            AVG(ev.quality_score) as avg_quality,
            AVG(ev.teamwork_score) as avg_teamwork,
            AVG(ev.initiative_score) as avg_initiative,
            AVG(ev.discipline_score) as avg_discipline
          FROM evaluations ev
          JOIN employees emp ON emp.id = ev.employee_id
          ${monthFilter}
          GROUP BY emp.department
        `).bind(...params).all();
        return json({ data: rows.results });
      }

      if (type === 'attendance_report') {
        const rows = await env.pandora_db.prepare(`
          SELECT ev.month, emp.name as employee_name, emp.department, emp.employee_id as emp_code,
            ev.days_leave_taken, ev.attendance_score, ev.late_minutes, ev.punctuality_score,
            ev.attendance_remark, ev.punctuality_remark
          FROM evaluations ev
          JOIN employees emp ON emp.id = ev.employee_id
          ${monthFilter}
          ORDER BY ev.month DESC, emp.name
        `).bind(...params).all();
        return json({ data: rows.results });
      }

      if (type === 'recommendations') {
        const rows = await env.pandora_db.prepare(`
          SELECT ev.month, emp.name as employee_name, emp.department, emp.position, emp.employee_id as emp_code,
            ev.percentage, ev.grade, ev.recommendation, ev.supervisor_comment, ev.supervisor_name
          FROM evaluations ev
          JOIN employees emp ON emp.id = ev.employee_id
          ${monthFilter}
          ORDER BY ev.month DESC, ev.percentage DESC
        `).bind(...params).all();
        return json({ data: rows.results });
      }

      if (type === 'employee_history') {
        const empId = url.searchParams.get('employeeId');
        if (!empId) return err('employeeId required for employee_history report');
        const rows = await env.pandora_db.prepare(`
          SELECT ev.*, emp.name as employee_name, emp.department, emp.position, emp.employee_id as emp_code
          FROM evaluations ev
          JOIN employees emp ON emp.id = ev.employee_id
          WHERE ev.employee_id = ?
          ORDER BY ev.month DESC
        `).bind(Number(empId)).all();
        return json({ data: rows.results });
      }

      return err('Unknown report type', 404);
    }

    // ─── 404 ────────────────────────────────────────────────────────────────
    return err('Not found', 404);
  },
};
