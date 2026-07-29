"use client";

import { useEffect, useState } from "react";
import { UpdateOrderInput } from "@/app/actions/order";

export interface MedicineItem {
  name: string;
  quantity: number;
}

interface EditOrderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (orderId: string, input: UpdateOrderInput) => Promise<void>;
  order?: {
    id: string;
    prescriptionNumber: string | null;
    status: string;
    patientName?: string | null;
    patientMobile?: string | null;
    patientAddress?: string | null;
    medicines?: string | null;
    patient?: {
      name: string;
      mobile: string;
      address: string;
    } | null;
  } | null;
}

function parseMedicinesString(raw?: string | null): MedicineItem[] {
  if (!raw || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => ({
        name: String(item.name || ""),
        quantity: Number(item.quantity) || 1,
      }));
    }
  } catch {
    // Failover for legacy comma-separated text e.g. "TELSARTAN 80 (x8), AMLO 5 (x15)"
    const items = raw.split(",").map((s) => s.trim()).filter(Boolean);
    return items.map((itemStr) => {
      const match = itemStr.match(/^(.+?)(?:\s*\(x(\d+)\))?$/i);
      if (match) {
        return {
          name: match[1].trim(),
          quantity: match[2] ? parseInt(match[2], 10) : 1,
        };
      }
      return { name: itemStr, quantity: 1 };
    });
  }
  return [];
}

export default function EditOrderDialog({
  isOpen,
  onClose,
  onSubmit,
  order,
}: EditOrderDialogProps) {
  const [prescriptionNo, setPrescriptionNo] = useState("");
  const [patientName, setPatientName] = useState("");
  const [patientMobile, setPatientMobile] = useState("");
  const [patientAddress, setPatientAddress] = useState("");
  const [medicinesList, setMedicinesList] = useState<MedicineItem[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (order && isOpen) {
      setPrescriptionNo(order.prescriptionNumber || "");
      setPatientName(order.patientName || order.patient?.name || "");
      setPatientMobile(order.patientMobile || order.patient?.mobile || "");
      setPatientAddress(order.patientAddress || order.patient?.address || "");
      setMedicinesList(parseMedicinesString(order.medicines));
      setErrorMsg(null);
    }
  }, [order, isOpen]);

  if (!isOpen || !order) return null;

  const handleAddMedicine = () => {
    setMedicinesList([...medicinesList, { name: "", quantity: 1 }]);
  };

  const handleUpdateMedicineName = (index: number, newName: string) => {
    const updated = [...medicinesList];
    updated[index].name = newName;
    setMedicinesList(updated);
  };

  const handleUpdateMedicineQty = (index: number, delta: number) => {
    const updated = [...medicinesList];
    const newQty = Math.max(1, (updated[index].quantity || 1) + delta);
    updated[index].quantity = newQty;
    setMedicinesList(updated);
  };

  const handleRemoveMedicine = (index: number) => {
    setMedicinesList(medicinesList.filter((_, i) => i !== index));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    if (!prescriptionNo.trim()) {
      setErrorMsg("Prescription number is required.");
      setIsSubmitting(false);
      return;
    }

    if (!patientName.trim()) {
      setErrorMsg("Patient name is required.");
      setIsSubmitting(false);
      return;
    }

    if (patientMobile && patientMobile.length !== 10) {
      setErrorMsg("Patient mobile must be exactly 10 digits.");
      setIsSubmitting(false);
      return;
    }

    // Filter valid medicines with name
    const validMeds = medicinesList
      .map((m) => ({ name: m.name.trim(), quantity: Math.max(1, m.quantity || 1) }))
      .filter((m) => m.name.length > 0);

    const serializedMedicines = JSON.stringify(validMeds);

    try {
      await onSubmit(order.id, {
        prescriptionNumber: prescriptionNo,
        patient: {
          name: patientName,
          mobile: patientMobile,
          address: patientAddress,
        },
        medicines: serializedMedicines,
      });
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to update order details.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pb-20 md:pb-4 bg-on-background/50 backdrop-blur-sm">
      <div
        className="w-full max-w-lg bg-surface border border-outline-variant rounded-2xl shadow-2xl overflow-hidden glass-card animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-outline-variant flex items-center justify-between bg-surface-container-lowest">
          <h3 className="font-bold text-headline-sm text-on-surface">Edit Order Details</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container active:scale-90 transition-transform"
            type="button"
            aria-label="Close dialog"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Modal Content */}
        <form onSubmit={handleFormSubmit} className="p-6 space-y-4 max-h-[65vh] sm:max-h-[75vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3 bg-error-container/30 border border-error text-error text-sm rounded-xl flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Prescription Number */}
          <div className="space-y-1.5">
            <label className="font-label-md text-label-md text-on-surface-variant ml-1" htmlFor="prescriptionNo">
              Prescription Number *
            </label>
            <input
              id="prescriptionNo"
              value={prescriptionNo}
              onChange={(e) => setPrescriptionNo(e.target.value)}
              className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-body-md text-body-md placeholder:text-outline/60 text-on-surface"
              placeholder="e.g. RX12345"
              type="text"
              required
            />
          </div>

          {/* Patient Name */}
          <div className="space-y-1.5">
            <label className="font-label-md text-label-md text-on-surface-variant ml-1" htmlFor="patientName">
              Patient Name *
            </label>
            <input
              id="patientName"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-body-md text-body-md placeholder:text-outline/60 text-on-surface"
              placeholder="e.g. John Doe"
              type="text"
              required
            />
          </div>

          {/* Patient Mobile */}
          <div className="space-y-1.5">
            <label className="font-label-md text-label-md text-on-surface-variant ml-1" htmlFor="patientMobile">
              Patient Mobile
            </label>
            <input
              id="patientMobile"
              value={patientMobile}
              onChange={(e) => setPatientMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
              className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-body-md text-body-md placeholder:text-outline/60 text-on-surface"
              placeholder="10-digit mobile number"
              type="tel"
            />
          </div>

          {/* Patient Address */}
          <div className="space-y-1.5">
            <label className="font-label-md text-label-md text-on-surface-variant ml-1" htmlFor="patientAddress">
              Patient Address
            </label>
            <textarea
              id="patientAddress"
              value={patientAddress}
              onChange={(e) => setPatientAddress(e.target.value)}
              className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-body-md text-body-md placeholder:text-outline/60 text-on-surface min-h-[60px]"
              placeholder="Delivery address details"
            />
          </div>

          {/* Medicines Items List */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-b border-outline-variant pb-2 gap-2">
              <label className="font-bold text-xs sm:text-sm text-primary uppercase tracking-wider truncate">
                Prescription Medicines ({medicinesList.length})
              </label>
              <button
                type="button"
                onClick={handleAddMedicine}
                className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-xs font-bold transition-all flex items-center gap-1 shrink-0 whitespace-nowrap active:scale-95"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                <span>Add Medicine</span>
              </button>
            </div>

            <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
              {medicinesList.length === 0 ? (
                <div className="text-center py-4 text-xs text-on-surface-variant bg-surface-container-lowest border border-dashed border-outline-variant rounded-xl">
                  No medicines added yet. Click "+ Add Medicine" above.
                </div>
              ) : (
                medicinesList.map((med, idx) => (
                  <div key={idx} className="flex flex-wrap sm:flex-nowrap items-center gap-2 bg-surface-container-lowest p-2.5 border border-outline-variant rounded-xl shadow-xs">
                    <input
                      type="text"
                      value={med.name}
                      onChange={(e) => handleUpdateMedicineName(idx, e.target.value)}
                      placeholder="Medicine name"
                      className="w-full sm:flex-1 px-3 py-2 bg-surface border border-outline-variant rounded-lg text-xs text-on-surface font-semibold focus:border-primary outline-none"
                    />

                    <div className="flex items-center justify-between w-full sm:w-auto gap-2 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-outline-variant/40">
                      {/* Quantity counter */}
                      <div className="flex items-center border border-outline-variant rounded-lg overflow-hidden bg-surface">
                        <button
                          type="button"
                          onClick={() => handleUpdateMedicineQty(idx, -1)}
                          className="w-8 h-8 flex items-center justify-center hover:bg-surface-container text-primary font-bold transition-all active:scale-75"
                          aria-label="Decrease quantity"
                        >
                          <span className="material-symbols-outlined text-[14px]">remove</span>
                        </button>
                        <span className="px-3 py-1 font-bold text-on-surface text-xs select-none min-w-[24px] text-center">
                          {med.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateMedicineQty(idx, 1)}
                          className="w-8 h-8 flex items-center justify-center hover:bg-surface-container text-primary font-bold transition-all active:scale-75"
                          aria-label="Increase quantity"
                        >
                          <span className="material-symbols-outlined text-[14px]">add</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveMedicine(idx)}
                        className="w-8 h-8 flex items-center justify-center text-error hover:bg-error-container/10 rounded-lg transition-colors"
                        title="Remove medicine"
                        aria-label="Remove medicine"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Actions Footer */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-outline-variant mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2.5 bg-surface border border-outline-variant text-on-surface-variant rounded-xl font-label-md text-label-md hover:bg-surface-container active:scale-95 transition-all"
              type="button"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              className="px-6 py-2.5 bg-primary text-on-primary rounded-xl font-label-md text-label-md flex items-center justify-center gap-2 shadow-md hover:bg-on-primary-fixed-variant active:scale-[0.98] transition-all disabled:opacity-75"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
