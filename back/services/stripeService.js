require('dotenv').config();
const Stripe = require('stripe');

let stripeClient = null;

// Test-mode Stripe client (sk_test_...). Returns null if not configured yet.
function getStripe() {
  if (stripeClient) return stripeClient;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || !key.startsWith('sk_')) return null;
  stripeClient = new Stripe(key);
  return stripeClient;
}

// Test / dependency-injection hooks
function setClient(client) {
  stripeClient = client;
}

// Create a Stripe Checkout Session for a one-time Premium purchase.
async function createCheckoutSession({ username, amount, frontendURL }) {
  const stripe = getStripe();
  if (!stripe) {
    throw new Error(
      'Stripe is not configured. Set a test STRIPE_SECRET_KEY (sk_test_...) in .env, ' +
      'then restart the server.'
    );
  }
  const unitAmount = Math.round(Number(amount) * 100);

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    // Disable Managed Payments so classic Checkout doesn't require a product
    // tax_code / payment_method_types restrictions.
    managed_payments: { enabled: false },
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: { name: 'MovieMania Premium' },
          unit_amount: unitAmount,
        },
        quantity: 1,
      },
    ],
    client_reference_id: String(username),
    metadata: { username: String(username) },
    success_url: `${frontendURL}/premium?status=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${frontendURL}/premium?status=cancelled`,
  });

  return { sessionId: session.id, url: session.url };
}

// Verify a completed Checkout Session and return the paying user's username.
async function verifySession(sessionId) {
  const stripe = getStripe();
  if (!stripe) {
    throw new Error('Stripe is not configured (STRIPE_SECRET_KEY missing).');
  }
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  return {
    sessionId: session.id,
    paid: session.payment_status === 'paid',
    username: session.metadata && session.metadata.username,
    customerEmail: session.customer_details ? session.customer_details.email : null,
    amount: session.amount_total != null ? session.amount_total / 100 : null,
  };
}

module.exports = { getStripe, setClient, createCheckoutSession, verifySession };
