"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { loginAction } from '../app/actions';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // If already logged in, skip Login page
  useEffect(() => {
    const token = localStorage.getItem('ureka_token');
    if (token) {
      router.push('/dashboard');
    }
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await loginAction(email, password);

      if (res.success) {
        localStorage.setItem('ureka_token', res.token);
        router.push('/dashboard');
      } else {
        setError(res.error);
      }
    } catch (err) {
      setError('A connection error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card" style={{ maxWidth: '400px', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
          <img src="/favicon.svg" alt="Ureka Logo" style={{ height: '48px', width: '48px', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
        </div>
        
        <h2 className="login-title" style={{ textAlign: 'center', fontSize: '1.5rem', marginBottom: '8px' }}>
          Sign in to HUNAMEDIA
        </h2>
        
        <p className="login-subtitle" style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '24px' }}>
          Welcome back! Please enter your details.
        </p>

        {error && <div className="login-error" style={{ marginBottom: '16px' }}>{error}</div>}

        <form onSubmit={handleSubmit} className="login-form" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group">
            <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px', display: 'block' }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              disabled={loading}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
          </div>
          
          <div className="form-group">
            <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px', display: 'block' }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              disabled={loading}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
          </div>

          <button 
            type="submit" 
            className="login-btn" 
            disabled={loading}
            style={{ 
              width: '100%', 
              padding: '10px', 
              background: 'var(--color-accent)', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px', 
              fontWeight: 600, 
              cursor: 'pointer',
              marginTop: '8px'
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
