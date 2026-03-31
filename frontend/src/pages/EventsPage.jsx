import { useEffect, useMemo, useState } from 'react';
import api from '../api/client';
import MonthBoard from '../components/MonthBoard';
import { useAuth } from '../contexts/AuthContext';

const baseRoles = ['лектор', 'ведущий', 'помощник', 'модератор', 'координатор', 'фотограф', 'регистратор'];
const eventTypeOptions = ['мероприятие', 'мастер-класс', 'организационная помощь'];
const initialForm = {
  title: '', description: '', city: '', event_type: 'мероприятие', status: 'planned', starts_at: '', base_coins: 50, audience_size: 30, quality: 'base', required_roles: ['лектор'],
};

function toIso(value) {
  return value ? new Date(value).toISOString() : new Date().toISOString();
}

function EventModal({ event, onClose, onRefresh, allowEdit = true }) {
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

  const reports = details?.photo_reports || [];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="glass-card exact-card event-modal polished-modal" onClick={(e) => e.stopPropagation()}>
        <div className="panel-head"><h3>{details?.title || event.title}</h3><button className="ghost-button slim" type="button" onClick={onClose}>Закрыть</button></div>
        <div className="event-modal-meta">
          <span className="chip yellow">{details?.event_type || event.event_type}</span>
          <span>{details?.city || event.city || 'Онлайн'}</span>
          <span>{new Date(details?.starts_at || event.starts_at).toLocaleString('ru-RU')}</span>
        </div>
        <p className="event-modal-description">{details?.description || 'Описание скоро появится.'}</p>

        <div className="event-modal-actions-row">
          <label className="modal-role-picker">Роль<select value={role} onChange={(e) => setRole(e.target.value)}>{(details?.required_roles?.length ? details.required_roles : baseRoles).map((r) => <option key={r} value={r}>{r}</option>)}</select></label>
          {!details?.is_registered ? (
            <button className="primary-button" type="button" onClick={join}>Записаться</button>
          ) : allowEdit && (
            <>
              <button className="ghost-button" type="button" onClick={updateRole}>Сменить роль</button>
              <button className="ghost-button danger-button" type="button" onClick={cancel}>Отменить запись</button>
            </>
          )}
          <a className="ghost-button" href={`http://localhost:8000/api/events/${event.id}/ics`} target="_blank" rel="noreferrer">В календарь</a>
        </div>

        <div className="event-detail-grid profile-event-grid">
          <div className="event-detail-block">
            <h4>Участники</h4>
            <div className="mini-list">{(details?.participants || []).map((item) => <div key={item.id}>{item.name} · {item.role}</div>)}</div>
          </div>
          <div className="event-detail-block">
            <h4>Фотоотчёты</h4>
            <div className="photo-report-grid">
              {reports.map((report) => (
                <button className="photo-card photo-card-button" key={report.id} type="button" onClick={() => setPreview(report)}>
                  <img src={`http://localhost:8000${report.image_url}`} alt={report.comment || 'Фотоотчёт'} />
                  <strong>{report.user_name || 'Участник'}</strong>
                  <p>{report.comment || 'Без комментария'}</p>
                </button>
              ))}
              {!reports.length && <div className="empty-note">Пока нет фотоотчётов</div>}
            </div>
          </div>
        </div>

        {details?.is_registered && (
          <form className="photo-upload-form" onSubmit={uploadReport}>
            <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            <input placeholder="Комментарий к фотоотчёту" value={comment} onChange={(e) => setComment(e.target.value)} />
            <button className="primary-button" type="submit">Добавить фотоотчёт</button>
          </form>
        )}
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

function EventCard({ event, onOpen, registered = false }) {
  return (
    <button className={`event-classic-card ${registered ? 'registered' : ''}`} type="button" onClick={() => onOpen(event)}>
      <div className="event-classic-top">
        <span className="chip yellow">{event.event_type}</span>
        <span className={`status-pill ${event.status === 'completed' ? 'completed' : 'planned'}`}>{event.status === 'completed' ? 'проведено' : 'запланировано'}</span>
      </div>
      <strong>{event.title}</strong>
      <p>{event.description || 'Описание появится после заполнения карточки события.'}</p>
      <div className="event-classic-meta"><span>{event.city || 'Онлайн'}</span><span>{new Date(event.starts_at).toLocaleString('ru-RU')}</span></div>
      <div className="event-classic-meta"><span>Участники: {event.participants_count}</span><span>{registered ? `Моя роль: ${event.my_role || '—'}` : `Требуются: ${(event.required_roles || []).slice(0, 2).join(', ') || 'волонтёры'}`}</span></div>
    </button>
  );
}

export default function EventsPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [mine, setMine] = useState([]);
  const [available, setAvailable] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState('');
  const [filter, setFilter] = useState('');
  const [allRoles, setAllRoles] = useState(baseRoles);
  const [customRole, setCustomRole] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);

  const loadEvents = async () => {
    const [allRes, mineRes, availableRes] = await Promise.all([
      api.get('/events'),
      api.get('/events?mine=true'),
      api.get('/events?available=true'),
    ]);
    setEvents(allRes.data);
    setMine(mineRes.data);
    setAvailable(availableRes.data);
  };

  useEffect(() => { loadEvents(); }, []);

  const filteredMine = useMemo(() => mine.filter((item) => !filter || item.event_type === filter), [mine, filter]);
  const filteredAvailable = useMemo(() => available.filter((item) => !filter || item.event_type === filter), [available, filter]);
  const planned = events.filter((item) => item.status === 'planned').length;
  const completed = events.filter((item) => item.status === 'completed').length;

  const toggleRole = (role) => setForm((prev) => ({ ...prev, required_roles: prev.required_roles.includes(role) ? prev.required_roles.filter((item) => item !== role) : [...prev.required_roles, role] }));
  const addCustomRole = () => {
    const value = customRole.trim().toLowerCase();
    if (!value) return;
    if (!allRoles.includes(value)) setAllRoles((prev) => [...prev, value]);
    if (!form.required_roles.includes(value)) setForm((prev) => ({ ...prev, required_roles: [...prev.required_roles, value] }));
    setCustomRole('');
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/events', { ...form, starts_at: toIso(form.starts_at), ends_at: toIso(form.starts_at), base_coins: Number(form.base_coins), audience_size: Number(form.audience_size) });
      setMessage('Событие добавлено');
      setForm(initialForm);
      await loadEvents();
    } catch (error) {
      setMessage(error?.response?.data?.detail || 'Не удалось создать событие');
    }
  };

  return (
    <div className="page-stack exact-events-page">
      {selectedEvent && <EventModal event={selectedEvent} onClose={() => setSelectedEvent(null)} onRefresh={loadEvents} />}
      <section className="events-stage-grid wider-event-stage-grid">
        {user?.role === 'organizer' && (
          <div className="glass-card exact-card exact-event-form-card expanded-event-form-card">
            <div className="panel-head exact-panel-head"><h3>Создать событие</h3></div>
            <form className="event-form-grid exact-event-form" onSubmit={handleCreate}>
              <label>Название<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></label>
              <label>Город<input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></label>
              <label>Тип<select value={form.event_type} onChange={(e) => setForm({ ...form, event_type: e.target.value })}>{eventTypeOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
              <label>Статус<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="planned">Запланировано</option><option value="completed">Проведено</option></select></label>
              <label>Дата и время<input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} required /></label>
              <label>Коины<input type="number" value={form.base_coins} onChange={(e) => setForm({ ...form, base_coins: e.target.value })} /></label>
              <label>План аудитории<input type="number" value={form.audience_size} onChange={(e) => setForm({ ...form, audience_size: e.target.value })} /></label>
              <label>Качество<select value={form.quality} onChange={(e) => setForm({ ...form, quality: e.target.value })}><option value="base">Базовое</option><option value="photo">С фото</option><option value="high">Высокое</option></select></label>
              <label className="col-span-2">Описание<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} /></label>
              <div className="col-span-2">
                <span className="field-label">Требуемые роли</span>
                <div className="role-chip-row editor-row">{allRoles.map((role) => <button key={role} type="button" className={`role-select-chip ${form.required_roles.includes(role) ? 'selected' : ''}`} onClick={() => toggleRole(role)}>{role}</button>)}</div>
                <div className="custom-role-row"><input value={customRole} onChange={(e) => setCustomRole(e.target.value)} placeholder="Добавить свою роль" /><button type="button" className="ghost-button" onClick={addCustomRole}>Добавить роль</button></div>
              </div>
              <div className="col-span-2 form-actions"><button className="primary-button exact-primary-button" type="submit">Добавить событие</button>{message && <span className="inline-message">{message}</span>}</div>
            </form>
          </div>
        )}

        <aside className="events-right-column">
          <section className="glass-card exact-card compact-kpi-card">
            <div className="panel-head exact-panel-head"><h3>Показатели</h3><span>по событиям</span></div>
            <div className="kpi-list exact-kpi-list"><div><span>Запланировано</span><strong>{planned}</strong></div><div><span>Проведено</span><strong>{completed}</strong></div><div><span>Мои события</span><strong>{filteredMine.length}</strong></div></div>
            <select value={filter} onChange={(e) => setFilter(e.target.value)}><option value="">Все типы</option>{eventTypeOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          </section>
          <section className="glass-card exact-card compact-calendar-card"><MonthBoard events={filteredMine} compact onEventClick={setSelectedEvent} /></section>
        </aside>
      </section>

      <section className="events-split-grid">
        <section className="glass-card exact-card">
          <div className="panel-head exact-panel-head"><h3>Мои мероприятия</h3><span>только те, на которые вы записаны</span></div>
          <div className="event-classic-grid">{filteredMine.map((event) => <EventCard key={event.id} event={event} onOpen={setSelectedEvent} registered />)}{!filteredMine.length && <div className="empty-note">Пока нет записанных мероприятий</div>}</div>
        </section>
        <section className="glass-card exact-card">
          <div className="panel-head exact-panel-head"><h3>Доступные мероприятия</h3><span>сюда можно записаться</span></div>
          <div className="event-classic-grid">{filteredAvailable.map((event) => <EventCard key={event.id} event={event} onOpen={setSelectedEvent} />)}{!filteredAvailable.length && <div className="empty-note">Нет доступных мероприятий</div>}</div>
        </section>
      </section>
    </div>
  );
}
