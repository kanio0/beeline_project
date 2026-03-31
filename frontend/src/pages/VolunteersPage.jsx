import { useEffect, useMemo, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';

const emptyForm = { name: '', email: '', password: 'vol12345', telegram_username: '', phone: '', city: '', team_id: '', about: '' };

export default function VolunteersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [search, setSearch] = useState('');
  const [team, setTeam] = useState('');
  const [status, setStatus] = useState('');
  const [message, setMessage] = useState('');
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    const [teamsRes, usersRes] = await Promise.all([api.get('/teams'), api.get('/users')]);
    setTeams(teamsRes.data);
    setUsers(usersRes.data);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => users.filter((u) => {
    const okSearch = !search || [u.name, u.email, u.telegram_username, u.city].join(' ').toLowerCase().includes(search.toLowerCase());
    const okTeam = !team || u.team === team;
    const okStatus = !status || u.status === status;
    return okSearch && okTeam && okStatus;
  }), [users, search, team, status]);

  const addVolunteer = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, team_id: form.team_id ? Number(form.team_id) : null };
      await api.post('/users', payload);
      setMessage('Волонтёр добавлен');
      setForm(emptyForm);
      load();
    } catch (err) {
      setMessage(err?.response?.data?.detail || 'Не удалось добавить волонтёра');
    }
  };

  return (
    <div className="page-stack exact-directory-page">
      <section className="directory-hero">
        <h1>Волонтёры и контакты</h1>
        <p>Быстрый обзор команды, статусов, Telegram, телефонов и рейтингов.</p>
      </section>

      {user?.role === 'organizer' && (
        <section className="glass-card exact-card add-volunteer-card">
          <div className="panel-head exact-panel-head"><h3>Добавить волонтёра</h3><span>Быстрый CRM-ввод</span></div>
          <form className="volunteer-create-grid" onSubmit={addVolunteer}>
            <label>ФИО<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
            <label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label>
            <label>Пароль<input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></label>
            <label>Telegram<input value={form.telegram_username} onChange={(e) => setForm({ ...form, telegram_username: e.target.value })} placeholder="@username" /></label>
            <label>Телефон<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
            <label>Город<input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></label>
            <label>Команда<select value={form.team_id} onChange={(e) => setForm({ ...form, team_id: e.target.value })}><option value="">Выбрать команду</option>{teams.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label className="col-span-2">О себе<textarea value={form.about} onChange={(e) => setForm({ ...form, about: e.target.value })} rows={4} /></label>
            <div className="form-actions volunteer-form-actions col-span-2"><button className="primary-button exact-primary-button" type="submit">Сохранить</button>{message && <span className="inline-message">{message}</span>}</div>
          </form>
        </section>
      )}

      <section className="glass-card exact-card filter-strip exact-filter-card">
        <div className="filters-row luxury-filters">
          <input placeholder="Поиск по имени, email, Telegram или городу" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select value={team} onChange={(e) => setTeam(e.target.value)}><option value="">Все команды</option>{teams.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}</select>
          <select value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Любой статус</option><option value="active">Активен</option><option value="inactive">Неактивен</option></select>
        </div>
      </section>

      <section className="volunteer-card-grid exact-volunteer-grid wider-volunteer-grid">
        {filtered.map((u) => (
          <article className="glass-card exact-card volunteer-card exact-volunteer-card wider-volunteer-card" key={u.id}>
            <div className="volunteer-head">
              <div className="person-row-main">
                {u.photo_url ? <img className="avatar-image" src={`http://localhost:8000${u.photo_url}`} alt={u.name} /> : <div className="person-avatar exact-avatar">{u.name[0]}</div>}
                <div><strong>{u.name}</strong><p>{u.team || 'Без команды'}</p></div>
              </div>
              <span className={`status-pill ${u.status}`}>{u.status === 'active' ? 'активен' : 'неактивен'}</span>
            </div>
            <div className="volunteer-meta-grid">
              <div><span>Telegram</span><strong>{u.telegram_username ? `@${u.telegram_username}` : '—'}</strong></div>
              <div><span>Телефон</span><strong>{u.phone || '—'}</strong></div>
              <div><span>Город</span><strong>{u.city || '—'}</strong></div>
              <div><span>Роль</span><strong>{u.role === 'organizer' ? 'Координатор' : 'Волонтёр'}</strong></div><div><span>Мероприятий</span><strong>{u.events_count || 0}</strong></div>
            </div>
            <p className="volunteer-about">{u.about || 'Участник команды киберволонтёров.'}</p>
            <div className="volunteer-footer"><div><span>Коины</span><strong>{u.coins_balance}</strong></div><div><span>Рейтинг</span><strong>{u.rating}</strong></div></div>
          </article>
        ))}
      </section>
    </div>
  );
}
