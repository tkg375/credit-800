"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  actionUrl: string | null;
}

function NotificationModal({ n, onClose }: { n: Notification; onClose: () => void }) {
  const typeIcon = (type: string) => {
    switch (type) {
      case "dispute_reminder": return "⏰";
      case "score_change": return "📈";
      case "action_reminder": return "📋";
      case "success": return "✅";
      case "warning": return "⚠️";
      case "goal_achieved": return "🏆";
      default: return "🔔";
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-teal-600 to-cyan-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">{typeIcon(n.type)}</span>
            <h2 className="text-white font-semibold text-base">{n.title}</h2>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white text-2xl leading-none transition">×</button>
        </div>
        <div className="p-6">
          <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">{n.message}</p>
          <p className="text-xs text-slate-400 mt-4">
            {new Date(n.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
          </p>
        </div>
        <div className="px-6 pb-6 flex gap-3">
          {n.actionUrl && (
            <Link
              href={n.actionUrl}
              onClick={onClose}
              className="flex-1 py-2.5 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl text-sm font-medium text-center hover:opacity-90 transition"
            >
              View Details
            </Link>
          )}
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export function NotificationBell({ align = "right" }: { align?: "left" | "right" }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications || []);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = async (id: string) => {
    setLoading(true);
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: id, read: true }),
      });
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    } catch {
      // silently fail
    }
    setLoading(false);
  };

  const markAllRead = async () => {
    setLoading(true);
    const unread = notifications.filter((n) => !n.read);
    await Promise.all(
      unread.map((n) =>
        fetch("/api/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notificationId: n.id, read: true }),
        })
      )
    );
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setLoading(false);
  };

  const handleNotificationClick = (n: Notification) => {
    if (!n.read) markAsRead(n.id);
    setOpen(false);
    setSelectedNotification(n);
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  const typeIcon = (type: string) => {
    switch (type) {
      case "dispute_reminder": return "⏰";
      case "score_change": return "📈";
      case "action_reminder": return "📋";
      case "success": return "✅";
      case "warning": return "⚠️";
      case "goal_achieved": return "🏆";
      default: return "🔔";
    }
  };

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="relative p-2 text-slate-600 hover:text-teal-600 transition"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className={`absolute ${align === "left" ? "left-0 bottom-full mb-2" : "right-0 top-full mt-2"} w-80 max-w-[calc(100vw-1rem)] bg-white rounded-lg shadow-xl border border-slate-200 z-50 max-h-96 overflow-hidden flex flex-col`}>
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <h3 className="font-semibold text-sm text-slate-900">Notifications</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    disabled={loading}
                    className="text-xs text-teal-600 hover:text-teal-700"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="overflow-y-auto flex-1">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-slate-400">
                    No notifications yet
                  </div>
                ) : (
                  notifications.slice(0, 20).map((n) => (
                    <div
                      key={n.id}
                      className={`px-4 py-3 border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition ${!n.read ? "bg-teal-50/50" : ""}`}
                      onClick={() => handleNotificationClick(n)}
                    >
                      <div className="flex gap-2">
                        <span className="text-sm flex-shrink-0">{typeIcon(n.type)}</span>
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm ${!n.read ? "font-medium text-slate-900" : "text-slate-600"}`}>
                            {n.title}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5 truncate">{n.message}</p>
                          <div className="flex items-center justify-between mt-1">
                            <p className="text-xs text-slate-300">{timeAgo(n.createdAt)}</p>
                            <span className="text-xs text-teal-500">tap to read →</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {selectedNotification && (
        <NotificationModal
          n={selectedNotification}
          onClose={() => setSelectedNotification(null)}
        />
      )}
    </>
  );
}
