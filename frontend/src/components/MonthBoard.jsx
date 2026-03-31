import { useEffect, useMemo, useState } from 'react';

const WEEK_DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const MONTHS = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];

function normalizeDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateKeyLocal(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function buildCalendar(events, visibleMonth) {
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const monthLabel = `${MONTHS[month]} ${year} г.`;
  const first = new Date(year, month, 1);
  const firstDay = (first.getDay() + 6) % 7;
  const gridStart = new Date(year, month, 1 - firstDay);

  const days = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    const key = dateKeyLocal(date);
    const dayEvents = events.filter((event) => {
      const eventDate = normalizeDate(event.starts_at);
      return eventDate ? dateKeyLocal(eventDate) === key : false;
    });
    const today = new Date();
    return {
      key,
      date,
      inMonth: date.getMonth() === month,
      isToday: date.toDateString() === today.toDateString(),
      events: dayEvents,
    };
  });

  return { days, monthLabel };
}

export default function MonthBoard({ events = [], compact = false, onEventClick = null }) {
  const initialMonth = useMemo(() => startOfMonth(normalizeDate(events[0]?.starts_at) || new Date()), [events]);
  const [visibleMonth, setVisibleMonth] = useState(initialMonth);

  useEffect(() => {
    setVisibleMonth(initialMonth);
  }, [initialMonth]);

  const { days, monthLabel } = useMemo(() => buildCalendar(events, visibleMonth), [events, visibleMonth]);

  return (
    <div className={`month-board exact-month-board elevated-calendar ${compact ? 'compact' : ''}`}>
      <div className="month-board-head">
        <div className="month-board-title-wrap">
          <span className="calendar-tag">Календарь встреч</span>
          <h3>{monthLabel}</h3>
        </div>
        <div className="month-board-actions">
          <button type="button" aria-label="Предыдущий месяц" onClick={() => setVisibleMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}>‹</button>
          <button type="button" aria-label="Следующий месяц" onClick={() => setVisibleMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}>›</button>
          <button type="button" className="today-button" onClick={() => setVisibleMonth(startOfMonth(new Date()))}>today</button>
        </div>
      </div>
      <div className="month-board-grid month-board-weekdays">
        {WEEK_DAYS.map((day) => <div key={day}>{day}</div>)}
      </div>
      <div className="month-board-grid month-board-days refined-calendar-grid">
        {days.map((day) => (
          <div key={day.key} className={`month-cell refined-month-cell ${day.inMonth ? '' : 'muted-day'} ${day.isToday ? 'focus-day' : ''}`}>
            <div className="month-cell-num">{day.date.getDate()}</div>
            <div className="month-cell-events">
              {day.events.slice(0, compact ? 2 : 3).map((event, index) => (
                <button
                  key={event.id || `${day.key}-${index}`}
                  type="button"
                  className="event-chip clickable-event-chip"
                  title={event.title}
                  onClick={() => onEventClick?.(event)}
                >
                  <span className="event-chip-text">{event.title}</span>
                  <span className="event-chip-tooltip">{event.title}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
