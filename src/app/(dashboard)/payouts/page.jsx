"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Info } from 'lucide-react';
import { getUserProfileAction, getUserPayoutsAction } from '../../actions';

export default function PayoutsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [payouts, setPayouts] = useState([]);

  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [profileRes, payoutsRes] = await Promise.all([
        getUserProfileAction(),
        getUserPayoutsAction()
      ]);

      if (!profileRes.status) throw new Error(profileRes.error || 'Failed to fetch profile');
      if (!payoutsRes.status) throw new Error(payoutsRes.error || 'Failed to fetch payouts');

      setPayouts(payoutsRes.payouts || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
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
        Dashboard / <span className="active">Payouts</span>
      </div>

      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div className="page-title">Payouts Management</div>
      </div>

      {error && <div className="login-error" style={{ marginBottom: '20px' }}>{error}</div>}

      {loading ? (
        <div className="loading-screen" style={{ minHeight: '300px' }}>
          <div className="spinner"></div>
          <p>Loading payouts data...</p>
        </div>
      ) : (
        <div className="bottom-grid" style={{ gridTemplateColumns: '1fr', gap: '24px' }}>
          {/* Payment Schedule Notice */}
          <div style={{ background: '#e3f2fd', border: '1px solid #bbdefb', borderRadius: '8px', padding: '16px' }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#0277bd', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Info size={18} /> Payment Schedule
            </h4>
            <p style={{ margin: 0, color: '#01579b', fontSize: '0.95rem', lineHeight: '1.5' }}>
              All payments are issued once a month according to the NET 30 payment terms. This means that this month you will get paid for earnings from last month. Once issued, payment may take up to 3 business days to arrive. Weekends and holidays do not count as business days.
            </p>
          </div>

          {/* Payouts History Table */}
          <div className="chart-section">
            <div className="chart-header" style={{ padding: '20px 20px 0' }}>Payout History</div>
            <div style={{ overflowX: 'auto', padding: '20px' }}>
              <table className="data-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Request date</th>
                    <th>Site Name</th>
                    <th>Billing Period</th>
                    <th>Status</th>
                    <th>Request sum</th>
                    <th>Payout date</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: '#888' }}>
                        No payouts found.
                      </td>
                    </tr>
                  ) : (
                    payouts.map((p) => (
                      <tr key={p.id}>
                        <td>{formatDate(p.createdAt)}</td>
                        <td>{p.siteName}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          {p.startDate && p.endDate ? `${formatDate(p.startDate)} - ${formatDate(p.endDate)}` : 'N/A'}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {p.status}
                            <Info size={14} color="#0277bd" />
                          </div>
                        </td>
                        <td>${p.requestSum.toFixed(2)}</td>
                        <td>{formatDate(p.payoutDate)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
