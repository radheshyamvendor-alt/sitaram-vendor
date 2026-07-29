"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useAuth from "@/hooks/useAuth";
import { tokenStorage } from "@/lib/tokenStorage";
import { getChemistIdFromToken } from "@/lib/jwt";
import { createDirectOrder } from "@/app/actions/order";
import Header from "@/components/dashboard/Header";
import BottomNav from "@/components/dashboard/BottomNav";

interface ExtractedMedicine {
  id: string | null;
  name: string;
  price: number | null;
  quantity: number;
  stock: number | null;
}

interface ExtractedPatient {
  name?: string | null;
  address?: string | null;
  mobile?: string | null;
  gender?: string | null;
  age?: number | null;
}

interface OcrResult {
  prescriptionNumber: string;
  patient: ExtractedPatient;
  medicines: ExtractedMedicine[];
}

export default function OcrPage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Pending result awaiting user review
  const [pendingResult, setPendingResult] = useState<OcrResult | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const handleUpdateMedQty = (medName: string, newQty: number) => {
    if (!pendingResult) return;
    const updatedMeds = pendingResult.medicines.map((med) =>
      med.name === medName ? { ...med, quantity: Math.max(1, newQty) } : med
    );
    setPendingResult({ ...pendingResult, medicines: updatedMeds });
  };

  const handleRemoveMed = (medName: string) => {
    if (!pendingResult) return;
    const updatedMeds = pendingResult.medicines.filter((med) => med.name !== medName);
    setPendingResult({ ...pendingResult, medicines: updatedMeds });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await processFileOcr(files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await processFileOcr(files[0]);
    }
  };

  const processFileOcr = async (selectedFile: File) => {
    const validTypes = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
    if (!validTypes.includes(selectedFile.type)) {
      setOcrError("Invalid file type. Please upload a PDF, PNG, JPG, or JPEG file.");
      return;
    }

    setIsOcrProcessing(true);
    setOcrError(null);
    setPendingResult(null);
    setIsEditing(false);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const response = await fetch("/api/ocr", {
        method: "POST",
        body: formData,
      });

      const resData = await response.json();
      if (resData.success) {
        setPendingResult(resData.data);
      } else {
        setOcrError(resData.error || "OCR extraction failed. Please try again.");
      }
    } catch (err) {
      console.error(err);
      const errMsg = err instanceof Error ? err.message : "Failed to communicate with OCR service.";
      setOcrError(errMsg);
    } finally {
      setIsOcrProcessing(false);
    }
  };

  const handleSubmitOrder = async () => {
    if (!pendingResult) return;

    // Verify active JWT session token and extract active chemistId from token payload
    const tokenInfo = getChemistIdFromToken();
    if (tokenInfo.isExpired || !tokenInfo.chemistId) {
      setOcrError(tokenInfo.error || "Session expired. Please login again.");
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      setTimeout(() => {
        logout();
      }, 1500);
      return;
    }

    const activeChemistId = tokenInfo.chemistId;

    // Mobile number validation if present
    if (pendingResult.patient.mobile != null) {
      const mobileDigits = String(pendingResult.patient.mobile).replace(/\D/g, "");
      if (mobileDigits.length !== 10) {
        setOcrError("Mobile number must be exactly 10 digits.");
        if (typeof window !== "undefined") {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
        return;
      }
      pendingResult.patient.mobile = mobileDigits;
    }

    setIsSubmittingOrder(true);
    setOcrError(null);

    // Build structured JSON string storing medicine name and quantity
    const medicinesJson = JSON.stringify(
      pendingResult.medicines.map((m) => ({ name: m.name, quantity: m.quantity }))
    );

    try {
      const result = await createDirectOrder({
        prescriptionNumber: pendingResult.prescriptionNumber,
        patientName: pendingResult.patient.name || "Anonymous Patient",
        patientMobile: pendingResult.patient.mobile || undefined,
        patientAddress: pendingResult.patient.address || undefined,
        patientGender: pendingResult.patient.gender || undefined,
        patientAge: pendingResult.patient.age || undefined,
        medicines: medicinesJson,
        chemistId: activeChemistId,
        chemistEmail: user?.email || tokenStorage.getUserData()?.email || undefined,
      });

      if (result.success) {
        // Redirect directly to Orders page
        router.push("/dashboard/otp");
      } else {
        setOcrError(result.error || "Failed to submit order. Please try again.");
      }
    } catch (err) {
      console.error(err);
      setOcrError(err instanceof Error ? err.message : "Error submitting order.");
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const resetScanner = () => {
    setPendingResult(null);
    setOcrError(null);
    setIsEditing(false);
  };

  return (
    <div className="min-h-screen bg-background trust-gradient pb-24 md:pb-12 text-on-background">
      <Header />

      <main className="max-w-[800px] mx-auto px-margin-mobile md:px-margin-desktop py-xl">
        <div className="space-y-6">

          {ocrError && (
            <div className="p-4 bg-error-container/20 border border-error/20 text-error rounded-xl flex items-center gap-3 text-sm">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{ocrError}</span>
            </div>
          )}

          {/* STEP 1: Upload area */}
          {!pendingResult && (
            <div className="bg-surface border border-outline-variant shadow-sm rounded-xl p-8 glass-card space-y-6">
              <div className="text-center space-y-2">
                <h3 className="text-headline-sm font-bold text-on-surface">Prescription OCR Scanner</h3>
                <p className="text-sm text-on-surface-variant max-w-sm mx-auto">
                  Upload a prescription document (PDF or image). Extracted details will create an order directly.
                </p>
              </div>

              {isOcrProcessing ? (
                <div className="h-64 border border-outline-variant rounded-2xl bg-surface-container-lowest flex flex-col items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-85 shadow-[0_0_10px_#003d9b] animate-[bounce_2.5s_infinite_linear]"></div>
                  <svg className="animate-spin h-10 w-10 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <h4 className="mt-4 font-bold text-on-surface text-base">Radheshyam OCR Active</h4>
                  <p className="text-xs text-on-surface-variant mt-1 animate-pulse">Extracting credentials &amp; matching medicines...</p>
                </div>
              ) : (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`h-64 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-6 cursor-pointer transition-all ${
                    isDragOver
                      ? "border-primary bg-primary/5"
                      : "border-outline-variant bg-surface-container-lowest hover:border-primary/50"
                  }`}
                  onClick={() => document.getElementById("file-input-page")?.click()}
                >
                  <input
                    id="file-input-page"
                    type="file"
                    accept="application/pdf,image/png,image/jpeg,image/jpg"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <span className="material-symbols-outlined text-[48px] text-primary mb-4 animate-bounce">
                    cloud_upload
                  </span>
                  <span className="font-bold text-on-surface text-base">Drag &amp; Drop Prescription File</span>
                  <span className="text-xs text-on-surface-variant mt-1">Supports PDF, PNG, JPG, JPEG</span>
                  <button
                    type="button"
                    className="mt-6 px-4 py-2 bg-surface border border-outline-variant rounded-xl font-label-md text-label-md text-on-surface hover:bg-surface-container transition-all"
                  >
                    Select Prescription
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Review extracted details & Create Order */}
          {pendingResult && (
            <div className="bg-surface border border-outline-variant shadow-sm rounded-xl p-6 glass-card space-y-5">
              {/* Review header */}
              <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/20 text-amber-700 rounded-xl">
                <span className="material-symbols-outlined text-[22px]">rate_review</span>
                <div>
                  <h4 className="font-bold text-sm">Review Extracted Details</h4>
                  <p className="text-xs text-on-surface-variant mt-0.5">Verify the details below before submitting the order.</p>
                </div>
              </div>

              {/* Patient info card */}
              <div className="border border-outline-variant rounded-xl p-4 bg-surface-container-lowest space-y-4">
                <div className="flex justify-between items-center border-b border-outline-variant pb-2">
                  <h4 className="font-bold text-on-surface text-sm uppercase tracking-wider text-primary">Patient Profile</h4>
                  <button
                    type="button"
                    onClick={() => setIsEditing(!isEditing)}
                    className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-bold bg-primary/10 px-2.5 py-1 rounded-lg transition-all"
                  >
                    <span className="material-symbols-outlined text-[16px]">{isEditing ? "check" : "edit"}</span>
                    <span>{isEditing ? "Done Editing" : "Edit Details"}</span>
                  </button>
                </div>
                {isEditing ? (
                  <div className="space-y-3 text-sm">
                    <div>
                      <label className="text-xs font-semibold text-outline block mb-1">Patient Name</label>
                      <input
                        type="text"
                        value={pendingResult.patient.name || ""}
                        onChange={(e) => setPendingResult({
                          ...pendingResult,
                          patient: { ...pendingResult.patient, name: e.target.value }
                        })}
                        className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg text-sm text-on-surface focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-outline block mb-1">Rx Number</label>
                        <input
                          type="text"
                          value={pendingResult.prescriptionNumber}
                          onChange={(e) => setPendingResult({
                            ...pendingResult,
                            prescriptionNumber: e.target.value
                          })}
                          className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg text-sm text-on-surface focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-outline block mb-1">Mobile Number</label>
                        <input
                          type="text"
                          value={pendingResult.patient.mobile || ""}
                          onChange={(e) => setPendingResult({
                            ...pendingResult,
                            patient: { ...pendingResult.patient, mobile: e.target.value }
                          })}
                          className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg text-sm text-on-surface focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-outline block mb-1">Residential Address</label>
                      <textarea
                        value={pendingResult.patient.address || ""}
                        onChange={(e) => setPendingResult({
                          ...pendingResult,
                          patient: { ...pendingResult.patient, address: e.target.value }
                        })}
                        rows={2}
                        className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg text-sm text-on-surface focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-xs text-outline block">Patient Name</span>
                      <span className="font-semibold text-on-surface">{pendingResult.patient.name || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-xs text-outline block">Rx Number</span>
                      <span className="font-semibold text-on-surface">{pendingResult.prescriptionNumber}</span>
                    </div>
                    <div>
                      <span className="text-xs text-outline block">Mobile Number</span>
                      <span className="font-semibold text-on-surface">{pendingResult.patient.mobile || "N/A"}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-xs text-outline block">Residential Address</span>
                      <span className="font-semibold text-on-surface">{pendingResult.patient.address || "N/A"}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Extracted medicines list */}
              <div className="border border-outline-variant rounded-xl p-4 bg-surface-container-lowest space-y-3">
                <h4 className="font-bold text-on-surface border-b border-outline-variant pb-2 text-sm uppercase tracking-wider text-primary">Extracted Medicines</h4>
                <div className="divide-y divide-outline-variant">
                  {pendingResult.medicines.length === 0 ? (
                    <div className="py-4 text-center text-sm text-on-surface-variant font-medium">
                      No medicines detected.
                    </div>
                  ) : (
                    pendingResult.medicines.map((med) => (
                      <div key={med.name} className="py-3 flex justify-between items-center text-sm gap-2">
                        <div className="flex-grow">
                          <span className="font-semibold text-on-surface">{med.name}</span>
                        </div>
                        {isEditing ? (
                          <div className="flex items-center gap-3">
                            <div className="flex items-center border border-outline-variant rounded-lg overflow-hidden bg-surface">
                              <button
                                type="button"
                                onClick={() => handleUpdateMedQty(med.name, med.quantity - 1)}
                                className="px-2 py-1 hover:bg-surface-container text-primary font-bold transition-all active:scale-75"
                              >
                                <span className="material-symbols-outlined text-[16px]">remove</span>
                              </button>
                              <span className="px-3 py-1 font-bold text-on-surface text-xs select-none">
                                {med.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleUpdateMedQty(med.name, med.quantity + 1)}
                                className="px-2 py-1 hover:bg-surface-container text-primary font-bold transition-all active:scale-75"
                              >
                                <span className="material-symbols-outlined text-[16px]">add</span>
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveMed(med.name)}
                              className="text-error hover:bg-error-container/10 p-2 rounded-full transition-colors"
                              title="Delete medicine"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          </div>
                        ) : (
                          <div className="text-right">
                            <span className="font-bold text-primary">Qty: {med.quantity}</span>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Direct Order Creation Action */}
              <div className="flex flex-col sm:flex-row gap-3 pt-1">
                <button
                  onClick={handleSubmitOrder}
                  disabled={isSubmittingOrder}
                  className="flex-1 bg-primary text-on-primary font-bold py-3.5 rounded-xl hover:bg-on-primary-fixed-variant transition-all text-center flex items-center justify-center gap-2 shadow-md disabled:opacity-75"
                >
                  {isSubmittingOrder ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Creating Order...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">check_circle</span>
                      <span>Submit &amp; Create Order</span>
                    </>
                  )}
                </button>
                <button
                  onClick={resetScanner}
                  disabled={isSubmittingOrder}
                  className="flex-1 bg-surface-container-low border border-outline-variant text-on-surface-variant font-bold py-3.5 rounded-xl hover:bg-error-container/10 hover:border-error/30 hover:text-error transition-all text-center flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">cancel</span>
                  <span>Discard &amp; Re-scan</span>
                </button>
              </div>
            </div>
          )}

        </div>
      </main>

      <BottomNav />
    </div>
  );
}
