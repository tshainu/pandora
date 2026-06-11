export default function GradeBadge({ pct }: { pct: number }) {
  if (pct >= 90) return <span className="badge badge-excellent">Excellent</span>;
  if (pct >= 80) return <span className="badge badge-verygood">Very Good</span>;
  if (pct >= 70) return <span className="badge badge-good">Good</span>;
  if (pct >= 60) return <span className="badge badge-average">Average</span>;
  return <span className="badge badge-needs">Needs Improvement</span>;
}
