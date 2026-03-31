import { createContext, useContext, useMemo, useState } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUserState] = useState(JSON.parse(localStorage.getItem('user') || 'null'));

  const setUser = (nextUser) => {
    setUserState(nextUser);
    localStorage.setItem('user', JSON.stringify(nextUser));
  };

  const login = async (email, password) => {
    const payload = { email: String(email || '').trim(), password: String(password || '') };
    const { data } = await api.post('/auth/login', payload, {
      headers: { 'Content-Type': 'application/json' },
    });

    if (!data?.access_token || !data?.user) {
      throw new Error('Сервер вернул неполный ответ авторизации');
    }

    setToken(data.access_token);
    setUser(data.user);
    localStorage.setItem('token', data.access_token);
    return data.user;
  };

  const logout = () => {
    setToken(null);
    setUserState(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const value = useMemo(() => ({ token, user, login, logout, setUser }), [token, user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
