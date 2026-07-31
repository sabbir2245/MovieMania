require('dotenv').config();
const { Resend } = require('resend');

let resendClient = null;
let fromAddress = process.env.RESEND_FROM_EMAIL || 'MovieMania <onboarding@resend.dev>';

function getClient() {
  if (resendClient) return resendClient;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  resendClient = new Resend(apiKey);
  return resendClient;
}

// Test / dependency-injection hooks
function setClient(client) {
  resendClient = client;
}

function setFromAddress(address) {
  fromAddress = address;
}

async function sendWelcomeEmail(user) {
  const client = getClient();
  if (!client) {
    console.warn('[emailService] RESEND_API_KEY not configured; skipping welcome email for', user.email);
    return { success: false, skipped: true, reason: 'RESEND_API_KEY not configured' };
  }

  const { data, error } = await client.emails.send({
    from: fromAddress,
    to: [user.email],
    subject: `Welcome to MovieMania, ${user.name}! 🎬`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
        <h1 style="color: #ffcc00; margin: 0 0 8px;">🎬 MovieMania</h1>
        <p>Hi <strong>${user.name}</strong>,</p>
        <p>Welcome aboard! Your account <strong>@${user.username}</strong> has been created successfully.</p>
        <p>Start exploring trending movies, leave reviews, and build your watchlist.</p>
        <p style="margin-top: 24px; color: #64748b; font-size: 13px;">— The MovieMania Team</p>
      </div>
    `,
  });

  if (error) {
    console.error('[emailService] Failed to send welcome email:', error);
    return { success: false, error };
  }

  console.log(`[emailService] Welcome email sent to ${user.email}`);
  return { success: true, data };
}

module.exports = { sendWelcomeEmail, getClient, setClient, setFromAddress };
