"use client";

import { useState } from 'react';
import { changePasswordAction } from '../../actions';
import { Key } from 'lucide-react';

export default function AccountPage() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      setMessage('');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const res = await changePasswordAction(password);
      if (res.status) {
        setMessage('Password changed successfully.');
        setPassword('');
      } else {
        setError(res.error || 'Failed to change password.');
      }
    } catch (err) {
      setError('System error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="main-content">
      <div className="page-header">
        <h1 className="page-title">Account Settings</h1>
      </div>

      <div className="chart-section" style={{ maxWidth: '500px' }}>
        <div className="chart-header" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Key size={18} />
          Change Password
        </div>
        
        {message && (
          <div style={{ backgroundColor: '#e8f5e9', color: '#2e7d32', padding: '12px', borderRadius: '4px', marginBottom: '16px', fontSize: '0.85rem', fontWeight: '500' }}>
            {message}
          </div>
        )}
        
        {error && (
          <div className="login-error" style={{ marginBottom: '16px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleChangePassword} className="login-form">
          <div className="form-group">
            <label>New Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter new password (min 8 characters)"
              required
              minLength={8}
            />
          </div>
          
          <button 
            type="submit" 
            className="login-btn" 
            disabled={loading || password.length < 8}
            style={{ marginTop: '16px' }}
          >
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
