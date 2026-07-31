import React, { useState, useRef, useEffect } from 'react';
import { API_URL } from '../config';

const CHAT_URL = `${API_URL}/api/chat`;

const SUGGESTIONS = [
  'What is the rating of The Batman?',
  'Which movies have a better rating than The Batman?',
  'When was Gladiator released?',
  'How many people reviewed The Batman?',
  'What are the top rated movies?',
];

function ChatPanel({ variant = 'mini' }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  const isFull = variant === 'full';

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const sendMessage = async (text) => {
    const trimmed = String(text || '').trim();
    if (!trimmed || loading) return;

    const userMsg = { role: 'user', content: trimmed };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);
    console.log('[DEBUG ChatPanel] sending:', trimmed);

    // Pass the full prior conversation so the bot remembers the session.
    const history = messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch(CHAT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, history }),
      });
      const data = await res.json();
      const reply = res.ok
        ? (data.reply || 'Sorry, I could not answer that.')
        : (data.error || 'Error from chatbot.');
      console.log('[DEBUG ChatPanel] intent:', data.intent, '| reply:', reply);
      setMessages([...nextMessages, { role: 'assistant', content: reply }]);
    } catch (err) {
      console.error('[DEBUG ChatPanel] network error:', err);
      setMessages([...nextMessages, { role: 'assistant', content: 'Error connecting to the chatbot server.' }]);
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-200';

  return (
    <div className={`flex flex-col ${isFull ? 'h-[70vh]' : 'h-[420px]'}`}>
      {/* Suggestions (only show when conversation is empty) */}
      {messages.length === 0 && (
        <div className={`mb-3 ${isFull ? 'flex flex-wrap gap-2' : 'flex flex-col gap-2'}`}>
          {SUGGESTIONS.slice(0, isFull ? 5 : 3).map((s) => (
            <button
              key={s}
              onClick={() => sendMessage(s)}
              className={`rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-left text-xs font-medium text-indigo-600 transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-300 hover:bg-indigo-100 ${
                isFull ? 'flex-1 basis-1/3' : ''
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div
        ref={scrollRef}
        className="mb-3 flex flex-1 flex-col gap-3 overflow-y-auto rounded-xl bg-slate-50 p-3"
      >
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center text-slate-400">
            <span className="mb-2 text-3xl">🤖</span>
            <p className="text-sm font-medium">Ask me anything about the movies on MovieMania!</p>
            <p className="mt-1 text-xs">e.g. rating, release date, budget, or which are better rated.</p>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] whitespace-pre-line rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
                m.role === 'user'
                  ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white'
                  : 'border border-slate-200 bg-white text-slate-700'
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <span className="h-2 w-2 animate-bounce rounded-full bg-indigo-400" style={{ animationDelay: '0ms' }} />
              <span className="h-2 w-2 animate-bounce rounded-full bg-indigo-400" style={{ animationDelay: '150ms' }} />
              <span className="h-2 w-2 animate-bounce rounded-full bg-indigo-400" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage(input);
        }}
        className="flex items-center gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about a movie..."
          className={inputCls}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="shrink-0 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-5 py-3 text-sm font-bold text-white shadow-md shadow-indigo-500/30 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:brightness-110 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
        >
          ➤
        </button>
      </form>
    </div>
  );
}

export default ChatPanel;
