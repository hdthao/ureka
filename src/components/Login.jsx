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

  const handleLogin = async (e) => {
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
      setError('Đã xảy ra lỗi kết nối.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
          <img src="/favicon.svg" alt="Ureka Logo" style={{ height: '48px', width: '48px', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
        </div>
        <h2 className="login-title" style={{ textAlign: 'center' }}>Sign in to Report HUNAMEDIA</h2>
        <p className="login-subtitle" style={{ textAlign: 'center' }}>Welcome back! Please enter your details.</p>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
