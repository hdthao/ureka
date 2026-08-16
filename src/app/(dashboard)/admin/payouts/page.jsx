"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, Info, Loader2 } from 'lucide-react';
import { getAllPayoutsAdminAction, markPayoutPaidAction, getUserProfileAction } from '../../../actions';

export default function AdminPayoutsPage() {
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null); // stores ID of payout being processed
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [payouts, setPayouts] = useState([]);

  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const profileRes = await getUserProfileAction();
      if (!profileRes.status) throw new Error(profileRes.error || 'Failed to fetch profile');
      if (profileRes.user.role !== 'admin') {
        router.push('/dashboard');
        return;
      }

      const payoutsRes = await getAllPayoutsAdminAction();
      if (!payoutsRes.status) throw new Error(payoutsRes.error || 'Failed to fetch payouts');

      setPayouts(payoutsRes.payouts || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkPaid = async (payoutId) => {
    try {
      setActionLoading(payoutId);
      setError(null);
      setSuccessMsg(null);

      const res = await markPayoutPaidAction(payoutId);
      if (!res.status) throw new Error(res.error || 'Failed to mark as paid');

      setSuccessMsg('Payout marked as paid successfully.');
      setTimeout(() => setSuccessMsg(null), 3000);
      
      // Refresh payouts list
      await fetchData();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB'); // dd/mm/yyyy
  };

  return (
    <div className="main-content">
      <div className="breadcrumb">
        Admin / <span className="active">Manage Payouts</span>
      </div>

      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div className="page-title">Admin Payouts Management</div>
      </div>

      {error && <div className="login-error" style={{ marginBottom: '20px' }}>{error}</div>}
      {successMsg && <div style={{ background: '#d4edda', color: '#155724', padding: '12px', borderRadius: '4px', marginBottom: '20px', border: '1px solid #c3e6cb' }}>{successMsg}</div>}

      {loading ? (
        <div className="loading-screen" style={{ minHeight: '300px' }}>
          <div className="spinner"></div>
          <p>Loading payouts data...</p>
        </div>
      ) : (
        <div className="bottom-grid" style={{ gridTemplateColumns: '1fr', gap: '24px' }}>
          {payouts.length === 0 ? (
            <div className="chart-section" style={{ padding: '32px', textAlign: 'center', color: '#888' }}>
              No payouts found.
            </div>
          ) : (
            Object.entries(
              payouts.reduce((acc, p) => {
                const site = p.siteName || 'N/A';
                if (!acc[site]) acc[site] = [];
                acc[site].push(p);
                return acc;
              }, {})
            ).map(([siteName, sitePayouts]) => (
              <div key={siteName} className="chart-section" style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid #eaeaea', background: 'white' }}>
                <div style={{ padding: '16px 20px', background: '#f8f9fa', borderBottom: '1px solid #eaeaea', display: 'flex', alignItems: 'center', gap: '8px' }}>
                   <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e3f2fd', color: '#1976d2', width: '32px', height: '32px', borderRadius: '6px' }}>
                     <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                   </div>
                   <div style={{ color: '#333', fontWeight: 600, fontSize: '1.1rem' }}>
                     {siteName}
                   </div>
                </div>
                <div style={{ overflowX: 'auto', padding: '20px' }}>
                  <table className="data-table" style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <th>Request date</th>
                        <th>User Email</th>
                        <th>Status</th>
                        <th>Request sum</th>
                        <th>Payment method</th>
                        <th>Payout date</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sitePayouts.map((p) => (
                        <tr key={p.id}>
                          <td>{formatDate(p.createdAt)}</td>
                          <td>{p.userEmail}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {p.status}
                              <Info size={14} color={p.status === 'Paid' ? '#388e3c' : '#0277bd'} />
                            </div>
                          </td>
                          <td>${p.requestSum.toFixed(2)}</td>
                          <td style={{ maxWidth: '300px', wordBreak: 'break-all' }}>{p.paymentMethod}</td>
                          <td>{formatDate(p.payoutDate)}</td>
                          <td style={{ textAlign: 'right' }}>
                            {p.status === 'Pending' && (
                              <button
                                onClick={() => handleMarkPaid(p.id)}
                                disabled={actionLoading === p.id}
                                style={{
                                  padding: '6px 12px', background: '#2e7d32', color: 'white', border: 'none',
                                  borderRadius: '4px', cursor: 'pointer', fontWeight: 600, display: 'inline-flex',
                                  alignItems: 'center', gap: '6px'
                                }}
                              >
                                {actionLoading === p.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                                Mark as Paid
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
