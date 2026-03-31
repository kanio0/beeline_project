import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

export default function TeamsPage() {
  const [teams, setTeams] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/teams').then((res) => setTeams(res.data));
  }, []);

  const max = useMemo(() => Math.max(...teams.map((team) => team.total_coins || 0), 1), [teams]);

  return (
    <div className="page-stack exact-teams-page">
      <section className="directory-hero">
        <h1>Команды и лидеры</h1>
        <p>Рейтинг по сумме коинов, составу и средней активности.</p>
      </section>

      <section className="teams-grid-showcase">
        <section className="glass-card exact-card">
          <div className="panel-head exact-panel-head"><h3>Рейтинг команд</h3><span>по сумме коинов</span></div>
          <div className="ranking-list exact-ranking-list large-list">
            {teams.map((team, idx) => (
              <button key={team.id} className="ranking-item exact-ranking-item team-item clickable-card button-reset" type="button" onClick={() => navigate(`/teams/${team.id}`)}>
                <div>
                  <strong>{idx + 1}. {team.name}</strong>
                  <p>{team.city || 'Город не указан'} · {team.members_count} участников</p>
                </div>
                <div className="team-item-metrics"><span>{team.average_activity}% active</span><div className="coin-pill exact-coin-pill">{team.total_coins}</div></div>
              </button>
            ))}
          </div>
        </section>

        <section className="glass-card exact-card team-bars-card">
          <div className="panel-head exact-panel-head"><h3>Сравнение команд</h3><span>сумма коинов</span></div>
          <div className="city-chart team-comparison-chart">
            <div className="city-chart-grid" />
            <div className="city-bars team-bars">
              {teams.map((team, index) => (
                <button className="city-bar-wrap button-reset" key={team.id} onClick={() => navigate(`/teams/${team.id}`)}>
                  <div className={`city-bar ${index % 3 === 1 ? 'light' : ''}`} style={{ height: `${Math.max(36, ((team.total_coins || 0) / max) * 260)}px` }} />
                  <span>{team.name.replace('Команда ', '')}</span>
                </button>
              ))}
            </div>
          </div>
        </section>
      </section>
    </div>
  );
}
