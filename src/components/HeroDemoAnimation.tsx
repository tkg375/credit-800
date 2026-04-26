"use client";

import { useEffect, useRef, useState } from "react";

type Phase = "overview" | "selecting" | "generating" | "won" | "final";

const DISPUTES = [
  { creditor: "Capital One", type: "Late Payment", detail: "Dec 2021", pts: 85 },
  { creditor: "Sprint", type: "Collection Account", detail: "$847 owed", pts: 86 },
  { creditor: "Discover", type: "Hard Inquiry", detail: "Sep 2023", pts: 12 },
];

function scoreColor(s: number) {
  if (s < 580) return "#EF4444";
  if (s < 670) return "#F59E0B";
  if (s < 740) return "#84CC16";
  if (s < 800) return "#14B8A6";
  return "#10B981";
}

function scoreLabel(s: number) {
  if (s < 580) return "Poor";
  if (s < 670) return "Fair";
  if (s < 740) return "Good";
  if (s < 800) return "Very Good";
  return "Exceptional";
}

export default function HeroDemoAnimation() {
  const [phase, setPhase] = useState<Phase>("overview");
  const [score, setScore] = useState(543);
  const [disputeIdx, setDisputeIdx] = useState(-1);
  const [resolvedCount, setResolvedCount] = useState(0);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const startRef = useRef<() => void>(() => {});

  useEffect(() => {
    function clear() {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    }

    function add(ms: number, fn: () => void) {
      timersRef.current.push(setTimeout(fn, ms));
    }

    function countScore(from: number, to: number, startMs: number, durMs: number) {
      const steps = 24;
      for (let i = 1; i <= steps; i++) {
        const v = Math.round(from + ((to - from) / steps) * i);
        add(startMs + (durMs / steps) * i, () => setScore(v));
      }
    }

    function start() {
      clear();
      setPhase("overview");
      setScore(543);
      setDisputeIdx(-1);
      setResolvedCount(0);

      // Dispute 1: Capital One Late Payment
      add(1800, () => { setPhase("selecting"); setDisputeIdx(0); });
      add(3100, () => setPhase("generating"));
      add(5000, () => { setPhase("won"); setResolvedCount(1); });
      countScore(543, 628, 5000, 700);

      // Dispute 2: Sprint Collections
      add(6500, () => { setPhase("selecting"); setDisputeIdx(1); });
      add(7800, () => setPhase("generating"));
      add(9700, () => { setPhase("won"); setResolvedCount(2); });
      countScore(628, 714, 9700, 700);

      // Final: score climbs to 800
      add(11400, () => setPhase("final"));
      countScore(714, 800, 11400, 1300);

      // Loop
      add(15800, start);
    }

    startRef.current = start;
    start();
    return clear;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fillPct = Math.round(((score - 300) / (850 - 300)) * 100);
  const isActive = phase === "selecting" || phase === "generating";

  return (
    <>
      <style>{`
        @keyframes heroFadeUp {
          from { transform: translateY(10px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes heroPop {
          0%   { transform: scale(0.88); opacity: 0; }
          65%  { transform: scale(1.04); }
          100% { transform: scale(1);    opacity: 1; }
        }
        @keyframes heroPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(20,184,166,0.5); }
          50%       { box-shadow: 0 0 0 5px rgba(20,184,166,0); }
        }
        @keyframes heroLine {
          from { width: 0; opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes heroSpin {
          to { transform: rotate(360deg); }
        }
        @keyframes heroFloat {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-5px); }
        }
      `}</style>

      <div
        className="w-full max-w-md mx-auto rounded-2xl overflow-hidden select-none"
        style={{
          boxShadow: "0 32px 72px rgba(0,0,0,0.22), 0 0 0 1px rgba(255,255,255,0.25)",
          animation: "heroFloat 4s ease-in-out infinite",
        }}
      >
        {/* Header bar */}
        <div
          className="px-5 py-3 flex items-center justify-between"
          style={{ background: "linear-gradient(90deg, #4D7C0F 0%, #0F766E 55%, #0891B2 100%)" }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.18)" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                  stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="text-white font-extrabold text-sm tracking-tight">Credit 800</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-lime-400" style={{ animation: "heroPulse 2s ease-in-out infinite" }} />
            <span className="text-white/70 text-xs font-medium">Live Dashboard</span>
          </div>
        </div>

        {/* Body */}
        <div className="bg-white px-5 pt-5 pb-4" style={{ height: 470, overflow: "hidden" }}>

          {/* Score section */}
          <div className="mb-5">
            <div className="flex items-end justify-between mb-2.5">
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">
                  Your Credit Score
                </p>
                <div
                  className="text-5xl font-extrabold leading-none tabular-nums transition-colors duration-300"
                  style={{ color: scoreColor(score) }}
                >
                  {score}
                </div>
              </div>
              <div className="text-right">
                <span
                  className="text-xs font-bold px-3 py-1 rounded-full transition-all duration-300"
                  style={{
                    background: `${scoreColor(score)}18`,
                    color: scoreColor(score),
                    border: `1px solid ${scoreColor(score)}30`,
                  }}
                >
                  {scoreLabel(score)}
                </span>
                {score > 543 && (
                  <div
                    className="text-xs mt-1.5 font-semibold"
                    style={{ color: "#10B981", animation: "heroFadeUp 0.4s ease-out forwards" }}
                  >
                    ↑ +{score - 543} pts
                  </div>
                )}
              </div>
            </div>

            {/* Score range bar */}
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "#F1F5F9" }}>
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${fillPct}%`,
                  background: `linear-gradient(90deg, #EF4444 0%, ${scoreColor(score)} 100%)`,
                }}
              />
            </div>
            <div className="flex justify-between text-[9px] text-slate-300 mt-1 px-0.5">
              <span>Poor</span>
              <span>Fair</span>
              <span>Good</span>
              <span>V.Good</span>
              <span>Exceptional</span>
            </div>
          </div>

          {/* Disputes list */}
          {phase !== "final" && (
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
                  Negative Items
                </p>
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(239,68,68,0.08)", color: "#DC2626" }}
                >
                  {Math.max(0, 3 - resolvedCount)} remaining
                </span>
              </div>

              <div className="space-y-2">
                {DISPUTES.map((d, i) => {
                  const resolved = i < resolvedCount;
                  const active = isActive && disputeIdx === i;
                  return (
                    <div
                      key={i}
                      className="rounded-xl p-3 transition-all duration-300"
                      style={{
                        background: resolved
                          ? "rgba(16,185,129,0.04)"
                          : active
                            ? "rgba(20,184,166,0.06)"
                            : "#FAFAFA",
                        border: resolved
                          ? "1px solid rgba(16,185,129,0.18)"
                          : active
                            ? "1px solid rgba(20,184,166,0.45)"
                            : "1px solid #F0F0F0",
                        animation: active ? "heroPulse 1.1s ease-in-out infinite" : "none",
                        opacity: resolved ? 0.75 : 1,
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5">
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                            style={{
                              background: resolved
                                ? "rgba(16,185,129,0.15)"
                                : active
                                  ? "rgba(20,184,166,0.12)"
                                  : "rgba(239,68,68,0.08)",
                            }}
                          >
                            {resolved ? (
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                                <path stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                              </svg>
                            ) : (
                              <svg width="8" height="8" viewBox="0 0 24 24" fill="none">
                                <path stroke={active ? "#14B8A6" : "#EF4444"} strokeWidth="2.5" strokeLinecap="round" d="M12 8v5m0 3h.01"/>
                              </svg>
                            )}
                          </div>
                          <div>
                            <div
                              className="text-xs font-semibold"
                              style={
                                resolved
                                  ? { textDecoration: "line-through", color: "#94A3B8" }
                                  : { color: "#1E293B" }
                              }
                            >
                              {d.type}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {d.creditor} · {d.detail}
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          {resolved ? (
                            <span
                              className="text-[11px] font-bold"
                              style={{ color: "#10B981" }}
                            >
                              Removed ✓
                            </span>
                          ) : active ? (
                            <span className="text-[11px] font-semibold" style={{ color: "#14B8A6" }}>
                              {phase === "generating" ? "Sending…" : "Analyzing…"}
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-300 font-medium">
                              +{d.pts} pts
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Letter preview */}
                      {active && phase === "generating" && (
                        <div
                          className="mt-2.5 pt-2.5 border-t border-teal-100"
                          style={{ animation: "heroFadeUp 0.3s ease-out forwards" }}
                        >
                          <div className="flex items-center gap-1.5 mb-2">
                            <svg
                              width="10"
                              height="10"
                              viewBox="0 0 24 24"
                              fill="none"
                              style={{ animation: "heroSpin 1.2s linear infinite" }}
                            >
                              <path stroke="#14B8A6" strokeWidth="2.5" strokeLinecap="round" d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4"/>
                            </svg>
                            <span className="text-[10px] font-semibold text-teal-600 uppercase tracking-wide">
                              Generating Dispute Letter
                            </span>
                          </div>
                          <div className="space-y-1.5">
                            {[100, 78, 92, 60].map((w, li) => (
                              <div
                                key={li}
                                className="h-1.5 rounded-full"
                                style={{
                                  width: `${w}%`,
                                  background: "#E2E8F0",
                                  animation: `heroLine 0.5s ease-out ${li * 0.12}s both`,
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Won toast */}
          {phase === "won" && (
            <div
              className="mt-3 rounded-xl p-3 flex items-center gap-3"
              style={{
                background: "rgba(16,185,129,0.07)",
                border: "1px solid rgba(16,185,129,0.22)",
                animation: "heroPop 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards",
              }}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                style={{ background: "rgba(16,185,129,0.14)" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold" style={{ color: "#065F46" }}>Dispute Resolved!</p>
                <p className="text-[11px] text-slate-400">Score is updating now…</p>
              </div>
              <div className="ml-auto text-right shrink-0">
                <p className="text-xl font-extrabold leading-none" style={{ color: "#10B981" }}>
                  +{resolvedCount === 1 ? 85 : 86}
                </p>
                <p className="text-[10px] text-slate-400">pts</p>
              </div>
            </div>
          )}

          {/* Final celebration */}
          {phase === "final" && (
            <div
              className="flex flex-col items-center gap-4 pt-2 pb-2"
              style={{ animation: "heroFadeUp 0.5s ease-out forwards" }}
            >
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, #65A30D, #0F766E)",
                  boxShadow: "0 0 28px rgba(20,184,166,0.45)",
                  animation: "heroPop 0.55s cubic-bezier(0.34,1.56,0.64,1) forwards",
                }}
              >
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                  <path stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                </svg>
              </div>

              <div className="text-center">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">
                  Credit Journey
                </p>
                <p className="text-xl font-extrabold text-slate-800">Goal Reached!</p>
              </div>

              <div
                className="w-full rounded-xl p-4"
                style={{
                  background: "linear-gradient(135deg, rgba(132,204,22,0.07), rgba(20,184,166,0.07))",
                  border: "1px solid rgba(20,184,166,0.18)",
                }}
              >
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-xl font-extrabold" style={{ color: "#10B981" }}>+257</p>
                    <p className="text-[10px] text-slate-400">pts gained</p>
                  </div>
                  <div>
                    <p className="text-xl font-extrabold text-slate-800">2</p>
                    <p className="text-[10px] text-slate-400">disputes won</p>
                  </div>
                  <div>
                    <p className="text-xl font-extrabold" style={{ color: "#0891B2" }}>800</p>
                    <p className="text-[10px] text-slate-400">final score</p>
                  </div>
                </div>
              </div>

              <div className="w-full space-y-1.5">
                {DISPUTES.slice(0, 2).map((d, i) => (
                  <div key={i} className="flex items-center gap-2 text-[11px]">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                      <path stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                    </svg>
                    <span style={{ textDecoration: "line-through", color: "#94A3B8" }}>
                      {d.type} · {d.creditor}
                    </span>
                    <span className="ml-auto font-semibold" style={{ color: "#10B981" }}>
                      Removed
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
