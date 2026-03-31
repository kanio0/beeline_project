import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('coord@beeline.local');
  const [password, setPassword] = useState('coord12345');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      await login(email, password);
      navigate('/', { replace: true });
    } catch (err) {
      const message = err?.response?.data?.detail || err?.message || 'Ошибка входа. Проверь, что backend запущен.';
      setError(String(message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page luxe-login-page">
      <div className="login-card luxe-login-card">
        <div className="login-hero luxe-login-hero">
          <div className="brand brand-large login-brand">
            <div className="brand-orb" />
            <div>
              <h1>Beeline</h1>
              <p>Cyber Volunteers</p>
            </div>
          </div>
          <span className="chip">Координаторский штаб</span>
          <h2>Вход в систему управления кибер-волонтёрами</h2>
          <p>Рейтинги, команды, календарь встреч, достижения и контроль активности — в одном интерфейсе.</p>
          <div className="login-glow-panel">
            <div><strong>1000+</strong><span>пользователей</span></div>
            <div><strong>&lt; 2 сек</strong><span>время загрузки</span></div>
            <div><strong>24/7</strong><span>штаб онлайн</span></div>
          </div>
        </div>
        <form onSubmit={onSubmit} className="login-form luxe-form">
          <div className="panel-head"><h3>Авторизация</h3><span>через email demo</span></div>
          <label>Email
            <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label>Пароль
            <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          {error && <div className="error-box">{error}</div>}
          <button type="submit" className="primary-button big-button" disabled={loading}>{loading ? 'Входим…' : 'Войти в дашборд'}</button>
          <div className="demo-box luxe-demo-box">
            <strong>Демо-аккаунты</strong>
            <span>coord@beeline.local / coord12345</span>
            <span>volunteer@beeline.local / vol12345</span>
          </div>
        </form>
      </div>
    </div>
  );
}
