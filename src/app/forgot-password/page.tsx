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
    <main className="min-h-screen flex flex-col justify-center px-margin-mobile py-12 max-w-md mx-auto relative">
      {/* Brand Title */}
      <h1 className="font-headline-md text-headline-md font-bold text-primary text-center mb-6">
        Reset Password
      </h1>

      {/* Error/Success Feedbacks */}
      {errorMsg && (
        <div className="mb-4 p-3 bg-error-container/30 border border-error text-error text-sm rounded-xl flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">error</span>
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="mb-4 p-4 bg-tertiary-container/10 border border-tertiary-container text-on-surface text-sm rounded-xl flex flex-col gap-3">
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
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Email Address */}
        <div className="space-y-1 group">
          <div className="relative flex items-center">
            <span
              className={`material-symbols-outlined pointer-events-none flex items-center justify-center h-5 w-5 absolute left-4 top-1/2 -translate-y-1/2 text-[20px] leading-none transition-colors ${
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
              className="w-full pl-12 pr-4 h-14 bg-surface-container-lowest border border-outline-variant rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all text-base leading-normal placeholder:text-outline/60"
              id="email"
              placeholder="Registered Email Address"
              type="email"
              disabled={isSubmitting}
            />
          </div>
          {errors.email && <p className="text-xs text-error ml-1 mt-0.5">{errors.email.message}</p>}
        </div>

        {/* CTA Section */}
        <div className="mt-6 space-y-3">
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
              <span>Request Reset Token</span>
            )}
          </button>

          <p className="text-center font-body-sm text-body-sm text-on-surface-variant">
            Already remembered?{" "}
            <Link href={AUTH_CONSTANTS.ROUTES.LOGIN} className="text-primary font-bold hover:underline">
              Log In
            </Link>
          </p>
        </div>
      </form>
    </main>
  );
}
