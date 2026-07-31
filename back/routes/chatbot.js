const express = require('express');
const router = express.Router();
const chatbot = require('../services/chatbotService');

// GET /api/chat/health
router.get('/health', (req, res) => {
  console.log('[DEBUG chatbot] GET /api/chat/health');
  res.json({ status: 'ok', service: 'MovieMania Chatbot' });
});

// POST /api/chat  ->  { message, history? }
// Returns a natural-language reply plus the detected intent and structured data.
router.post('/', async (req, res) => {
  const { message, history } = req.body || {};
  console.log('[DEBUG chatbot] POST /api/chat | message:', JSON.stringify(message));

  if (!message || !String(message).trim()) {
    console.log('[DEBUG chatbot] 400: message is required');
    return res.status(400).json({ error: 'message is required' });
  }

  try {
    const result = await chatbot.answerMessage(message, history);
    console.log('[DEBUG chatbot] responding with intent:', result.intent);
    res.json(result);
  } catch (err) {
    console.error('[DEBUG chatbot] 500 error:', err.message);
    res.status(500).json({ error: 'Chatbot failed', details: err.message });
  }
});

// POST /api/chat/classify  ->  { message }
// Returns only the detected intent (useful for the UI to preview routing).
router.post('/classify', async (req, res) => {
  const { message } = req.body || {};
  console.log('[DEBUG chatbot] POST /api/chat/classify | message:', JSON.stringify(message));

  if (!message || !String(message).trim()) {
    return res.status(400).json({ error: 'message is required' });
  }

  try {
    const movies = await chatbot.fetchMovies();
    const intent = chatbot.classifyIntent(message, movies);
    const movie = chatbot.findMovie(message, movies);
    console.log('[DEBUG chatbot] classify -> intent:', intent);
    res.json({ intent, movie: movie ? movie.title : null });
  } catch (err) {
    console.error('[DEBUG chatbot] classify 500:', err.message);
    res.status(500).json({ error: 'Chatbot failed', details: err.message });
  }
});

module.exports = router;
