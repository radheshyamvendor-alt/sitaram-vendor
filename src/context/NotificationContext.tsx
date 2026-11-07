"use client";

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";

export interface EmailNotification {
  id: string;
  sender?: string;
  subject?: string;
  filename: string;
  attachmentId: string;
  messageId: string;
  receivedAt: string;
  read?: boolean;
}

interface NotificationContextValue {
  notifications: EmailNotification[];
  unreadCount: number;
  markAllAsRead: () => void;
  markAsRead: (id: string) => void;
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue>({
  notifications: [],
  unreadCount: 0,
  markAllAsRead: () => {},
  markAsRead: () => {},
  refreshNotifications: async () => {},
});

export function NotificationProvider({
  chemistEmail,
  children,
}: {
  chemistEmail: string;
  children: React.ReactNode;
}) {
  const [notifications, setNotifications] = useState<EmailNotification[]>([]);
  const seenIds = useRef<Set<string>>(new Set());
  const lastFetchedAtRef = useRef<number>(0);
  const isFetchingRef = useRef<boolean>(false);

  const fetchPrescriptions = useCallback(async (email: string, force = false) => {
    if (!email) return;

    const now = Date.now();
    // Enforce 30-second cooldown unless forced (e.g. manual refresh)
    if (!force && now - lastFetchedAtRef.current < 30000) {
      return;
    }
    // Prevent concurrent overlapping requests
    if (isFetchingRef.current) return;

    isFetchingRef.current = true;
    lastFetchedAtRef.current = now;

    try {
      const res = await fetch(`/api/auth/gmail/prescriptions?email=${encodeURIComponent(email)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.prescriptions)) {
        const loaded: EmailNotification[] = data.prescriptions.map((p: any) => {
          seenIds.current.add(p.messageId);
          return {
            id: p.id,
            sender: p.sender || "Patient Email",
            subject: p.subject || "Prescription PDF",
            filename: p.filename,
            attachmentId: p.attachmentId,
            messageId: p.messageId,
            receivedAt: p.receivedAt,
            read: p.status !== "PENDING",
          };
        });
        setNotifications(loaded);
      }
    } catch {
      // ignore network errors
    } finally {
      isFetchingRef.current = false;
    }
  }, []);

  // Manual only: Zero automatic background timers or mount calls.
  // Prescriptions are only fetched when explicitly requested (e.g. clicking the Bell icon or Sync button).

  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    if (chemistEmail) {
      try {
        await fetch("/api/auth/gmail/prescriptions", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: chemistEmail, markAll: true }),
        });
      } catch {
        // ignore network failure
      }
    }
  };

  const markAsRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    if (chemistEmail && id) {
      try {
        await fetch("/api/auth/gmail/prescriptions", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: chemistEmail, id }),
        });
      } catch {
        // ignore network failure
      }
    }
  };

  const refreshNotifications = async () => {
    await fetchPrescriptions(chemistEmail, true);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, markAllAsRead, markAsRead, refreshNotifications }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
