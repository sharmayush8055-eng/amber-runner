import React from 'react';
import DinoGame from '../components/Game/DinoGame.jsx';
import Leaderboard from '../components/Leaderboard/Leaderboard.jsx';

export default function Home() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.2em] text-teal mb-2">an original endless runner</p>
        <h1 className="font-display text-2xl sm:text-3xl text-bone leading-tight">
          A dino trapped in resin.<br className="hidden sm:block" /> Every step it breaks a little further free.
        </h1>
        <p className="text-bone/60 text-sm mt-3 max-w-xl">
          Dodge amber cacti, weaving pterodactyls and rolling boulders. Chain coins into a
          multiplier, bank a shield, and watch the world tip from day to bioluminescent night the
          longer you survive.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
        <DinoGame />
        <Leaderboard />
      </div>
    </div>
  );
}
