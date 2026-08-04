"use client";

import React, { useState, useRef, useEffect } from "react";
import { Bell, Mail, FileText, ArrowRight, CheckCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useNotifications } from "@/context/NotificationContext";

export default function NotificationBell() {
  const { notifications, unreadCount, markAllAsRead, markAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectNotification = (notif: typeof notifications[number]) => {
    markAsRead(notif.id);
    setIsOpen(false);
    router.push(
      `/dashboard/ocr?messageId=${encodeURIComponent(notif.messageId)}&attachmentId=${encodeURIComponent(notif.attachmentId)}&filename=${encodeURIComponent(notif.filename)}`
    );
  };

  const unreadNotifications = notifications.filter((n) => !n.read);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button with Badge Counter */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-all text-gray-600 hover:text-blue-700 flex items-center justify-center"
        aria-label="Notifications"
        title="Email Prescription Notifications"
      >
        <Bell className="w-5 h-5 text-gray-700" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full h-5 min-w-[20px] px-1 flex items-center justify-center shadow-sm animate-pulse border-2 border-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Popover Header */}
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-blue-600" />
              <h4 className="text-sm font-semibold text-gray-900">Email Prescriptions</h4>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* List Body (Shows ONLY Unread Notifications) */}
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
            {unreadNotifications.length === 0 ? (
              <div className="p-6 text-center text-gray-400 text-xs">
                <Mail className="w-8 h-8 text-gray-300 mx-auto mb-2 opacity-60" />
                No unread email prescriptions.
              </div>
            ) : (
              unreadNotifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleSelectNotification(notif)}
                  className="p-3.5 hover:bg-blue-50/50 transition-colors cursor-pointer flex items-start gap-3 bg-blue-50/20"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-100/60 flex items-center justify-center text-blue-600 shrink-0 mt-0.5">
                    <FileText className="w-4 h-4" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-xs font-semibold text-gray-900 truncate">
                        {notif.sender || "Email Prescription"}
                      </p>
                      <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0"></span>
                    </div>

                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      Attached: {notif.filename}
                    </p>

                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-gray-100">
                      <span className="text-[10px] text-gray-400">
                        {new Date(notif.receivedAt).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <span className="text-xs font-medium text-blue-600 flex items-center gap-1">
                        Scan in OCR <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Popover Footer Link to Dedicated Page */}
          <div className="p-2.5 bg-gray-50 border-t border-gray-100 text-center">
            <button
              onClick={() => {
                setIsOpen(false);
                router.push("/dashboard/notifications");
              }}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center justify-center gap-1.5 w-full py-1 hover:underline transition-all cursor-pointer"
            >
              <span>View All Email Prescriptions Hub</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
