import React, { useState } from 'react';
import { DropPage } from './pages/DropPage';
import { AuthModal } from './components/AuthModal';
import { AuthUser } from './types';

const App: React.FC = () => {
  // Check if a token already exists in localStorage (returning user)
  const [user, setUser] = useState<AuthUser | null>(() => {
    const token = localStorage.getItem('token');
    if (!token) return null;
    // Decode the payload (no verification — server verifies on each request)
    try {
      const payload = JSON.parse(atob(token.split('.')[1]!));
      // Check token expiry
      if (payload.exp && Date.now() / 1000 > payload.exp) {
        localStorage.removeItem('token');
        return null;
      }
      return { id: payload.id, email: payload.email, name: payload.name ?? payload.email };
    } catch {
      localStorage.removeItem('token');
      return null;
    }
  });

  const handleAuth = (authUser: AuthUser): void => {
    setUser(authUser);
  };

  const handleLogout = (): void => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <>
      {!user && <AuthModal onAuth={handleAuth} />}
      <DropPage user={user} onLogout={handleLogout} />
    </>
  );
};

export default App;
