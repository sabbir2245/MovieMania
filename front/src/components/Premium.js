import React, { useState, useEffect, useContext } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { UserContext } from '../contexts/UserContext';
import '../styles/Premium.css';

const API_BASE = 'http://localhost:3000';

function getToken() {
  // JWT saved on sign-in by Signin.js
  const token = localStorage.getItem('token');
  console.log('[DEBUG] getToken() ->', token ? token.slice(0, 20) + '...' : 'NO TOKEN');
  return token;
}

function Premium() {
  const { loggedInUser } = useContext(UserContext);
  const [searchParams] = useSearchParams(); // backend redirects to /premium?status=...&trxID=...

  const [premium, setPremium] = useState(null); // { isPremium, premiumtype }
  const [loadingMe, setLoadingMe] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [payment, setPayment] = useState(null); // { paymentID, bkashURL, amount }
  const [pollStatus, setPollStatus] = useState(null);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null); // shows bKash redirect result

  const isLoggedIn = !!loggedInUser;

  // ---- 1) Read Stripe redirect result from URL (?status=success&session_id=...) ----
  useEffect(() => {
    const status = searchParams.get('status');
    const trxID = searchParams.get('trxID');
    const amount = searchParams.get('amount');
    const sessionId = searchParams.get('session_id');
    console.log('[DEBUG] URL params -> status:', status, '| session_id:', sessionId, '| trxID:', trxID, '| amount:', amount);

    // After a Stripe Checkout redirect, confirm the session and grant Premium.
    if (sessionId) {
      confirmStripeSession(sessionId);
    } else if (status === 'success') {
      setNotice({ type: 'success', text: `Payment complete! Transaction ID: ${trxID || 'N/A'}${amount ? ` (BDT ${amount})` : ''}` });
    } else if (status === 'failed' || status === 'cancelled') {
      setNotice({ type: 'error', text: 'Payment was not completed. Please try again.' });
    } else if (status === 'error') {
      setNotice({ type: 'error', text: 'Something went wrong processing your payment.' });
    }
    // Refresh status after returning from the gateway
    if (isLoggedIn) {
      loadPremiumStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Confirm a Stripe Checkout session server-side, then refresh premium status.
  const confirmStripeSession = async (sessionId) => {
    const token = getToken();
    if (!token || !sessionId) return;
    try {
      console.log('[DEBUG] POST /api/premium/stripe-verify for session:', sessionId);
      const res = await fetch(`${API_BASE}/api/premium/stripe-verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json();
      console.log('[DEBUG] stripe-verify response:', data);
      if (data.paid) {
        setNotice({ type: 'success', text: `Payment complete! You are now Premium.${data.amount ? ` ($${data.amount})` : ''}` });
      } else {
        setNotice({ type: 'error', text: 'Payment could not be confirmed. Please try again.' });
      }
      loadPremiumStatus();
    } catch (err) {
      console.error('[DEBUG] stripe-verify error:', err);
      setNotice({ type: 'error', text: 'Something went wrong confirming your payment.' });
      loadPremiumStatus();
    }
  };

  // ---- 2) Fetch the current user's premium status ----
  const loadPremiumStatus = async () => {
    const token = getToken();
    if (!token) {
      console.warn('[DEBUG] No token; cannot load premium status');
      return;
    }
    setLoadingMe(true);
    setError(null);
    try {
      console.log('[DEBUG] Fetching GET /api/premium/me ...');
      const res = await fetch(`${API_BASE}/api/premium/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('[DEBUG] /api/premium/me status:', res.status);
      const data = await res.json();
      console.log('[DEBUG] /api/premium/me body:', data);
      if (!res.ok) throw new Error(data.error || `Server responded ${res.status}`);
      setPremium(data);
    } catch (err) {
      console.error('[DEBUG] loadPremiumStatus error:', err);
      setError(err.message);
    } finally {
      setLoadingMe(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      loadPremiumStatus();
    } else {
      console.log('[DEBUG] User not logged in; skipping premium status fetch');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn]);

  // ---- 3) Start a Stripe Checkout payment ----
  const handleCheckout = async () => {
    const token = getToken();
    if (!token) {
      setError('Please sign in to purchase premium.');
      return;
    }
    setCheckoutLoading(true);
    setError(null);
    try {
      console.log('[DEBUG] POST /api/premium/stripe-checkout ...');
      const res = await fetch(`${API_BASE}/api/premium/stripe-checkout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      console.log('[DEBUG] checkout response status:', res.status, '| body:', data);
      if (!res.ok) throw new Error(data.details || data.error || 'Failed to start payment');
      setPayment(data);

      // Redirect the user into the Stripe Checkout gateway
      console.log('[DEBUG] Redirecting to Stripe Checkout URL:', data.url);
      window.location.href = data.url;
    } catch (err) {
      console.error('[DEBUG] checkout error:', err);
      setError(err.message);
      setCheckoutLoading(false);
    }
  };

  // ---- 4) Poll payment status (optional manual check) ----
  const handleCheckStatus = async () => {
    if (!payment?.sessionId) return;
    const token = getToken();
    try {
      console.log('[DEBUG] POST /api/premium/stripe-verify for session:', payment.sessionId);
      const res = await fetch(`${API_BASE}/api/premium/stripe-verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ sessionId: payment.sessionId }),
      });
      const data = await res.json();
      console.log('[DEBUG] status response:', data);
      setPollStatus(data);
    } catch (err) {
      console.error('[DEBUG] status check error:', err);
      setPollStatus({ error: err.message });
    }
  };

  console.log('[DEBUG] Premium render | isLoggedIn:', isLoggedIn, '| premium:', premium);

  // ---- Not logged in ----
  if (!isLoggedIn) {
    return (
      <div className="premium-page">
        <div className="premium-card">
          <h1 className="premium-title">MovieMania <span>Premium</span></h1>
          <p className="premium-subtitle">Unlock exclusive features and support the platform.</p>
          <Link to="/signin" className="btn-primary">Sign in to continue</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="premium-page">
      <div className="premium-card">
        <h1 className="premium-title">MovieMania <span>Premium</span></h1>
        <p className="premium-subtitle">One-time payment · Stripe (test mode)</p>

        {notice && (
          <div className={`notice ${notice.type}`}>{notice.text}</div>
        )}

        {loadingMe ? (
          <p className="status-line">Loading your premium status...</p>
        ) : (
          <div className="status-box">
            <span className="status-label">Your status:</span>
            <span className={`badge ${premium?.isPremium ? 'badge-premium' : 'badge-free'}`}>
              {premium?.isPremium ? '★ PREMIUM' : 'Free'}
            </span>
            {premium && <span className="status-meta">premiumtype = {premium.premiumtype || 'none'}</span>}
          </div>
        )}

        {error && <div className="error-box">{error}</div>}

        {!premium?.isPremium ? (
          <div className="buy-section">
            <p className="price">$2.99 <span>/ one-time</span></p>
            <button className="btn-primary" onClick={handleCheckout} disabled={checkoutLoading}>
              {checkoutLoading ? 'Starting payment...' : '💰 Upgrade to Premium'}
            </button>

            {payment && (
              <div className="payment-info">
                <p>session: <code>{payment.sessionId}</code></p>
                {payment.url && (
                  <p>
                    If you weren't redirected:{' '}
                    <a href={payment.url} target="_blank" rel="noreferrer">Open Stripe Checkout</a>
                  </p>
                )}
                <button className="btn-secondary" onClick={handleCheckStatus}>Check payment status</button>
                {pollStatus && (
                  <pre className="poll-result">{JSON.stringify(pollStatus, null, 2)}</pre>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="already-premium">
            <p>🎉 You are a Premium member!</p>
            <button className="btn-secondary" onClick={loadPremiumStatus}>Refresh status</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Premium;
