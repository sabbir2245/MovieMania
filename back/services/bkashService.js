require('dotenv').config();

// bKash Tokenized Checkout (sandbox) client.
// Docs: https://developer.bka.sh  (sandbox base uses *.sandbox.bka.sh)

const B_KASH_BASE = process.env.B_KASH_BASE_URL ||
  'https://tokenized.sandbox.bka.sh/v1.2.0-beta/tokenized/checkout';
const APP_KEY = process.env.B_KASH_APP_KEY;
const APP_SECRET = process.env.B_KASH_APP_SECRET;
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Values from the sample .env are placeholders, not real sandbox credentials.
function isConfigured(value) {
  return Boolean(value) &&
    value !== 'sandbox_app_key' &&
    value !== 'sandbox_app_secret' &&
    !value.startsWith('re_placeholder');
}

// ---------------------------------------------------------------------------
// MOCK MODE (no API key needed)
// ---------------------------------------------------------------------------
// When B_KASH_MOCK=true (or the keys are still placeholders), the service
// simulates the whole bKash flow locally instead of calling *.bka.sh. The
// frontend/API shape stays identical, so the UI doesn't change at all:
//   checkout -> paymentID + a local mock "pay now" page
//   callback -> executePayment() returns Completed, user is upgraded.
function isMock() {
  if (process.env.B_KASH_MOCK === 'true' || process.env.B_KASH_MOCK === '1') return true;
  return !isConfigured(APP_KEY) || !isConfigured(APP_SECRET);
}

// Encode the payer into the mock paymentID so we can recover the username on
// execute without any in-memory state. base64url never contains '.', so split
// on '.' is safe. Format: MOCK.<base64(username)>.<timestamp>
function encodeMockPaymentID(payerReference) {
  const encoded = Buffer.from(String(payerReference)).toString('base64url');
  return `MOCK.${encoded}.${Date.now()}`;
}

// Inverse of encodeMockPaymentID — returns the username or null.
function decodeMockPaymentID(paymentID) {
  const parts = String(paymentID || '').split('.');
  if (parts[0] !== 'MOCK' || !parts[1]) return null;
  try {
    return Buffer.from(parts[1], 'base64url').toString('utf8');
  } catch (err) {
    return null;
  }
}

function authHeaders(token) {
  return {
    'content-type': 'application/json',
    authorization: token,
    'x-app-key': APP_KEY,
    'x-app-secret': APP_SECRET,
  };
}

async function getToken() {
  if (!isConfigured(APP_KEY) || !isConfigured(APP_SECRET)) {
    throw new Error(
      'bKash is not configured yet. Set real sandbox B_KASH_APP_KEY and B_KASH_APP_SECRET in .env ' +
      '(get them from https://developer.bka.sh), then restart the server.'
    );
  }
  const res = await fetch(`${B_KASH_BASE}/token/grant`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-app-key': APP_KEY,
      'x-app-secret': APP_SECRET,
    },
    body: JSON.stringify({ app_key: APP_KEY, app_secret: APP_SECRET }),
  });
  const data = await res.json();
  if (data.status_code !== '0000' || !data.id_token) {
    throw new Error(`bKash token grant failed: ${JSON.stringify(data)}`);
  }
  return data.id_token;
}

async function createPayment({ payerReference, amount, callbackURL, merchantInvoiceNumber }) {
  // --- MOCK: no API call, just return a fake payment + local payment page ---
  if (isMock()) {
    const paymentID = encodeMockPaymentID(payerReference);
    const mockURL = `${BASE_URL}/api/premium/mock-checkout?paymentID=${paymentID}&amount=${amount}`;
    return {
      paymentID,
      bkashURL: mockURL,
      statusCode: '0000',
      mock: true,
    };
  }

  const token = await getToken();
  const res = await fetch(`${B_KASH_BASE}/create`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({
      mode: '0011',
      payerReference: String(payerReference),
      callbackURL,
      amount: String(amount),
      currency: 'BDT',
      intent: 'sale',
      merchantInvoiceNumber,
    }),
  });
  const data = await res.json();
  if (data.statusCode !== '0000') {
    throw new Error(`bKash create payment failed: ${JSON.stringify(data)}`);
  }
  return data; // { paymentID, bkashURL, ... }
}

async function executePayment({ paymentID }) {
  // --- MOCK: return Completed + recover the payer from the paymentID ---
  if (isMock()) {
    const payerReference = decodeMockPaymentID(paymentID);
    return {
      paymentID,
      transactionStatus: 'Completed',
      payerReference,
      trxID: `MOCKTRX${Date.now()}`,
      amount: process.env.PREMIUM_PRICE_BDT || '299',
      mock: true,
    };
  }

  const token = await getToken();
  const res = await fetch(`${B_KASH_BASE}/execute`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ paymentID }),
  });
  return res.json();
}

async function queryPayment({ paymentID }) {
  // --- MOCK: report the payment as Completed ---
  if (isMock()) {
    return {
      transactionStatus: 'Completed',
      payerReference: decodeMockPaymentID(paymentID),
      trxID: `MOCKTRX${Date.now()}`,
      completed: true,
      mock: true,
    };
  }

  const token = await getToken();
  const res = await fetch(`${B_KASH_BASE}/payment/status`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ paymentID }),
  });
  return res.json();
}

module.exports = { getToken, createPayment, executePayment, queryPayment, isMock, B_KASH_BASE };
