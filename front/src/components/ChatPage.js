import React from 'react';
import { Link } from 'react-router-dom';
import ChatPanel from './ChatPanel';

function ChatPage() {
  return (
    <div className="mx-auto my-10 w-full max-w-3xl px-4">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight text-slate-100 sm:text-3xl">
            <span>🤖</span> MovieMania AI Assistant
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Ask about ratings, release dates, budgets, reviews — and which movies are better rated.
          </p>
        </div>
        <Link
          to="/"
          className="shrink-0 rounded-xl border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-200 transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-400 hover:bg-slate-800"
        >
          ← Back
        </Link>
      </div>

      <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-4 shadow-2xl sm:p-5">
        <ChatPanel variant="full" />
      </div>
    </div>
  );
}

export default ChatPage;
