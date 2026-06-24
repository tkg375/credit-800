export default function LogoPreviewPage() {
  return (
    <div className="min-h-screen bg-slate-900 px-8 py-12">
      <h1 className="text-white text-2xl font-bold mb-2">Logo Options</h1>
      <p className="text-slate-400 text-sm mb-12">Preview on dark and light backgrounds</p>

      <div className="space-y-16">

        {/* Option A — Refined Speedometer */}
        <section>
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-4">Option A — Refined Speedometer</p>
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 flex items-center justify-center">
              <LogoA className="h-16 w-auto" />
            </div>
            <div className="bg-white rounded-2xl p-8 flex items-center justify-center">
              <LogoA className="h-16 w-auto" />
            </div>
          </div>
        </section>

        {/* Option B — Shield + Gauge */}
        <section>
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-4">Option B — Shield + Gauge</p>
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 flex items-center justify-center">
              <LogoB className="h-16 w-auto" />
            </div>
            <div className="bg-white rounded-2xl p-8 flex items-center justify-center">
              <LogoB className="h-16 w-auto" />
            </div>
          </div>
        </section>

        {/* Option C — Score Arc */}
        <section>
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-4">Option C — Score Arc</p>
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 flex items-center justify-center">
              <LogoC className="h-16 w-auto" />
            </div>
            <div className="bg-white rounded-2xl p-8 flex items-center justify-center">
              <LogoC className="h-16 w-auto" />
            </div>
          </div>
        </section>

        {/* Option D — Rising Bar Chart */}
        <section>
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-4">Option D — Rising Bar Chart</p>
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 flex items-center justify-center">
              <LogoD className="h-16 w-auto" />
            </div>
            <div className="bg-white rounded-2xl p-8 flex items-center justify-center">
              <LogoD className="h-16 w-auto" />
            </div>
          </div>
        </section>

        {/* Option E — Coin */}
        <section>
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-4">Option E — Coin with 800</p>
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 flex items-center justify-center">
              <LogoE className="h-16 w-auto" />
            </div>
            <div className="bg-white rounded-2xl p-8 flex items-center justify-center">
              <LogoE className="h-16 w-auto" />
            </div>
          </div>
        </section>

        {/* Option F — Arrow in 8 */}
        <section>
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-4">Option F — Upward Arrow in 8</p>
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 flex items-center justify-center">
              <LogoF className="h-16 w-auto" />
            </div>
            <div className="bg-white rounded-2xl p-8 flex items-center justify-center">
              <LogoF className="h-16 w-auto" />
            </div>
          </div>
        </section>

        {/* Option G — Credit Card Chip */}
        <section>
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-4">Option G — Credit Card Chip</p>
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 flex items-center justify-center">
              <LogoG className="h-16 w-auto" />
            </div>
            <div className="bg-white rounded-2xl p-8 flex items-center justify-center">
              <LogoG className="h-16 w-auto" />
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}

/* ── Option A — Refined Speedometer ── */
function LogoA({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 220 60" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="aGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#84cc16" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
      </defs>
      <path d="M8 40 A 22 22 0 0 1 52 40" stroke="url(#aGrad)" strokeWidth="4" strokeLinecap="round" fill="none" />
      <line x1="8.5" y1="39" x2="5" y2="33" stroke="#84cc16" strokeWidth="2" strokeLinecap="round" />
      <line x1="18" y1="20" x2="16" y2="15" stroke="#84cc16" strokeWidth="2" strokeLinecap="round" />
      <line x1="30" y1="16" x2="30" y2="11" stroke="#14b8a6" strokeWidth="2" strokeLinecap="round" />
      <line x1="42" y1="20" x2="44" y2="15" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" />
      <line x1="51.5" y1="39" x2="55" y2="33" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" />
      <line x1="30" y1="40" x2="46" y2="22" stroke="url(#aGrad)" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="30" cy="40" r="3" fill="url(#aGrad)" />
      <line x1="0" y1="30" x2="8" y2="30" stroke="#84cc16" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
      <line x1="0" y1="36" x2="5" y2="36" stroke="#84cc16" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
      <text x="66" y="38" fontFamily="system-ui, sans-serif" fontWeight="800" fontSize="22" letterSpacing="-0.5" fill="#1e293b">CREDIT</text>
      <text x="66" y="55" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="14" letterSpacing="3" fill="url(#aGrad)">800</text>
    </svg>
  );
}

/* ── Option B — Shield + Gauge ── */
function LogoB({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 180 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#84cc16" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
        <linearGradient id="bText" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#38bdf8" />
        </linearGradient>
      </defs>
      <path d="M26 4 L44 9 L44 26 C44 36 35 44 26 47 C17 44 8 36 8 26 L8 9 Z" fill="url(#bGrad)" opacity="0.1" />
      <path d="M26 4 L44 9 L44 26 C44 36 35 44 26 47 C17 44 8 36 8 26 L8 9 Z" stroke="url(#bGrad)" strokeWidth="2" fill="none" />
      <path d="M 15 31 A 11 11 0 0 1 37 31" stroke="url(#bGrad)" strokeWidth="3" strokeLinecap="round" fill="none" />
      <line x1="26" y1="31" x2="34" y2="21" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <circle cx="26" cy="31" r="2" fill="url(#bGrad)" />
      <rect x="54" y="12" width="1.5" height="32" rx="0.75" fill="url(#bGrad)" opacity="0.3" />
      <text x="62" y="30" fontFamily="system-ui, sans-serif" fontWeight="600" fontSize="11" letterSpacing="4" fill="#64748b">CREDIT</text>
      <text x="61" y="46" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="20" letterSpacing="2" fill="url(#bText)">800</text>
    </svg>
  );
}

/* ── Option C — Score Arc ── */
function LogoC({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 180 60" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="cGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#84cc16" />
          <stop offset="50%" stopColor="#14b8a6" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
      </defs>
      {/* Outer track */}
      <path d="M 6 46 A 28 28 0 0 1 62 46" stroke="#e2e8f0" strokeWidth="5" strokeLinecap="round" fill="none" />
      {/* Filled arc ~85% */}
      <path d="M 6 46 A 28 28 0 0 1 58 30" stroke="url(#cGrad)" strokeWidth="5" strokeLinecap="round" fill="none" />
      {/* Score text */}
      <text x="34" y="44" textAnchor="middle" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="18" fill="#06b6d4">800</text>
      {/* Labels */}
      <text x="4" y="56" fontFamily="system-ui, sans-serif" fontSize="7" fill="#94a3b8">300</text>
      <text x="56" y="56" fontFamily="system-ui, sans-serif" fontSize="7" fill="#94a3b8">850</text>
      {/* Wordmark */}
      <rect x="74" y="14" width="1.2" height="32" rx="0.6" fill="#06b6d4" opacity="0.25" />
      <text x="82" y="33" fontFamily="system-ui, sans-serif" fontWeight="700" fontSize="20" letterSpacing="-0.5" fill="#1e293b">CREDIT</text>
      <text x="83" y="50" fontFamily="system-ui, sans-serif" fontWeight="400" fontSize="11" letterSpacing="5" fill="#94a3b8">REPAIR</text>
    </svg>
  );
}

/* ── Option D — Rising Bar Chart ── */
function LogoD({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 200 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="d1" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#84cc16" />
          <stop offset="100%" stopColor="#a3e635" />
        </linearGradient>
        <linearGradient id="d2" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#14b8a6" />
          <stop offset="100%" stopColor="#2dd4bf" />
        </linearGradient>
        <linearGradient id="d3" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#0891b2" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
        <linearGradient id="dText" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#38bdf8" />
        </linearGradient>
      </defs>
      {/* Bars */}
      <rect x="6" y="34" width="12" height="16" rx="3" fill="url(#d1)" />
      <rect x="22" y="22" width="12" height="28" rx="3" fill="url(#d2)" />
      <rect x="38" y="8" width="12" height="42" rx="3" fill="url(#d3)" />
      {/* Trend line */}
      <polyline points="12,34 28,22 44,8" stroke="white" strokeWidth="1.5" strokeDasharray="2 2" opacity="0.5" />
      {/* Wordmark */}
      <text x="62" y="30" fontFamily="system-ui, sans-serif" fontWeight="800" fontSize="20" letterSpacing="-0.5" fill="#1e293b">CREDIT</text>
      <text x="62" y="50" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="22" letterSpacing="1" fill="url(#dText)">800</text>
    </svg>
  );
}

/* ── Option E — Coin with 800 ── */
function LogoE({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 190 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="eGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#84cc16" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
        <linearGradient id="eText" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#38bdf8" />
        </linearGradient>
      </defs>
      {/* Coin outer */}
      <circle cx="28" cy="28" r="24" fill="url(#eGrad)" opacity="0.12" />
      <circle cx="28" cy="28" r="24" stroke="url(#eGrad)" strokeWidth="2.5" />
      {/* Coin inner ring */}
      <circle cx="28" cy="28" r="18" stroke="url(#eGrad)" strokeWidth="1" opacity="0.4" />
      {/* 800 stamped */}
      <text x="28" y="33" textAnchor="middle" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="16" fill="url(#eGrad)">800</text>
      {/* Wordmark */}
      <text x="62" y="24" fontFamily="system-ui, sans-serif" fontWeight="600" fontSize="11" letterSpacing="4" fill="#64748b">CREDIT</text>
      <text x="62" y="44" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="22" letterSpacing="1" fill="url(#eText)">800</text>
    </svg>
  );
}

/* ── Option F — Arrow integrated into wordmark ── */
function LogoF({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 200 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="fGrad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#84cc16" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
      </defs>
      {/* CREDIT small above */}
      <text x="0" y="18" fontFamily="system-ui, sans-serif" fontWeight="600" fontSize="12" letterSpacing="5" fill="#94a3b8">CREDIT</text>
      {/* 800 large */}
      <text x="0" y="48" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="38" letterSpacing="-1" fill="#1e293b">800</text>
      {/* Upward arrow overlaid on the 8 */}
      <path d="M 10 42 L 10 24 M 5 29 L 10 24 L 15 29" stroke="url(#fGrad)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {/* Gradient underline */}
      <rect x="0" y="52" width="100" height="2" rx="1" fill="url(#fGrad)" opacity="0.5" />
    </svg>
  );
}

/* ── Option G — Credit Card Chip ── */
function LogoG({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 200 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="gGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#84cc16" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
        <linearGradient id="gText" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#38bdf8" />
        </linearGradient>
      </defs>
      {/* Chip rectangle */}
      <rect x="4" y="10" width="42" height="34" rx="6" fill="url(#gGrad)" opacity="0.15" />
      <rect x="4" y="10" width="42" height="34" rx="6" stroke="url(#gGrad)" strokeWidth="2" />
      {/* Chip grid lines — horizontal */}
      <line x1="4" y1="22" x2="46" y2="22" stroke="url(#gGrad)" strokeWidth="1" opacity="0.5" />
      <line x1="4" y1="33" x2="46" y2="33" stroke="url(#gGrad)" strokeWidth="1" opacity="0.5" />
      {/* Chip grid lines — vertical */}
      <line x1="19" y1="10" x2="19" y2="44" stroke="url(#gGrad)" strokeWidth="1" opacity="0.5" />
      <line x1="31" y1="10" x2="31" y2="44" stroke="url(#gGrad)" strokeWidth="1" opacity="0.5" />
      {/* Center square */}
      <rect x="19" y="22" width="12" height="11" rx="2" fill="url(#gGrad)" opacity="0.3" />
      {/* Wordmark */}
      <text x="58" y="29" fontFamily="system-ui, sans-serif" fontWeight="800" fontSize="18" letterSpacing="-0.5" fill="#1e293b">CREDIT</text>
      <text x="58" y="48" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="20" letterSpacing="2" fill="url(#gText)">800</text>
    </svg>
  );
}
