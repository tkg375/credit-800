"use client";

import { useState } from "react";

export function AutopilotNotify() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "duplicate">("idle");

  const handleSubmit = async () => {
    if (!email.includes("@")) return;
    setState("loading");
    try {
      const res = await fetch("/api/autopilot/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      setState(data.duplicate ? "duplicate" : "done");
    } catch {
      setState("idle");
    }
  };

  if (state === "done") {
    return <p className="text-center text-sm text-teal-600 font-medium py-2">✓ We'll notify you when it's live!</p>;
  }

  if (state === "duplicate") {
    return <p className="text-center text-sm text-slate-500 py-2">You're already on the list!</p>;
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-400 text-center">Get notified when Autopilot launches</p>
      <div className="flex gap-2">
        <input
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          className="flex-1 min-w-0 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400"
        />
        <button
          onClick={handleSubmit}
          disabled={state === "loading" || !email.includes("@")}
          className="px-3 py-2 bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] text-white rounded-xl text-sm font-medium hover:opacity-90 transition disabled:opacity-50 shrink-0"
        >
          {state === "loading" ? "..." : "Notify Me"}
        </button>
      </div>
    </div>
  );
}
