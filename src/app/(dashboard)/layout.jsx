"use client";

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { User, LogOut, Menu, X } from 'lucide-react';
import { logoutAction } from '../actions';

function getPayloadFromToken(token) {
  try {
    const [payload] = token.split('.');
    return JSON.parse(atob(payload));
  } catch (error) {
    console.error('Failed to read payload from token:', error);
    return {};
  }
}

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [token, setToken] = useState(null);
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState('user');
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem('ureka_token');
    if (!t) {
      router.push('/');
    } else {
      setToken(t);
      const payload = getPayloadFromToken(t);
      setUserEmail(payload.email || '');
      setUserRole(payload.role || 'user');
    }
  }, [router]);

  if (!token) {
    return null; // Prevent flash of header content
  }

  const handleLogout = async () => {
    localStorage.removeItem('ureka_token');
    await logoutAction();
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
          HUNAMEDIA
        </div>

        {/* Navigation Links */}
        <nav className={`nav-links ${menuOpen ? 'open' : ''}`}>
          {userRole !== 'admin' ? (
            <>
              <Link 
                href="/dashboard"
                className={`nav-item ${pathname === '/dashboard' ? 'active' : ''}`}
                onClick={() => setMenuOpen(false)}
              >
                Dashboard
              </Link>
              <Link 
                href="/reports-builder"
                className={`nav-item ${pathname === '/reports-builder' ? 'active' : ''}`}
                onClick={() => setMenuOpen(false)}
              >
                Reports Builder
              </Link>
              <Link 
                href="/payouts"
                className={`nav-item ${pathname === '/payouts' ? 'active' : ''}`}
                onClick={() => setMenuOpen(false)}
              >
                Payouts
              </Link>
            </>
          ) : (
            <Link 
              href="/admin/payouts"
              className={`nav-item ${pathname === '/admin/payouts' ? 'active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              Admin Payouts
            </Link>
          )}
          <Link 
            href="/account"
            className={`nav-item ${pathname === '/account' ? 'active' : ''}`}
            onClick={() => setMenuOpen(false)}
          >
            Account
          </Link>
        </nav>

        <div className="user-profile" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span>{userEmail || 'User'}</span>
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

      {children}
    </div>
  );
}
