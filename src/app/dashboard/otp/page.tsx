"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useAuth from "@/hooks/useAuth";
import { getChemistIdFromToken } from "@/lib/jwt";
import { getDashboardOverview, startDelivery, deleteOrder, updateOrder } from "@/app/actions/order";
import OTPModal from "@/components/dashboard/OTPModal";
import EditOrderDialog from "@/components/dashboard/EditOrderDialog";
import ConfirmationDialog from "@/components/dashboard/ConfirmationDialog";
import Header from "@/components/dashboard/Header";
import BottomNav from "@/components/dashboard/BottomNav";

export interface DashboardOrder {
  id: string;
  patientId?: string | null;
  prescriptionNumber: string | null;
  patientName?: string | null;
  patientMobile?: string | null;
  patientAddress?: string | null;
  medicines?: string | null;
  status: string;
  otp: string | null;
  createdAt: string | Date;
  patient?: {
    name: string;
    mobile: string;
    address: string;
  } | null;
}

export function formatMedicinesDisplay(medicinesStr?: string | null): string {
  if (!medicinesStr) return "Prescription Medicines";
  try {
    const parsed = JSON.parse(medicinesStr);
    if (Array.isArray(parsed)) {
      return parsed.map((m: any) => `${m.name} (x${m.quantity || 1})`).join(", ");
    }
  } catch {
    // If raw text
  }
  return medicinesStr;
}

export default function OTPVerificationPage() {
  const { user, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  // OTP Modal Overlay States
  const [isOtpOpen, setIsOtpOpen] = useState(false);
  const [otpPrescriptionNo, setOtpPrescriptionNo] = useState("");
  const [otpOrderId, setOtpOrderId] = useState("");

  // Edit Order modal states
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<DashboardOrder | null>(null);

  // Delete confirmation modal states
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [orderIdToDelete, setOrderIdToDelete] = useState("");

  // Pagination states
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Search states
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchInput]);

  // Reset page to 1 on search change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  // Single Unified Query for Dashboard Overview (Stats + Paginated Orders)
  const tokenInfo = getChemistIdFromToken();
  const activeChemistId = tokenInfo.chemistId || undefined;

  const { data: dashboardResult, isLoading, error } = useQuery({
    queryKey: ["dashboard-overview", page, user?.email, debouncedSearch, activeChemistId],
    queryFn: () => getDashboardOverview(page, pageSize, user?.email, debouncedSearch, activeChemistId),
    enabled: !authLoading,
  });

  // Start Delivery mutation
  const startDeliveryMutation = useMutation({
    mutationFn: (orderId: string) => startDelivery(orderId),
    onSuccess: (result, orderId) => {
      if (result.success && result.data) {
        queryClient.invalidateQueries({ queryKey: ["dashboard-overview"] });
        
        // Open OTP Verification Dialog directly
        setOtpOrderId(orderId);
        setOtpPrescriptionNo(result.data.prescriptionNumber || "");
        setIsOtpOpen(true);
      }
    },
  });

  // Delete order mutation
  const deleteOrderMutation = useMutation({
    mutationFn: (orderId: string) => deleteOrder(orderId),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["dashboard-overview"] });
      } else {
        alert(result.error || "Failed to delete order");
      }
    },
  });

  // Update order mutation
  const updateOrderMutation = useMutation({
    mutationFn: ({ orderId, input }: { orderId: string; input: any }) => updateOrder(orderId, input),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["dashboard-overview"] });
      } else {
        alert(result.error || "Failed to update order");
      }
    },
  });

  const stats = (dashboardResult && dashboardResult.success && dashboardResult.stats) ? dashboardResult.stats : {
    totalMedicines: 0,
    ordersToday: 0,
    pendingDeliveries: 0,
    completedDeliveries: 0,
  };

  const recentOrders = (dashboardResult?.success ? (dashboardResult.orders ?? []) : []) as DashboardOrder[];
  const totalPages = dashboardResult?.success ? (dashboardResult.pagination?.totalPages ?? 1) : 1;
  const totalCount = dashboardResult?.success ? (dashboardResult.pagination?.totalCount ?? 0) : 0;

  const handleStartDelivery = (order: DashboardOrder) => {
    startDeliveryMutation.mutate(order.id);
  };

  const handleEnterOtp = (order: DashboardOrder) => {
    setOtpOrderId(order.id);
    setOtpPrescriptionNo(order.prescriptionNumber || "");
    setIsOtpOpen(true);
  };

  const handleDeleteOrder = (orderId: string) => {
    setOrderIdToDelete(orderId);
    setIsConfirmOpen(true);
  };

  const handleUpdateOrderSubmit = async (orderId: string, input: any) => {
    const res = await updateOrderMutation.mutateAsync({ orderId, input });
    if (!res.success) {
      throw new Error(res.error || "Failed to update order");
    }
  };

  return (
    <div className="min-h-screen bg-background text-on-surface">
      {/* Unified Navigation Header */}
      <Header />

      {/* Main Panel Content */}
      <main className="max-w-[1440px] mx-auto px-margin-mobile md:px-margin-desktop py-xl pb-24 md:pb-12 space-y-8">
        {/* Welcome Banner */}
        <div className="bg-surface-container-lowest border border-outline-variant shadow-sm rounded-xl p-6 glass-card flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-headline-md font-bold text-on-surface mb-1">
              {user?.name || "Chemist"}!
            </h2>
            <p className="text-sm text-on-surface-variant">
              Scan prescriptions, track customer orders, and verify package deliveries securely.
            </p>
          </div>
          
          <div className="flex gap-2">
            <Link
              href="/dashboard/ocr"
              className="px-4 py-2.5 bg-[#003d9b] text-white rounded-xl font-label-md text-label-md hover:opacity-95 transition-all shadow flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">document_scanner</span>
              <span>Scan Prescription</span>
            </Link>
          </div>
        </div>

        {/* Loading Spinner */}
        {isLoading && !dashboardResult ? (
          <div className="p-12 flex flex-col items-center justify-center bg-surface-container-lowest border border-outline-variant rounded-xl glass-card">
            <svg className="animate-spin h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="mt-4 text-on-surface-variant text-sm font-semibold">Updating statistics counts...</span>
          </div>
        ) : error && !dashboardResult ? (
          <div className="p-6 text-center text-error font-medium bg-surface-container-lowest border border-outline-variant rounded-xl glass-card">
            Failed to sync dashboard statistics: {(error as Error).message || "Unknown error"}
          </div>
        ) : (
          <>
            {/* Stat Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {/* Orders Today */}
              <div className="bg-surface-container-lowest border border-outline-variant shadow-sm rounded-xl p-5 glass-card">
                <span className="text-[10px] uppercase font-bold text-outline tracking-wider block">
                  Orders Today
                </span>
                <span className="text-display-lg text-[32px] font-bold text-on-surface block mt-1">
                  {stats.ordersToday}
                </span>
              </div>

              {/* Pending Deliveries */}
              <div className="bg-surface-container-lowest border border-outline-variant shadow-sm rounded-xl p-5 glass-card">
                <span className="text-[10px] uppercase font-bold text-outline tracking-wider block">
                  Pending Deliveries
                </span>
                <span className="text-display-lg text-[32px] font-bold text-amber-600 block mt-1">
                  {stats.pendingDeliveries}
                </span>
              </div>

              {/* Completed Deliveries */}
              <div className="bg-surface-container-lowest border border-outline-variant shadow-sm rounded-xl p-5 glass-card">
                <span className="text-[10px] uppercase font-bold text-outline tracking-wider block">
                  Completed Deliveries
                </span>
                <span className="text-display-lg text-[32px] font-bold text-emerald-600 block mt-1">
                  {stats.completedDeliveries}
                </span>
              </div>
            </div>

            {/* Recent Activity Table */}
            <div className="bg-surface-container-lowest border border-outline-variant shadow-sm rounded-xl overflow-hidden glass-card">
              <div className="px-6 py-4 border-b border-outline-variant bg-surface-container-lowest flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h3 className="font-bold text-headline-sm text-on-surface">Recent Orders Queue</h3>
                <div className="relative w-full md:w-80">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">search</span>
                  <input
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="w-full pl-10 pr-4 h-11 bg-surface-container-low border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all text-sm outline-none text-on-surface"
                    placeholder="Search by Rx, patient, or mobile..."
                    type="text"
                  />
                </div>
              </div>

              <div className={`transition-opacity duration-200 ${isLoading ? "opacity-60" : "opacity-100"}`}>
                {recentOrders.length === 0 ? (
                  <div className="p-12 text-center text-on-surface-variant font-medium">
                    {searchInput ? "No orders found matching your search." : "No orders placed yet. Head over to the Medicine Catalog to create one!"}
                  </div>
                ) : (
                  <>
                  {/* Table View — shown on Medium screens and up */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full border-collapse text-left text-sm text-on-surface">
                      <thead className="bg-surface-container border-b border-outline-variant">
                        <tr>
                          <th className="px-6 py-3.5 font-label-md text-label-md text-outline uppercase tracking-wider">
                            Prescription No
                          </th>
                          <th className="px-6 py-3.5 font-label-md text-label-md text-outline uppercase tracking-wider">
                            Patient Details
                          </th>
                          <th className="px-6 py-3.5 font-label-md text-label-md text-outline uppercase tracking-wider">
                            Ordered Medicines
                          </th>
                          <th className="px-6 py-3.5 font-label-md text-label-md text-outline uppercase tracking-wider">
                            Order Date
                          </th>
                          <th className="px-6 py-3.5 font-label-md text-label-md text-outline uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3.5 font-label-md text-label-md text-outline uppercase tracking-wider text-right">
                            Delivery Action
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant bg-surface-container-lowest">
                        {recentOrders.map((order) => {
                          const dateFormatted = order.createdAt
                            ? new Date(order.createdAt).toLocaleDateString("en-GB", {
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "N/A";

                          return (
                            <tr key={order.id} className="hover:bg-surface-container/40 transition-colors group">
                              {/* Prescription Number */}
                              <td className="px-6 py-4 font-mono font-bold text-xs text-primary">
                                {order.prescriptionNumber || "N/A"}
                              </td>
                              {/* Patient Info */}
                              <td className="px-6 py-4">
                                <div>
                                  <span className="font-bold text-on-surface text-sm block">
                                    {order.patientName || order.patient?.name || "Anonymous Patient"}
                                  </span>
                                  <span className="text-[10px] text-on-surface-variant block">
                                    {order.patientMobile || order.patient?.mobile || "N/A"}
                                  </span>
                                </div>
                              </td>
                              {/* Medicines summary list */}
                              <td className="px-6 py-4">
                                <div className="max-w-[220px] truncate" title={formatMedicinesDisplay(order.medicines)}>
                                  <span className="block text-xs text-on-surface font-medium">
                                    {formatMedicinesDisplay(order.medicines)}
                                  </span>
                                </div>
                              </td>
                              {/* Date */}
                              <td className="px-6 py-4 text-on-surface-variant font-medium text-xs">
                                {dateFormatted}
                              </td>
                              {/* Status badge */}
                              <td className="px-6 py-4 text-center">
                                {order.status === "PENDING" && (
                                  <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600">
                                    Pending
                                  </span>
                                )}
                                {order.status === "SHIPPED" && (
                                  <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-primary/10 border border-primary-container/30 text-[#003d9b]">
                                    Shipped
                                  </span>
                                )}
                                {order.status === "COMPLETED" && (
                                  <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600">
                                    Completed
                                  </span>
                                )}
                              </td>
                              {/* Action Button */}
                              <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-sm">
                                  {order.status !== "COMPLETED" && (
                                    <>
                                      <button
                                        onClick={() => { setEditingOrder(order); setIsEditOpen(true); }}
                                        className="p-1.5 rounded-lg text-primary hover:bg-primary/10 transition-colors"
                                        title="Edit Order"
                                      >
                                        <span className="material-symbols-outlined text-[18px]">edit</span>
                                      </button>
                                      <button
                                        onClick={() => handleDeleteOrder(order.id)}
                                        className="p-1.5 rounded-lg text-error hover:bg-error/10 transition-colors"
                                        title="Delete/Cancel Order"
                                      >
                                        <span className="material-symbols-outlined text-[18px]">delete</span>
                                      </button>
                                    </>
                                  )}
                                  {order.status === "PENDING" && (
                                    <button
                                      onClick={() => handleStartDelivery(order)}
                                      disabled={startDeliveryMutation.isPending}
                                      className="px-3 py-1.5 bg-[#003d9b] text-white rounded-lg text-xs font-bold shadow hover:opacity-90 active:scale-95 transition-all flex items-center gap-1 shrink-0"
                                    >
                                      <span className="material-symbols-outlined text-xs">local_shipping</span>
                                      <span>Start Delivery</span>
                                    </button>
                                  )}
                                  {order.status === "SHIPPED" && (
                                    <button
                                      onClick={() => handleEnterOtp(order)}
                                      className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-bold shadow hover:bg-amber-600 active:scale-95 transition-all flex items-center gap-1 shrink-0"
                                    >
                                      <span className="material-symbols-outlined text-xs">lock_open</span>
                                      <span>Verify OTP</span>
                                    </button>
                                  )}
                                  {order.status === "COMPLETED" && (
                                    <span className="text-xs font-bold text-on-surface-variant flex items-center gap-1 select-none shrink-0">
                                      <span className="material-symbols-outlined text-xs text-emerald-600">check_circle</span>
                                      <span>Delivered</span>
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Card List View — shown on Mobile/Tablet */}
                  <div className="block md:hidden divide-y divide-outline-variant bg-surface">
                    {recentOrders.map((order: DashboardOrder) => {
                      const dateFormatted = new Date(order.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      });

                      return (
                        <div key={order.id} className="p-5 space-y-4 hover:bg-surface-container-low transition-colors">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-[10px] uppercase font-bold text-outline tracking-wider block">
                                Prescription No
                              </span>
                              <span className="font-mono font-bold text-primary text-sm select-all">
                                {order.prescriptionNumber || "No Prescription"}
                              </span>
                            </div>
                            <div>
                              {order.status === "PENDING" && (
                                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600">
                                  Pending
                                </span>
                              )}
                              {order.status === "SHIPPED" && (
                                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-primary/10 border border-primary-container/30 text-[#003d9b]">
                                  Shipped
                                </span>
                              )}
                              {order.status === "COMPLETED" && (
                                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600">
                                  Completed
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div>
                              <span className="text-[10px] font-bold text-outline uppercase tracking-wider block mb-0.5">
                                Patient Name
                              </span>
                              <span className="font-semibold text-on-surface text-sm">
                                {order.patientName || order.patient?.name || "Anonymous Patient"}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold text-outline uppercase tracking-wider block mb-0.5">
                                Mobile Number
                              </span>
                              <span className="font-semibold text-on-surface text-sm">
                                {order.patientMobile || order.patient?.mobile || "N/A"}
                              </span>
                            </div>
                          </div>

                          <div>
                            <span className="text-[10px] font-bold text-outline uppercase tracking-wider block mb-1">
                              Ordered Medicines
                            </span>
                              <span className="block text-xs text-on-surface font-medium">
                                {formatMedicinesDisplay(order.medicines)}
                              </span>
                          </div>

                          <div className="flex justify-between items-center pt-2">
                            <span className="text-[10px] text-on-surface-variant font-medium">
                              {dateFormatted}
                            </span>
                            <div className="flex items-center gap-2">
                              {order.status !== "COMPLETED" && (
                                <div className="flex gap-1 mr-1">
                                  <button
                                    onClick={() => { setEditingOrder(order); setIsEditOpen(true); }}
                                    className="p-1.5 rounded-lg text-primary hover:bg-primary/10 transition-colors"
                                    title="Edit Order"
                                  >
                                    <span className="material-symbols-outlined text-[18px]">edit</span>
                                  </button>
                                  <button
                                    onClick={() => handleDeleteOrder(order.id)}
                                    className="p-1.5 rounded-lg text-error hover:bg-error/10 transition-colors"
                                    title="Delete Order"
                                  >
                                    <span className="material-symbols-outlined text-[18px]">delete</span>
                                  </button>
                                </div>
                              )}
                              {order.status === "PENDING" && (
                                <button
                                  onClick={() => handleStartDelivery(order)}
                                  disabled={startDeliveryMutation.isPending}
                                  className="px-3 py-1.5 bg-[#003d9b] text-white rounded-lg text-xs font-bold shadow hover:opacity-90 active:scale-95 transition-all flex items-center gap-1.5"
                                >
                                  <span className="material-symbols-outlined text-[14px]">local_shipping</span>
                                  <span>Start Delivery</span>
                                </button>
                              )}
                              {order.status === "SHIPPED" && (
                                <button
                                  onClick={() => handleEnterOtp(order)}
                                  className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-bold shadow hover:bg-amber-600 active:scale-95 transition-all flex items-center gap-1.5"
                                >
                                  <span className="material-symbols-outlined text-[14px]">lock_open</span>
                                  <span>Verify OTP</span>
                                </button>
                              )}
                              {order.status === "COMPLETED" && (
                                <span className="text-xs font-bold text-on-surface-variant flex items-center gap-1 select-none py-1">
                                  <span className="material-symbols-outlined text-xs text-emerald-600">check_circle</span>
                                  <span>Delivered</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Pagination Footer */}
                  <div className="p-lg border-t border-outline-variant flex items-center justify-between">
                    <span className="font-label-md text-label-md text-on-surface-variant font-medium">
                      Showing {totalCount > 0 ? (page - 1) * pageSize + 1 : 0} to {Math.min(page * pageSize, totalCount)} of {totalCount} orders
                    </span>
                    <div className="flex gap-xs">
                      <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                        className="px-4 py-2 border border-outline-variant rounded-lg text-label-md font-label-md hover:bg-surface-container-low transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                        Previous
                      </button>
                      <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                        className="px-4 py-2 bg-[#003d9b] text-white rounded-lg text-label-md font-label-md hover:opacity-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold">
                        Next
                      </button>
                    </div>
                  </div>
                </>
              )}
              </div>
            </div>
          </>
        )}
      </main>

      {/* OTP Delivery Verification Modal */}
      <OTPModal
        isOpen={isOtpOpen}
        onClose={() => setIsOtpOpen(false)}
        prescriptionNumber={otpPrescriptionNo}
        orderId={otpOrderId}
      />

      {/* Edit Order Modal */}
      <EditOrderDialog
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSubmit={handleUpdateOrderSubmit}
        order={editingOrder}
      />

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={() => {
          if (orderIdToDelete) {
            deleteOrderMutation.mutate(orderIdToDelete);
          }
        }}
        title="Cancel & Delete Order"
        message="Are you sure you want to cancel and delete this order? All reserved medicine stocks will be returned to inventory."
        confirmText="Cancel Order"
        cancelText="Keep Order"
        type="danger"
      />

      {/* Shared Responsive Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
