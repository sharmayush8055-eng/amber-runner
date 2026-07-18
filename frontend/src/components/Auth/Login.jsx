import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not log in. Check your details and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-sm mx-auto mt-10">
      <div className="resin-panel pixel-corners rounded-lg p-6">
        <h1 className="font-display text-amber text-lg mb-1">Welcome back</h1>
        <p className="text-bone/50 text-sm mb-5">Log in to save your runs to the leaderboard.</p>

        <form onSubmit={onSubmit} className="space-y-4">
          <Field
            label="Email"
            type="email"
            value={form.email}
            onChange={(v) => setForm({ ...form, email: v })}
          />
          <Field
            label="Password"
            type="password"
            value={form.password}
            onChange={(v) => setForm({ ...form, password: v })}
          />

          {error && <p className="text-danger text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-gradient text-obsidian font-display text-sm px-4 py-3 rounded-md shadow-amberGlow disabled:opacity-60 hover:scale-[1.01] active:scale-95 transition-transform"
          >
            {loading ? 'Logging in…' : 'Log in'}
          </button>
        </form>

        <p className="text-bone/50 text-sm mt-4">
          New here?{' '}
          <Link to="/register" className="text-teal hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}

function Field({ label, type, value, onChange }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wider text-bone/50">{label}</span>
      <input
        type={type}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full bg-panelLight border border-white/10 rounded-md px-3 py-2 text-bone focus:border-teal outline-none"
      />
    </label>
  );
}
