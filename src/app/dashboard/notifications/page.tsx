"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useAuth from "@/hooks/useAuth";
import Header from "@/components/dashboard/Header";
import BottomNav from "@/components/dashboard/BottomNav";
import { useNotifications } from "@/context/NotificationContext";
import {
  Mail,
  FileText,
  CheckCheck,
  ArrowRight,
  Search,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Inbox,
  CheckCircle2,
  ShoppingBag,
  AlertTriangle,
  X,
  Trash2,
} from "lucide-react";

interface PrescriptionItem {
  id: string;
  sender: string | null;
  subject: string | null;
  filename: string;
  attachmentId: string;
  messageId: string;
  status: string; // PENDING, PROCESSED, ORDERED
  receivedAt: string;
}

export default function EmailPrescriptionsHubPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { refreshNotifications } = useNotifications();
  const router = useRouter();

  const [prescriptions, setPrescriptions] = useState<PrescriptionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Pagination & Filter States
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);

  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "unread" | "read" | "ordered">("all");
  const lastFetchedUrlRef = useRef<string>("");

  // Debounce search - only trigger timer when search input changes
  useEffect(() => {
    if (searchInput === debouncedSearch) return;
    const handler = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchInput, debouncedSearch]);

  const loadPrescriptions = useCallback(async (forceRefresh = false) => {
    if (authLoading || !user?.email) return;

    const url = `/api/auth/gmail/prescriptions?email=${encodeURIComponent(
      user.email
    )}&page=${page}&pageSize=${pageSize}&search=${encodeURIComponent(
      debouncedSearch
    )}&statusFilter=${statusFilter}`;

    if (!forceRefresh && lastFetchedUrlRef.current === url) {
      return;
    }
    lastFetchedUrlRef.current = url;

    setLoading(true);
    try {
      const res = await fetch(url);
      const data = await res.json();

      if (data.success) {
        setPrescriptions(data.prescriptions || []);
        setTotalCount(data.pagination?.totalCount || 0);
        setTotalPages(data.pagination?.totalPages || 1);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error("Failed to load email prescriptions:", err);
    } finally {
      setLoading(false);
    }
  }, [user?.email, authLoading, page, pageSize, debouncedSearch, statusFilter]);

  useEffect(() => {
    loadPrescriptions();
  }, [loadPrescriptions]);

  const [syncModal, setSyncModal] = useState<{
    isOpen: boolean;
    type: "success" | "error";
    title: string;
    message: string;
    showConnectBtn?: boolean;
  }>({
    isOpen: false,
    type: "error",
    title: "",
    message: "",
  });

  const handleSyncInbox = async () => {
    if (!user?.email) return;
    setSyncing(true);
    try {
      const res = await fetch("/api/auth/gmail/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chemistEmail: user.email }),
      });
      const data = await res.json();

      if (!res.ok || !data.success || data.error) {
        const errorMsg = data.error || data.message || "Failed to sync Gmail inbox";
        const isNotConnected =
          errorMsg.toLowerCase().includes("no active gmail connection") ||
          errorMsg.toLowerCase().includes("not connected");

        setSyncModal({
          isOpen: true,
          type: "error",
          title: isNotConnected ? "Gmail Not Connected" : "Sync Error",
          message: errorMsg,
          showConnectBtn: isNotConnected,
        });
      } else {
        await refreshNotifications();
        await loadPrescriptions(true);
        setSyncModal({
          isOpen: true,
          type: "success",
          title: "Inbox Synchronized",
          message: data.message || "Gmail inbox scanned successfully!",
          showConnectBtn: false,
        });
      }
    } catch (err: any) {
      setSyncModal({
        isOpen: true,
        type: "error",
        title: "Sync Error",
        message: err?.message || "Network error occurred while syncing Gmail inbox.",
        showConnectBtn: false,
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    if (!user?.email) return;
    try {
      await fetch("/api/auth/gmail/prescriptions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email, id }),
      });
      await refreshNotifications();
      await loadPrescriptions(true);
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user?.email) return;
    try {
      await fetch("/api/auth/gmail/prescriptions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email, markAll: true }),
      });
      await refreshNotifications();
      await loadPrescriptions(true);
    } catch (err) {
      console.error("Failed to mark all read:", err);
    }
  };

  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    id: string | null;
    filename: string;
    deleting: boolean;
  }>({
    isOpen: false,
    id: null,
    filename: "",
    deleting: false,
  });

  const promptDeletePrescription = (item: PrescriptionItem) => {
    setDeleteModal({
      isOpen: true,
      id: item.id,
      filename: item.filename || "prescription.pdf",
      deleting: false,
    });
  };

  const confirmDeletePrescription = async () => {
    if (!user?.email || !deleteModal.id) return;
    setDeleteModal((prev) => ({ ...prev, deleting: true }));
    try {
      const res = await fetch(
        `/api/auth/gmail/prescriptions?id=${encodeURIComponent(deleteModal.id)}&email=${encodeURIComponent(user.email)}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (data.success) {
        await refreshNotifications();
        await loadPrescriptions(true);
      } else {
        alert(data.error || "Failed to remove prescription");
      }
    } catch (err) {
      console.error("Failed to delete prescription:", err);
    } finally {
      setDeleteModal({ isOpen: false, id: null, filename: "", deleting: false });
    }
  };

  const handleOpenOCR = (item: PrescriptionItem) => {
    handleMarkAsRead(item.id);
    router.push(
      `/dashboard/ocr?messageId=${encodeURIComponent(item.messageId)}&attachmentId=${encodeURIComponent(
        item.attachmentId
      )}&filename=${encodeURIComponent(item.filename)}`
    );
  };

  return (
    <div className="min-h-screen bg-background text-on-surface">
      <Header />

      <main className="max-w-[1440px] mx-auto px-margin-mobile md:px-margin-desktop py-xl pb-24 md:pb-12 space-y-8">
        {/* Welcome & Overview Header */}
        <div className="bg-surface border border-outline-variant rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Email Prescriptions Hub</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Auto-ingested prescription attachments from patient emails with deduplication.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl flex items-center gap-2 transition-all cursor-pointer"
              >
                <CheckCheck className="w-4 h-4 text-blue-600" />
                <span>Mark All Read</span>
              </button>
            )}

            <button
              onClick={handleSyncInbox}
              disabled={syncing}
              className="px-4 py-2.5 bg-primary text-on-primary rounded-xl text-xs font-semibold hover:opacity-95 active:scale-95 transition-all shadow flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
              <span>{syncing ? "Scanning Inbox..." : "Sync Gmail Inbox"}</span>
            </button>
          </div>
        </div>

        {/* Stat Counter Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-surface border border-outline-variant shadow-sm rounded-2xl p-5">
            <span className="text-[10px] uppercase font-bold text-outline tracking-wider block">
              Total Email Prescriptions
            </span>
            <span className="text-3xl font-bold text-gray-900 block mt-1">
              {totalCount}
            </span>
          </div>

          <div className="bg-surface border border-outline-variant shadow-sm rounded-2xl p-5">
            <span className="text-[10px] uppercase font-bold text-outline tracking-wider block">
              Unread Prescriptions
            </span>
            <span className="text-3xl font-bold text-blue-600 block mt-1">
              {unreadCount}
            </span>
          </div>

          <div className="bg-surface border border-outline-variant shadow-sm rounded-2xl p-5">
            <span className="text-[10px] uppercase font-bold text-outline tracking-wider block">
              Processed / Ordered
            </span>
            <span className="text-3xl font-bold text-emerald-600 block mt-1">
              {totalCount - unreadCount < 0 ? 0 : totalCount - unreadCount}
            </span>
          </div>
        </div>

        {/* Main List Table Container */}
        <div className="bg-surface border border-outline-variant shadow-sm rounded-2xl overflow-hidden">
          {/* Filters & Search Toolbar */}
          <div className="p-4 sm:p-6 border-b border-outline-variant bg-gray-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Status Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-gray-200/60 rounded-xl self-start overflow-x-auto max-w-full">
              <button
                onClick={() => { setStatusFilter("all"); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  statusFilter === "all"
                    ? "bg-white text-blue-700 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                All
              </button>
              <button
                onClick={() => { setStatusFilter("unread"); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  statusFilter === "unread"
                    ? "bg-white text-blue-700 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <span>Unread</span>
                {unreadCount > 0 && (
                  <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                    {unreadCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => { setStatusFilter("read"); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  statusFilter === "read"
                    ? "bg-white text-blue-700 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Processed
              </button>
              <button
                onClick={() => { setStatusFilter("ordered"); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  statusFilter === "ordered"
                    ? "bg-white text-purple-700 shadow-sm font-bold"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Ordered
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search sender, subject, or filename..."
                className="w-full pl-10 pr-4 h-10 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs text-gray-800 transition-all"
                type="text"
              />
            </div>
          </div>

          {/* List Content */}
          {loading ? (
            <div className="p-16 text-center text-gray-400 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
              <span className="text-xs font-medium">Loading email prescriptions...</span>
            </div>
          ) : prescriptions.length === 0 ? (
            <div className="p-16 text-center text-gray-400 flex flex-col items-center justify-center gap-3">
              <Inbox className="w-10 h-10 text-gray-300 stroke-[1.5]" />
              <p className="text-sm font-semibold text-gray-700">No email prescriptions found</p>
              <p className="text-xs text-gray-400 max-w-sm">
                {searchInput
                  ? "Try adjusting your search criteria."
                  : "Connect your Gmail account or click 'Sync Gmail Inbox' to auto-scan patient email prescriptions."}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-700 border-collapse">
                  <thead className="bg-gray-50 border-b border-gray-100 text-gray-400 uppercase text-[10px] font-bold tracking-wider">
                    <tr>
                      <th className="px-6 py-4">Sender / Patient</th>
                      <th className="px-6 py-4">Subject &amp; Attachment</th>
                      <th className="px-6 py-4">Received Date</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {prescriptions.map((item) => {
                      const isUnread = item.status === "PENDING";
                      const isOrdered = item.status === "ORDERED";
                      const dateStr = new Date(item.receivedAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      });

                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-blue-50/30 transition-colors ${
                            isUnread ? "bg-blue-50/10 font-semibold" : ""
                          }`}
                        >
                          {/* Sender */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                                {(item.sender || "P").slice(0, 1).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <span className="font-semibold text-gray-900 text-xs block truncate max-w-[200px]">
                                  {item.sender || "Patient Email"}
                                </span>
                                <span className="text-[10px] text-gray-400 block truncate max-w-[200px]">
                                  Message ID: {item.messageId.slice(0, 12)}...
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Subject & Attachment */}
                          <td className="px-6 py-4">
                            <div>
                              <span className="font-medium text-gray-900 text-xs block truncate max-w-[260px]">
                                {item.subject || "Prescription Attachment"}
                              </span>
                              <span className="text-[11px] text-blue-600 flex items-center gap-1 mt-0.5 font-mono">
                                <FileText className="w-3.5 h-3.5 text-blue-500" />
                                {item.filename}
                              </span>
                            </div>
                          </td>

                          {/* Received At */}
                          <td className="px-6 py-4 text-gray-500 font-medium text-xs">
                            {dateStr}
                          </td>

                          {/* Status Badge */}
                          <td className="px-6 py-4">
                            {isUnread ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping" />
                                Unread
                              </span>
                            ) : isOrdered ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                                <ShoppingBag className="w-3.5 h-3.5 text-purple-600" />
                                Ordered
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-green-50 text-green-700 border border-green-200">
                                <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                                Processed
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {isUnread && (
                                <button
                                  onClick={() => handleMarkAsRead(item.id)}
                                  className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                                  title="Mark as Read"
                                >
                                  <CheckCheck className="w-4 h-4" />
                                </button>
                              )}

                              <button
                                onClick={() => handleOpenOCR(item)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer ${
                                  isOrdered
                                    ? "bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100"
                                    : "bg-blue-600 hover:bg-blue-700 text-white"
                                }`}
                              >
                                <span>{isOrdered ? "Re-scan OCR" : "Scan in OCR"}</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => promptDeletePrescription(item)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                title="Remove Prescription"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List View */}
              <div className="block md:hidden divide-y divide-gray-100">
                {prescriptions.map((item) => {
                  const isUnread = item.status === "PENDING";
                  const isOrdered = item.status === "ORDERED";
                  const dateStr = new Date(item.receivedAt).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <div key={item.id} className="p-4 space-y-3 hover:bg-gray-50 transition-colors">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                            {(item.sender || "P").slice(0, 1).toUpperCase()}
                          </div>
                          <span className="font-semibold text-xs text-gray-900 truncate max-w-[180px]">
                            {item.sender || "Patient Email"}
                          </span>
                        </div>

                        {isUnread ? (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                            Unread
                          </span>
                        ) : isOrdered ? (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1">
                            <ShoppingBag className="w-3 h-3 text-purple-600" />
                            Ordered
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-green-50 text-green-700 border border-green-200">
                            Processed
                          </span>
                        )}
                      </div>

                      <div>
                        <p className="text-xs text-gray-800 font-medium truncate">{item.subject || "Prescription PDF"}</p>
                        <p className="text-[11px] text-blue-600 font-mono mt-0.5 flex items-center gap-1">
                          <FileText className="w-3 h-3 text-blue-500" />
                          {item.filename}
                        </p>
                      </div>

                      <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                        <span className="text-[10px] text-gray-400">{dateStr}</span>
                        <div className="flex items-center gap-2">
                          {isUnread && (
                            <button
                              onClick={() => handleMarkAsRead(item.id)}
                              className="px-2.5 py-1 text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium"
                            >
                              Mark Read
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenOCR(item)}
                            className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm"
                          >
                            <span>OCR</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => promptDeletePrescription(item)}
                            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Remove Prescription"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination Footer */}
              <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50 text-xs text-gray-500">
                <span>
                  Showing {totalCount > 0 ? (page - 1) * pageSize + 1 : 0} to{" "}
                  {Math.min(page * pageSize, totalCount)} of {totalCount} prescriptions
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded-lg border border-gray-200 hover:bg-white transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    title="Previous Page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="font-semibold text-gray-700">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-1.5 rounded-lg border border-gray-200 hover:bg-white transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    title="Next Page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Dynamic Sync Result / Error Modal Dialog ── */}
        {syncModal.isOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-gray-100 space-y-5 relative animate-in zoom-in-95 duration-200">
              {/* Close Button */}
              <button
                onClick={() => setSyncModal((prev) => ({ ...prev, isOpen: false }))}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Modal Icon & Header */}
              <div className="flex items-start gap-4">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
                    syncModal.type === "error"
                      ? "bg-red-50 text-red-600 border border-red-100"
                      : "bg-green-50 text-green-600 border border-green-100"
                  }`}
                >
                  {syncModal.type === "error" ? (
                    <AlertTriangle className="w-6 h-6" />
                  ) : (
                    <CheckCircle2 className="w-6 h-6" />
                  )}
                </div>
                <div className="pr-6">
                  <h3 className="text-base font-bold text-gray-900 leading-snug">
                    {syncModal.title}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    {syncModal.message}
                  </p>
                </div>
              </div>

              {/* Footer Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-100">
                <button
                  onClick={() => setSyncModal((prev) => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Close
                </button>

                {syncModal.showConnectBtn && (
                  <Link
                    href="/profile"
                    className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <span>Connect Gmail</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Custom Delete Confirmation Modal Dialog ── */}
        {deleteModal.isOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-gray-100 space-y-5 relative animate-in zoom-in-95 duration-200">
              {/* Close Button */}
              <button
                onClick={() => setDeleteModal({ isOpen: false, id: null, filename: "", deleting: false })}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
                disabled={deleteModal.deleting}
              >
                <X className="w-4 h-4" />
              </button>

              {/* Modal Icon & Header */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 border border-red-100 flex items-center justify-center shrink-0 shadow-xs">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div className="pr-6">
                  <h3 className="text-base font-bold text-gray-900 leading-snug">
                    Remove Prescription?
                  </h3>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    Are you sure you want to remove <span className="font-semibold text-gray-800 font-mono">{deleteModal.filename}</span>? This action cannot be undone.
                  </p>
                </div>
              </div>

              {/* Footer Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-100">
                <button
                  onClick={() => setDeleteModal({ isOpen: false, id: null, filename: "", deleting: false })}
                  disabled={deleteModal.deleting}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  onClick={confirmDeletePrescription}
                  disabled={deleteModal.deleting}
                  className="px-4 py-2 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {deleteModal.deleting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Removing...</span>
                    </>
                  ) : (
                    <span>Yes, Remove</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
