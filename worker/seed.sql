INSERT OR IGNORE INTO employees (id, name, department, position, employee_id, created_at) VALUES
(1,'Nimal Perera','Sewing','Machine Operator','PG001','2026-06-10 04:15:41'),
(2,'Kumari Silva','Cutting','Cutter','PG002','2026-06-10 04:15:42'),
(3,'Ruwan Fernando','Quality Control','QC Inspector','PG003','2026-06-10 04:15:42'),
(4,'Shamila Dias','Finishing','Finisher','PG004','2026-06-10 04:15:42'),
(5,'Pradeep Jayawardena','Administration','Admin Officer','PG005','2026-06-10 04:15:42');

INSERT OR IGNORE INTO evaluations (id, employee_id, month, supervisor_name, evaluation_date, days_leave_taken, attendance_score, attendance_remark, late_minutes, punctuality_score, punctuality_remark, productivity_stars, productivity_score, productivity_remark, quality_stars, quality_score, quality_remark, team_respect_supervisors, team_cooperation, team_follow_instructions, team_no_conflicts, teamwork_score, teamwork_remark, initiative_stars, initiative_score, initiative_remark, discipline_phone_stars, discipline_activities_stars, discipline_behaviour_stars, discipline_score, discipline_remark, total_score, percentage, grade, recommendation, supervisor_comment, created_at) VALUES
(1,1,'2025-05','Saman Rathnayake','2025-05-31',0,10,'Perfect attendance',0,10,'Always on time',5,10,'Exceeds targets',4,8,'High quality work',1,1,1,1,10,'Team player',4,8,'Shows initiative',5,5,4,9.30,'Very disciplined',65.30,93.30,'Excellent','Promote','Outstanding employee','2026-06-10 04:15:42');
