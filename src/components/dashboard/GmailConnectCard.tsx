"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Mail, CheckCircle2, Unlink, Loader2, ExternalLink, RefreshCw, AlertCircle, X } from "lucide-react";
import { useNotifications } from "@/context/NotificationContext";

interface GmailConnectCardProps {
  chemistEmail: string;
}

interface GmailStatus {
  connected: boolean;
  gmailAddress?: string;
  watchExpiry?: string;
  connectedAt?: string;
}

interface DialogState {
  isOpen: boolean;
  title: string;
  message: string;
  type: "success" | "error" | "confirm";
  onConfirm?: () => void;
}

export default function GmailConnectCard({ chemistEmail }: GmailConnectCardProps) {
  const { refreshNotifications } = useNotifications();
  const [status, setStatus] = useState<GmailStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [dialogState, setDialogState] = useState<DialogState | null>(null);
  const fetchedEmailRef = useRef<string | null>(null);

  const fetchStatus = useCallback(async (email: string) => {
    try {
      const res = await fetch(`/api/auth/gmail/status?email=${encodeURIComponent(email)}`);
      if (!res.ok) {
        setStatus({ connected: false });
        return;
      }
      const data = await res.json();
      setStatus(data);
    } catch {
      setStatus({ connected: false });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!chemistEmail) return;

    const params = new URLSearchParams(window.location.search);
    const gmailParam = params.get("gmail");

    if (gmailParam || fetchedEmailRef.current !== chemistEmail) {
      fetchedEmailRef.current = chemistEmail;
      fetchStatus(chemistEmail);

      if (gmailParam === "connected") {
        window.history.replaceState({}, "", window.location.pathname);
      }
    }
  }, [chemistEmail, fetchStatus]);

  const handleConnect = () => {
    window.location.href = `/api/auth/gmail/connect?email=${encodeURIComponent(chemistEmail)}`;
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/auth/gmail/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chemistEmail }),
      });
      const data = await res.json();
      if (data.success) {
        await refreshNotifications();
        setDialogState({
          isOpen: true,
          title: "Inbox Sync Complete",
          message: data.message || "Scanned inbox successfully.",
          type: "success",
        });
      } else {
        setDialogState({
          isOpen: true,
          title: "Sync Failed",
          message: data.error || "Sync failed. Please try again.",
          type: "error",
        });
      }
    } catch {
      setDialogState({
        isOpen: true,
        title: "Sync Failed",
        message: "Failed to connect to email sync service.",
        type: "error",
      });
    } finally {
      setSyncing(false);
    }
  };

  const proceedDisconnect = async () => {
    setDisconnecting(true);
    try {
      await fetch("/api/auth/gmail/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chemistEmail }),
      });
      setStatus({ connected: false });
      fetchedEmailRef.current = null;
    } catch {
      setDialogState({
        isOpen: true,
        title: "Error",
        message: "Failed to disconnect. Please try again.",
        type: "error",
      });
    } finally {
      setDisconnecting(false);
    }
  };

  const handleDisconnectClick = () => {
    setDialogState({
      isOpen: true,
      title: "Disconnect Gmail Account",
      message: "Are you sure you want to disconnect your Gmail account? Auto-scanning of prescription emails will be paused.",
      type: "confirm",
      onConfirm: proceedDisconnect,
    });
  };

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
            <Mail className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Gmail Integration</h3>
            <p className="text-xs text-gray-500">Auto-scan PDF prescriptions from email</p>
          </div>
        </div>

        {/* Body */}
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Checking connection...
          </div>
        ) : status?.connected ? (
          <div className="space-y-3">
            {/* Connected state */}
            <div className="flex items-center gap-2 bg-green-50 text-green-700 rounded-xl px-4 py-3">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium">Connected</p>
                <p className="text-xs text-green-600 truncate">{status.gmailAddress}</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                onClick={handleSync}
                disabled={syncing}
                className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
                {syncing ? "Scanning Inbox..." : "Sync Inbox Now"}
              </button>

              <button
                onClick={handleDisconnectClick}
                disabled={disconnecting}
                className="flex items-center gap-2 text-xs text-red-500 hover:text-red-700 font-medium transition-colors disabled:opacity-50"
              >
                {disconnecting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Unlink className="w-3.5 h-3.5" />
                )}
                Disconnect
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-gray-500 leading-relaxed">
              Connect your Gmail to automatically detect and scan PDF prescriptions
              received via email — no manual upload needed.
            </p>
            <button
              onClick={handleConnect}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-all w-full justify-center"
            >
              <ExternalLink className="w-4 h-4" />
              Connect Gmail Account
            </button>
          </div>
        )}
      </div>

      {/* Beautiful Custom Dialog Modal */}
      {dialogState?.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-2.5">
                {dialogState.type === "success" && (
                  <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                )}
                {dialogState.type === "error" && (
                  <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                )}
                {dialogState.type === "confirm" && (
                  <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
                    <Unlink className="w-4 h-4" />
                  </div>
                )}
                <h3 className="font-semibold text-sm text-gray-900">{dialogState.title}</h3>
              </div>

              <button
                onClick={() => setDialogState(null)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
                type="button"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              <p className="text-xs text-gray-600 leading-relaxed font-normal">
                {dialogState.message}
              </p>

              {/* Actions Footer */}
              <div className="flex items-center justify-end gap-2 pt-2">
                {dialogState.type === "confirm" ? (
                  <>
                    <button
                      onClick={() => setDialogState(null)}
                      className="px-4 py-2 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all"
                      type="button"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        const action = dialogState.onConfirm;
                        setDialogState(null);
                        if (action) action();
                      }}
                      className="px-4 py-2 text-xs font-medium text-white bg-red-600 hover:bg-red-700 active:scale-95 rounded-xl transition-all shadow-sm"
                      type="button"
                    >
                      Disconnect
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setDialogState(null)}
                    className="px-5 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 active:scale-95 rounded-xl transition-all shadow-sm"
                    type="button"
                  >
                    Got it
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

