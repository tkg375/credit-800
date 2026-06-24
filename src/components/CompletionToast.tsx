"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  actionUrl: string | null;
}

/**
 * Polls notifications and shows a transient toast when a NEW one arrives while
 * the user is on the site (e.g. when background analysis completes). Notifications
 * that already existed when the component mounted are not re-toasted.
 */
export function CompletionToast() {
  const router = useRouter();
  const [toast, setToast] = useState<Notification | null>(null);
  const seenIds = useRef<Set<string> | null>(null);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const poll = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      const notifications: Notification[] = data.notifications || [];

      // First run: record baseline, don't toast anything pre-existing
      if (seenIds.current === null) {
        seenIds.current = new Set(notifications.map((n) => n.id));
        return;
      }

      // Find the newest unseen notification
      const fresh = notifications.find((n) => !seenIds.current!.has(n.id));
      if (fresh) {
        notifications.forEach((n) => seenIds.current!.add(n.id));
        setToast(fresh);
        if (dismissTimer.current) clearTimeout(dismissTimer.current);
        dismissTimer.current = setTimeout(() => setToast(null), 10000);
        // Reload page data when analysis/letter results are ready
        if (fresh.type === "success") {
          window.location.reload();
        }
      }
    } catch {
      // silently ignore
    }
  }, []);

  useEffect(() => {
    poll();
    const interval = setInterval(poll, 15000);
    return () => {
      clearInterval(interval);
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
  }, [poll]);

  if (!toast) return null;

  const icon = toast.type === "warning" ? "⚠️" : "✅";

  return (
    <div className="fixed top-16 right-4 z-[9998] w-[calc(100vw-2rem)] max-w-sm animate-[slideIn_0.3s_ease]">
      <style>{`@keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }`}</style>
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] px-4 py-2.5 flex items-center gap-2">
          <span>{icon}</span>
          <span className="text-white font-semibold text-sm flex-1">{toast.title}</span>
          <button onClick={() => setToast(null)} className="text-white/80 hover:text-white text-lg leading-none">×</button>
        </div>
        <div className="p-4">
          <p className="text-sm text-slate-600 leading-relaxed">{toast.message}</p>
          {toast.actionUrl && (
            <button
              onClick={() => { const url = toast.actionUrl!; setToast(null); router.push(url); }}
              className="mt-3 w-full py-2.5 bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] text-white rounded-xl text-sm font-medium hover:opacity-90 transition"
            >
              View Now
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
