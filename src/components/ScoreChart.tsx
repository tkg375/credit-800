"use client";

import { useEffect, useState } from "react";

const CX = 130;
const CY = 120;
const R = 90;
const START_DEG = 150;
const TOTAL_DEG = 240;
const INITIAL_SCORE = 543;

const ARC_LENGTH = (TOTAL_DEG / 360) * 2 * Math.PI * R; // ≈ 377

function toRad(d: number) { return (d * Math.PI) / 180; }
function arcPoint(deg: number) {
  return { x: CX + R * Math.cos(toRad(deg)), y: CY + R * Math.sin(toRad(deg)) };
}

const sp = arcPoint(START_DEG);                  // 150° → bottom-left
const ep = arcPoint(START_DEG + TOTAL_DEG);      // 390° = 30° → bottom-right

// 240° arc going clockwise through the top (large-arc=1, sweep=1)
const TRACK_PATH = `M ${sp.x.toFixed(2)} ${sp.y.toFixed(2)} A ${R} ${R} 0 1 1 ${ep.x.toFixed(2)} ${ep.y.toFixed(2)}`;

function scoreToFraction(score: number) {
  return Math.max(0, Math.min(1, (score - 300) / (850 - 300)));
}

function scoreLabel(score: number) {
  if (score < 580) return "Poor";
  if (score < 670) return "Fair";
  if (score < 740) return "Good";
  if (score < 800) return "Very Good";
  return "Excellent";
}

// Tick mark positions at score boundaries
const TICKS = [
  { score: 300, label: "" },
  { score: 580, label: "Fair" },
  { score: 670, label: "Good" },
  { score: 740, label: "" },
  { score: 800, label: "" },
  { score: 850, label: "" },
];

export function ScoreChart({ className = "" }: { className?: string }) {
  const [score, setScore] = useState(INITIAL_SCORE);

  useEffect(() => {
    const timeout = setTimeout(() => {
      let current = INITIAL_SCORE;
      const step = () => {
        current = Math.min(800, current + 4);
        setScore(current);
        if (current < 800) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, 700);
    return () => clearTimeout(timeout);
  }, []);

  const fraction = scoreToFraction(score);
  const fillLength = fraction * ARC_LENGTH;

  return (
    <div className={`relative ${className}`} style={{ overflow: "visible" }}>
      {/* ── Floating card: Disputes ── */}
      <div
        className="absolute top-4 right-0 bg-white rounded-2xl shadow-2xl px-4 py-3 flex items-center gap-3 z-10"
        style={{ minWidth: 155 }}
      >
        <div className="w-9 h-9 bg-lime-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-lime-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-400 leading-none">Disputes Won</p>
          <p className="text-base font-bold text-slate-800 mt-1">3 of 5</p>
        </div>
      </div>

      {/* ── Floating card: Loan Readiness ── */}
      <div
        className="absolute top-1/2 -right-4 -translate-y-1/2 bg-white rounded-2xl shadow-2xl px-4 py-3 z-10"
        style={{ minWidth: 145 }}
      >
        <p className="text-xs font-medium text-slate-400 leading-none">Loan Readiness</p>
        <p className="text-base font-bold text-slate-800 mt-1">78%</p>
        <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{ width: "78%", background: "linear-gradient(to right,#14b8a6,#06b6d4)" }}
          />
        </div>
      </div>

      {/* ── Floating card: Saved ── */}
      <div
        className="absolute bottom-4 left-0 bg-white rounded-2xl shadow-2xl px-4 py-3 flex items-center gap-3 z-10"
        style={{ minWidth: 155 }}
      >
        <div className="w-9 h-9 bg-teal-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-400 leading-none">Saved This Month</p>
          <p className="text-base font-bold text-slate-800 mt-1">$1,240</p>
        </div>
      </div>

      {/* ── Main score card ── */}
      <div className="relative bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl px-6 pt-5 pb-4 mx-6 my-16">
        {/* Header row */}
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Credit Score</p>
          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-600 text-xs font-bold px-2.5 py-1 rounded-full">
            ↑ +{score - INITIAL_SCORE} pts
          </span>
        </div>

        {/* AI badge */}
        <div className="flex items-center gap-1.5 mb-3">
          <span className="w-1.5 h-1.5 bg-lime-400 rounded-full animate-pulse" />
          <span className="text-xs text-slate-400 font-medium">Actively monitoring</span>
        </div>

        {/* ── Gauge SVG ── */}
        <svg viewBox="0 0 260 200" className="w-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#84cc16" />
              <stop offset="45%" stopColor="#14b8a6" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
            <filter id="gaugeGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="scoreGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Outer track (gray) */}
          <path
            d={TRACK_PATH}
            fill="none"
            stroke="#f1f5f9"
            strokeWidth="20"
            strokeLinecap="round"
          />

          {/* Colored fill */}
          <path
            d={TRACK_PATH}
            fill="none"
            stroke="url(#gaugeGrad)"
            strokeWidth="20"
            strokeLinecap="round"
            strokeDasharray={`${fillLength} ${ARC_LENGTH + 50}`}
            filter="url(#gaugeGlow)"
          />

          {/* Tick marks at score boundaries */}
          {TICKS.map(({ score: s }) => {
            const f = scoreToFraction(s);
            const angle = START_DEG + f * TOTAL_DEG;
            const inner = arcPoint(angle);
            const outerR = R + 14;
            const outer = {
              x: CX + outerR * Math.cos(toRad(angle)),
              y: CY + outerR * Math.sin(toRad(angle)),
            };
            return (
              <line
                key={s}
                x1={inner.x.toFixed(1)}
                y1={inner.y.toFixed(1)}
                x2={outer.x.toFixed(1)}
                y2={outer.y.toFixed(1)}
                stroke="#cbd5e1"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            );
          })}

          {/* Endpoint dot (current score tip) */}
          {(() => {
            const angle = START_DEG + fraction * TOTAL_DEG;
            const pt = arcPoint(angle);
            return (
              <>
                <circle cx={pt.x} cy={pt.y} r="14" fill="url(#gaugeGrad)" opacity="0.2">
                  <animate attributeName="r" values="10;16;10" dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.25;0.1;0.25" dur="2s" repeatCount="indefinite" />
                </circle>
                <circle cx={pt.x} cy={pt.y} r="7" fill="white" stroke="url(#gaugeGrad)" strokeWidth="3" />
              </>
            );
          })()}

          {/* Score number */}
          <text
            x={CX}
            y={CY + 18}
            fontFamily="ScienceGothic, sans-serif"
            fontSize="54"
            fontWeight="800"
            fill="#0f172a"
            textAnchor="middle"
            filter="url(#scoreGlow)"
          >
            {score}
          </text>

          {/* Score label */}
          <text
            x={CX}
            y={CY + 42}
            fontFamily="ScienceGothic, sans-serif"
            fontSize="13"
            fill="#64748b"
            textAnchor="middle"
            fontWeight="600"
          >
            {scoreLabel(score)}
          </text>

          {/* Bottom arc labels */}
          <text x="44" y="185" fontFamily="ScienceGothic, sans-serif" fontSize="12" fill="#94a3b8" textAnchor="middle">Poor</text>
          <text x="130" y="30" fontFamily="ScienceGothic, sans-serif" fontSize="12" fill="#94a3b8" textAnchor="middle">Good</text>
          <text x="216" y="185" fontFamily="ScienceGothic, sans-serif" fontSize="12" fill="#94a3b8" textAnchor="middle">Excellent</text>
        </svg>

        {/* ── Bottom stats row ── */}
        <div className="grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100 mt-1 pt-3 pb-1">
          <div className="text-center">
            <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wide">Start</p>
            <p className="text-sm font-bold text-slate-500 mt-0.5">{INITIAL_SCORE}</p>
          </div>
          <div className="text-center">
            <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wide">Gained</p>
            <p className="text-sm font-bold text-emerald-500 mt-0.5">+{score - INITIAL_SCORE}</p>
          </div>
          <div className="text-center">
            <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wide">Current</p>
            <p className="text-sm font-bold text-slate-800 mt-0.5">{score}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
