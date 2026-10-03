import React, { createContext, useState, useEffect } from 'react';
import api from '../services/api';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('aegis_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (err) {
      console.error('Failed to parse saved user:', err);
      return null;
    }
  });

  const [token, setToken] = useState(() => localStorage.getItem('aegis_token') || null);
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!token && !!user);
  const [loading, setLoading] = useState(true);

  // Validate stored session with backend on initial load
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('aegis_token');
      const storedUser = localStorage.getItem('aegis_user');

      if (storedToken && storedUser) {
        try {
          // Verify token validity with backend /auth/me
          const response = await api.get('/auth/me');
          if (response.data && response.data.success) {
            setUser(response.data.user);
            setToken(storedToken);
            setIsAuthenticated(true);
            localStorage.setItem('aegis_user', JSON.stringify(response.data.user));
          } else {
            clearSession();
          }
        } catch (err) {
          console.warn('Backend session verification failed, clearing invalid token:', err.message);
          clearSession();
        }
      } else {
        clearSession();
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const clearSession = () => {
    localStorage.removeItem('aegis_token');
    localStorage.removeItem('aegis_user');
    setUser(null);
    setToken(null);
    setIsAuthenticated(false);
  };

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', {
        email: email.trim(),
        password: password.trim(),
      });

      if (response.data && response.data.success) {
        const { token: newToken, user: newUser } = response.data;

        localStorage.setItem('aegis_token', newToken);
        localStorage.setItem('aegis_user', JSON.stringify(newUser));

        setToken(newToken);
        setUser(newUser);
        setIsAuthenticated(true);

        return { success: true };
      }

      return {
        success: false,
        message: response.data?.message || 'Invalid email or password.',
      };
    } catch (error) {
      let message =
        error.response?.data?.message ||
        error.message;
      
      if (error.code === 'ERR_NETWORK' || message === 'Network Error') {
        message = 'Network Error: Backend server is unreachable or offline. Please verify database connection and server status.';
      } else if (!message) {
        message = 'Unable to connect to the authentication server.';
      }
      
      clearSession();
      return { success: false, message };
    }
  };

  const logout = () => {
    clearSession();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
