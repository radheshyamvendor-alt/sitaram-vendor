"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import useAuth from "@/hooks/useAuth";
import { AUTH_CONSTANTS } from "@/services/auth.constants";

const forgotPasswordSchema = zod.object({
  email: zod.string().min(1, "Email is required").email("Please enter a valid email address"),
});

type ForgotPasswordFormValues = zod.infer<typeof forgotPasswordSchema>;

export default function ForgotPassword() {
  const { forgotPassword } = useAuth();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const {
    register: registerField,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (values: ForgotPasswordFormValues) => {
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await forgotPassword(values.email);
      setSuccessMsg("Password reset token has been sent to your email.");
    } catch (err) {
      console.error(err);
      setErrorMsg(err instanceof Error ? err.message : "Email address not found. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col px-margin-mobile pt-12 pb-10 max-w-md mx-auto relative">
      {/* Subtle Background Decorations */}
      <div className="fixed -bottom-24 -right-24 w-64 h-64 bg-primary-container/20 rounded-full blur-3xl -z-10"></div>
      <div className="fixed top-1/4 -left-12 w-48 h-48 bg-secondary-container/10 rounded-full blur-2xl -z-10"></div>

      {/* Brand & Back Button */}
      <div className="flex items-center justify-between mb-8">
        <Link
          href={AUTH_CONSTANTS.ROUTES.LOGIN}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-container-lowest shadow-sm border border-outline-variant text-on-surface-variant active:scale-95 transition-transform"
          aria-label="Go back to login"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <span className="font-headline-md text-headline-md font-bold text-primary text-center">Sitaram Medical</span>
        <div className="w-10"></div> {/* Spacer for symmetry */}
      </div>

      {/* Recovery details header */}
      <div className="mb-10 bg-surface-container-lowest rounded-xl p-4 flex items-center gap-4 shadow-sm border border-outline-variant">
        <div className="bg-primary-container/20 w-12 h-12 rounded-full flex items-center justify-center text-primary">
          <span className="material-symbols-outlined text-[24px]">lock_reset</span>
        </div>
        <div>
          <p className="font-label-md text-label-md text-on-surface-variant mb-0.5">Account Security</p>
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">Reset Password</h1>
        </div>
      </div>

      {/* Prompt message */}
      <p className="font-body-md text-body-md text-on-surface-variant mb-8 ml-1 leading-relaxed">
        Enter your registered email address below. We will send you a secure verification token to restore access.
      </p>

      {/* Error/Success Feedbacks */}
      {errorMsg && (
        <div className="mb-6 p-3 bg-error-container/30 border border-error text-error text-sm rounded-xl flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">error</span>
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="mb-6 p-4 bg-tertiary-container/10 border border-tertiary-container text-on-surface text-sm rounded-xl flex flex-col gap-3">
          <div className="flex items-center gap-2 text-tertiary">
            <span className="material-symbols-outlined text-[20px]">check_circle</span>
            <span className="font-semibold">{successMsg}</span>
          </div>
          <Link
            href={`${AUTH_CONSTANTS.ROUTES.RESET_PASSWORD}?email=${encodeURIComponent(getValues("email") || "")}`}
            className="text-xs text-primary font-bold hover:underline flex items-center gap-1 mt-1"
          >
            <span>Proceed to enter token & reset password</span>
            <span className="material-symbols-outlined text-xs">arrow_forward</span>
          </Link>
        </div>
      )}

      {/* Recovery Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="flex-grow flex flex-col justify-between">
        <div className="space-y-6">
          {/* Email Address */}
          <div className="space-y-1.5 group">
            <label
              className={`font-label-md text-label-md ml-1 transition-colors ${
                focusedField === "email" ? "text-primary" : "text-on-surface-variant"
              }`}
              htmlFor="email"
            >
              Registered Email Address
            </label>
            <div className="relative">
              <span
                className={`material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[20px] transition-colors ${
                  focusedField === "email" ? "text-primary" : "text-on-surface-variant"
                }`}
                style={{ fontVariationSettings: focusedField === "email" ? "'FILL' 1" : "'FILL' 0" }}
              >
                mail
              </span>
              <input
                {...registerField("email")}
                onFocus={() => setFocusedField("email")}
                onBlur={() => setFocusedField(null)}
                className="w-full pl-12 pr-4 py-3.5 bg-surface-container-lowest border border-outline-variant rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-body-md text-body-md placeholder:text-outline/60"
                id="email"
                placeholder="sameer.s@clinic.com"
                type="email"
                disabled={isSubmitting}
              />
            </div>
            {errors.email && <p className="text-xs text-error ml-1 mt-0.5">{errors.email.message}</p>}
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-10 space-y-6">
          <button
            className="w-full h-14 bg-primary text-on-primary rounded-xl font-label-md text-label-md flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-all hover:bg-on-primary-fixed-variant disabled:opacity-75 disabled:cursor-not-allowed"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Requesting Token...</span>
              </>
            ) : (
              <>
                <span>Request Reset Token</span>
                <span className="material-symbols-outlined">send</span>
              </>
            )}
          </button>

          <p className="text-center font-body-sm text-body-sm text-on-surface-variant">
            Already remembered?{" "}
            <Link href={AUTH_CONSTANTS.ROUTES.LOGIN} className="text-primary font-bold hover:underline">
              Log In
            </Link>
          </p>

          <div className="pt-6 border-t border-outline-variant text-center">
            <p className="text-[10px] text-outline uppercase tracking-widest">© 2026 Sitaram Medical Group. All Rights Reserved.</p>
          </div>
        </div>
      </form>
    </main>
  );
}
