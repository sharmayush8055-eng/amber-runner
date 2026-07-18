import React, { useEffect, useState, useCallback } from 'react';
import { scoreApi } from '../../api/api.js';
import { useAuth } from '../../context/AuthContext.jsx';

export default function Leaderboard() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();

  const load = useCallback(() => {
    setLoading(true);
    scoreApi
      .leaderboard(10)
      .then((data) => setEntries(data.leaderboard))
      .catch(() => setError('Could not reach the leaderboard service.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 20000);
    return () => clearInterval(interval);
  }, [load]);

  return (
    <div className="resin-panel pixel-corners rounded-lg p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-amber text-base">Fossil record</h2>
        <span className="text-[10px] uppercase tracking-widest text-bone/40">top runs</span>
      </div>

      {loading && <p className="text-bone/50 text-sm">Digging up scores…</p>}
      {error && <p className="text-danger text-sm">{error}</p>}

      {!loading && !error && entries.length === 0 && (
        <p className="text-bone/50 text-sm">No runs recorded yet. Be the first fossil on the wall.</p>
      )}

      <ol className="space-y-2">
        {entries.map((e, i) => (
          <li
            key={e._id || i}
            className={`flex items-center justify-between rounded-md px-3 py-2 text-sm ${
              user && e.username === user.username ? 'bg-teal/10 border border-teal/30' : 'bg-panelLight/60'
            }`}
          >
            <span className="flex items-center gap-3">
              <span className="font-mono text-bone/40 w-5 text-right">{i + 1}</span>
              <span className="text-bone">{e.username}</span>
            </span>
            <span className="font-mono text-amber">{e.bestScore}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
