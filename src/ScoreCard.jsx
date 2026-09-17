export default function ScoreCard({ score = 0 }) {
  const label = score >= 75 ? 'Alta prioridad' : score >= 45 ? 'Seguimiento' : 'Baja urgencia';
  const tone = score >= 75 ? 'high' : score >= 45 ? 'medium' : 'low';

  return (
    <div className={`score score-${tone}`} title={`Score ${score}/100`}>
      <div className="score-ring" style={{ '--score': `${score}%` }}>
        <span>{score}</span>
      </div>
      <div>
        <strong>{label}</strong>
        <small>Probabilidad {score}%</small>
      </div>
    </div>
  );
}
