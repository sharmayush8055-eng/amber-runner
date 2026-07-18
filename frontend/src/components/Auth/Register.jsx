import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form.username, form.email, form.password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create your account. Try different details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-sm mx-auto mt-10">
      <div className="resin-panel pixel-corners rounded-lg p-6">
        <h1 className="font-display text-amber text-lg mb-1">Join the run</h1>
        <p className="text-bone/50 text-sm mb-5">Create an account to appear on the global leaderboard.</p>

        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Username" value={form.username} onChange={(v) => setForm({ ...form, username: v })} />
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
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="text-bone/50 text-sm mt-4">
          Already playing?{' '}
          <Link to="/login" className="text-teal hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}

function Field({ label, type = 'text', value, onChange }) {
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
