import React, { useState } from 'react';

function Signup() {
  const [form, setForm] = useState({
    username: '',
    name: '',
    email: '',
    birthDate: '',
    password: '',
  });

  const [message, setMessage] = useState('');

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSignup = async () => {
    if (!form.username || !form.name || !form.email || !form.birthDate || !form.password) {
      setMessage('Please fill all fields');
      return;
    }

    try {
      const res = await fetch('http://localhost:3000/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage('Signup successful! Please sign in.');
        setForm({ username: '', name: '', email: '', birthDate: '', password: '' });
      } else {
        setMessage(data.error || 'Signup failed');
      }
    } catch (error) {
      setMessage('Error connecting to server');
      console.error(error);
    }
  };

  const inputCls =
    'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-200';

  const labelCls = 'text-xs font-semibold uppercase tracking-wide text-slate-500';
  const isError = message && !message.includes('successful');

  return (
    <div className="mx-auto my-14 flex w-full max-w-md flex-col gap-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-2xl shadow-slate-900/10">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-2xl shadow-lg shadow-indigo-500/30">
            🎬
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">Create your account</h2>
          <p className="mt-1 text-sm text-slate-500">Join MovieMania in seconds</p>
        </div>

        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className={labelCls}>Username</span>
            <input name="username" placeholder="Choose a username" value={form.username} onChange={handleChange} className={inputCls} />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={labelCls}>Name</span>
            <input name="name" placeholder="Your full name" value={form.name} onChange={handleChange} className={inputCls} />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={labelCls}>Email</span>
            <input name="email" type="email" placeholder="you@example.com" value={form.email} onChange={handleChange} className={inputCls} />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={labelCls}>Birth Date</span>
            <input name="birthDate" type="date" value={form.birthDate} onChange={handleChange} className={inputCls} />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={labelCls}>Password</span>
            <input name="password" type="password" placeholder="Create a password" value={form.password} onChange={handleChange} className={inputCls} />
          </label>

          <button
            onClick={handleSignup}
            className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-500/40 hover:brightness-110 active:translate-y-0"
          >
            Create Account
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
        Already have an account?{' '}
        <a href="/signin" className="font-semibold text-indigo-500 hover:text-indigo-600 hover:underline">
          Sign in
        </a>
      </p>
    </div>
  );
}

export default Signup;
