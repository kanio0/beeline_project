import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';

export default function TeamDetailPage() {
  const { teamId } = useParams();
  const [team, setTeam] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/teams/${teamId}`).then((res) => setTeam(res.data)).catch((err) => {
      setError(err?.response?.data?.detail || 'Не удалось загрузить команду');
    });
  }, [teamId]);

  if (error) return <div className="page-loader">{error}</div>;
  if (!team) return <div className="page-loader">Загрузка команды…</div>;

  return (
    <div className="page-stack team-detail-page">
      <section className="directory-hero">
        <Link to="/teams" className="hero-pill exact-pill">← Все команды</Link>
        <h1>{team.name}</h1>
        <p>{team.description || 'Команда волонтёров Beeline Cyber Volunteers'} · {team.city || 'Онлайн'} </p>
      </section>

      <section className="team-detail-head">
        <div className="glass-card exact-card team-detail-kpi"><span>Участников</span><strong>{team.members_count}</strong></div>
        <div className="glass-card exact-card team-detail-kpi"><span>Всего коинов</span><strong>{team.total_coins}</strong></div>
        <div className="glass-card exact-card team-detail-kpi"><span>Активность</span><strong>{team.average_activity}%</strong></div>
      </section>

      <section className="glass-card exact-card">
        <div className="panel-head exact-panel-head"><h3>Состав команды</h3><span>Рейтинг внутри команды</span></div>
        <div className="team-member-list">
          {team.members.map((member, index) => (
            <div className="team-member-row" key={member.id}>
              <div className="person-row-main">
                {member.photo_url ? <img className="avatar-image" src={`http://localhost:8000${member.photo_url}`} alt={member.name} /> : <div className="person-avatar exact-avatar">{member.name?.[0] || 'V'}</div>}
                <div>
                  <strong>{index + 1}. {member.name}</strong>
                  <p>{member.city || 'Город не указан'} · {member.telegram_username ? `@${member.telegram_username}` : 'участник'}</p>
                </div>
              </div>
              <div className="person-score">
                <span className={`role-pill ${team.leader_id === member.id ? 'leader' : ''}`}>{team.leader_id === member.id ? 'Лидер' : 'Участник'}</span>
                <strong>{member.rating}</strong>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
