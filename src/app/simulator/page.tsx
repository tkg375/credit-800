"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { AuthenticatedLayout } from "@/components/AuthenticatedLayout";
import { ProGate } from "@/components/ProGate";
import { scenarios, simulateScoreChange, type SimulationResult } from "@/lib/score-simulator";

function ScoreGauge({ score, label, color }: { score: number; label: string; color: string }) {
  const min = 300;
  const max = 850;
  const pct = ((score - min) / (max - min)) * 100;
  const angle = -90 + (pct / 100) * 180;

  return (
    <div className="text-center">
      <svg viewBox="0 0 200 120" className="w-48 h-auto mx-auto">
        <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#e2e8f0" strokeWidth="12" strokeLinecap="round" />
        <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="url(#gaugeGrad)" strokeWidth="12" strokeLinecap="round"
          strokeDasharray={`${pct * 2.51} 251`} />
        <defs>
          <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="33%" stopColor="#f59e0b" />
            <stop offset="66%" stopColor="#84cc16" />
            <stop offset="100%" stopColor="#14b8a6" />
          </linearGradient>
        </defs>
        <line
          x1="100" y1="100"
          x2={100 + 60 * Math.cos((angle * Math.PI) / 180)}
          y2={100 + 60 * Math.sin((angle * Math.PI) / 180)}
          stroke={color} strokeWidth="3" strokeLinecap="round"
        />
        <circle cx="100" cy="100" r="4" fill={color} />
        <text x="100" y="90" textAnchor="middle" fontSize="28" fontWeight="800" fill={color}>{score}</text>
        <text x="20" y="115" textAnchor="middle" fontSize="10" fill="#94a3b8">300</text>
        <text x="180" y="115" textAnchor="middle" fontSize="10" fill="#94a3b8">850</text>
      </svg>
      <p className="text-sm text-slate-500 mt-1">{label}</p>
    </div>
  );
}

export default function SimulatorPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [currentScore, setCurrentScore] = useState(650);
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const [params, setParams] = useState<Record<string, number>>({});
  const [result, setResult] = useState<SimulationResult | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading, router]);

  const handleSimulate = () => {
    if (!selectedScenario) return;
    const sim = simulateScoreChange(currentScore, selectedScenario, params);
    setResult(sim);
  };

  const scenario = scenarios.find((s) => s.id === selectedScenario);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#1a3fd4] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <AuthenticatedLayout activeNav="simulator">
      <ProGate feature="Score Simulator">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2 bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] bg-clip-text text-transparent">
          Credit Score Simulator
        </h1>
        <p className="text-slate-500 mb-8">See how different actions could affect your credit score.</p>

        {/* Current Score Input */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">Your Current Credit Score</label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min={300}
              max={850}
              value={currentScore}
              onChange={(e) => { setCurrentScore(Number(e.target.value)); setResult(null); }}
              className="flex-1 accent-[#1a3fd4]"
            />
            <input
              type="number"
              min={300}
              max={850}
              value={currentScore}
              onChange={(e) => { setCurrentScore(Math.min(850, Math.max(300, Number(e.target.value)))); setResult(null); }}
              className="w-24 px-3 py-2 rounded-lg border border-slate-300 text-center font-bold text-lg"
            />
          </div>
        </div>

        {/* Scenario Selection */}
        <h2 className="text-lg font-semibold mb-3">Choose a Scenario</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mb-6">
          {scenarios.map((s) => (
            <button
              key={s.id}
              onClick={() => { setSelectedScenario(s.id); setParams({}); setResult(null); }}
              className={`p-4 rounded-xl border-2 text-left transition ${
                selectedScenario === s.id ? "border-teal-500 bg-teal-50" : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <h3 className="font-medium text-sm">{s.title}</h3>
              <p className="text-xs text-slate-500 mt-1">{s.description}</p>
            </button>
          ))}
        </div>

        {/* Scenario Inputs */}
        {scenario && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
            <h3 className="font-semibold mb-4">{scenario.title}</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {scenario.inputs.map((input) => (
                <div key={input.key}>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{input.label}</label>
                  {input.type === "select" ? (
                    <select
                      value={params[input.key] || ""}
                      onChange={(e) => setParams({ ...params, [input.key]: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm"
                    >
                      <option value="">Select...</option>
                      {input.options?.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="number"
                      min={input.min}
                      max={input.max}
                      value={params[input.key] || ""}
                      onChange={(e) => setParams({ ...params, [input.key]: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm"
                    />
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={handleSimulate}
              className="mt-4 px-6 py-3 bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] text-white rounded-xl font-medium hover:opacity-90 transition"
            >
              Simulate
            </button>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h3 className="font-semibold mb-6 text-center">Estimated Score Change</h3>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-8 mb-6">
              <ScoreGauge score={currentScore} label="Current Score" color="#94a3b8" />
              <div className="text-3xl font-bold">
                {result.impact === "positive" ? (
                  <span className="text-green-500">→</span>
                ) : result.impact === "negative" ? (
                  <span className="text-red-500">→</span>
                ) : (
                  <span className="text-slate-400">→</span>
                )}
              </div>
              <ScoreGauge
                score={Math.round((result.newScoreMin + result.newScoreMax) / 2)}
                label={`Est. ${result.newScoreMin}–${result.newScoreMax}`}
                color={result.impact === "positive" ? "#14b8a6" : result.impact === "negative" ? "#ef4444" : "#94a3b8"}
              />
            </div>

            <div className={`rounded-xl p-4 ${
              result.impact === "positive" ? "bg-blue-50 border border-blue-200" :
              result.impact === "negative" ? "bg-red-50 border border-red-200" :
              "bg-slate-50 border border-slate-200"
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">
                  {result.impact === "positive" ? "📈" : result.impact === "negative" ? "📉" : "➡️"}
                </span>
                <span className="font-medium">
                  {result.impact === "positive"
                    ? `+${result.newScoreMin - currentScore} to +${result.newScoreMax - currentScore} points`
                    : result.impact === "negative"
                    ? `${result.newScoreMin - currentScore} to ${result.newScoreMax - currentScore} points`
                    : "No significant change"}
                </span>
              </div>
              <p className="text-sm text-slate-600">{result.explanation}</p>
            </div>

            <p className="text-xs text-slate-400 mt-4 text-center">
              These are estimates based on general scoring models. Actual results may vary.
            </p>
          </div>
        )}
      </main>
      </ProGate>
    </AuthenticatedLayout>
  );
}
