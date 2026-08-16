"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CreditCard, PlusCircle, CheckCircle, Clock, Save, Loader2, Info, Calculator, ChevronDown, Search } from 'lucide-react';
import { getUserProfileAction, updatePaymentInfoAction, requestPayoutAction, getUserPayoutsAction, calculateRevenueAction } from '../../actions';

const VIETNAM_BANKS = [
  'Vietcombank', 'VietinBank', 'BIDV', 'Agribank', 'Techcombank', 'MBBank', 'VPBank', 'ACB', 
  'Sacombank', 'HDBank', 'VIB', 'SHB', 'SeABank', 'TPBank', 'OCB', 'MSB', 'LPBank (LienVietPostBank)',
  'Nam A Bank', 'Bac A Bank', 'DongA Bank', 'Eximbank', 'Kienlongbank', 'NCB', 'OceanBank', 
  'PG Bank', 'PVcomBank', 'SCB', 'Saigonbank', 'VietABank', 'Vietbank', 'BaoViet Bank', 
  'CBBank', 'GPBank', 'VRB (Vietnam-Russia Bank)', 'Public Bank', 'UOB', 'Standard Chartered', 
  'HSBC', 'Shinhan Bank', 'Woori Bank', 'CitiBank', 'Timo', 'Cake by VPBank', 'Momo', 'ZaloPay', 
  'Viettel Money', 'VNPT Money', 'Other'
];

export default function PayoutsPage() {
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [isEditingPayment, setIsEditingPayment] = useState(true);
  const [isBankDropdownOpen, setIsBankDropdownOpen] = useState(false);
  const [bankSearch, setBankSearch] = useState('');

  const [payouts, setPayouts] = useState([]);
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [requestSum, setRequestSum] = useState('');
  const [sitesBreakdown, setSitesBreakdown] = useState([]);
  const [calculating, setCalculating] = useState(false);

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

      const pInfo = profileRes.user.paymentInfo || '';
      if (pInfo) {
        const parts = pInfo.split(' - ');
        if (parts.length >= 3) {
          setBankName(parts[0]);
          setAccountNumber(parts[1]);
          setAccountName(parts.slice(2).join(' - '));
          setIsEditingPayment(false);
        }
      }
      setPayouts(payoutsRes.payouts || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePaymentInfo = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      setError(null);
      setSuccessMsg(null);
      
      if (!bankName || !accountNumber || !accountName) {
        throw new Error('Please fill all bank details.');
      }
      const combined = `${bankName} - ${accountNumber} - ${accountName}`;
      
      const res = await updatePaymentInfoAction(combined);
      if (!res.status) throw new Error(res.error || 'Failed to save payment info');
      
      setSuccessMsg('Payment information saved successfully.');
      setIsEditingPayment(false);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCalculateRevenue = async () => {
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
       const res = await calculateRevenueAction(startDate, endDate);
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

  const handleRequestPayout = async (e) => {
    e.preventDefault();
    try {
      const combinedPaymentInfo = `${bankName} - ${accountNumber} - ${accountName}`;
      if (!bankName || !accountNumber || !accountName) {
        throw new Error('Please set up your Vietnam Bank Account details first.');
      }
      const amount = parseFloat(requestSum);
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Please enter a valid payout amount or select a valid date range.');
      }

      setActionLoading(true);
      setError(null);
      setSuccessMsg(null);

      const res = await requestPayoutAction(sitesBreakdown, combinedPaymentInfo, startDate, endDate);
      if (!res.status) throw new Error(res.error || 'Failed to request payout');

      setSuccessMsg('Payout requested successfully.');
      setRequestSum('');
      setStartDate('');
      setEndDate('');
      setTimeout(() => setSuccessMsg(null), 3000);
      
      // Refresh payouts list
      await fetchData();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
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
      {successMsg && <div style={{ background: '#d4edda', color: '#155724', padding: '12px', borderRadius: '4px', marginBottom: '20px', border: '1px solid #c3e6cb' }}>{successMsg}</div>}

      {loading ? (
        <div className="loading-screen" style={{ minHeight: '300px' }}>
          <div className="spinner"></div>
          <p>Loading payouts data...</p>
        </div>
      ) : (
        <div className="bottom-grid" style={{ gridTemplateColumns: '1fr', gap: '24px' }}>
          
          {/* Actions Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
            
            {/* Payment Details Section */}
            <div className="chart-section" style={{ padding: '24px' }}>
              <div className="chart-header" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CreditCard size={18} /> Payment Information
              </div>
              <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '16px' }}>
                Please provide your Vietnam bank account details (e.g., Bank Name - Account Number - Account Name).
              </p>
              <form onSubmit={handleSavePaymentInfo} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Bank Name</label>
                  <div style={{ position: 'relative' }}>
                    <div 
                      onClick={() => isEditingPayment && setIsBankDropdownOpen(!isBankDropdownOpen)}
                      style={{ 
                        padding: '10px 12px', border: '1px solid #ddd', borderRadius: '4px', width: '100%', 
                        backgroundColor: isEditingPayment ? 'white' : '#f5f5f5',
                        cursor: isEditingPayment ? 'pointer' : 'not-allowed',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                      }}
                    >
                      <span style={{ color: bankName ? '#333' : '#999' }}>{bankName || '-- Select Bank --'}</span>
                      <ChevronDown size={16} color="#666" />
                    </div>
                    
                    {isBankDropdownOpen && isEditingPayment && (
                      <>
                        <div 
                          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9 }} 
                          onClick={() => setIsBankDropdownOpen(false)} 
                        />
                        <div style={{ 
                          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, 
                          backgroundColor: 'white', border: '1px solid #ddd', borderRadius: '4px', 
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 10,
                          maxHeight: '250px', display: 'flex', flexDirection: 'column'
                        }}>
                          <div style={{ padding: '8px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Search size={16} color="#999" />
                            <input 
                              type="text" 
                              placeholder="Search bank..." 
                              value={bankSearch}
                              onChange={e => setBankSearch(e.target.value)}
                              autoFocus
                              style={{ border: 'none', outline: 'none', width: '100%', fontSize: '0.9rem' }}
                            />
                          </div>
                          <div style={{ overflowY: 'auto', flex: 1 }}>
                            {VIETNAM_BANKS.filter(b => b.toLowerCase().includes(bankSearch.toLowerCase())).length === 0 ? (
                              <div style={{ padding: '12px', textAlign: 'center', color: '#999', fontSize: '0.9rem' }}>No banks found</div>
                            ) : (
                              VIETNAM_BANKS.filter(b => b.toLowerCase().includes(bankSearch.toLowerCase())).map(bank => (
                                <div 
                                  key={bank}
                                  onClick={() => { setBankName(bank); setIsBankDropdownOpen(false); setBankSearch(''); }}
                                  style={{ 
                                    padding: '10px 12px', cursor: 'pointer', fontSize: '0.9rem',
                                    backgroundColor: bankName === bank ? '#f0f7ff' : 'transparent',
                                    color: bankName === bank ? '#0277bd' : '#333',
                                    fontWeight: bankName === bank ? 600 : 400
                                  }}
                                  onMouseOver={e => e.currentTarget.style.backgroundColor = bankName === bank ? '#f0f7ff' : '#f5f5f5'}
                                  onMouseOut={e => e.currentTarget.style.backgroundColor = bankName === bank ? '#f0f7ff' : 'transparent'}
                                >
                                  {bank}
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Account Number</label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="e.g. 123456789"
                    disabled={!isEditingPayment}
                    style={{ padding: '10px 12px', border: '1px solid #ddd', borderRadius: '4px', width: '100%', backgroundColor: isEditingPayment ? 'white' : '#f5f5f5' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Account Name</label>
                  <input
                    type="text"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value.toUpperCase())}
                    placeholder="e.g. NGUYEN VAN A"
                    disabled={!isEditingPayment}
                    style={{ padding: '10px 12px', border: '1px solid #ddd', borderRadius: '4px', width: '100%', backgroundColor: isEditingPayment ? 'white' : '#f5f5f5' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                  <button
                    type="submit"
                    disabled={actionLoading || !isEditingPayment}
                    style={{
                      padding: '10px 16px', 
                      background: isEditingPayment ? 'var(--color-primary)' : '#f1f5f9', 
                      color: isEditingPayment ? 'white' : '#94a3b8', 
                      border: isEditingPayment ? 'none' : '1px solid #e2e8f0',
                      borderRadius: '6px', 
                      cursor: isEditingPayment ? 'pointer' : 'not-allowed', 
                      fontWeight: 600, 
                      display: 'inline-flex',
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      gap: '8px',
                      transition: 'all 0.2s ease',
                      boxShadow: isEditingPayment ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
                    }}
                  >
                    {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    Save Details
                  </button>
                  
                  {!isEditingPayment && (
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); setIsEditingPayment(true); }}
                      style={{
                        padding: '10px 16px', 
                        background: '#e2e8f0', 
                        color: '#475569', 
                        border: 'none',
                        borderRadius: '6px', 
                        cursor: 'pointer', 
                        fontWeight: 600, 
                        display: 'inline-flex',
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        gap: '8px',
                        transition: 'background 0.2s ease'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.background = '#cbd5e1'}
                      onMouseOut={(e) => e.currentTarget.style.background = '#e2e8f0'}
                    >
                      Edit
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Request Payout Section */}
            <div className="chart-section" style={{ padding: '24px' }}>
              <div className="chart-header" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <PlusCircle size={18} /> Request Payout
              </div>
              <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '16px' }}>
                Request a new payout to your saved bank account.
              </p>
              <form onSubmit={handleRequestPayout} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      style={{ padding: '10px 12px', border: '1px solid #ddd', borderRadius: '4px', width: '100%' }}
                    />
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>End Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      style={{ padding: '10px 12px', border: '1px solid #ddd', borderRadius: '4px', width: '100%' }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleCalculateRevenue}
                    disabled={calculating}
                    style={{
                      padding: '10px 16px', background: 'var(--color-accent)', color: 'white', border: 'none',
                      borderRadius: '4px', cursor: calculating ? 'not-allowed' : 'pointer', fontWeight: 600, display: 'inline-flex',
                      alignItems: 'center', justifyContent: 'center', gap: '8px', height: '41px', whiteSpace: 'nowrap'
                    }}
                  >
                    {calculating ? <Loader2 size={16} className="animate-spin" /> : 'Apply'}
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    Calculated Payout Amount
                    <span style={{ fontSize: '0.75rem', background: '#ffebee', color: '#c62828', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                      Min $100
                    </span>
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: '#f8f9fa', minHeight: '46px', position: 'relative' }}>
                    <span style={{ fontSize: '1.2rem', fontWeight: 700, color: (requestSum && Number(requestSum) >= 100) ? '#2e7d32' : '#d32f2f' }}>
                      {calculating ? 'Calculating...' : `$${requestSum || '0.00'}`}
                    </span>
                    {calculating && <Loader2 size={18} className="animate-spin" style={{ position: 'absolute', right: '12px', color: '#888' }} />}
                  </div>
                </div>
                
                <button
                  type="submit"
                  disabled={actionLoading || !bankName || !accountNumber || !accountName || !requestSum || Number(requestSum) < 100}
                  style={{
                    padding: '12px 20px', 
                    background: (bankName && accountNumber && accountName && requestSum && Number(requestSum) >= 100) ? '#10b981' : '#f1f5f9', 
                    color: (bankName && accountNumber && accountName && requestSum && Number(requestSum) >= 100) ? 'white' : '#94a3b8', 
                    border: (bankName && accountNumber && accountName && requestSum && Number(requestSum) >= 100) ? 'none' : '1px solid #e2e8f0',
                    borderRadius: '6px', 
                    cursor: (bankName && accountNumber && accountName && requestSum && Number(requestSum) >= 100) ? 'pointer' : 'not-allowed', 
                    fontWeight: 600, 
                    display: 'inline-flex',
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '8px', 
                    alignSelf: 'flex-start',
                    transition: 'all 0.2s ease',
                    boxShadow: (bankName && accountNumber && accountName && requestSum && Number(requestSum) >= 100) ? '0 4px 6px -1px rgba(16, 185, 129, 0.2)' : 'none'
                  }}
                  title={(!bankName || !accountNumber || !accountName) ? "Please save payment info first" : (!requestSum || Number(requestSum) < 100) ? "Minimum payout is $100" : ""}
                >
                  {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                  Request Payout
                </button>
              </form>
            </div>
            
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
                      <td colSpan="5" style={{ textAlign: 'center', padding: '32px', color: '#888' }}>
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
