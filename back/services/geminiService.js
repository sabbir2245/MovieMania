// ============================================================================
// MovieMania Gemini Service
// ----------------------------------------------------------------------------
// Thin wrapper around the Google Gemini REST API (no npm dependency — uses
// Node's global fetch). Used by the chatbot to answer free-form / unknown
// questions. Structured movie queries are still answered from the database by
// the rule-based specialists; Gemini only handles the fallback.
// ============================================================================

require('dotenv').config();

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

// Whether a real Gemini key is present (not a placeholder).
function isConfigured() {
  return Boolean(API_KEY) && API_KEY !== 'YOUR_GEMINI_API_KEY';
}

// Compact text summary of the working movie set, so Gemini can answer
// movie-related free-form questions from the ACTUAL database rows.
function buildMovieContext(movies) {
  const rows = Array.isArray(movies) ? movies : [];
  // Cap the list so we don't blow the token budget on huge datasets.
  const capped = rows.slice(0, 120);
  if (capped.length === 0) return 'No movies are currently available in the database.';
  const lines = capped.map((m) => {
    const bits = [m.title, m.year ? `(${m.year})` : ''];
    if (typeof m.rating === 'number') bits.push(`rating ${m.rating.toFixed(1)}/10`);
    if (m.genre) bits.push(`genre: ${m.genre}`);
    return bits.filter(Boolean).join(' ');
  });
  return `Movies in the MovieMania database (${rows.length} total, first ${capped.length} shown):\n- ${lines.join('\n- ')}`;
}

function systemPrompt(movieContext) {
  return `You are the friendly MovieMania assistant. You help users with questions about the movies on the platform.

Use the movie database context below to ground your answers (only reference movies that actually appear in it):
"""${movieContext}"""

Guidelines:
- Be concise and conversational.
- If the user asks for a recommendation, suggest movies from the database above.
- If you cannot answer from the given data, say so honestly rather than inventing movies.
- Keep answers short (a few sentences), unless the user asks for details.`;
}

// Generate a reply. Returns the assistant text, or throws on error.
async function generateReply({ message, history = [], movieContext = '' }) {
  if (!isConfigured()) return null;

  const url = `${BASE_URL}/models/${MODEL}:generateContent?key=${API_KEY}`;

  // Build the conversation contents from prior history + the current message.
  const contents = [];
  const hist = Array.isArray(history) ? history : [];
  for (const h of hist) {
    const role = h.role === 'assistant' ? 'model' : h.role === 'user' ? 'user' : null;
    const text = String(h.content || '').trim();
    if (role && text) contents.push({ role, parts: [{ text }] });
  }
  // Always append the current user message last.
  const current = String(message || '').trim();
  if (current) contents.push({ role: 'user', parts: [{ text: current }] });
  // Guarantee at least one user turn.
  if (contents.length === 0) contents.push({ role: 'user', parts: [{ text: 'Hello' }] });

  const body = {
    systemInstruction: { parts: [{ text: systemPrompt(movieContext) }] },
    contents,
    generationConfig: { temperature: 0.7, maxOutputTokens: 800 },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${detail}`);
  }

  const data = await res.json();
  const parts = data?.candidates?.[0]?.content?.parts;
  const text = Array.isArray(parts)
    ? parts.map((p) => (p && p.text) || '').join('')
    : '';
  return text ? text.trim() : null;
}

module.exports = { generateReply, buildMovieContext, isConfigured };
