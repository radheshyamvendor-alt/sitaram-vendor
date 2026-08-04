"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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

function OcrContent() {
  const { user, isLoading: authLoading, logout } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const processedAttachmentRef = useRef<string>("");

  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Pending result awaiting user review
  const [pendingResult, setPendingResult] = useState<OcrResult | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Automatically load & scan email attachment if redirected from Notification Bell
  useEffect(() => {
    if (authLoading) return;

    const messageId = searchParams.get("messageId");
    const attachmentId = searchParams.get("attachmentId");
    const filename = searchParams.get("filename") || "prescription.pdf";
    const userEmail = user?.email || tokenStorage.getUserData()?.email;

    if (messageId && attachmentId && userEmail) {
      const attachmentKey = `${messageId}:${attachmentId}`;
      if (processedAttachmentRef.current === attachmentKey) return;
      processedAttachmentRef.current = attachmentKey;

      loadAndProcessGmailAttachment(userEmail, messageId, attachmentId, filename);
    }
  }, [searchParams, user, authLoading]);

  const loadAndProcessGmailAttachment = async (
    email: string,
    messageId: string,
    attachmentId: string,
    filename: string
  ) => {
    setIsOcrProcessing(true);
    setOcrError(null);

    try {
      const res = await fetch(
        `/api/auth/gmail/attachment?email=${encodeURIComponent(
          email
        )}&messageId=${encodeURIComponent(messageId)}&attachmentId=${encodeURIComponent(
          attachmentId
        )}`
      );
      const data = await res.json();
      if (!data.success || !data.base64) {
        throw new Error(data.error || "Failed to download email attachment");
      }

      // Convert base64 to File object
      const byteCharacters = atob(data.base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const file = new File([byteArray], filename, { type: "application/pdf" });

      await processFileOcr(file);
    } catch (err: any) {
      setOcrError(err?.message || "Failed to load prescription from email attachment.");
      setIsOcrProcessing(false);
    }
  };

  const handleAddMedicine = () => {
    if (!pendingResult) return;
    const newMed: ExtractedMedicine = {
      id: null,
      name: "",
      price: null,
      quantity: 1,
      stock: null,
    };
    setPendingResult({
      ...pendingResult,
      medicines: [...pendingResult.medicines, newMed],
    });
  };

  const handleUpdateMedName = (index: number, newName: string) => {
    if (!pendingResult) return;
    const updatedMeds = [...pendingResult.medicines];
    updatedMeds[index] = { ...updatedMeds[index], name: newName };
    setPendingResult({ ...pendingResult, medicines: updatedMeds });
  };

  const handleUpdateMedQtyIndex = (index: number, newQty: number) => {
    if (!pendingResult) return;
    const updatedMeds = [...pendingResult.medicines];
    updatedMeds[index] = { ...updatedMeds[index], quantity: Math.max(1, newQty) };
    setPendingResult({ ...pendingResult, medicines: updatedMeds });
  };

  const handleRemoveMedIndex = (index: number) => {
    if (!pendingResult) return;
    const updatedMeds = pendingResult.medicines.filter((_, i) => i !== index);
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

    // Client-side 5MB limit check — show error immediately without API round-trip
    const MAX_SIZE_MB = 5;
    const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
    if (selectedFile.size > MAX_SIZE_BYTES) {
      const sizeMB = (selectedFile.size / (1024 * 1024)).toFixed(2);
      setOcrError(`File is too large (${sizeMB} MB). Maximum allowed file size is ${MAX_SIZE_MB} MB. Please compress the image or use a smaller PDF.`);
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

    const medicinesJson = JSON.stringify(
      pendingResult.medicines.map((m) => ({ name: m.name, quantity: m.quantity }))
    );

    const currentMessageId = searchParams.get("messageId") || undefined;

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
        gmailMessageId: currentMessageId,
      });

      if (result.success) {
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
    processedAttachmentRef.current = "";
    setPendingResult(null);
    setOcrError(null);
    setIsEditing(false);
    router.replace("/dashboard/ocr");
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
                <div className="h-64 border border-primary/20 rounded-2xl bg-surface-container-lowest flex flex-col items-center justify-center relative overflow-hidden p-6 shadow-inner">
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_12px_#003d9b] animate-pulse"></div>
                  
                  <div className="relative flex items-center justify-center">
                    <div className="absolute w-16 h-16 rounded-full bg-primary/10 animate-ping"></div>
                    <div className="w-12 h-12 rounded-full border-3 border-primary/20 border-t-primary animate-spin"></div>
                  </div>

                  <div className="mt-5 text-center space-y-1">
                    <span className="px-3 py-1 bg-primary/10 text-primary font-bold text-xs rounded-full inline-block border border-primary/20">
                      Radheshyam OCR AI Active
                    </span>
                    <h4 className="font-bold text-on-surface text-base">Scanning Prescription...</h4>
                    <p className="text-xs text-on-surface-variant animate-pulse max-w-xs mx-auto">
                      Extracting patient credentials &amp; prescription medicines
                    </p>
                  </div>
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
              <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/20 text-amber-700 rounded-xl">
                <span className="material-symbols-outlined text-[22px]">rate_review</span>
                <div>
                  <h4 className="font-bold text-sm">Review Extracted Details</h4>
                  <p className="text-xs text-on-surface-variant mt-0.5">Verify the details below before submitting the order.</p>
                </div>
              </div>

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

              <div className="border border-outline-variant rounded-xl p-4 bg-surface-container-lowest space-y-3">
                <div className="flex items-center justify-between border-b border-outline-variant pb-2 gap-2">
                  <h4 className="font-bold text-on-surface text-xs sm:text-sm uppercase tracking-wider text-primary truncate">
                    Extracted Medicines ({pendingResult.medicines.length})
                  </h4>
                  {isEditing && (
                    <button
                      type="button"
                      onClick={handleAddMedicine}
                      className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-xs font-bold transition-all flex items-center gap-1 shrink-0 whitespace-nowrap active:scale-95"
                    >
                      <span className="material-symbols-outlined text-[16px]">add</span>
                      <span>Add Medicine</span>
                    </button>
                  )}
                </div>

                <div className="divide-y divide-outline-variant">
                  {pendingResult.medicines.length === 0 ? (
                    <div className="py-4 text-center text-sm text-on-surface-variant font-medium">
                      No medicines detected. Click "+ Add Medicine" to add item.
                    </div>
                  ) : (
                    pendingResult.medicines.map((med, idx) => (
                      <div key={idx} className="py-2.5 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 text-sm">
                        {isEditing ? (
                          <input
                            type="text"
                            value={med.name}
                            onChange={(e) => handleUpdateMedName(idx, e.target.value)}
                            placeholder="Medicine name"
                            className="w-full sm:flex-1 px-3 py-2 bg-surface border border-outline-variant rounded-lg font-semibold text-on-surface focus:border-primary outline-none text-xs"
                          />
                        ) : (
                          <div className="flex-grow">
                            <span className="font-semibold text-on-surface">{med.name}</span>
                          </div>
                        )}

                        {isEditing ? (
                          <div className="flex items-center justify-between w-full sm:w-auto gap-2 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-outline-variant/40">
                            <div className="flex items-center border border-outline-variant rounded-lg overflow-hidden bg-surface">
                              <button
                                type="button"
                                onClick={() => handleUpdateMedQtyIndex(idx, med.quantity - 1)}
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
                                onClick={() => handleUpdateMedQtyIndex(idx, med.quantity + 1)}
                                className="w-8 h-8 flex items-center justify-center hover:bg-surface-container text-primary font-bold transition-all active:scale-75"
                                aria-label="Increase quantity"
                              >
                                <span className="material-symbols-outlined text-[14px]">add</span>
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveMedIndex(idx)}
                              className="w-8 h-8 flex items-center justify-center text-error hover:bg-error-container/10 rounded-lg transition-colors"
                              title="Delete medicine"
                              aria-label="Delete medicine"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          </div>
                        ) : (
                          <div className="text-right shrink-0">
                            <span className="font-bold text-primary text-xs">Qty: {med.quantity}</span>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

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

export default function OcrPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background trust-gradient flex items-center justify-center">Loading OCR Scanner...</div>}>
      <OcrContent />
    </Suspense>
  );
}
