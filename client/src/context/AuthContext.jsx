import { createContext, useContext, useEffect, useState } from 'react';
import axiosInstance from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // true on first mount while we verify token

  // On mount: if a token is stored, verify it and restore session
  useEffect(() => {
    const token = localStorage.getItem('ay_token');
    if (token) {
      axiosInstance
        .get('/auth/me')
        .then((res) => setUser(res.data.user))
        .catch(() => {
          // Token is invalid or expired — clear it
          localStorage.removeItem('ay_token');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const res = await axiosInstance.post('/auth/login', { email, password });
    localStorage.setItem('ay_token', res.data.token);
    setUser(res.data.user);
    return res.data;
  };

  const signup = async (name, email, password) => {
    const res = await axiosInstance.post('/auth/signup', { name, email, password });
    localStorage.setItem('ay_token', res.data.token);
    setUser(res.data.user);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('ay_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};
