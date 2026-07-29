"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getLocalAccessToken } from "@/lib/axios";
import { completeOrderLocal } from "@/app/actions/order";

interface OTPModalProps {
  isOpen: boolean;
  onClose: () => void;
  prescriptionNumber: string;
  orderId: string;
}

export default function OTPModal({
  isOpen,
  onClose,
  prescriptionNumber,
  orderId,
}: OTPModalProps) {
  const accessToken = getLocalAccessToken() || "";
  const queryClient = useQueryClient();

  const [otpValues, setOtpValues] = useState<string[]>(Array(6).fill(""));
  const otp = otpValues.join("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Reset states whenever modal is opened or prescriptionNumber changes
  useEffect(() => {
    if (isOpen) {
      setOtpValues(Array(6).fill(""));
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen, prescriptionNumber]);

  // OTP Verification — calls HIS Chemist API directly
  const verifyMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("https://hischemistapi.ongc.co.in/api/Otp/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ PrescriptionNo: prescriptionNumber, otp }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || "Verification failed. Invalid OTP.");
      }
      return data;
    },
    onSuccess: async (result) => {
      // Mark as completed locally since verification succeeded
      await completeOrderLocal(prescriptionNumber);
      
      setSuccessMsg(result.message || "OTP verified successfully!");
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setTimeout(() => {
        onClose();
      }, 1500);
    },
    onError: (err: any) => {
      setErrorMsg(err.message || "Verification failed. Invalid OTP.");
    },
  });

  // OTP Resend — calls HIS Chemist API directly
  const resendMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("https://hischemistapi.ongc.co.in/api/Otp/resend", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ PrescriptionNo: Number(prescriptionNumber) }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || "Failed to resend OTP.");
      }
      return data;
    },
    onSuccess: (result) => {
      setSuccessMsg(result.message || "New OTP sent to patient's mobile.");
      setErrorMsg(null);
    },
    onError: (err: any) => {
      setErrorMsg(err.message || "Failed to resend OTP.");
    },
  });


  if (!isOpen) return null;

  const handleOtpChange = (value: string, index: number) => {
    // Only allow digits
    const cleaned = value.replace(/[^0-9]/g, "");
    if (!cleaned) {
      const newValues = [...otpValues];
      newValues[index] = "";
      setOtpValues(newValues);
      return;
    }

    const newValues = [...otpValues];
    newValues[index] = cleaned.substring(cleaned.length - 1);
    setOtpValues(newValues);

    // Focus next input if not the last one
    if (index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace") {
      const newValues = [...otpValues];
      if (otpValues[index]) {
        newValues[index] = "";
        setOtpValues(newValues);
      } else if (index > 0) {
        newValues[index - 1] = "";
        setOtpValues(newValues);
        const prevInput = document.getElementById(`otp-input-${index - 1}`);
        prevInput?.focus();
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/[^0-9]/g, "").substring(0, 6);
    if (pastedData) {
      const newValues = Array(6).fill("");
      for (let i = 0; i < pastedData.length; i++) {
        newValues[i] = pastedData[i];
      }
      setOtpValues(newValues);
      
      const focusIndex = Math.min(pastedData.length, 5);
      const targetInput = document.getElementById(`otp-input-${focusIndex}`);
      targetInput?.focus();
    }
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (otp.length < 4) {
      setErrorMsg("Please enter a valid OTP code.");
      return;
    }

    verifyMutation.mutate();
  };

  const handleResend = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    resendMutation.mutate();
  };

  const handleModalClose = () => {
    setOtpValues(Array(6).fill(""));
    setErrorMsg(null);
    setSuccessMsg(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pb-20 md:pb-4 bg-on-background/50 backdrop-blur-sm">
      <div
        className="w-full max-w-sm bg-surface border border-outline-variant rounded-2xl shadow-2xl overflow-hidden glass-card animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-outline-variant flex items-center justify-between bg-surface-container-lowest">
          <h3 className="font-bold text-headline-sm text-on-surface">OTP Delivery Verification</h3>
          <button
            onClick={handleModalClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container active:scale-90 transition-transform"
            type="button"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Modal Content */}
        <form onSubmit={handleVerify} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-error-container/30 border border-error text-error text-sm rounded-xl flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-tertiary-container/10 border border-tertiary-container text-tertiary-container text-sm rounded-xl flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              <span>{successMsg}</span>
            </div>
          )}

          <div className="text-center space-y-2">
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Enter the OTP provided by the patient to verify order delivery completion for prescription:
            </p>
            <span className="inline-block px-3 py-1 bg-surface-container-high border border-outline-variant rounded-lg text-xs font-bold text-primary font-mono select-all">
              {prescriptionNumber}
            </span>
          </div>

          {/* OTP Input */}
          <div className="space-y-3 pt-2">
            <label className="font-label-md text-label-md text-on-surface-variant block text-center">
              OTP Verification Code
            </label>
            <div className="flex justify-center gap-2 font-mono" onPaste={handlePaste}>
              {otpValues.map((val, idx) => (
                <input
                  key={idx}
                  id={`otp-input-${idx}`}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={val}
                  onChange={(e) => handleOtpChange(e.target.value, idx)}
                  onKeyDown={(e) => handleKeyDown(e, idx)}
                  className="w-10 h-12 text-center font-bold text-headline-md bg-surface-container-lowest border border-outline-variant rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all text-on-surface"
                  maxLength={1}
                  required
                  disabled={verifyMutation.isPending}
                />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 flex flex-col gap-2">
            <button
              type="submit"
              disabled={verifyMutation.isPending || otp.length < 4}
              className="w-full h-12 bg-primary text-on-primary rounded-xl font-label-md text-label-md flex items-center justify-center gap-2 shadow-md hover:bg-on-primary-fixed-variant active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {verifyMutation.isPending ? (
                <span>Verifying...</span>
              ) : (
                <>
                  <span>Verify &amp; Complete</span>
                  <span className="material-symbols-outlined">verified</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleResend}
              disabled={resendMutation.isPending}
              className="w-full h-10 border border-outline-variant bg-surface text-on-surface-variant hover:bg-surface-container rounded-xl font-label-md text-label-md flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
            >
              {resendMutation.isPending ? (
                <span>Resending...</span>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">sync</span>
                  <span>Resend OTP</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
