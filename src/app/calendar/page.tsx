"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { AuthenticatedLayout } from "@/components/AuthenticatedLayout";

interface DisputeEvent {
  id: string;
  creditorName: string;
  bureau: string;
  reason: string;
  status: string;
  createdAt: Date;
  mailedAt: Date | null;
  resolvedAt: Date | null;
  deadlineDate: Date | null; // mailedAt + 30 days
  isOverdue: boolean;
  isRound2Ready: boolean;
  daysSinceMailed: number | null;
  daysUntilDeadline: number | null;
}

function statusColor(status: string) {
  switch (status) {
    case "DRAFT":
      return { dot: "bg-slate-400", badge: "bg-slate-100 text-slate-600", border: "border-slate-200" };
    case "SENT":
      return { dot: "bg-amber-400", badge: "bg-amber-100 text-amber-700", border: "border-amber-200" };
    case "UNDER_INVESTIGATION":
      return { dot: "bg-blue-400", badge: "bg-blue-100 text-blue-700", border: "border-blue-200" };
    case "RESOLVED":
      return { dot: "bg-green-500", badge: "bg-blue-50 text-[#1a3fd4]", border: "border-green-200" };
    case "REJECTED":
      return { dot: "bg-red-400", badge: "bg-red-100 text-red-700", border: "border-red-200" };
    default:
      return { dot: "bg-slate-400", badge: "bg-slate-100 text-slate-600", border: "border-slate-200" };
  }
}

function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function CalendarPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState<DisputeEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "overdue" | "resolved">("all");

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;

    async function loadDisputes() {
      try {
        const res = await fetch("/api/data/disputes", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user!.idToken}`,
          },
          body: JSON.stringify({}),
        });

        const data = await res.json() as { documents?: Record<string, unknown>[] };
        const now = new Date();

        const parsed: DisputeEvent[] = (data.documents || []).map((doc: Record<string, unknown>) => {
            const createdAt = doc.createdAt instanceof Date ? doc.createdAt : new Date(doc.createdAt as string || Date.now());
            const mailedAt = doc.mailedAt ? (doc.mailedAt instanceof Date ? doc.mailedAt : new Date(doc.mailedAt as string)) : null;
            const resolvedAt = doc.resolvedAt ? (doc.resolvedAt instanceof Date ? doc.resolvedAt : new Date(doc.resolvedAt as string)) : null;
            const deadlineDate = mailedAt ? new Date(mailedAt.getTime() + 30 * 24 * 60 * 60 * 1000) : null;

            const daysSinceMailed = mailedAt ? daysBetween(mailedAt, now) : null;
            const daysUntilDeadline = deadlineDate ? daysBetween(now, deadlineDate) : null;
            const isOverdue =
              deadlineDate !== null &&
              now > deadlineDate &&
              doc.status !== "RESOLVED" &&
              doc.status !== "REJECTED";
            const isRound2Ready =
              daysSinceMailed !== null &&
              daysSinceMailed >= 30 &&
              doc.status !== "RESOLVED" &&
              doc.status !== "REJECTED" &&
              !String(doc.reason || "").includes("[Round 2]");

            return {
              id: doc.id as string,
              creditorName: (doc.creditorName as string) || "Unknown",
              bureau: (doc.bureau as string) || "",
              reason: (doc.reason as string) || "",
              status: (doc.status as string) || "DRAFT",
              createdAt,
              mailedAt,
              resolvedAt,
              deadlineDate,
              isOverdue,
              isRound2Ready,
              daysSinceMailed,
              daysUntilDeadline,
            };
          })
          .sort((a: DisputeEvent, b: DisputeEvent) => b.createdAt.getTime() - a.createdAt.getTime());

        setEvents(parsed);
      } catch (err) {
        console.error("Failed to load disputes:", err);
      } finally {
        setLoading(false);
      }
    }

    loadDisputes();
  }, [user]);

  const filtered = events.filter((e) => {
    if (filter === "active") return e.status !== "RESOLVED" && e.status !== "REJECTED";
    if (filter === "overdue") return e.isOverdue || e.isRound2Ready;
    if (filter === "resolved") return e.status === "RESOLVED" || e.status === "REJECTED";
    return true;
  });

  const overdueCount = events.filter((e) => e.isOverdue || e.isRound2Ready).length;
  const activeCount = events.filter((e) => e.status !== "RESOLVED" && e.status !== "REJECTED").length;
  const resolvedCount = events.filter((e) => e.status === "RESOLVED").length;

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#1a3fd4] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <AuthenticatedLayout activeNav="calendar">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] bg-clip-text text-transparent">
            Dispute Timeline
          </h1>
          <p className="text-slate-500 mt-1">
            Track deadlines, follow-ups, and status updates for all your disputes.
          </p>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <p className="text-2xl font-bold text-slate-900">{events.length}</p>
            <p className="text-xs text-slate-500">Total Disputes</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <p className="text-2xl font-bold text-amber-500">{activeCount}</p>
            <p className="text-xs text-slate-500">Active</p>
          </div>
          <div className={`rounded-xl border p-4 text-center ${overdueCount > 0 ? "bg-red-50 border-red-200" : "bg-white border-slate-200"}`}>
            <p className={`text-2xl font-bold ${overdueCount > 0 ? "text-red-500" : "text-slate-900"}`}>{overdueCount}</p>
            <p className="text-xs text-slate-500">Need Follow-Up</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <p className="text-2xl font-bold text-green-500">{resolvedCount}</p>
            <p className="text-xs text-slate-500">Resolved</p>
          </div>
        </div>

        {/* Alert banner for overdue */}
        {overdueCount > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3">
            <span className="text-red-500 text-lg shrink-0">⚠️</span>
            <div>
              <p className="font-medium text-red-800 text-sm">
                {overdueCount} dispute{overdueCount > 1 ? "s" : ""} need{overdueCount === 1 ? "s" : ""} attention
              </p>
              <p className="text-xs text-red-700 mt-0.5">
                The 30-day bureau response window has passed. Consider sending a Round 2 Method of Verification Demand or filing a CFPB complaint.
              </p>
              <Link href="/disputes" className="text-xs text-red-600 font-medium underline mt-1 inline-block">
                Go to Disputes →
              </Link>
            </div>
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {[
            { key: "all" as const, label: "All", count: events.length },
            { key: "active" as const, label: "Active", count: activeCount },
            { key: "overdue" as const, label: "Need Follow-Up", count: overdueCount },
            { key: "resolved" as const, label: "Resolved", count: resolvedCount },
          ].map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${
                filter === key
                  ? "bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300"
              }`}
            >
              {label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${filter === key ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
                {count}
              </span>
            </button>
          ))}
        </div>

        {/* Timeline */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <p className="text-slate-500 mb-4">No disputes found.</p>
            <Link
              href="/disputes"
              className="inline-block px-6 py-2 bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] text-white rounded-xl font-medium hover:opacity-90 transition text-sm"
            >
              Start a Dispute
            </Link>
          </div>
        ) : (
          <div className="relative">
            {/* Vertical timeline line */}
            <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-slate-200" />

            <div className="space-y-4">
              {filtered.map((event) => {
                const colors = statusColor(event.status);
                return (
                  <div key={event.id} className="relative pl-14">
                    {/* Timeline dot */}
                    <div className={`absolute left-3.5 top-5 w-3 h-3 rounded-full border-2 border-white ${colors.dot} shadow`} />

                    <div className={`bg-white rounded-xl border ${event.isOverdue ? "border-red-300 shadow-red-100 shadow" : colors.border} p-4 sm:p-5`}>
                      {/* Alert badge */}
                      {event.isOverdue && (
                        <div className="flex items-center gap-1.5 mb-3 text-red-600 text-xs font-semibold bg-red-50 rounded-lg px-3 py-1.5 w-fit">
                          <span>⚠️</span> Response overdue — consider escalating
                        </div>
                      )}
                      {!event.isOverdue && event.isRound2Ready && (
                        <div className="flex items-center gap-1.5 mb-3 text-amber-700 text-xs font-semibold bg-amber-50 rounded-lg px-3 py-1.5 w-fit">
                          <span>🔔</span> 30 days passed — Round 2 letter recommended
                        </div>
                      )}

                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h3 className="font-semibold text-sm">{event.creditorName}</h3>
                            {event.bureau && (
                              <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">
                                {event.bureau}
                              </span>
                            )}
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors.badge}`}>
                              {event.status.replace(/_/g, " ")}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 truncate">{event.reason}</p>
                        </div>
                      </div>

                      {/* Timeline row */}
                      <div className="mt-4 space-y-2">
                        {/* Created */}
                        <div className="flex items-center gap-3 text-xs">
                          <div className="w-28 text-slate-400 shrink-0">Created</div>
                          <div className="w-2 h-2 rounded-full bg-slate-300 shrink-0" />
                          <div className="text-slate-600">{formatDate(event.createdAt)}</div>
                        </div>

                        {/* Mailed */}
                        {event.mailedAt && (
                          <div className="flex items-center gap-3 text-xs">
                            <div className="w-28 text-slate-400 shrink-0">Letter Mailed</div>
                            <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                            <div className="text-slate-600">{formatDate(event.mailedAt)}</div>
                          </div>
                        )}

                        {/* Deadline */}
                        {event.deadlineDate && event.status !== "RESOLVED" && event.status !== "REJECTED" && (
                          <div className="flex items-center gap-3 text-xs">
                            <div className="w-28 text-slate-400 shrink-0 font-medium">Response Due</div>
                            <div className={`w-2 h-2 rounded-full shrink-0 ${event.isOverdue ? "bg-red-500" : "bg-teal-500"}`} />
                            <div className={`font-medium ${event.isOverdue ? "text-red-600" : "text-teal-600"}`}>
                              {formatDate(event.deadlineDate)}
                              {event.isOverdue
                                ? ` (${Math.abs(event.daysUntilDeadline!)} days overdue)`
                                : event.daysUntilDeadline !== null && event.daysUntilDeadline <= 7
                                ? ` (${event.daysUntilDeadline} days left)`
                                : ""}
                            </div>
                          </div>
                        )}

                        {/* Resolved */}
                        {event.resolvedAt && (
                          <div className="flex items-center gap-3 text-xs">
                            <div className="w-28 text-slate-400 shrink-0">Resolved</div>
                            <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                            <div className="text-green-600 font-medium">{formatDate(event.resolvedAt)}</div>
                          </div>
                        )}

                        {/* 30-day progress bar for sent disputes */}
                        {event.mailedAt && event.status === "SENT" && event.daysSinceMailed !== null && (
                          <div className="mt-3 pt-3 border-t border-slate-100">
                            <div className="flex justify-between text-xs text-slate-500 mb-1">
                              <span>Bureau response window</span>
                              <span>{Math.min(30, event.daysSinceMailed)}/30 days</span>
                            </div>
                            <ProgressBar
                              value={event.daysSinceMailed}
                              max={30}
                              color={event.isOverdue ? "bg-red-400" : event.daysSinceMailed >= 25 ? "bg-amber-400" : "bg-teal-500"}
                            />
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      {(event.isRound2Ready || event.isOverdue) && (
                        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap gap-2">
                          <Link
                            href={`/disputes`}
                            className="px-3 py-1.5 text-xs bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] text-white rounded-lg font-medium hover:opacity-90 transition"
                          >
                            Send Round 2 Letter
                          </Link>
                          <Link
                            href="/cfpb"
                            className="px-3 py-1.5 text-xs border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition"
                          >
                            File CFPB Complaint
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="mt-8 bg-white rounded-xl border border-slate-200 p-4">
          <h3 className="text-sm font-semibold mb-3">Status Guide</h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { status: "DRAFT", label: "Draft — not sent" },
              { status: "SENT", label: "Sent — awaiting response" },
              { status: "UNDER_INVESTIGATION", label: "Under investigation" },
              { status: "RESOLVED", label: "Resolved — removed" },
              { status: "REJECTED", label: "Rejected — verified" },
            ].map(({ status, label }) => {
              const c = statusColor(status);
              return (
                <div key={status} className="flex items-center gap-2 text-xs text-slate-600">
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${c.dot}`} />
                  {label}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-slate-400 mt-3">
            The FCRA requires bureaus to complete investigations within 30 days of receiving a dispute (45 days if you provide additional information).
          </p>
        </div>
      </main>
    </AuthenticatedLayout>
  );
}
