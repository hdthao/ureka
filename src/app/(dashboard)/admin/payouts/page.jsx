"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, Info, Loader2, PlusCircle, Users, ChevronDown } from 'lucide-react';
import { getAllPayoutsAdminAction, markPayoutPaidAction, getUserProfileAction, getAllUsersAdminAction, calculateUserRevenueAdminAction, adminCreatePayoutAction } from '../../../actions';

export default function AdminPayoutsPage() {
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null); // stores ID of payout being processed
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [payouts, setPayouts] = useState([]);
  
  // Create Payout State
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [calculating, setCalculating] = useState(false);
  const [requestSum, setRequestSum] = useState('');
  const [sitesBreakdown, setSitesBreakdown] = useState([]);
  const [creating, setCreating] = useState(false);

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

      const [payoutsRes, usersRes] = await Promise.all([
        getAllPayoutsAdminAction(),
        getAllUsersAdminAction()
      ]);

      if (!payoutsRes.status) throw new Error(payoutsRes.error || 'Failed to fetch payouts');
      if (!usersRes.status) throw new Error(usersRes.error || 'Failed to fetch users');

      setPayouts(payoutsRes.payouts || []);
      setUsers(usersRes.users || []);
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

  const handleCalculateRevenue = async () => {
    if (!selectedUserId) {
      setError("Please select a user.");
      return;
    }
    if (!startDate || !endDate) {
      setError("Please select both start and end dates.");
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      setError("Start date cannot be later than end date.");
      return;
    }
    
    setCalculating(true);
    setError(null);
    try {
       const res = await calculateUserRevenueAdminAction(selectedUserId, startDate, endDate);
       if (res.status) {
         setRequestSum(res.totalRevenue.toFixed(2));
         setSitesBreakdown(res.sitesBreakdown || []);
       } else {
         throw new Error(res.error || "Failed to calculate revenue.");
       }
    } catch (e) {
       setError(e.message);
    } finally {
       setCalculating(false);
    }
  };

  const handleCreatePayout = async (e) => {
    e.preventDefault();
    try {
      if (!selectedUserId) throw new Error('Please select a user.');
      
      const amount = parseFloat(requestSum);
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Please enter a valid payout amount or select a valid date range.');
      }

      setCreating(true);
      setError(null);
      setSuccessMsg(null);

      // Proportionally adjust sitesBreakdown if amount was edited
      let adjustedBreakdown = [...sitesBreakdown];
      const originalTotal = sitesBreakdown.reduce((sum, site) => sum + site.revenue, 0);
      
      if (originalTotal > 0 && Math.abs(amount - originalTotal) > 0.01) {
        const ratio = amount / originalTotal;
        adjustedBreakdown = sitesBreakdown.map(site => ({
          ...site,
          revenue: site.revenue * ratio
        }));
      } else if (originalTotal === 0 && amount > 0) {
        // Fallback: If admin overrides amount but there are no sites in the period,
        // we fake a generic site entry so the backend doesn't fail.
        adjustedBreakdown = [{
          siteId: 'manual',
          siteName: 'Manual Adjustment',
          revenue: amount
        }];
      }

      const res = await adminCreatePayoutAction(selectedUserId, adjustedBreakdown, startDate, endDate);
      if (!res.status) throw new Error(res.error || 'Failed to create payout');

      setSuccessMsg('Payout created and sent successfully.');
      setRequestSum('');
      setStartDate('');
      setEndDate('');
      setSelectedUserId('');
      setTimeout(() => setSuccessMsg(null), 3000);
      
      // Refresh payouts list
      await fetchData();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
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
          
          {/* Create Payout Section */}
          <div className="chart-section" style={{ padding: '24px', background: 'white' }}>
            <div className="chart-header" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <PlusCircle size={18} /> Create & Send Payout
            </div>
            <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '16px' }}>
              Calculate revenue for a user and create a payout record for them.
            </p>
            <form onSubmit={handleCreatePayout} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Select User</label>
                <div style={{ position: 'relative', width: '100%' }}>
                  <div 
                    onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                    style={{ padding: '10px 12px 10px 36px', border: '1px solid #ddd', borderRadius: '4px', width: '100%', backgroundColor: '#f8f9fa', cursor: 'pointer', minHeight: '41px', display: 'flex', alignItems: 'center' }}
                  >
                    <Users size={16} color="#666" style={{ position: 'absolute', left: '12px' }} />
                    {selectedUserId ? (
                      <span style={{ fontSize: '0.95rem' }}>
                        <strong style={{ color: '#0277bd', marginRight: '6px' }}>[{users.find(u => u.id === selectedUserId)?.sites}]</strong>
                        {users.find(u => u.id === selectedUserId)?.email}
                      </span>
                    ) : (
                      <span style={{ color: '#666' }}>-- Select a User --</span>
                    )}
                    <ChevronDown size={16} color="#666" style={{ position: 'absolute', right: '12px' }} />
                  </div>

                  {isUserDropdownOpen && (
                    <>
                      <div 
                        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9 }} 
                        onClick={() => setIsUserDropdownOpen(false)} 
                      />
                      <div style={{ 
                        position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, 
                        backgroundColor: 'white', border: '1px solid #ddd', borderRadius: '4px', 
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 10,
                        maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column'
                      }}>
                        {users.map(u => (
                          <div 
                            key={u.id}
                            onClick={() => { setSelectedUserId(u.id); setRequestSum(''); setIsUserDropdownOpen(false); }}
                            style={{ 
                              padding: '12px 16px', cursor: 'pointer', fontSize: '0.95rem',
                              backgroundColor: selectedUserId === u.id ? '#f0f7ff' : 'transparent',
                              borderBottom: '1px solid #eee'
                            }}
                            onMouseOver={e => e.currentTarget.style.backgroundColor = selectedUserId === u.id ? '#f0f7ff' : '#f5f5f5'}
                            onMouseOut={e => e.currentTarget.style.backgroundColor = selectedUserId === u.id ? '#f0f7ff' : 'transparent'}
                          >
                            <strong style={{ color: '#0277bd', marginRight: '6px' }}>[{u.sites}]</strong> 
                            <span style={{ color: '#333' }}>{u.email}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => { setStartDate(e.target.value); setRequestSum(''); }}
                    style={{ padding: '10px 12px', border: '1px solid #ddd', borderRadius: '4px', width: '100%' }}
                  />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => { setEndDate(e.target.value); setRequestSum(''); }}
                    style={{ padding: '10px 12px', border: '1px solid #ddd', borderRadius: '4px', width: '100%' }}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleCalculateRevenue}
                  disabled={calculating || !selectedUserId}
                  style={{
                    padding: '10px 16px', background: 'var(--color-accent)', color: 'white', border: 'none',
                    borderRadius: '4px', cursor: (calculating || !selectedUserId) ? 'not-allowed' : 'pointer', fontWeight: 600, display: 'inline-flex',
                    alignItems: 'center', justifyContent: 'center', gap: '8px', height: '41px', whiteSpace: 'nowrap'
                  }}
                >
                  {calculating ? <Loader2 size={16} className="animate-spin" /> : 'Calculate'}
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  Calculated Payout Amount
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '16px', fontSize: '1.2rem', fontWeight: 700, color: '#333', zIndex: 1 }}>$</span>
                  <input 
                    type="number"
                    step="0.01"
                    value={requestSum}
                    onChange={(e) => setRequestSum(e.target.value)}
                    disabled={calculating}
                    style={{ 
                      padding: '12px 16px 12px 32px', border: '1px solid #ddd', borderRadius: '4px', 
                      backgroundColor: 'white', minHeight: '46px', width: '100%', 
                      fontSize: '1.2rem', fontWeight: 700, color: (requestSum && Number(requestSum) > 0) ? '#2e7d32' : '#333' 
                    }}
                    placeholder={calculating ? 'Calculating...' : '0.00'}
                  />
                </div>
              </div>
              
              <button
                type="submit"
                disabled={creating || !selectedUserId || !requestSum || Number(requestSum) <= 0}
                style={{
                  padding: '12px 20px', 
                  background: (selectedUserId && requestSum && Number(requestSum) > 0) ? '#10b981' : '#f1f5f9', 
                  color: (selectedUserId && requestSum && Number(requestSum) > 0) ? 'white' : '#94a3b8', 
                  border: (selectedUserId && requestSum && Number(requestSum) > 0) ? 'none' : '1px solid #e2e8f0',
                  borderRadius: '6px', 
                  cursor: (selectedUserId && requestSum && Number(requestSum) > 0) ? 'pointer' : 'not-allowed', 
                  fontWeight: 600, 
                  display: 'inline-flex',
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '8px', 
                  alignSelf: 'flex-start',
                  transition: 'all 0.2s ease',
                }}
              >
                {creating ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                Create & Send Payout
              </button>
            </form>
          </div>

          <div className="page-title" style={{ marginTop: '16px' }}>All Payouts History</div>

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
