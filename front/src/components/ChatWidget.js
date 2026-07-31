import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ChatPanel from './ChatPanel';

function ChatWidget() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      {/* Floating launcher bubble (bottom-right) */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-3xl text-white shadow-2xl shadow-indigo-500/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-indigo-500/50 active:translate-y-0"
        title={open ? 'Close chat' : 'Open MovieMania AI chat'}
      >
        {open ? '✕' : '🤖'}
      </button>

      {/* Mini chat popup */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 flex w-[360px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/20">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">🤖</span>
              <div>
                <p className="text-sm font-bold text-white">MovieMania AI</p>
                <p className="text-[11px] text-indigo-100">Ask me about any movie</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/chat')}
              className="rounded-lg bg-white/20 px-3 py-1.5 text-xs font-semibold text-white transition-all duration-200 hover:bg-white/30"
              title="Open full-screen chat"
            >
              ⛶ Full screen
            </button>
          </div>

          {/* Body */}
          <div className="p-3">
            <ChatPanel variant="mini" />
          </div>
        </div>
      )}
    </>
  );
}

export default ChatWidget;
