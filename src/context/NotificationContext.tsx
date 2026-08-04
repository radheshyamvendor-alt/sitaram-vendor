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

  const fetchPrescriptions = useCallback(async (email: string) => {
    if (!email) return;
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
            read: p.status === "PROCESSED",
          };
        });
        setNotifications(loaded);
      }
    } catch {
      // ignore network errors
    }
  }, []);

  // Fetch stored prescriptions ONCE on mount or email change
  useEffect(() => {
    fetchPrescriptions(chemistEmail);
  }, [chemistEmail, fetchPrescriptions]);

  // Single SSE connection for real-time events (zero polling)
  useEffect(() => {
    if (!chemistEmail) return;

    const eventSource = new EventSource(
      `/api/orders/email-received/stream?email=${encodeURIComponent(chemistEmail)}`
    );

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data && data.messageId && !seenIds.current.has(data.messageId)) {
          seenIds.current.add(data.messageId);
          setNotifications((prev) => [
            {
              id: data.id || data.messageId,
              sender: data.sender || "Patient Email",
              subject: data.subject || "Prescription PDF",
              filename: data.filename || "prescription.pdf",
              attachmentId: data.attachmentId,
              messageId: data.messageId,
              receivedAt: data.receivedAt || new Date().toISOString(),
              read: false,
            },
            ...prev,
          ]);
        }
      } catch {
        // ignore parse errors
      }
    };

    return () => {
      eventSource.close();
    };
  }, [chemistEmail]);

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
    await fetchPrescriptions(chemistEmail);
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
