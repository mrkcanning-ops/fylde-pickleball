'use client';

import { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userType, setUserType] = useState(null); // 'club-member', 'guest', or null
  const [isLoading, setIsLoading] = useState(true);

  // Load session from sessionStorage on mount
  useEffect(() => {
    const storedSession = sessionStorage.getItem('fylde-pickleball-session');
    if (storedSession) {
      try {
        const session = JSON.parse(storedSession);
        setUser(session.user);
        setUserType(session.userType);
      } catch (e) {
        console.error('Failed to restore session:', e);
      }
    }
    setIsLoading(false);
  }, []);

  const loginClubMember = (username, password) => {
    return fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
      .then((res) => {
        if (!res.ok) {
          return res.json().then((err) => Promise.reject(err));
        }
        return res.json();
      })
      .then((data) => {
        const session = { user: data.user, userType: 'club-member' };
        sessionStorage.setItem('fylde-pickleball-session', JSON.stringify(session));
        setUser(data.user);
        setUserType('club-member');
        return data.user;
      });
  };

  const signupClubMember = (username, password) => {
    return fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
      .then((res) => {
        if (!res.ok) {
          return res.json().then((err) => Promise.reject(err));
        }
        return res.json();
      })
      .then((data) => {
        const session = { user: data.user, userType: 'club-member' };
        sessionStorage.setItem('fylde-pickleball-session', JSON.stringify(session));
        setUser(data.user);
        setUserType('club-member');
        return data.user;
      });
  };

  const loginAsGuest = () => {
    const guestId = `guest-${Date.now()}`;
    const session = { user: { id: guestId, username: 'Guest' }, userType: 'guest' };
    sessionStorage.setItem('fylde-pickleball-session', JSON.stringify(session));
    setUser(session.user);
    setUserType('guest');
  };

  const logout = () => {
    sessionStorage.removeItem('fylde-pickleball-session');
    setUser(null);
    setUserType(null);
  };

  const convertGuestToMember = (username, password) => {
    // Convert existing guest data to club member data before logging in as member
    return signupClubMember(username, password);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userType,
        isLoading,
        loginClubMember,
        signupClubMember,
        loginAsGuest,
        logout,
        convertGuestToMember,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
