const express = require('express');
const router = express.Router();
const { pool } = require('../pool');
const { authenticate } = require('../middleware/auth');
const bkash = require('../services/bkashService');

const PREMIUM_PRICE_BDT = Number(process.env.PREMIUM_PRICE_BDT || 299);
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5001';
const PREMIUM_TYPE_VALUE = 'premium';

// Server-rendered MOCK bKash checkout page. In mock mode createPayment() points
// bkashURL here so the user can "pay" without a real bKash account. Clicking
// Pay routes back through the SAME /callback used by real bKash.
router.get('/mock-checkout', (req, res) => {
  const { paymentID, amount } = req.query;
  const callback = `${BASE_URL}/api/premium/callback?paymentID=${encodeURIComponent(paymentID || '')}`;
  const cancel = `${FRONTEND_URL}/premium?status=failed`;
  const amt = amount || PREMIUM_PRICE_BDT;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>MovieMania · Mock bKash</title>
  <style>
    * { box-sizing: border-box; margin: 0; }
    body { font-family: 'Segoe UI', system-ui, Arial, sans-serif; background: #0b1220; display: flex; min-height: 100vh; align-items: center; justify-content: center; padding: 16px; }
    .card { background: #111b2e; border: 1px solid #26334d; border-radius: 16px; padding: 28px; width: 360px; color: #e6ecf5; box-shadow: 0 20px 40px rgba(0,0,0,.4); }
    .brand { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
    .brand span { color: #e6005c; }
    .sub { color: #8a97ad; font-size: 13px; margin-bottom: 20px; }
    .badge { display: inline-block; background: #e6005c; color: #fff; font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 20px; margin-bottom: 16px; }
    .amount-label { color: #8a97ad; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; }
    .amount { font-size: 34px; font-weight: 800; margin: 4px 0 2px; }
    .currency { color: #8a97ad; font-size: 14px; }
    .divider { border: none; border-top: 1px solid #26334d; margin: 18px 0; }
    .pay { display: block; width: 100%; background: #e6005c; color: #fff; border: none; border-radius: 10px; padding: 14px; font-size: 16px; font-weight: 700; cursor: pointer; text-align: center; text-decoration: none; }
    .pay:hover { background: #cc0052; }
    .cancel { display: block; text-align: center; margin-top: 14px; color: #8a97ad; font-size: 13px; text-decoration: none; }
    .note { margin-top: 18px; font-size: 11px; color: #5c6b82; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="brand">MovieMania <span>● bKash</span></div>
    <div class="sub">Mock Checkout · Sandbox (no real charge)</div>
    <div class="badge">TEST MODE</div>
    <div class="amount-label">Amount</div>
    <div class="amount">৳${amt}</div>
    <div class="currency">BDT · One-time Premium</div>
    <hr class="divider" />
    <a class="pay" href="${callback}">Pay ৳${amt}</a>
    <a class="cancel" href="${cancel}">Cancel payment</a>
    <div class="note">This is a simulated payment page. No money moves.</div>
  </div>
</body>
</html>`);
});

// GET /api/premium/me - the current user's premium status
router.get('/me', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT username, premiumtype FROM "Users" WHERE username = $1',
      [req.user.username]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const isPremium = rows[0].premiumtype === PREMIUM_TYPE_VALUE;
    res.json({
      username: rows[0].username,
      isPremium,
      premiumtype: rows[0].premiumtype,
    });
  } catch (err) {
    console.error('Error fetching premium status:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/premium/checkout - initiate a bKash payment for the current user
router.post('/checkout', authenticate, async (req, res) => {
  const username = req.user.username;
  const callbackURL = `${BASE_URL}/api/premium/callback`;
  const merchantInvoiceNumber = `MM-${username}-${Date.now()}`;

  try {
    const payment = await bkash.createPayment({
      payerReference: username,
      amount: PREMIUM_PRICE_BDT,
      callbackURL,
      merchantInvoiceNumber,
    });
    res.status(201).json({
      paymentID: payment.paymentID,
      bkashURL: payment.bkashURL,
      amount: PREMIUM_PRICE_BDT,
      currency: 'BDT',
    });
  } catch (err) {
    console.error('bKash checkout error:', err.message);
    res.status(500).json({ error: 'Failed to initiate payment', details: err.message });
  }
});

// bKash redirects the user here after they pay. Confirm via execute, then upgrade.
router.get('/callback', async (req, res) => {
  const { paymentID } = req.query;

  if (!paymentID) {
    return res.redirect(`${FRONTEND_URL}/premium?status=error`);
  }

  try {
    const execResult = await bkash.executePayment({ paymentID });
    const success = execResult.transactionStatus === 'Completed';
    const payerReference = execResult.payerReference;

    if (success && payerReference) {
      await pool.query(
        'UPDATE "Users" SET premiumtype = $1 WHERE username = $2',
        [PREMIUM_TYPE_VALUE, payerReference]
      );
      console.log(`✅ User "${payerReference}" upgraded to premium`);
    }

    const params = new URLSearchParams({
      status: success ? 'success' : 'failed',
      trxID: execResult.trxID || '',
      amount: execResult.amount || '',
    });
    return res.redirect(`${FRONTEND_URL}/premium?${params.toString()}`);
  } catch (err) {
    console.error('bKash callback error:', err.message);
    return res.redirect(`${FRONTEND_URL}/premium?status=error`);
  }
});

// POST /api/premium/status - query payment state (frontend polling / verification)
router.post('/status', authenticate, async (req, res) => {
  const { paymentID } = req.body;
  if (!paymentID) {
    return res.status(400).json({ error: 'paymentID required' });
  }
  try {
    const status = await bkash.queryPayment({ paymentID });
    res.json({
      transactionStatus: status.transactionStatus,
      completed: status.transactionStatus === 'Completed',
      trxID: status.trxID || null,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to query payment', details: err.message });
  }
});

module.exports = router;
