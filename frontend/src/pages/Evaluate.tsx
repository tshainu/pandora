import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { Save, ChevronLeft } from 'lucide-react';

function StarRating({ value, onChange, max = 5 }: { value: number; onChange: (v: number) => void; max?: number }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="stars">
      {Array.from({ length: max }, (_, i) => i + 1).map(s => (
        <span
          key={s}
          className={`star ${s <= (hover || value) ? 'filled' : ''}`}
          onMouseEnter={() => setHover(s)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(s)}
        >★</span>
      ))}
    </div>
  );
}

function starsToScore(stars: number, max = 5) { return Math.round((stars / max) * 10); }

const blank = {
  employee_id: '', month: '', supervisor_name: '', evaluation_date: '',
  days_leave_taken: 0, attendance_score: 0, attendance_remark: '',
  late_minutes: 0, punctuality_score: 0, punctuality_remark: '',
  productivity_stars: 0, productivity_score: 0, productivity_remark: '',
  quality_stars: 0, quality_score: 0, quality_remark: '',
  team_respect_supervisors: false, team_cooperation: false, team_follow_instructions: false, team_no_conflicts: false,
  teamwork_score: 0, teamwork_remark: '',
  initiative_stars: 0, initiative_score: 0, initiative_remark: '',
  discipline_phone_stars: 0, discipline_activities_stars: 0, discipline_behaviour_stars: 0,
  discipline_score: 0, discipline_remark: '',
  total_score: 0, percentage: 0, grade: '',
  recommendation: 'No Action', supervisor_comment: '',
};

function calcAttendance(days: number) {
  if (days === 0) return 10;
  if (days === 1) return 8;
  if (days === 2) return 6;
  if (days === 3) return 4;
  return 2;
}
function calcPunctuality(minutes: number) {
  if (minutes === 0) return 10;
  if (minutes <= 10) return 8;
  if (minutes <= 30) return 6;
  if (minutes <= 60) return 4;
  return 2;
}
function calcTeamwork(form: any) {
  const checked = [form.team_respect_supervisors, form.team_cooperation, form.team_follow_instructions, form.team_no_conflicts].filter(Boolean).length;
  return checked * 2.5;
}

export default function Evaluate() {
  const qc = useQueryClient();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const editId = params.get('edit') ? parseInt(params.get('edit')!) : null;

  const { data: employees = [] } = useQuery({ queryKey: ['employees'], queryFn: api.getEmployees });
  const { data: existingEval } = useQuery({
    queryKey: ['evaluation', editId],
    queryFn: () => api.getEvaluation(editId!),
    enabled: !!editId,
  });

  const [form, setForm] = useState<any>(blank);
  const [error, setError] = useState('');

  useEffect(() => {
    if (existingEval) setForm(existingEval);
  }, [existingEval]);

  function update(field: string, value: any) {
    setForm((f: any) => {
      const next = { ...f, [field]: value };

      // Auto-calc scores
      if (field === 'days_leave_taken') next.attendance_score = calcAttendance(value);
      if (field === 'late_minutes') next.punctuality_score = calcPunctuality(value);
      if (field === 'productivity_stars') next.productivity_score = starsToScore(value);
      if (field === 'quality_stars') next.quality_score = starsToScore(value);
      if (field === 'initiative_stars') next.initiative_score = starsToScore(value);
      if (['team_respect_supervisors', 'team_cooperation', 'team_follow_instructions', 'team_no_conflicts'].includes(field)) {
        next.teamwork_score = calcTeamwork(next);
      }
      if (['discipline_phone_stars', 'discipline_activities_stars', 'discipline_behaviour_stars'].includes(field)) {
        const avg = ((next.discipline_phone_stars + next.discipline_activities_stars + next.discipline_behaviour_stars) / 3) * 2;
        next.discipline_score = Math.round(avg * 10) / 10;
      }

      // Recalc total
      const total = (next.attendance_score || 0) + (next.punctuality_score || 0) +
        (next.productivity_score || 0) + (next.quality_score || 0) +
        (next.teamwork_score || 0) + (next.initiative_score || 0) + (next.discipline_score || 0);
      next.total_score = Math.round(total * 10) / 10;
      next.percentage = Math.round((total / 70) * 100 * 10) / 10;

      return next;
    });
  }

  const create = useMutation({ mutationFn: (d: object) => api.createEvaluation(d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['evaluations'] }); nav('/evaluations'); } });
  const upd = useMutation({ mutationFn: ({ id, d }: any) => api.updateEvaluation(id, d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['evaluations'] }); nav('/evaluations'); } });

  async function submit() {
    if (!form.employee_id || !form.month || !form.supervisor_name || !form.evaluation_date) {
      setError('Please fill all required fields (Employee, Month, Supervisor, Date)');
      return;
    }
    setError('');
    const payload = { ...form, employee_id: parseInt(form.employee_id) };
    if (editId) upd.mutate({ id: editId, d: payload });
    else create.mutate(payload);
  }

  const pct = form.percentage || 0;
  const gradeColor = pct >= 90 ? '#2E7D32' : pct >= 80 ? '#1565C0' : pct >= 70 ? '#F57C00' : pct >= 60 ? '#6A1FA0' : '#C0001A';
  const gradeLabel = pct >= 90 ? 'Excellent' : pct >= 80 ? 'Very Good' : pct >= 70 ? 'Good' : pct >= 60 ? 'Average' : 'Needs Improvement';

  return (
    <>
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="btn-icon" onClick={() => nav(-1)}><ChevronLeft size={18} /></button>
          <h2>{editId ? 'Edit Evaluation' : 'New Evaluation'}</h2>
        </div>
        <div className="topbar-right">
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text3)' }}>Live Score</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: gradeColor, lineHeight: 1 }}>{pct}%</div>
            <div style={{ fontSize: '0.7rem', color: gradeColor, fontWeight: 600 }}>{gradeLabel}</div>
          </div>
          <button className="btn btn-primary" onClick={submit} disabled={create.isPending || upd.isPending}>
            <Save size={14} /> {create.isPending || upd.isPending ? 'Saving…' : 'Save Evaluation'}
          </button>
        </div>
      </div>
      <div className="content">
        {error && <div className="alert alert-danger">{error}</div>}

        {/* Basic Info */}
        <div className="card" style={{ marginBottom: 16 }}>
          <p className="card-title">Basic Information</p>
          <div className="form-row">
            <div className="form-group">
              <label>Employee *</label>
              <select className="form-control" value={form.employee_id} onChange={e => update('employee_id', e.target.value)}>
                <option value="">Select employee</option>
                {employees.map((e: any) => <option key={e.id} value={e.id}>{e.name} — {e.department}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Month *</label>
              <input type="month" className="form-control" value={form.month} onChange={e => update('month', e.target.value)} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Supervisor Name *</label>
              <input className="form-control" value={form.supervisor_name} onChange={e => update('supervisor_name', e.target.value)} placeholder="Supervisor full name" />
            </div>
            <div className="form-group">
              <label>Evaluation Date *</label>
              <input type="date" className="form-control" value={form.evaluation_date} onChange={e => update('evaluation_date', e.target.value)} />
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Attendance */}
          <div className="score-section">
            <h4>📅 Attendance <span style={{ fontSize: '0.76rem', fontWeight: 400, color: 'var(--text3)' }}>/ 10</span></h4>
            <div className="score-row">
              <label>Days Leave Taken</label>
              <input type="number" min="0" max="31" className="form-control" style={{ width: 80 }} value={form.days_leave_taken} onChange={e => update('days_leave_taken', parseInt(e.target.value) || 0)} />
              <span style={{ fontWeight: 700, color: 'var(--red)', minWidth: 60 }}>Score: {form.attendance_score}/10</span>
            </div>
            <div className="form-group">
              <label>Remark</label>
              <textarea className="form-control" rows={2} value={form.attendance_remark} onChange={e => update('attendance_remark', e.target.value)} />
            </div>
          </div>

          {/* Punctuality */}
          <div className="score-section">
            <h4>⏰ Punctuality <span style={{ fontSize: '0.76rem', fontWeight: 400, color: 'var(--text3)' }}>/ 10</span></h4>
            <div className="score-row">
              <label>Total Late Minutes</label>
              <input type="number" min="0" className="form-control" style={{ width: 80 }} value={form.late_minutes} onChange={e => update('late_minutes', parseInt(e.target.value) || 0)} />
              <span style={{ fontWeight: 700, color: 'var(--red)', minWidth: 60 }}>Score: {form.punctuality_score}/10</span>
            </div>
            <div className="form-group">
              <label>Remark</label>
              <textarea className="form-control" rows={2} value={form.punctuality_remark} onChange={e => update('punctuality_remark', e.target.value)} />
            </div>
          </div>

          {/* Productivity */}
          <div className="score-section">
            <h4>🏭 Productivity <span style={{ fontSize: '0.76rem', fontWeight: 400, color: 'var(--text3)' }}>/ 10</span></h4>
            <div className="score-row">
              <label>Star Rating</label>
              <StarRating value={form.productivity_stars} onChange={v => update('productivity_stars', v)} />
              <span style={{ fontWeight: 700, color: 'var(--red)', minWidth: 60 }}>Score: {form.productivity_score}/10</span>
            </div>
            <div className="form-group">
              <label>Remark</label>
              <textarea className="form-control" rows={2} value={form.productivity_remark} onChange={e => update('productivity_remark', e.target.value)} />
            </div>
          </div>

          {/* Quality */}
          <div className="score-section">
            <h4>✅ Quality <span style={{ fontSize: '0.76rem', fontWeight: 400, color: 'var(--text3)' }}>/ 10</span></h4>
            <div className="score-row">
              <label>Star Rating</label>
              <StarRating value={form.quality_stars} onChange={v => update('quality_stars', v)} />
              <span style={{ fontWeight: 700, color: 'var(--red)', minWidth: 60 }}>Score: {form.quality_score}/10</span>
            </div>
            <div className="form-group">
              <label>Remark</label>
              <textarea className="form-control" rows={2} value={form.quality_remark} onChange={e => update('quality_remark', e.target.value)} />
            </div>
          </div>

          {/* Teamwork */}
          <div className="score-section">
            <h4>🤝 Team Work <span style={{ fontSize: '0.76rem', fontWeight: 400, color: 'var(--text3)' }}>/ 10</span></h4>
            <div className="checkbox-group" style={{ marginBottom: 10 }}>
              {[
                { key: 'team_respect_supervisors', label: 'Respects supervisors' },
                { key: 'team_cooperation', label: 'Cooperates with team' },
                { key: 'team_follow_instructions', label: 'Follows instructions' },
                { key: 'team_no_conflicts', label: 'No conflicts reported' },
              ].map(({ key, label }) => (
                <label key={key} className="checkbox-item">
                  <input type="checkbox" checked={form[key]} onChange={e => update(key, e.target.checked)} />
                  {label}
                </label>
              ))}
            </div>
            <div style={{ fontWeight: 700, color: 'var(--red)', fontSize: '0.82rem', marginBottom: 10 }}>Score: {form.teamwork_score}/10</div>
            <div className="form-group">
              <label>Remark</label>
              <textarea className="form-control" rows={2} value={form.teamwork_remark} onChange={e => update('teamwork_remark', e.target.value)} />
            </div>
          </div>

          {/* Initiative */}
          <div className="score-section">
            <h4>💡 Initiative & Learning <span style={{ fontSize: '0.76rem', fontWeight: 400, color: 'var(--text3)' }}>/ 10</span></h4>
            <div className="score-row">
              <label>Star Rating</label>
              <StarRating value={form.initiative_stars} onChange={v => update('initiative_stars', v)} />
              <span style={{ fontWeight: 700, color: 'var(--red)', minWidth: 60 }}>Score: {form.initiative_score}/10</span>
            </div>
            <div className="form-group">
              <label>Remark</label>
              <textarea className="form-control" rows={2} value={form.initiative_remark} onChange={e => update('initiative_remark', e.target.value)} />
            </div>
          </div>
        </div>

        {/* Discipline */}
        <div className="score-section" style={{ marginTop: 16 }}>
          <h4>🛡️ Discipline <span style={{ fontSize: '0.76rem', fontWeight: 400, color: 'var(--text3)' }}>/ 10 (avg of 3 sub-scores)</span></h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            {[
              { key: 'discipline_phone_stars', label: 'Phone Usage' },
              { key: 'discipline_activities_stars', label: 'Unauthorized Activities' },
              { key: 'discipline_behaviour_stars', label: 'Behaviour' },
            ].map(({ key, label }) => (
              <div key={key}>
                <label style={{ fontSize: '0.78rem', fontWeight: 500, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>{label}</label>
                <StarRating value={form[key]} onChange={v => update(key, v)} />
              </div>
            ))}
          </div>
          <div style={{ fontWeight: 700, color: 'var(--red)', fontSize: '0.82rem', marginTop: 10, marginBottom: 10 }}>Score: {form.discipline_score}/10</div>
          <div className="form-group">
            <label>Remark</label>
            <textarea className="form-control" rows={2} value={form.discipline_remark} onChange={e => update('discipline_remark', e.target.value)} />
          </div>
        </div>

        {/* Summary & Recommendation */}
        <div className="card" style={{ marginTop: 16 }}>
          <p className="card-title">Summary & Recommendation</p>
          <div style={{ display: 'flex', gap: 24, marginBottom: 20, flexWrap: 'wrap' }}>
            {[
              { label: 'Total Score', value: `${form.total_score}/70` },
              { label: 'Percentage', value: `${form.percentage}%` },
              { label: 'Grade', value: gradeLabel },
            ].map(({ label, value }) => (
              <div key={label} style={{ textAlign: 'center', background: 'var(--bg)', padding: '12px 24px', borderRadius: 8 }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text3)' }}>{label}</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: gradeColor }}>{value}</div>
              </div>
            ))}
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Recommendation</label>
              <select className="form-control" value={form.recommendation} onChange={e => update('recommendation', e.target.value)}>
                <option>No Action</option>
                <option>Promote</option>
                <option>Salary Increment</option>
                <option>Training Required</option>
                <option>Warning Issued</option>
                <option>Termination Review</option>
              </select>
            </div>
            <div className="form-group">
              <label>Supervisor Comment</label>
              <textarea className="form-control" rows={2} value={form.supervisor_comment} onChange={e => update('supervisor_comment', e.target.value)} placeholder="Overall comment…" />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary" onClick={submit} disabled={create.isPending || upd.isPending}>
              <Save size={14} /> {create.isPending || upd.isPending ? 'Saving…' : 'Save Evaluation'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
