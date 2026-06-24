"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { GetStartedButton } from "@/components/AuthModalButtons";

export function AutopilotHero() {
  const [mounted, setMounted] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [fly, setFly] = useState(false);

  useEffect(() => {
    setMounted(true);
    const t1 = setTimeout(() => setFly(true), 1400);
    const t2 = setTimeout(() => setShowContent(true), 2100);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  if (!mounted) return <div className="min-h-[340px] sm:min-h-[400px]" />;

  return (
    <>
      <style>{`
        @keyframes flyAway {
          0%   { transform: translateX(0) translateY(0) scale(1) rotate(0deg); opacity: 1; }
          100% { transform: translateX(160%) translateY(-60px) scale(0.2) rotate(-20deg); opacity: 0; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fly-away {
          animation: flyAway 0.65s cubic-bezier(0.4, 0, 0.6, 1) forwards;
        }
        .fade-up {
          animation: fadeUp 0.6s ease forwards;
        }
      `}</style>

      <div className="relative min-h-[340px] sm:min-h-[400px] flex items-center justify-center text-center w-full overflow-hidden">

        {/* Engage screen */}
        {!showContent && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {/* Dots */}
            <div
              className="flex items-center gap-3 mb-4 transition-opacity duration-200"
              style={{ opacity: fly ? 0 : 1 }}
            >
              <span className="w-3 h-3 bg-lime-300 rounded-full animate-ping" />
              <span className="text-white/60 text-xs font-mono uppercase tracking-widest">System Ready</span>
              <span className="w-3 h-3 bg-lime-300 rounded-full animate-ping" style={{ animationDelay: "0.2s" }} />
            </div>

            {/* Autopilot — flies away */}
            <div className={fly ? "fly-away" : ""}>
              <h1 className="text-5xl sm:text-7xl font-extrabold text-white tracking-tight">
                Autopilot
              </h1>
            </div>

            {/* Engage label */}
            <p
              className="mt-3 text-2xl sm:text-3xl font-bold text-lime-300 tracking-widest uppercase transition-opacity duration-200"
              style={{ opacity: fly ? 0 : 1 }}
            >
              Engage
            </p>
          </div>
        )}

        {/* Content screen */}
        {showContent && (
          <div className="w-full max-w-2xl mx-auto fade-up">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight text-white mb-2">
              Introducing Autopilot
            </h1>

            <p className="mt-4 text-white/85 text-base sm:text-lg leading-relaxed">
              Autopilot pulls your credit report, generates FCRA-compliant dispute letters, and mails them — automatically, every month.
            </p>

            <div className="mt-8 flex flex-row flex-wrap justify-center gap-3 sm:gap-4">
              <GetStartedButton className="px-6 py-3 bg-white text-[#1a3fd4] hover:bg-blue-50 rounded-lg font-medium transition">
                Start Now →
              </GetStartedButton>
              <Link
                href="/how-it-works"
                className="px-6 py-3 border border-white/50 hover:border-white text-white rounded-lg font-medium transition"
              >
                See How It Works
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
