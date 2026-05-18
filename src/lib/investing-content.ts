export interface Fund {
  ticker: string;
  name: string;
  category: string;
  expenseRatio: string;
  description: string;
  bestFor: string;
  minInvestment: string;
  benchmarkIndex: string;
  colorClass: string;
  pros: string[];
  cons: string[];
}

export interface Strategy {
  id: string;
  name: string;
  tagline: string;
  riskLevel: "Conservative" | "Moderate" | "Aggressive" | "Very Aggressive";
  allocations: { ticker: string; label: string; percentage: number; color: string }[];
  description: string;
  bestFor: string;
  expectedReturn: string;
  timeHorizon: string;
}

export interface AccountType {
  id: string;
  name: string;
  icon: string;
  contributionLimit: string;
  taxAdvantage: string;
  bestFor: string;
  keyBenefits: string[];
  keyLimitations: string[];
  priority: number;
}

export const fidelityFunds: Fund[] = [
  {
    ticker: "FZROX",
    name: "Fidelity ZERO Total Market Index Fund",
    category: "US Total Market",
    expenseRatio: "0.00%",
    description:
      "Tracks the Fidelity US Total Investable Market Index, covering large, mid, small, and micro-cap US stocks. With a 0% expense ratio, every dollar you invest goes to work — no fees taken out ever.",
    bestFor: "Core US equity holding for any portfolio",
    minInvestment: "$0",
    benchmarkIndex: "Fidelity US Total Investable Market Index",
    colorClass: "from-teal-500 to-cyan-600",
    pros: [
      "Zero expense ratio — costs you nothing to hold",
      "Instant diversification across ~2,700 US companies",
      "No minimum investment",
      "Simple — one fund covers all of US equities",
    ],
    cons: [
      "Only available at Fidelity (not transferable as-is)",
      "No international exposure",
      "Tracks a proprietary index, not the standard Wilshire 5000",
    ],
  },
  {
    ticker: "FZILX",
    name: "Fidelity ZERO International Index Fund",
    category: "International",
    expenseRatio: "0.00%",
    description:
      "Tracks international developed and emerging market stocks outside the US. Pairs perfectly with FZROX to achieve zero-cost global diversification across thousands of companies worldwide.",
    bestFor: "International diversification complement to FZROX",
    minInvestment: "$0",
    benchmarkIndex: "Fidelity Global ex US Index",
    colorClass: "from-blue-500 to-indigo-600",
    pros: [
      "Zero expense ratio",
      "Covers developed + emerging markets",
      "Perfect FZROX complement for global exposure",
      "No minimum investment",
    ],
    cons: [
      "Fidelity-only fund",
      "Currency and geopolitical risk",
      "Historically lower returns than US equity over past decade",
    ],
  },
  {
    ticker: "FSMDX",
    name: "Fidelity Small/Mid Cap Index Fund",
    category: "Small/Mid Cap",
    expenseRatio: "0.025%",
    description:
      "Tracks small and mid-cap US stocks. Academic research (Fama-French) shows small-cap value stocks have historically delivered higher long-term returns than large caps, though with more volatility. Use alongside FZROX for a small-cap tilt.",
    bestFor: "Aggressive long-term investors seeking small-cap premium",
    minInvestment: "$0",
    benchmarkIndex: "Russell 2500 Index",
    colorClass: "from-lime-500 to-green-600",
    pros: [
      "Historically higher long-term returns (small-cap premium)",
      "Near-zero expense ratio (0.025%)",
      "Diversified across 2,500 small and mid-cap companies",
    ],
    cons: [
      "Higher volatility than total market funds",
      "Can underperform large caps for extended periods",
      "Small additional cost vs FZROX",
    ],
  },
  {
    ticker: "FXAIX",
    name: "Fidelity 500 Index Fund",
    category: "Large Cap",
    expenseRatio: "0.015%",
    description:
      "Tracks the S&P 500 — the 500 largest US companies. The gold standard benchmark that most active fund managers fail to beat. Highly liquid, battle-tested, and nearly free to hold.",
    bestFor: "Pure large-cap US exposure, or if you want S&P 500 specifically",
    minInvestment: "$0",
    benchmarkIndex: "S&P 500 Index",
    colorClass: "from-amber-500 to-orange-500",
    pros: [
      "Tracks the world's most followed index",
      "Extremely low 0.015% expense ratio",
      "Highly liquid and battle-tested",
      "80% overlap with FZROX — simpler if you want large-cap only",
    ],
    cons: [
      "No small/mid-cap exposure (unlike FZROX)",
      "Concentrated in top holdings (Apple, Microsoft, Nvidia ~20%)",
      "Not free (0.015% vs FZROX's 0%)",
    ],
  },
  {
    ticker: "FXNAX",
    name: "Fidelity US Bond Index Fund",
    category: "Bonds",
    expenseRatio: "0.025%",
    description:
      "Tracks the Bloomberg US Aggregate Bond Index — the broad US investment-grade bond market. Adds stability and ballast to a stock-heavy portfolio. Typically rises when stocks fall, reducing overall volatility.",
    bestFor: "Conservative investors or as a stabilizer in a balanced portfolio",
    minInvestment: "$0",
    benchmarkIndex: "Bloomberg US Aggregate Bond Index",
    colorClass: "from-slate-500 to-slate-700",
    pros: [
      "Low correlation to stocks — reduces portfolio swings",
      "Near-zero 0.025% expense ratio",
      "Provides income through interest payments",
      "Essential in conservative or near-retirement portfolios",
    ],
    cons: [
      "Lower long-term returns than equities",
      "Hurt by rising interest rates (as in 2022)",
      "Inflation erodes real returns over time",
    ],
  },
];

export const strategies: Strategy[] = [
  {
    id: "zero_cost_global",
    name: "Zero-Cost Global Portfolio",
    tagline: "Maximum diversification, zero fees",
    riskLevel: "Aggressive",
    allocations: [
      { ticker: "FZROX", label: "US Total Market", percentage: 60, color: "#14b8a6" },
      { ticker: "FZILX", label: "International", percentage: 40, color: "#3b82f6" },
    ],
    description:
      "Hold the entire global stock market for absolutely nothing. 60% US, 40% international mirrors global market-cap weights. You own a tiny piece of every significant company on earth — for $0/year in fees.",
    bestFor: "Long-term investors (10+ years) who want a simple, set-and-forget portfolio",
    expectedReturn: "7–10% historical average (not guaranteed)",
    timeHorizon: "10+ years",
  },
  {
    id: "small_cap_tilt",
    name: "Small-Cap Tilt Portfolio",
    tagline: "Pursue the small-cap premium",
    riskLevel: "Very Aggressive",
    allocations: [
      { ticker: "FZROX", label: "US Total Market", percentage: 50, color: "#14b8a6" },
      { ticker: "FSMDX", label: "Small/Mid Cap", percentage: 30, color: "#84cc16" },
      { ticker: "FZILX", label: "International", percentage: 20, color: "#3b82f6" },
    ],
    description:
      "Overweights small and mid-cap stocks relative to market cap. Academic research (Fama-French three-factor model) shows that small-cap stocks have historically earned a premium over large caps over multi-decade periods, though with more short-term volatility.",
    bestFor: "Aggressive investors with 15+ year horizon who can stomach more volatility",
    expectedReturn: "8–11% historical average (higher risk, not guaranteed)",
    timeHorizon: "15+ years",
  },
  {
    id: "three_fund",
    name: "Classic Three-Fund Portfolio",
    tagline: "The Bogleheads favorite",
    riskLevel: "Moderate",
    allocations: [
      { ticker: "FZROX", label: "US Total Market", percentage: 60, color: "#14b8a6" },
      { ticker: "FZILX", label: "International", percentage: 20, color: "#3b82f6" },
      { ticker: "FXNAX", label: "US Bonds", percentage: 20, color: "#64748b" },
    ],
    description:
      "The classic three-fund portfolio championed by Vanguard founder Jack Bogle and the Bogleheads community. Simple, diversified, and battle-tested. The bond allocation reduces volatility while stocks drive long-term growth.",
    bestFor: "Moderate-risk investors or those within 10 years of retirement",
    expectedReturn: "6–8% historical average",
    timeHorizon: "7–15 years",
  },
  {
    id: "conservative",
    name: "Conservative Income Portfolio",
    tagline: "Stability first",
    riskLevel: "Conservative",
    allocations: [
      { ticker: "FZROX", label: "US Total Market", percentage: 40, color: "#14b8a6" },
      { ticker: "FXNAX", label: "US Bonds", percentage: 40, color: "#64748b" },
      { ticker: "FZILX", label: "International", percentage: 20, color: "#3b82f6" },
    ],
    description:
      "A 40/40/20 portfolio that prioritizes stability. Heavier bond allocation significantly reduces drawdowns during market crashes — in 2008 this would have lost ~25% instead of ~50%. Best for those who can't stomach large drops.",
    bestFor: "Near-retirees, conservative investors, or those who lost sleep in 2022",
    expectedReturn: "5–7% historical average",
    timeHorizon: "5–10 years",
  },
];

export const accountTypes: AccountType[] = [
  {
    id: "roth_ira",
    name: "Roth IRA",
    icon: "🌱",
    contributionLimit: "$7,000/year ($8,000 if 50+)",
    taxAdvantage: "Tax-FREE growth — pay taxes now, never again",
    bestFor: "Anyone under ~45 expecting to be in a higher tax bracket later",
    keyBenefits: [
      "Contributions can be withdrawn anytime, penalty-free",
      "Qualified withdrawals in retirement are 100% tax-free",
      "No required minimum distributions (RMDs)",
      "Best account to hold FZROX for decades",
    ],
    keyLimitations: [
      "Income limits: phaseout starts at $146k (single) / $230k (married) in 2024",
      "$7,000/year cap",
      "Earnings can't be withdrawn before 59½ without penalty",
    ],
    priority: 1,
  },
  {
    id: "401k",
    name: "401(k) / 403(b)",
    icon: "🏢",
    contributionLimit: "$23,000/year ($30,500 if 50+)",
    taxAdvantage: "Pre-tax contributions lower your taxable income today",
    bestFor: "Anyone with employer match — that's free money, contribute at least to the match",
    keyBenefits: [
      "Much higher contribution limits than IRA",
      "Employer match is an instant 50–100% return",
      "Automatic payroll deduction makes saving effortless",
      "Some plans offer Roth 401k option (best of both worlds)",
    ],
    keyLimitations: [
      "Limited fund options (depends on your employer's plan)",
      "10% penalty + taxes for early withdrawals",
      "Required minimum distributions starting at age 73",
    ],
    priority: 2,
  },
  {
    id: "taxable",
    name: "Taxable Brokerage",
    icon: "📈",
    contributionLimit: "Unlimited",
    taxAdvantage: "No immediate tax benefit — but no restrictions either",
    bestFor: "After maxing Roth IRA and 401k, or for goals before retirement",
    keyBenefits: [
      "No contribution limits",
      "Full flexibility — withdraw anytime for any reason",
      "Long-term capital gains taxed at lower rate (0%, 15%, or 20%)",
      "FZROX's zero turnover minimizes taxable events",
    ],
    keyLimitations: [
      "Dividends and capital gains taxed each year",
      "No upfront tax deduction",
      "Requires more tax awareness (tax-loss harvesting, etc.)",
    ],
    priority: 3,
  },
  {
    id: "hsa",
    name: "HSA (Health Savings Account)",
    icon: "🏥",
    contributionLimit: "$4,150/year single ($8,300 family)",
    taxAdvantage: "Triple tax-free: deductible contributions, tax-free growth, tax-free withdrawals for medical",
    bestFor: "Anyone with a high-deductible health plan (HDHP) — the most tax-efficient account available",
    keyBenefits: [
      "Triple tax advantage — no account beats it",
      "After 65, works like a traditional IRA for non-medical expenses",
      "Invest contributions in index funds (FZROX) for long-term growth",
      "No 'use it or lose it' — rolls over every year",
    ],
    keyLimitations: [
      "Must have a qualifying high-deductible health plan",
      "Non-medical withdrawals before 65 face 20% penalty + taxes",
      "Not all employers offer HSA-compatible plans",
    ],
    priority: 0,
  },
];

export const priorityOrder = ["hsa", "401k", "roth_ira", "taxable"];
