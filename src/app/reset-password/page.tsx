"use client";

import Link from "next/link";
import { useState, useEffect, Suspense } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import { useRouter, useSearchParams } from "next/navigation";
import useAuth from "@/hooks/useAuth";
import { AUTH_CONSTANTS } from "@/services/auth.constants";

const resetPasswordSchema = zod
  .object({
    email: zod.string().min(1, "Email is required").email("Please enter a valid email address"),
    token: zod.string().min(1, "Reset token is required"),
    newPassword: zod
      .string()
      .min(6, "New password must be at least 6 characters")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[0-9]/, "Password must contain at least one number")
      .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
    confirmPassword: zod.string().min(6, "Confirm password must be at least 6 characters"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ResetPasswordFormValues = zod.infer<typeof resetPasswordSchema>;

function ResetPasswordForm() {
  const { resetPassword } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const {
    register: registerField,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: "",
      token: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Prefill email and token from URL parameters if present
  useEffect(() => {
    const emailParam = searchParams.get("email");
    const tokenParam = searchParams.get("token");
    if (emailParam) setValue("email", decodeURIComponent(emailParam));
    if (tokenParam) setValue("token", decodeURIComponent(tokenParam));
  }, [searchParams, setValue]);

  const onSubmit = async (values: ResetPasswordFormValues) => {
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await resetPassword({
        email: values.email,
        token: values.token,
        newPassword: values.newPassword,
        confirmPassword: values.confirmPassword,
      });
      setSuccessMsg("Password reset successfully! Redirecting to login...");
      setTimeout(() => {
        router.push(AUTH_CONSTANTS.ROUTES.LOGIN);
      }, 2000);
    } catch (err) {
      console.error(err);
      setErrorMsg(err instanceof Error ? err.message : "Invalid or expired token. Please request another link.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Error/Success Feedbacks */}
      {errorMsg && (
        <div className="mb-4 p-3 bg-error-container/30 border border-error text-error text-sm rounded-xl flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">error</span>
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="mb-4 p-3 bg-tertiary-container/10 border border-tertiary-container text-tertiary-container text-sm rounded-xl flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          <span>{successMsg}</span>
        </div>
      )}

      {/* Reset Password Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
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

          {/* Reset Token */}
          <div className="space-y-1 group">
            <div className="relative flex items-center">
              <span
                className={`material-symbols-outlined pointer-events-none flex items-center justify-center h-5 w-5 absolute left-4 top-1/2 -translate-y-1/2 text-[20px] leading-none transition-colors ${
                  focusedField === "token" ? "text-primary" : "text-on-surface-variant"
                }`}
                style={{ fontVariationSettings: focusedField === "token" ? "'FILL' 1" : "'FILL' 0" }}
              >
                vpn_key
              </span>
              <input
                {...registerField("token")}
                onFocus={() => setFocusedField("token")}
                onBlur={() => setFocusedField(null)}
                className="w-full pl-12 pr-4 h-14 bg-surface-container-lowest border border-outline-variant rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all text-base leading-normal placeholder:text-outline/60"
                id="token"
                placeholder="Reset Token"
                type="text"
                disabled={isSubmitting}
              />
            </div>
            {errors.token && <p className="text-xs text-error ml-1 mt-0.5">{errors.token.message}</p>}
          </div>

          {/* New Password */}
          <div className="space-y-1 group">
            <div className="relative flex items-center">
              <span
                className={`material-symbols-outlined pointer-events-none flex items-center justify-center h-5 w-5 absolute left-4 top-1/2 -translate-y-1/2 text-[20px] leading-none transition-colors ${
                  focusedField === "newPassword" ? "text-primary" : "text-on-surface-variant"
                }`}
                style={{ fontVariationSettings: focusedField === "newPassword" ? "'FILL' 1" : "'FILL' 0" }}
              >
                lock
              </span>
              <input
                {...registerField("newPassword")}
                onFocus={() => setFocusedField("newPassword")}
                onBlur={() => setFocusedField(null)}
                className="w-full pl-12 pr-12 h-14 bg-surface-container-lowest border border-outline-variant rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all text-base leading-normal placeholder:text-outline/60"
                id="newPassword"
                placeholder="New Password"
                type={showNewPassword ? "text" : "password"}
                disabled={isSubmitting}
              />
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center h-6 w-6 text-outline hover:text-primary transition-colors focus:outline-none"
                onClick={() => setShowNewPassword(!showNewPassword)}
                type="button"
              >
                <span className="material-symbols-outlined text-[20px] leading-none select-none">
                  {showNewPassword ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
            {errors.newPassword && <p className="text-xs text-error ml-1 mt-0.5">{errors.newPassword.message}</p>}
          </div>

          {/* Confirm Password */}
          <div className="space-y-1 group">
            <div className="relative flex items-center">
              <span
                className={`material-symbols-outlined pointer-events-none flex items-center justify-center h-5 w-5 absolute left-4 top-1/2 -translate-y-1/2 text-[20px] leading-none transition-colors ${
                  focusedField === "confirmPassword" ? "text-primary" : "text-on-surface-variant"
                }`}
                style={{ fontVariationSettings: focusedField === "confirmPassword" ? "'FILL' 1" : "'FILL' 0" }}
              >
                lock_reset
              </span>
              <input
                {...registerField("confirmPassword")}
                onFocus={() => setFocusedField("confirmPassword")}
                onBlur={() => setFocusedField(null)}
                className="w-full pl-12 pr-12 h-14 bg-surface-container-lowest border border-outline-variant rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all text-base leading-normal placeholder:text-outline/60"
                id="confirmPassword"
                placeholder="Confirm Password"
                type={showConfirmPassword ? "text" : "password"}
                disabled={isSubmitting}
              />
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center h-6 w-6 text-outline hover:text-primary transition-colors focus:outline-none"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                type="button"
              >
                <span className="material-symbols-outlined text-[20px] leading-none select-none">
                  {showConfirmPassword ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-xs text-error ml-1 mt-0.5">{errors.confirmPassword.message}</p>
            )}
          </div>
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
                <span>Updating Password...</span>
              </>
            ) : (
              <span>Update Password</span>
            )}
          </button>

          <p className="text-center font-body-sm text-body-sm text-on-surface-variant">
            Remembered your credentials?{" "}
            <Link href={AUTH_CONSTANTS.ROUTES.LOGIN} className="text-primary font-bold hover:underline">
              Log In
            </Link>
          </p>
        </div>
      </form>
    </>
  );
}

export default function ResetPassword() {
  return (
    <main className="min-h-screen flex flex-col justify-center px-margin-mobile py-12 max-w-md mx-auto relative">
      {/* Brand Title */}
      <h1 className="font-headline-md text-headline-md font-bold text-primary text-center mb-6">
        Set Password
      </h1>

      {/* Form with Suspense Wrapper */}
      <Suspense
        fallback={
          <div className="flex flex-col items-center justify-center py-12 flex-grow">
            <svg className="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="mt-4 text-on-surface-variant text-sm font-medium">Loading form context...</span>
          </div>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </main>
  );
}
