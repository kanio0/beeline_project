function normalize(items) {
  if (!items?.length) return [];
  const [first, second, third] = items;
  return [second, first, third].filter(Boolean);
}

export default function Podium({ items = [] }) {
  const ordered = normalize(items);

  return (
    <div className="podium deluxe-podium">
      {ordered.map((item, idx) => {
        const place = idx === 1 ? 1 : idx === 0 ? 2 : 3;
        return (
          <div className={`podium-card deluxe-card place-${place}`} key={item.id}>
            <div className="place-pill">#{place}</div>
            <div className="podium-avatar">{item.name?.[0] || 'V'}</div>
            <h4>{item.name}</h4>
            <p>{item.team || 'Без команды'}</p>
            <strong>{item.rating}</strong>
            <span>{item.coins} коинов</span>
          </div>
        );
      })}
    </div>
  );
}
