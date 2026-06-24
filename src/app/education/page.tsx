"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { AuthenticatedLayout } from "@/components/AuthenticatedLayout";
import { educationModules, categories, type EducationModule } from "@/lib/education-content";

export default function EducationPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const [completed, setCompleted] = useState<string[]>([]);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    const saved = localStorage.getItem("credit800_education_progress");
    if (saved) setCompleted(JSON.parse(saved));
  }, []);

  const toggleComplete = (id: string) => {
    setCompleted((prev) => {
      const next = prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id];
      localStorage.setItem("credit800_education_progress", JSON.stringify(next));
      return next;
    });
  };

  const filtered = educationModules.filter((m) => {
    if (activeCategory !== "All" && m.category !== activeCategory) return false;
    if (search && !m.title.toLowerCase().includes(search.toLowerCase()) && !m.summary.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#1a3fd4] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <AuthenticatedLayout activeNav="education">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] bg-clip-text text-transparent">
            Credit Education
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Learn how to build, protect, and repair your credit.
          </p>
        </div>

        {/* Progress Bar */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-5">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-slate-600 font-medium">Your Progress</span>
            <span className="font-semibold text-teal-600">
              {completed.length}/{educationModules.length} completed &nbsp;·&nbsp; {Math.round((completed.length / educationModules.length) * 100)}%
            </span>
          </div>
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] rounded-full transition-all duration-500"
              style={{ width: `${(completed.length / educationModules.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search modules..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-slate-200 mb-4 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm"
        />

        {/* Category — select on mobile, tabs on sm+ */}
        <div className="sm:hidden mb-4">
          <select
            value={activeCategory}
            onChange={(e) => setActiveCategory(e.target.value)}
            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            {["All", ...categories].map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        <div className="hidden sm:flex gap-2 mb-5 overflow-x-auto pb-1">
          {["All", ...categories].map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition flex-shrink-0 ${
                activeCategory === cat
                  ? "bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Module List */}
        <div className="space-y-3">
          {filtered.map((mod) => (
            <div key={mod.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <button
                onClick={() => setExpandedModule(expandedModule === mod.id ? null : mod.id)}
                className="w-full p-4 text-left flex items-start gap-3 hover:bg-slate-50 transition"
              >
                <span className="text-2xl flex-shrink-0 mt-0.5">{mod.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="font-semibold text-sm">{mod.title}</h3>
                    {completed.includes(mod.id) && (
                      <span className="text-xs bg-blue-50 text-[#1a3fd4] px-2 py-0.5 rounded-full font-medium">✓ Done</span>
                    )}
                  </div>
                  <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{mod.category}</span>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1.5 leading-snug">{mod.summary}</p>
                </div>
                <svg
                  className={`w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5 transition-transform ${expandedModule === mod.id ? "rotate-180" : ""}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {expandedModule === mod.id && (
                <div className="border-t border-slate-100 px-4 py-4 sm:px-5 sm:py-5">
                  <div className="prose prose-sm prose-slate max-w-none">
                    {mod.content.split("\n\n").map((paragraph, i) => {
                      if (paragraph.startsWith("**") && paragraph.endsWith("**")) {
                        return <h4 key={i} className="font-semibold text-slate-900 mt-4 mb-2 text-sm">{paragraph.replace(/\*\*/g, "")}</h4>;
                      }
                      const formatted = paragraph
                        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                        .replace(/- (.*)/g, "<li>$1</li>");
                      if (formatted.includes("<li>")) {
                        return <ul key={i} className="list-disc list-inside text-slate-600 space-y-1 ml-2 text-sm" dangerouslySetInnerHTML={{ __html: formatted }} />;
                      }
                      return <p key={i} className="text-slate-600 text-sm leading-relaxed mb-3" dangerouslySetInnerHTML={{ __html: formatted }} />;
                    })}
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <button
                      onClick={() => toggleComplete(mod.id)}
                      className={`w-full sm:w-auto px-5 py-2.5 rounded-lg text-sm font-medium transition ${
                        completed.includes(mod.id)
                          ? "bg-blue-50 text-[#1a3fd4] hover:bg-green-200"
                          : "bg-teal-600 text-white hover:bg-teal-700"
                      }`}
                    >
                      {completed.includes(mod.id) ? "Completed ✓" : "Mark as Completed"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400 text-sm">
              No modules match your search.
            </div>
          )}
        </div>
      </main>
    </AuthenticatedLayout>
  );
}
