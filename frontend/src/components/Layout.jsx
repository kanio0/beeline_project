import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Layout({ children }) {
  const { logout } = useAuth();
  const items = [
    ['/', 'Дашборд'],
    ['/volunteers', 'Волонтёры'],
    ['/events', 'События'],
    ['/teams', 'Команды'],
    ['/profile', 'Кабинет'],
  ];

  return (
    <div className="app-frame beeline-frame">
      <div className="frame-noise" />
      <header className="topbar exact-topbar">
        <div className="brand beeline-brand">
          <div className="brand-orb" />
          <div>
            <h1>Beeline</h1>
            <p>Cyber Volunteers</p>
          </div>
        </div>

        <nav className="topnav exact-topnav">
          {items.map(([href, label]) => (
            <NavLink key={href} to={href} end className={({ isActive }) => `topnav-link ${isActive ? 'active' : ''}`}>
              {label}
            </NavLink>
          ))}
          <button className="topnav-link topnav-logout" onClick={logout}>Выйти</button>
        </nav>
      </header>

      <main className="page-shell exact-shell">{children}</main>
    </div>
  );
}
