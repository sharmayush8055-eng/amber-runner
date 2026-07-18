import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { scoreApi } from '../../api/api.js';

// ---- Tunable constants -----------------------------------------------
const CANVAS_W = 900;
const CANVAS_H = 440;
const GROUND_Y = 345;
const GRAVITY = 0.85;
const JUMP_VELOCITY = -9.6;
const BASE_SPEED = 4.2;
const MAX_SPEED = 14;
const SPEED_RAMP = 0.00003; // speed gained per frame
const CYCLE_FRAMES = 2600; // full day/night cycle length in frames
const COINS_FOR_SHIELD = 6;
const SHIELD_DURATION_FRAMES = 210;
const LOCAL_BEST_KEY = 'amber_runner_local_best';

const DAY_SKY_TOP = [46, 40, 33];
const DAY_SKY_BOTTOM = [18, 15, 12];
const NIGHT_SKY_TOP = [10, 12, 22];
const NIGHT_SKY_BOTTOM = [5, 5, 10];

function lerp(a, b, t) {
  return a + (b - a) * t;
}
function lerpColor(c1, c2, t) {
  return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];
}
function rgb([r, g, b]) {
  return `rgb(${r | 0}, ${g | 0}, ${b | 0})`;
}
function aabb(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export default function DinoGame() {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const { user, updateBestScore } = useAuth();

  const [phase, setPhase] = useState('idle'); // idle | playing | paused | over
  const [hudScore, setHudScore] = useState(0);
  const [hudBest, setHudBest] = useState(() => {
    const local = parseInt(localStorage.getItem(LOCAL_BEST_KEY) || '0', 10);
    return user?.bestScore ? Math.max(user.bestScore, local) : local;
  });
  const [runSummary, setRunSummary] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [isNight, setIsNight] = useState(false);
  const [shieldGauge, setShieldGauge] = useState(0);
  const [shieldActive, setShieldActive] = useState(false);
  const [multiplier, setMultiplier] = useState(1);

  // Mutable game state lives in a ref so the render loop never fights React re-renders.
  const stateRef = useRef(null);

  const resetState = useCallback(() => {
    stateRef.current = {
      frame: 0,
      speed: BASE_SPEED,
      distance: 0,
      score: 0,
      coins: 0,
      combo: 0,
      multiplier: 1,
      shieldGauge: 0,
      shieldFramesLeft: 0,
      player: {
        x: 70,
        y: GROUND_Y - 46,
        w: 40,
        h: 46,
        vy: 0,
        onGround: true,
        jumpsUsed: 0,
        maxJumps: 2,
        ducking: false,
        legPhase: 0,
      },
      obstacles: [],
      coinsList: [],
      particles: [],
      spawnCooldown: 70,
      coinCooldown: 90,
      cycle: 0,
      shakeFrames: 0,
    };
  }, []);

  const spawnObstacle = (s) => {
    const roll = Math.random();
    const speedFactor = 1 + Math.min(s.speed / MAX_SPEED, 1) * 0.4;
    if (roll < 0.45) {
      // amber crystal cactus cluster, ground obstacle
      const clusters = 1 + (Math.random() < 0.35 ? 1 : 0);
      s.obstacles.push({
        type: 'cactus',
        x: CANVAS_W + 20,
        y: GROUND_Y - 34,
        w: 18 * clusters + 10,
        h: 34,
        clusters,
      });
    } else if (roll < 0.75) {
      // pterodactyl - flies at one of two heights, must duck or time a jump
      const high = Math.random() < 0.5;
      s.obstacles.push({
        type: 'ptero',
        x: CANVAS_W + 20,
        y: high ? GROUND_Y - 100 : GROUND_Y - 40,
        w: 42,
        h: 26,
        wingPhase: 0,
      });
    } else {
      // rolling boulder - fast, low profile
      s.obstacles.push({
        type: 'boulder',
        x: CANVAS_W + 20,
        y: GROUND_Y - 22,
        w: 22,
        h: 22,
        spin: 0,
      });
    }
    s.spawnCooldown = Math.max(38, 95 - s.speed * 4) / speedFactor + Math.random() * 30;
  };

  const spawnCoin = (s) => {
    const arcHeight = 30 + Math.random() * 70;
    s.coinsList.push({
      x: CANVAS_W + 20,
      y: GROUND_Y - 20 - arcHeight,
      r: 8,
      collected: false,
    });
    s.coinCooldown = 60 + Math.random() * 90;
  };

  const doJump = () => {
    const s = stateRef.current;
    if (!s || phase !== 'playing') return;
    const p = s.player;
    if (p.jumpsUsed < p.maxJumps) {
      p.vy = JUMP_VELOCITY * (p.jumpsUsed === 1 ? 0.85 : 1);
      p.onGround = false;
      p.jumpsUsed += 1;
    }
  };

  const setDuck = (val) => {
    const s = stateRef.current;
    if (!s || phase !== 'playing') return;
    s.player.ducking = val && s.player.onGround;
  };

  const startGame = useCallback(() => {
    resetState();
    setRunSummary(null);
    setHudScore(0);
    setShieldGauge(0);
    setShieldActive(false);
    setMultiplier(1);
    setPhase('playing');
  }, [resetState]);

  const endGame = useCallback(
    (finalScore, s) => {
      setPhase('over');
      const localBest = parseInt(localStorage.getItem(LOCAL_BEST_KEY) || '0', 10);
      const newLocalBest = Math.max(localBest, finalScore);
      localStorage.setItem(LOCAL_BEST_KEY, String(newLocalBest));
      setHudBest((prev) => Math.max(prev, newLocalBest));

      const summary = {
        score: finalScore,
        coins: s.coins,
        distance: Math.round(s.distance),
        isNewLocalBest: finalScore > localBest,
      };
      setRunSummary(summary);

      if (user) {
        setSubmitting(true);
        scoreApi
          .submit({
            score: finalScore,
            coinsCollected: s.coins,
            distance: Math.round(s.distance),
            durationMs: Math.round((s.frame / 60) * 1000),
          })
          .then((data) => {
            if (data.newBest) {
              updateBestScore(data.bestScore);
              setHudBest((prev) => Math.max(prev, data.bestScore));
            }
          })
          .catch(() => {})
          .finally(() => setSubmitting(false));
      }
    },
    [user, updateBestScore]
  );

  // ---- Main render / physics loop --------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const tick = () => {
      const s = stateRef.current;
      if (phase === 'playing' && s) {
        step(s, ctx);
      } else if (s) {
        draw(s, ctx, phase);
      } else {
        drawEmpty(ctx);
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    const step = (s, ctx) => {
      s.frame += 1;
      s.speed = Math.min(MAX_SPEED, BASE_SPEED + s.frame * SPEED_RAMP * 60);
      s.distance += s.speed;

      // day/night cycle progress
      s.cycle = (s.frame % CYCLE_FRAMES) / CYCLE_FRAMES;
      const night = s.cycle > 0.5;
      setIsNight((prev) => (prev !== night ? night : prev));

      // player physics
      const p = s.player;
      p.h = p.ducking ? 28 : 46;
      p.y = p.ducking ? GROUND_Y - 28 : p.y;
      if (!p.onGround || p.vy !== 0) {
        p.vy += GRAVITY;
        p.y += p.vy;
        if (p.y >= GROUND_Y - p.h) {
          p.y = GROUND_Y - p.h;
          p.vy = 0;
          p.onGround = true;
          p.jumpsUsed = 0;
        }
      }
      p.legPhase += s.speed * 0.05;

      // spawn logic
      s.spawnCooldown -= 1;
      if (s.spawnCooldown <= 0) spawnObstacle(s);
      s.coinCooldown -= 1;
      if (s.coinCooldown <= 0) spawnCoin(s);

      // move + collide obstacles
      const playerBox = { x: p.x + 6, y: p.y + 4, w: p.w - 12, h: p.h - 8 };
      let hit = false;
      s.obstacles.forEach((o) => {
        o.x -= s.speed * (o.type === 'boulder' ? 1.25 : 1);
        if (o.type === 'ptero') o.wingPhase += 0.15;
        if (o.type === 'boulder') o.spin += 0.2;
        const obBox = { x: o.x + 3, y: o.y + 3, w: o.w - 6, h: o.h - 6 };
        if (aabb(playerBox, obBox)) hit = true;
      });
      s.obstacles = s.obstacles.filter((o) => o.x > -60);

      if (hit) {
        if (s.shieldFramesLeft > 0) {
          s.obstacles = s.obstacles.filter((o) => {
            const obBox = { x: o.x + 3, y: o.y + 3, w: o.w - 6, h: o.h - 6 };
            return !aabb(playerBox, obBox);
          });
          s.combo = 0;
          s.multiplier = 1;
          setMultiplier(1);
        } else {
          s.shakeFrames = 14;
          const finalScore = Math.round(s.score);
          draw(s, ctx, 'over');
          endGame(finalScore, s);
          return;
        }
      }

      // coins
      s.coinsList.forEach((c) => {
        c.x -= s.speed;
        if (!c.collected) {
          const coinBox = { x: c.x - c.r, y: c.y - c.r, w: c.r * 2, h: c.r * 2 };
          if (aabb(playerBox, coinBox)) {
            c.collected = true;
            s.coins += 1;
            s.combo += 1;
            s.multiplier = 1 + Math.min(4, Math.floor(s.combo / 5)) * 0.5;
            setMultiplier(s.multiplier);
            s.score += 10 * s.multiplier;
            s.shieldGauge = Math.min(COINS_FOR_SHIELD, s.shieldGauge + 1);
            setShieldGauge(s.shieldGauge);
            for (let i = 0; i < 6; i++) {
              s.particles.push({
                x: c.x,
                y: c.y,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4 - 1,
                life: 20,
              });
            }
            if (s.shieldGauge >= COINS_FOR_SHIELD && s.shieldFramesLeft <= 0) {
              s.shieldFramesLeft = SHIELD_DURATION_FRAMES;
              s.shieldGauge = 0;
              setShieldGauge(0);
              setShieldActive(true);
            }
          }
        }
      });
      s.coinsList = s.coinsList.filter((c) => c.x > -20);

      if (s.shieldFramesLeft > 0) {
        s.shieldFramesLeft -= 1;
        if (s.shieldFramesLeft <= 0) setShieldActive(false);
      }

      // particles
      s.particles.forEach((pt) => {
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.life -= 1;
      });
      s.particles = s.particles.filter((pt) => pt.life > 0);

      // score from distance
      s.score += s.speed * 0.04 * s.multiplier;
      setHudScore(Math.round(s.score));

      if (s.shakeFrames > 0) s.shakeFrames -= 1;

      draw(s, ctx, 'playing');
    };

    tick();
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, endGame]);

  // ---- Drawing -----------------------------------------------------------
  const draw = (s, ctx, currentPhase) => {
    const cycle = s.cycle;
    const night = cycle > 0.5;
    const t = night ? (cycle - 0.5) * 2 : cycle * 2;
    const skyTop = night ? lerpColor(DAY_SKY_TOP, NIGHT_SKY_TOP, Math.min(1, t)) : lerpColor(NIGHT_SKY_TOP, DAY_SKY_TOP, Math.min(1, t));
    const skyBottom = night
      ? lerpColor(DAY_SKY_BOTTOM, NIGHT_SKY_BOTTOM, Math.min(1, t))
      : lerpColor(NIGHT_SKY_BOTTOM, DAY_SKY_BOTTOM, Math.min(1, t));

    ctx.save();
    if (s.shakeFrames > 0) {
      ctx.translate((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6);
    }

    // sky
    const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
    grad.addColorStop(0, rgb(skyTop));
    grad.addColorStop(1, rgb(skyBottom));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // stars at night
    if (night) {
      ctx.fillStyle = 'rgba(242,236,217,0.55)';
      for (let i = 0; i < 40; i++) {
        const sx = (i * 137 + s.frame * 0.05) % CANVAS_W;
        const sy = (i * 53) % 140;
        ctx.fillRect(sx, sy, 2, 2);
      }
    }

    // sun / moon
    const orbT = cycle;
    const orbX = orbT * (CANVAS_W + 160) - 80;
    const orbY = 40 + Math.sin(orbT * Math.PI) * -0 + 60 * Math.abs(Math.sin(orbT * Math.PI * 2)) * 0;
    const orbYFixed = 130 - Math.sin(orbT * Math.PI * 2 >= 0 ? orbT * Math.PI : 0) * 0;
    ctx.beginPath();
    ctx.fillStyle = night ? 'rgba(242,236,217,0.85)' : 'rgba(232,163,61,0.9)';
    ctx.arc(orbX, 60, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.fillStyle = night ? 'rgba(47,230,199,0.12)' : 'rgba(232,163,61,0.15)';
    ctx.arc(orbX, 60, 40, 0, Math.PI * 2);
    ctx.fill();

    // distant dunes (parallax)
    ctx.fillStyle = night ? '#161310' : '#241f19';
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y + 10);
    for (let x = 0; x <= CANVAS_W; x += 30) {
      const duneY = GROUND_Y - 6 + Math.sin((x + s.frame * 0.4) * 0.01) * 8;
      ctx.lineTo(x, duneY);
    }
    ctx.lineTo(CANVAS_W, CANVAS_H);
    ctx.lineTo(0, CANVAS_H);
    ctx.closePath();
    ctx.fill();

    // ground line
    ctx.strokeStyle = night ? '#2FE6C7' : '#E8A33D';
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(CANVAS_W, GROUND_Y);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // ground texture dashes (scroll with speed)
    ctx.strokeStyle = 'rgba(242,236,217,0.15)';
    for (let i = 0; i < 20; i++) {
      const dx = (i * 60 - (s.frame * (s.speed || BASE_SPEED)) % 60);
      ctx.beginPath();
      ctx.moveTo(dx, GROUND_Y + 6);
      ctx.lineTo(dx + 20, GROUND_Y + 6);
      ctx.stroke();
    }

    // coins
    s.coinsList.forEach((c) => {
      if (c.collected) return;
      ctx.beginPath();
      ctx.fillStyle = '#FFC978';
      ctx.shadowColor = 'rgba(255,201,120,0.8)';
      ctx.shadowBlur = 8;
      ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    // particles
    s.particles.forEach((pt) => {
      ctx.globalAlpha = Math.max(0, pt.life / 20);
      ctx.fillStyle = '#FFC978';
      ctx.fillRect(pt.x, pt.y, 3, 3);
      ctx.globalAlpha = 1;
    });

    // obstacles
    s.obstacles.forEach((o) => drawObstacle(ctx, o, night));

    // player
    drawPlayer(ctx, s.player, s.shieldFramesLeft > 0, night);

    ctx.restore();

    if (currentPhase === 'idle') {
      overlayText(ctx, 'AMBER RUNNER', 'press space / tap to begin', night);
    } else if (currentPhase === 'paused') {
      overlayText(ctx, 'PAUSED', 'press P to resume', night);
    } else if (currentPhase === 'over') {
      overlayText(ctx, 'RUN OVER', 'press space / tap to try again', night);
    }
  };

  const drawEmpty = (ctx) => {
    ctx.fillStyle = '#12100E';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  };

  const overlayText = (ctx, title, subtitle, night) => {
    ctx.save();
    ctx.fillStyle = 'rgba(18,16,14,0.55)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.textAlign = 'center';
    ctx.fillStyle = night ? '#2FE6C7' : '#E8A33D';
    ctx.font = '700 34px "Space Grotesk", sans-serif';
    ctx.fillText(title, CANVAS_W / 2, CANVAS_H / 2 - 6);
    ctx.fillStyle = '#F2ECD9';
    ctx.font = '500 15px "Space Grotesk", sans-serif';
    ctx.fillText(subtitle, CANVAS_W / 2, CANVAS_H / 2 + 22);
    ctx.restore();
  };

  const drawPlayer = (ctx, p, shielded, night) => {
    ctx.save();
    ctx.translate(p.x, p.y);
    if (shielded) {
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(47,230,199,0.9)';
      ctx.lineWidth = 2;
      ctx.shadowColor = 'rgba(47,230,199,0.8)';
      ctx.shadowBlur = 12;
      ctx.roundRect ? ctx.roundRect(-4, -4, p.w + 8, p.h + 8, 8) : ctx.rect(-4, -4, p.w + 8, p.h + 8);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
    const bodyColor = night ? '#FFC978' : '#E8A33D';
    const duck = p.ducking;
    const bodyY = duck ? 8 : 10;
    const bodyH = duck ? p.h - 12 : p.h - 16;
    ctx.fillStyle = bodyColor;

    // tail
    ctx.beginPath();
    ctx.moveTo(-10, bodyY + bodyH * 0.55);
    ctx.lineTo(5, bodyY + bodyH * 0.2);
    ctx.lineTo(5, bodyY + bodyH * 0.8);
    ctx.closePath();
    ctx.fill();

    // body
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(2, bodyY, p.w - 16, bodyH, 8);
    } else {
      ctx.rect(2, bodyY, p.w - 16, bodyH);
    }
    ctx.fill();

    // back spikes
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const sx = 8 + i * 7;
      ctx.moveTo(sx, bodyY + 1);
      ctx.lineTo(sx + 3.5, bodyY - 6);
      ctx.lineTo(sx + 7, bodyY + 1);
    }
    ctx.fill();

    // head + snout
    const headCX = p.w - 15;
    const headCY = duck ? bodyY + 3 : bodyY - 1;
    ctx.beginPath();
    ctx.arc(headCX, headCY, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(headCX + 7, headCY - 5);
    ctx.lineTo(headCX + 19, headCY - 1);
    ctx.lineTo(headCX + 7, headCY + 7);
    ctx.closePath();
    ctx.fill();

    // eye
    ctx.fillStyle = '#12100E';
    ctx.beginPath();
    ctx.arc(headCX + 2, headCY - 4, 2, 0, Math.PI * 2);
    ctx.fill();

    // little arm
    ctx.strokeStyle = bodyColor;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(p.w - 22, bodyY + bodyH * 0.55);
    ctx.lineTo(p.w - 16, bodyY + bodyH * 0.8);
    ctx.stroke();

    // legs (animated)
    if (!duck) {
      const legOffset = Math.sin(p.legPhase) * 6;
      ctx.strokeStyle = bodyColor;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(8, bodyY + bodyH);
      ctx.lineTo(8 + legOffset, bodyY + bodyH + 10);
      ctx.moveTo(20, bodyY + bodyH);
      ctx.lineTo(20 - legOffset, bodyY + bodyH + 10);
      ctx.stroke();
    }
    ctx.restore();
  };

  const drawObstacle = (ctx, o, night) => {
    ctx.save();
    if (o.type === 'cactus') {
      ctx.fillStyle = night ? '#2FE6C7' : '#B87F2E';
      for (let i = 0; i < o.clusters; i++) {
        ctx.beginPath();
        const cx = o.x + i * 20;
        ctx.moveTo(cx, o.y + o.h);
        ctx.lineTo(cx + 9, o.y);
        ctx.lineTo(cx + 18, o.y + o.h);
        ctx.closePath();
        ctx.fill();
      }
    } else if (o.type === 'ptero') {
      ctx.fillStyle = night ? '#D8452F' : '#D8452F';
      const flap = Math.sin(o.wingPhase) * 10;
      ctx.beginPath();
      ctx.moveTo(o.x, o.y + o.h / 2);
      ctx.lineTo(o.x + o.w / 2, o.y - flap);
      ctx.lineTo(o.x + o.w, o.y + o.h / 2);
      ctx.lineTo(o.x + o.w / 2, o.y + o.h / 2 + 8);
      ctx.closePath();
      ctx.fill();
      if (night) {
        ctx.fillStyle = '#FFC978';
        ctx.beginPath();
        ctx.arc(o.x + o.w / 2, o.y, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (o.type === 'boulder') {
      ctx.translate(o.x + o.w / 2, o.y + o.h / 2);
      ctx.rotate(o.spin);
      ctx.fillStyle = '#8a8378';
      ctx.beginPath();
      ctx.arc(0, 0, o.w / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#12100E';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-o.w / 2, 0);
      ctx.lineTo(o.w / 2, 0);
      ctx.stroke();
    }
    ctx.restore();
  };

  // ---- Input handling ------------------------------------------------
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        if (phase === 'idle' || phase === 'over') startGame();
        else if (phase === 'playing') doJump();
      } else if (e.code === 'ArrowDown') {
        setDuck(true);
      } else if (e.code === 'KeyP') {
        if (phase === 'playing') setPhase('paused');
        else if (phase === 'paused') setPhase('playing');
      }
    };
    const onKeyUp = (e) => {
      if (e.code === 'ArrowDown') setDuck(false);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, startGame]);

  const handleTap = () => {
    if (phase === 'idle' || phase === 'over') startGame();
    else if (phase === 'playing') doJump();
  };

  return (
    <div className="w-full">
      <div className="relative resin-panel pixel-corners rounded-lg overflow-hidden shadow-amberGlow">
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          onMouseDown={handleTap}
          onTouchStart={(e) => {
            e.preventDefault();
            handleTap();
          }}
          className="w-full h-auto block cursor-pointer select-none"
        />
      </div>

      {phase === 'idle' && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={startGame}
            className="bg-amber-gradient text-obsidian font-display text-sm px-8 py-3 rounded-md shadow-amberGlow hover:scale-[1.02] active:scale-95 transition-transform"
          >
            Start run
          </button>
        </div>
      )}

      {phase === 'over' && runSummary && (
        <div className="mt-4 resin-panel pixel-corners rounded-lg p-5 text-center">
          <h3 className="font-display text-amber text-lg mb-2">Run complete</h3>
          <p className="text-bone/80 text-sm mb-1">
            Score: <span className="font-mono text-bone">{runSummary.score}</span> · Coins:{' '}
            <span className="font-mono text-bone">{runSummary.coins}</span> · Distance:{' '}
            <span className="font-mono text-bone">{runSummary.distance}m</span>
          </p>
          {runSummary.isNewLocalBest && (
            <p className="text-teal text-sm mb-2">New personal best on this device.</p>
          )}
          {!user && (
            <p className="text-bone/50 text-xs mb-3">
              Sign in to save this run to the global leaderboard.
            </p>
          )}
          {submitting && <p className="text-bone/50 text-xs mb-3">Syncing score…</p>}
          <button
            onClick={startGame}
            className="bg-amber-gradient text-obsidian font-display text-sm px-8 py-3 rounded-md shadow-amberGlow hover:scale-[1.02] active:scale-95 transition-transform"
          >
            Run again
          </button>
        </div>
      )}

      {/* HUD */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
        <HudStat label="Score" value={hudScore} accent="amber" />
        <HudStat label="Best" value={hudBest} accent="teal" />
        <HudStat label="Multiplier" value={`x${multiplier.toFixed(1)}`} accent="amber" />
        <div className="resin-panel pixel-corners rounded-md p-3">
          <div className="text-xs uppercase tracking-wider text-bone/60 mb-1">Shield gauge</div>
          <div className="h-2 w-full bg-panelLight rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-150 ${shieldActive ? 'bg-teal' : 'bg-amber'}`}
              style={{ width: `${shieldActive ? 100 : (shieldGauge / COINS_FOR_SHIELD) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-bone/60">
        <span>Space / Tap: jump</span>
        <span>·</span>
        <span>Double-tap in air: double jump</span>
        <span>·</span>
        <span>Down arrow: duck under pterodactyls</span>
        <span>·</span>
        <span>P: pause</span>
        <span>·</span>
        <span>{isNight ? 'Night cycle — obstacles glow' : 'Day cycle'}</span>
      </div>
    </div>
  );
}

function HudStat({ label, value, accent }) {
  const color = accent === 'teal' ? 'text-teal' : 'text-amber';
  return (
    <div className="resin-panel pixel-corners rounded-md p-3">
      <div className="text-xs uppercase tracking-wider text-bone/60 mb-1">{label}</div>
      <div className={`text-xl font-semibold ${color}`}>{value}</div>
    </div>
  );
}
