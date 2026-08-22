"use client";

import { useState, useEffect } from 'react';
import { getDailySettingsAction, saveDailySettingAction, deleteDailySettingAction } from '../../../actions';
import { Loader2, Trash2, Plus, Save } from 'lucide-react';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [rpmInput, setRpmInput] = useState('');
  const [saving, setSaving] = useState(false);
  const todayStr = new Date().toLocaleDateString('en-CA');

  const fetchSettings = async () => {
    setLoading(true);
    const res = await getDailySettingsAction();
    if (res.status) {
      setSettings(res.data);
    } else {
      setError(res.error || 'Failed to load settings');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!rpmInput) return;
    
    setSaving(true);
    const res = await saveDailySettingAction(todayStr, parseFloat(rpmInput));
    if (res.status) {
      setRpmInput('');
      fetchSettings();
    } else {
      alert(res.error || 'Failed to save');
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this setting?')) return;
    const res = await deleteDailySettingAction(id);
    if (res.status) {
      fetchSettings();
    } else {
      alert(res.error || 'Failed to delete');
    }
  };

  return (
    <div className="main-content">
      <div className="breadcrumb" style={{ marginBottom: '24px' }}>
        Admin / <span className="active">RPM Settings</span>
      </div>

      <div className="dashboard-card" style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          Daily RPM Settings
        </h2>
        
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px', background: 'var(--color-bg-body)', padding: '24px', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--color-text-primary)' }}>Set Exact Target RPM for Today</h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
              This setting will take effect immediately for data generated on: <strong style={{ color: 'var(--color-accent)' }}>{todayStr}</strong>
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', fontWeight: 500 }}>Exact Target RPM</label>
              <input 
                type="number" 
                step="0.01"
                min="10"
                max="14.7"
                style={{ 
                  width: '100%', 
                  height: '44px', 
                  fontSize: '1rem',
                  padding: '0 16px',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  outline: 'none',
                  boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)',
                  transition: 'border-color 0.2s, box-shadow 0.2s'
                }}
                onFocus={(e) => { e.target.style.borderColor = 'var(--color-accent)'; e.target.style.boxShadow = '0 0 0 3px rgba(33, 150, 243, 0.15)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'var(--color-border)'; e.target.style.boxShadow = 'inset 0 1px 2px rgba(0,0,0,0.02)'; }}
                placeholder="e.g. 14.50"
                value={rpmInput}
                onChange={(e) => setRpmInput(e.target.value)}
                required
              />
            </div>
            <button 
              type="submit" 
              style={{ 
                height: '44px', 
                padding: '0 32px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                gap: '8px', 
                fontSize: '1rem',
                fontWeight: 600,
                backgroundColor: 'var(--color-accent)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.7 : 1,
                boxShadow: '0 4px 10px rgba(33, 150, 243, 0.25)',
                transition: 'transform 0.1s, box-shadow 0.1s, opacity 0.2s'
              }}
              onMouseDown={(e) => { if(!saving) e.currentTarget.style.transform = 'scale(0.97)'; }}
              onMouseUp={(e) => { if(!saving) e.currentTarget.style.transform = 'none'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; }}
              disabled={saving}
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              Save Setting
            </button>
          </div>
        </form>

        {error && <div style={{ color: 'red', marginBottom: '16px' }}>{error}</div>}

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <Loader2 className="animate-spin" size={32} style={{ color: 'var(--color-accent)' }} />
          </div>
        ) : settings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-muted)', background: 'var(--color-bg-body)', borderRadius: '8px' }}>
            No custom daily limits found. Default limits apply.
          </div>
        ) : (
          <div style={{ overflowX: 'auto', background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '0 12px 12px' }}>
            <table className="data-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Target RPM</th>
                  <th style={{ width: '80px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {settings.map(setting => (
                  <tr key={setting.id}>
                    <td>{setting.date}</td>
                    <td style={{ fontWeight: 600, color: 'var(--color-accent)' }}>{setting.rpmLimit.toFixed(2)}</td>
                    <td style={{ textAlign: 'center' }}>
                      {setting.date >= todayStr && (
                        <button 
                          onClick={() => handleDelete(setting.id)}
                          title="Delete setting"
                          style={{ background: 'none', border: 'none', color: '#ef5350', cursor: 'pointer', padding: '4px' }}
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
