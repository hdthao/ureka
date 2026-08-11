"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, LogOut, Menu, X } from 'lucide-react';
import Dashboard from '../../components/Dashboard';
import ReportsBuilder from '../../components/ReportsBuilder';

export default function DashboardPage() {
  const router = useRouter();
  const [token, setToken] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    const t = localStorage.getItem('ureka_token');
    if (!t) {
      router.push('/');
    } else {
      setToken(t);
    }
  }, [router]);

  if (!token) {
    return null; // Prevent flash of header content
  }

  const handleLogout = () => {
    localStorage.removeItem('ureka_token');
    router.push('/');
  };

  return (
    <div className="app-container">
      <header className="header">
        {/* Mobile Menu Toggle Button */}
        <button 
          className="menu-toggle-btn"
          onClick={() => setMenuOpen(!menuOpen)}
          title="Toggle Menu"
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <div className="brand">
          <img src="/favicon.svg" alt="Ureka Logo" style={{ height: '28px', width: '28px', borderRadius: '6px' }} />
          SSP
        </div>

        {/* Navigation Links */}
        <nav className={`nav-links ${menuOpen ? 'open' : ''}`}>
          <a 
            href="#" 
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => { setActiveTab('dashboard'); setMenuOpen(false); }}
          >
            Dashboard
          </a>
          <a 
            href="#" 
            className={`nav-item ${activeTab === 'reports-builder' ? 'active' : ''}`}
            onClick={() => { setActiveTab('reports-builder'); setMenuOpen(false); }}
          >
            Reports Builder
          </a>
        </nav>

        <div className="user-profile">
          <span>Hoangnam Social 2</span>
          <div className="avatar">
            <User size={18} />
          </div>
          <button 
            onClick={handleLogout} 
            title="Logout"
            style={{ 
              background: '#e53935', 
              border: 'none', 
              color: '#ffffff', 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              marginLeft: '16px',
              padding: '6px 12px',
              borderRadius: '4px',
              fontSize: '0.85rem',
              fontWeight: '600',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#b71c1c'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#e53935'}
          >
            <LogOut size={14} />
            Logout
          </button>
        </div>
      </header>

      {activeTab === 'dashboard' ? <Dashboard /> : <ReportsBuilder />}
    </div>
  );
}
