import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="border-b border-white/5">
      <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <span className="w-3 h-3 rounded-full bg-amber-gradient shadow-amberGlow group-hover:scale-110 transition-transform" />
          <span className="font-display text-lg text-bone tracking-wide">AMBER RUNNER</span>
        </Link>

        <nav className="flex items-center gap-4 text-sm">
          {user ? (
            <>
              <span className="text-bone/60 hidden sm:inline">
                Signed in as <span className="text-amber">{user.username}</span>
              </span>
              <button
                onClick={() => {
                  logout();
                  navigate('/');
                }}
                className="px-3 py-1.5 rounded-md border border-white/10 text-bone/70 hover:text-bone hover:border-teal/50 transition-colors"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-bone/70 hover:text-amber transition-colors">
                Log in
              </Link>
              <Link
                to="/register"
                className="px-3 py-1.5 rounded-md bg-amber-gradient text-obsidian font-medium hover:scale-[1.03] transition-transform"
              >
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
