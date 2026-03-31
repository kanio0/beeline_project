import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/client';

const emptyForm = { name: '', phone: '', telegram_username: '', city: '', about: '' };
const baseRoles = ['лектор', 'ведущий', 'помощник', 'модератор', 'координатор', 'фотограф', 'регистратор'];

function EventModal({ event, onClose, onRefresh }) {
  const { user } = useAuth();
  const [details, setDetails] = useState(null);
  const [comment, setComment] = useState('');
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');
  const [role, setRole] = useState('participant');
  const [preview, setPreview] = useState(null);

  const loadDetails = async () => {
    if (!event) return;
    const res = await api.get(`/events/${event.id}`);
    setDetails(res.data);
    setRole(res.data.my_role || res.data.required_roles?.[0] || 'participant');
  };

  useEffect(() => { loadDetails(); }, [event]);
  if (!event) return null;

  const join = async () => {
    await api.post('/events/participation', { event_id: event.id, user_id: user.id, role });
    setMessage('Вы записаны на мероприятие');
    await loadDetails();
    onRefresh?.();
  };

  const updateRole = async () => {
    if (!details?.my_participation_id) return;
    await api.patch(`/events/participation/${details.my_participation_id}`, { role, status: 'registered' });
    setMessage('Роль обновлена');
    await loadDetails();
    onRefresh?.();
  };

  const cancel = async () => {
    if (!details?.my_participation_id) return;
    await api.delete(`/events/participation/${details.my_participation_id}`);
    setMessage('Запись отменена');
    await loadDetails();
    onRefresh?.();
  };

  const uploadReport = async (e) => {
    e.preventDefault();
    if (!file) return;
    const payload = new FormData();
    payload.append('file', file);
    payload.append('comment', comment);
    await api.post(`/events/${event.id}/photo-report`, payload, { headers: { 'Content-Type': 'multipart/form-data' } });
    setMessage('Фотоотчёт добавлен');
    setComment('');
    setFile(null);
    await loadDetails();
    onRefresh?.();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="glass-card exact-card event-modal polished-modal" onClick={(e) => e.stopPropagation()}>
        <div className="panel-head"><h3>{details?.title || event.title}</h3><button className="ghost-button slim" type="button" onClick={onClose}>Закрыть</button></div>
        <div className="event-modal-meta"><span className="chip yellow">{details?.event_type || event.event_type}</span><span>{details?.city || event.city || 'Онлайн'}</span><span>{new Date(details?.starts_at || event.starts_at).toLocaleString('ru-RU')}</span></div>
        <p className="event-modal-description">{details?.description || 'Описание скоро появится.'}</p>
        <div className="event-modal-actions-row">
          <label className="modal-role-picker">Моя роль<select value={role} onChange={(e) => setRole(e.target.value)}>{(details?.required_roles?.length ? details.required_roles : baseRoles).map((r) => <option key={r} value={r}>{r}</option>)}</select></label>
          {details?.is_registered ? (<>
            <button className="ghost-button" type="button" onClick={updateRole}>Сменить роль</button>
            <button className="ghost-button danger-button" type="button" onClick={cancel}>Отменить запись</button>
          </>) : (
            <button className="primary-button" type="button" onClick={join}>Записаться</button>
          )}
          <a className="ghost-button" href={`http://localhost:8000/api/events/${event.id}/ics`} target="_blank" rel="noreferrer">В календарь</a>
        </div>
        <div className="event-detail-grid profile-event-grid">
          <div className="event-detail-block">
            <h4>Фотоотчёты</h4>
            <div className="photo-report-grid">
              {(details?.photo_reports || []).map((report) => (
                <button className="photo-card photo-card-button" key={report.id} type="button" onClick={() => setPreview(report)}>
                  <img src={`http://localhost:8000${report.image_url}`} alt={report.comment || 'Фотоотчёт'} />
                  <strong>{report.user_name || 'Участник'}</strong>
                  <p>{report.comment || 'Без комментария'}</p>
                </button>
              ))}
              {!details?.photo_reports?.length && <div className="empty-note">Пока нет фотоотчётов</div>}
            </div>
          </div>
          <div className="event-detail-block">
            <h4>Участники</h4>
            <div className="mini-list">{(details?.participants || []).map((item) => <div key={item.id}>{item.name} · {item.role}</div>)}</div>
          </div>
        </div>
        {details?.is_registered && <form className="photo-upload-form" onSubmit={uploadReport}>
          <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          <input placeholder="Комментарий к фотоотчёту" value={comment} onChange={(e) => setComment(e.target.value)} />
          <button className="primary-button" type="submit">Добавить фотоотчёт</button>
        </form>}
        {message && <div className="inline-message">{message}</div>}
      </div>
      {preview && (
        <div className="image-preview-backdrop" onClick={() => setPreview(null)}>
          <div className="image-preview-card" onClick={(e) => e.stopPropagation()}>
            <img src={`http://localhost:8000${preview.image_url}`} alt={preview.comment || 'Фотоотчёт'} />
            <div className="image-preview-copy"><strong>{preview.user_name || 'Участник'}</strong><p>{preview.comment || 'Без комментария'}</p></div>
          </div>
        </div>
      )}
    </div>
  );
}

function EventCard({ event, onClick, variant = 'mine' }) {
  return (
    <button className={`event-classic-card ${variant === 'mine' ? 'registered' : ''}`} type="button" onClick={() => onClick(event)}>
      <div className="event-classic-top"><span className="chip yellow">{event.event_type}</span><span className={`status-pill ${event.status === 'completed' ? 'completed' : 'planned'}`}>{event.status === 'completed' ? 'проведено' : 'запланировано'}</span></div>
      <strong>{event.title}</strong>
      <p>{event.description || 'Описание появится после заполнения карточки события.'}</p>
      <div className="event-classic-meta"><span>{event.city || 'Онлайн'}</span><span>{new Date(event.starts_at).toLocaleString('ru-RU')}</span></div>
      <div className="event-classic-meta"><span>Участники: {event.participants_count}</span><span>{variant === 'mine' ? `Моя роль: ${event.my_role || '—'}` : `Требуются: ${(event.required_roles || []).slice(0, 2).join(', ') || 'волонтёры'}`}</span></div>
    </button>
  );
}

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [mineEvents, setMineEvents] = useState([]);
  const [availableEvents, setAvailableEvents] = useState([]);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [uploading, setUploading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const load = async () => {
    try {
      setError('');
      const meRes = await api.get('/auth/me');
      const currentUser = meRes.data;
      const [profileRes, mineRes, availableRes, teamRes] = await Promise.all([
        api.get(`/users/${currentUser.id}`),
        api.get('/events?mine=true'),
        api.get('/events?available=true'),
        currentUser.team_id ? api.get(`/teams/${currentUser.team_id}`) : Promise.resolve({ data: null }),
      ]);
      const merged = { ...profileRes.data, team_detail: teamRes.data };
      setProfile(merged);
      setForm({ name: merged.name || '', phone: merged.phone || '', telegram_username: merged.telegram_username || '', city: merged.city || '', about: merged.about || '' });
      setMineEvents(mineRes.data);
      setAvailableEvents(availableRes.data);
    } catch (err) {
      const detail = err?.response?.data?.detail || err?.message || 'Не удалось загрузить кабинет';
      setError(String(detail));
    }
  };

  useEffect(() => { if (user?.id || localStorage.getItem('token')) load(); }, [user]);

  const saveProfile = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const { data } = await api.patch('/users/me', form);
      const next = { ...profile, ...data.user };
      setProfile(next);
      setUser?.(data.user);
      localStorage.setItem('user', JSON.stringify({ ...(JSON.parse(localStorage.getItem('user') || '{}')), ...data.user }));
      setEditing(false);
    } catch (err) {
      setError(err?.response?.data?.detail || 'Не удалось сохранить профиль');
    } finally {
      setSaving(false);
    }
  };

  const uploadPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const payload = new FormData();
    payload.append('file', file);
    try {
      setUploading(true);
      const { data } = await api.post('/users/me/photo', payload, { headers: { 'Content-Type': 'multipart/form-data' } });
      setProfile((prev) => ({ ...prev, photo_url: data.photo_url }));
    } catch (err) {
      setError(err?.response?.data?.detail || 'Не удалось загрузить фото');
    } finally {
      setUploading(false);
    }
  };

  if (error && !profile) return <div className="page-loader">{error}</div>;
  if (!profile) return <div className="page-loader">Загрузка профиля…</div>;

  const teamMembers = profile.team_detail?.members?.slice(0, 4) || [];

  return (
    <div className="page-stack exact-profile-page">
      {selectedEvent && <EventModal event={selectedEvent} onClose={() => setSelectedEvent(null)} onRefresh={load} />}
      <div className="profile-pills-row"><span className="hero-pill exact-pill">Личный кабинет</span><span className="hero-pill exact-pill">Мои мероприятия</span><span className="hero-pill exact-pill">Команда</span></div>
      <section className="profile-stage-grid improved-profile-grid polished-profile-grid">
        <div className="profile-left-column">
          <div className="profile-intro-copy"><h1>{profile.name}</h1><p>{profile.about || 'Личный кабинет волонтёра с календарём, мероприятиями и командой.'}</p></div>
          <div className="profile-left-grid wider-profile-left-grid">
            <section className="glass-card exact-card profile-form-card improved-profile-card">
              <div className="profile-photo-row">{profile.photo_url ? <img className="profile-photo" src={`http://localhost:8000${profile.photo_url}`} alt={profile.name} /> : <div className="person-avatar exact-avatar large bordered">{profile.name?.[0] || 'И'}</div>}<label className="upload-photo-button">{uploading ? 'Загрузка…' : 'Добавить фото'}<input type="file" accept="image/*" onChange={uploadPhoto} hidden /></label></div>
              {editing ? (
                <form className="profile-edit-form" onSubmit={saveProfile}>
                  <label>Имя<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
                  <label>Телефон<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
                  <label>Telegram<input value={form.telegram_username} onChange={(e) => setForm({ ...form, telegram_username: e.target.value })} /></label>
                  <label>Город<input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></label>
                  <label>О себе<textarea value={form.about} onChange={(e) => setForm({ ...form, about: e.target.value })} rows={4} /></label>
                  <div className="form-actions dual-actions"><button className="primary-button exact-primary-button" type="submit">{saving ? 'Сохраняем…' : 'Сохранить'}</button><button className="ghost-button" type="button" onClick={() => setEditing(false)}>Отмена</button></div>
                </form>
              ) : (
                <>
                  <label>Имя<input value={profile.name} readOnly /></label>
                  <label>Контакты<input value={profile.phone || profile.email || ''} readOnly /></label>
                  <label>Telegram<input value={profile.telegram_username ? `@${profile.telegram_username}` : '—'} readOnly /></label>
                  <label>Город<input value={profile.city || 'Город'} readOnly /></label>
                  <label>О себе<textarea value={profile.about || 'Расскажите о себе и своих сильных сторонах в волонтёрстве.'} readOnly rows={4} /></label>
                  <button className="primary-button exact-primary-button" type="button" onClick={() => setEditing(true)}>Редактировать</button>
                </>
              )}
            </section>
            <div className="profile-side-stack">
              <section className="highlight-card yellow-card exact-yellow-card"><span>Личный рейтинг</span><strong>{profile.rating || profile.coins_balance || 220}</strong><div className="mini-bars"><i /><i /><i /></div></section>
              <section className="glass-card exact-card profile-achievements-card"><h3>Личные достижения<br />и прогресс</h3><div className="achievement-stack">{(profile.achievements?.length ? profile.achievements : [{ name: 'Самая большая аудитория', description: 'Собрана аудитория 120', icon: '🎯' }]).slice(0, 4).map((item, index) => (<div className="small-achievement exact-small-achievement" key={index}><span>{item.icon || '🏆'}</span><div><strong>{item.name}</strong><p>{item.description}</p></div></div>))}</div></section>
            </div>
          </div>
        </div>
        <aside className="profile-team-column wider-team-column" style={{ marginTop: "56px" }}>
          <section className="glass-card exact-card profile-team-list-card profile-team-panel clickable-card" role="button" onClick={() => profile.team_id && navigate(`/teams/${profile.team_id}`)}>
            <div className="panel-head exact-panel-head profile-team-panel-head"><h3>{profile.team?.name || profile.team_detail?.name || 'Команда'}</h3><span>Открыть страницу команды</span></div>
            <div className="person-list compact-list">{teamMembers.map((item, index) => (<div className="person-row exact-person-row" key={item.id || index}><div className="person-row-main"><div className="person-avatar exact-avatar">{item.name?.[0] || 'V'}</div><div><strong>{item.name}</strong><p>{item.city || 'Участник'}</p></div></div><div className="person-score"><span className={`role-pill ${profile.team_detail?.leader_id === item.id ? 'leader' : ''}`}>{profile.team_detail?.leader_id === item.id ? 'Лидер' : 'Участник'}</span><strong>{item.rating || 0}</strong></div></div>))}</div>
          </section>
        </aside>
      </section>

      <section className="events-split-grid profile-events-split">
        <section className="glass-card exact-card"><div className="panel-head exact-panel-head"><h3>Мои мероприятия</h3><span>только те, на которые вы записаны</span></div><div className="event-classic-grid">{mineEvents.map((event) => <EventCard key={event.id} event={event} onClick={setSelectedEvent} variant="mine" />)}{!mineEvents.length && <div className="empty-note">Вы пока не записаны ни на одно мероприятие</div>}</div></section>
        <section className="glass-card exact-card"><div className="panel-head exact-panel-head"><h3>Можно записаться</h3><span>доступные для волонтёра события</span></div><div className="event-classic-grid">{availableEvents.map((event) => <EventCard key={event.id} event={event} onClick={setSelectedEvent} variant="available" />)}{!availableEvents.length && <div className="empty-note">Сейчас нет новых мероприятий</div>}</div></section>
      </section>

      {error && <div className="error-box">{error}</div>}
    </div>
  );
}
