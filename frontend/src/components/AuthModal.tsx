import React, { useState } from 'react';
import { authApi } from '../api/client';
import { AuthUser } from '../types';

interface AuthModalProps {
  onAuth: (user: AuthUser) => void;
}

type Mode = 'login' | 'register';

export const AuthModal: React.FC<AuthModalProps> = ({ onAuth }) => {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response =
        mode === 'login'
          ? await authApi.login(email, password)
          : await authApi.register(email, password, name);

      if (response.data) {
        localStorage.setItem('token', response.data.token);
        onAuth(response.data.user);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px',
      }}
    >
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: '16px',
          padding: '32px',
          width: '100%',
          maxWidth: '400px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
      >
        <h2
          style={{
            margin: '0 0 4px',
            fontSize: '22px',
            fontWeight: 800,
            color: '#111827',
          }}
        >
          {mode === 'login' ? 'Sign In' : 'Create Account'}
        </h2>
        <p style={{ margin: '0 0 24px', fontSize: '14px', color: '#6b7280' }}>
          {mode === 'login'
            ? 'Sign in to reserve limited drops'
            : 'Create an account to get started'}
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {mode === 'register' && (
            <input
              type="text"
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              style={inputStyle}
            />
          )}
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={inputStyle}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            style={inputStyle}
          />

          {error && (
            <div
              style={{
                padding: '10px 12px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                fontSize: '13px',
                color: '#dc2626',
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '14px',
              backgroundColor: loading ? '#d1d5db' : '#111827',
              color: loading ? '#9ca3af' : '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: '4px',
            }}
          >
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <p style={{ margin: '16px 0 0', textAlign: 'center', fontSize: '13px', color: '#6b7280' }}>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login');
              setError(null);
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#111827',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: '13px',
              padding: 0,
              textDecoration: 'underline',
            }}
          >
            {mode === 'login' ? 'Register' : 'Sign In'}
          </button>
        </p>
      </div>
    </div>
  );
};

const inputStyle: React.CSSProperties = {
  padding: '12px 14px',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  fontSize: '15px',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
};
