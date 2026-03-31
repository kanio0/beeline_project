import { useEffect, useMemo, useState } from 'react';
import api from '../api/client';
import MonthBoard from '../components/MonthBoard';

function BarPanel({ data = [] }) {
  const max = Math.max(...data.map((item) => item.value || 0), 1);
  return (
    <section className="glass-card exact-card cities-panel dashboard-chart-panel">
      <div className="panel-head exact-panel-head"><h3>Города</h3><span>По рейтингу</span></div>
      <div className="city-chart">
        <div className="city-chart-grid" />
        <div className="city-bars">
          {data.slice(0, 4).map((item, index) => (
            <div className="city-bar-wrap" key={item.city || item.name}>
              <div className={`city-bar ${index % 3 === 1 ? 'light' : ''}`} style={{ height: `${Math.max(36, ((item.value || 0) / max) * 220)}px` }} />
              <span>{item.city}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function DonutPanel({ eventTypes = [] }) {
  const total = Math.max(eventTypes.reduce((sum, item) => sum + item.value, 0), 1);
  const first = Math.round(((eventTypes[0]?.value || 0) / total) * 360);
  const second = Math.round(((eventTypes[1]?.value || 0) / total) * 360);
  const style = { background: `conic-gradient(#f3c933 0deg ${first}deg, #f5e5a4 ${first}deg ${first + second}deg, #9a6a2f ${first + second}deg 360deg)` };
  return (
    <section className="glass-card exact-card donut-panel dashboard-chart-panel">
      <div className="panel-head exact-panel-head"><h3>Нагрузка по регионам</h3><span>форматы</span></div>
      <div className="donut-legend dashboard-legend">{eventTypes.slice(0, 3).map((item, i) => <span key={item.type}><i className={`dot ${i === 0 ? 'gold' : i === 1 ? 'cream' : 'bronze'}`} /> {item.type}</span>)}</div>
      <div className="donut-shell"><div className="donut-ring" style={style}><div className="donut-center"><strong>{total}</strong><span>событий</span></div></div></div>
    </section>
  );
}

function PodiumRow({ topUsers }) {
  return (
    <section className="glass-card exact-card podium-ribbon-large">
      <div className="podium-title">Пьедестал почёта</div>
      <div className="podium-ribbon-users">
        {topUsers.slice(0, 3).map((user, index) => (
          <div className="podium-ribbon-user" key={user.id}>
            <span className={`podium-medal medal-${index + 1}`}>{index + 1}</span>
            <div>
              <strong>{user.name}</strong>
              <p>{user.rating} рейтинга</p>
            </div>
          </div>
        ))}
      </div>
      <button className="primary-button small-demo-button" type="button">Демо координатора</button>
    </section>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/dashboard').then((dashboardRes) => setData(dashboardRes.data)).catch((err) => {
      const detail = err?.response?.data?.detail || err?.message || 'Не удалось загрузить дашборд';
      setError(String(detail));
    });
  }, []);

  const topUsers = useMemo(() => (data?.top_users || []).slice(0, 5), [data]);
  const cityTotals = useMemo(() => data?.charts?.city_totals || [], [data]);
  const eventTypes = useMemo(() => data?.charts?.event_types || [], [data]);
  const calendarEvents = useMemo(() => data?.calendar_events || [], [data]);

  if (error) return <div className="page-loader">{error}</div>;
  if (!data) return <div className="page-loader">Загрузка штаба…</div>;

  const summaryCards = [
    ['Всего волонтёров', data.summary.users, '👤'],
    ['Активные < 180 дней', data.summary.active_users, '✔'],
    ['Неактивные', data.summary.inactive_users, '✕'],
    ['Запланировано событий', data.summary.events_planned, '🗓'],
    ['Средняя явка', `${data.summary.attendance_rate}%`, '📈'],
    ['Общий охват', data.summary.coins_total, '📣'],
  ];

  return (
    <div className="page-stack exact-dashboard-page dashboard-like-ref">
      <section className="dashboard-hero-ref-grid">
        <div className="dashboard-hero-copy refined-hero-copy">
          <div className="hero-line" />
          <h1>Дашборд<br />волонтёрского<br />штаба</h1>
          <p>Полная картина по людям, командам, событиям и достижениям за 1–2 минуты.</p>

          <div className="summary-cards-grid summary-cards-grid-below-hero">
            {summaryCards.map(([label, value, icon]) => (
              <div className="glass-card exact-card summary-card-tile" key={label}><span>{label}</span><div><strong>{value}</strong><b>{icon}</b></div></div>
            ))}
          </div>
        </div>

        <section className="glass-card exact-card calendar-card-ref"><MonthBoard events={calendarEvents} /></section>
      </section>

      <PodiumRow topUsers={topUsers} />

      <section className="dashboard-main-panels-grid">
        <section className="glass-card exact-card ranking-card-ref">
          <div className="panel-head exact-panel-head"><h3>Рейтинг команд</h3><span>По коинам</span></div>
          <div className="ranking-list exact-ranking-list">
            {data.top_teams.slice(0, 5).map((team, index) => (
              <div className="ranking-item exact-ranking-item" key={team.id}><div><strong>{index + 1}. {team.name}</strong><p>{team.city} · {team.members} участников</p></div><div className="coin-pill exact-coin-pill">{team.coins}</div></div>
            ))}
          </div>
        </section>

        <section className="glass-card exact-card achievements-card-ref">
          <div className="panel-head exact-panel-head"><h3>Особые достижения</h3><span>Индивидуальные награды</span></div>
          <div className="achievement-tiles exact-achievements">
            <div className="achievement-tile exact-achievement"><span>👑</span><div><strong>Лидер сезона</strong><p>{topUsers[0]?.name || '—'} · Самый высокий рейтинг по коинам</p></div></div>
            <div className="achievement-tile exact-achievement"><span>✨</span><div><strong>Самый младший слушатель</strong><p>Анна Сабичева · Проверена вовлечённость аудитории от 9 лет</p></div></div>
          </div>
        </section>

        <BarPanel data={cityTotals} />
        <DonutPanel eventTypes={eventTypes} />
      </section>
    </div>
  );
}
