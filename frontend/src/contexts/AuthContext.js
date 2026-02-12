import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    // Set default auth header
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      // Verify token and get user info
      fetchUser();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchUser = async () => {
    try {
      const response = await api.get('/api/auth/me');
      setUser(response.data);
    } catch (error) {
      // Token invalid, clear it
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password, twoFactorCode = null) => {
    try {
      const params = new URLSearchParams();
      params.append('username', username);
      params.append('password', password);

      const response = await api.post('/api/auth/login', params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      const { access_token, user: userData, requires_2fa } = response.data;
      
      // If 2FA is required, return that info
      if (requires_2fa) {
        // Store temp token for 2FA verification
        setToken(access_token);
        api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
        return { success: false, requires_2fa: true, user: userData };
      }
      
      // If 2FA code provided, verify it
      if (twoFactorCode) {
        const verifyResponse = await api.post('/api/auth/verify-2fa', null, {
          params: { code: twoFactorCode },
        });
        const { access_token: final_token, user: finalUser } = verifyResponse.data;
        setToken(final_token);
        setUser(finalUser);
        localStorage.setItem('token', final_token);
        api.defaults.headers.common['Authorization'] = `Bearer ${final_token}`;
        return { success: true };
      }
      
      // Normal login
      setToken(access_token);
      setUser(userData);
      localStorage.setItem('token', access_token);
      api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Login failed',
      };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
    // Use window.location instead of navigate since we're outside Router
    window.location.href = '/login';
  };

  const isAdmin = () => {
    return user?.role === 'admin';
  };

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    isAdmin,
    fetchUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
