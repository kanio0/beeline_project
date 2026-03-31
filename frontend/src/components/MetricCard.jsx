export default function MetricCard({ title, value, hint, accent = false }) {
  return (
    <div className={`metric-card ${accent ? 'metric-card-accent' : ''}`}>
      <span className="metric-card-label">{title}</span>
      <strong>{value}</strong>
      <small>{hint}</small>
    </div>
  );
}
