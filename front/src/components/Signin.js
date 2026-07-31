// src/components/Signin.js
import React, { useState } from 'react';

function Signin({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleSignin = async () => {
    console.log('[DEBUG] handleSignin called | username:', username);
    try {
      const res = await fetch('http://localhost:3000/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      console.log('[DEBUG] signin response status:', res.status, '| body:', data);

      if (res.ok) {
        if (data.token) {
          localStorage.setItem('token', data.token);
          console.log('[DEBUG] JWT stored in localStorage (token):', data.token.slice(0, 20) + '...');
        } else {
          console.warn('[DEBUG] signin succeeded but NO token returned by backend');
        }
        setMessage(`Welcome, ${data.user.Name}!`);
        onLogin(data.user);
      } else {
        setMessage(data.error || 'Signin failed');
      }
    } catch (err) {
      console.error('[DEBUG] signin network error:', err);
      setMessage('Error connecting to server');
    }
  };

  const inputCls =
    'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-200';

  const isError = message && !message.includes('Welcome');

  return (
    <div className="mx-auto my-14 flex w-full max-w-md flex-col gap-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-2xl shadow-slate-900/10">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-2xl shadow-lg shadow-indigo-500/30">
            🎬
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">Welcome back</h2>
          <p className="mt-1 text-sm text-slate-500">Sign in to your MovieMania account</p>
        </div>

        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Username</span>
            <input
              placeholder="Enter your username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className={inputCls}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Password</span>
            <input
              placeholder="Enter your password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className={inputCls}
            />
          </label>

          <button
            onClick={handleSignin}
            className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-500/40 hover:brightness-110 active:translate-y-0"
          >
            Sign In
          </button>

          {message && (
            <p
              className={`rounded-lg px-3 py-2 text-center text-sm font-semibold ${
                isError ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
              }`}
            >
              {message}
            </p>
          )}
        </div>
      </div>

      <p className="text-center text-sm text-slate-500">
        Don't have an account?{' '}
        <a href="/signup" className="font-semibold text-indigo-500 hover:text-indigo-600 hover:underline">
          Sign up
        </a>
      </p>
    </div>
  );
}

export default Signin;
