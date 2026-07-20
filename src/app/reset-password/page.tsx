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
      {/* Header card resembling step details */}
      <div className="mb-10 bg-surface-container-lowest rounded-xl p-4 flex items-center gap-4 shadow-sm border border-outline-variant">
        <div className="bg-primary-container/20 w-12 h-12 rounded-full flex items-center justify-center text-primary">
          <span className="material-symbols-outlined text-[24px]">security</span>
        </div>
        <div>
          <p className="font-label-md text-label-md text-on-surface-variant mb-0.5">Account Security</p>
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">Set Password</h1>
        </div>
      </div>

      {/* Error/Success Feedbacks */}
      {errorMsg && (
        <div className="mb-6 p-3 bg-error-container/30 border border-error text-error text-sm rounded-xl flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">error</span>
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="mb-6 p-3 bg-tertiary-container/10 border border-tertiary-container text-tertiary-container text-sm rounded-xl flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          <span>{successMsg}</span>
        </div>
      )}

      {/* Reset Password Form */}
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
                placeholder="chemist@gmail.com"
                type="email"
                disabled={isSubmitting}
              />
            </div>
            {errors.email && <p className="text-xs text-error ml-1 mt-0.5">{errors.email.message}</p>}
          </div>

          {/* Reset Token */}
          <div className="space-y-1.5 group">
            <label
              className={`font-label-md text-label-md ml-1 transition-colors ${
                focusedField === "token" ? "text-primary" : "text-on-surface-variant"
              }`}
              htmlFor="token"
            >
              Reset Token
            </label>
            <div className="relative">
              <span
                className={`material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[20px] transition-colors ${
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
                className="w-full pl-12 pr-4 py-3.5 bg-surface-container-lowest border border-outline-variant rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-body-md text-body-md placeholder:text-outline/60"
                id="token"
                placeholder="Enter verification token"
                type="text"
                disabled={isSubmitting}
              />
            </div>
            {errors.token && <p className="text-xs text-error ml-1 mt-0.5">{errors.token.message}</p>}
          </div>

          {/* New Password */}
          <div className="space-y-1.5 group">
            <label
              className={`font-label-md text-label-md ml-1 transition-colors ${
                focusedField === "newPassword" ? "text-primary" : "text-on-surface-variant"
              }`}
              htmlFor="newPassword"
            >
              New Password
            </label>
            <div className="relative">
              <span
                className={`material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[20px] transition-colors ${
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
                className="w-full pl-12 pr-12 py-3.5 bg-surface-container-lowest border border-outline-variant rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-body-md text-body-md placeholder:text-outline/60"
                id="newPassword"
                placeholder="••••••••"
                type={showNewPassword ? "text" : "password"}
                disabled={isSubmitting}
              />
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors"
                onClick={() => setShowNewPassword(!showNewPassword)}
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">
                  {showNewPassword ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
            {errors.newPassword && <p className="text-xs text-error ml-1 mt-0.5">{errors.newPassword.message}</p>}
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5 group">
            <label
              className={`font-label-md text-label-md ml-1 transition-colors ${
                focusedField === "confirmPassword" ? "text-primary" : "text-on-surface-variant"
              }`}
              htmlFor="confirmPassword"
            >
              Confirm Password
            </label>
            <div className="relative">
              <span
                className={`material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[20px] transition-colors ${
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
                className="w-full pl-12 pr-12 py-3.5 bg-surface-container-lowest border border-outline-variant rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-body-md text-body-md placeholder:text-outline/60"
                id="confirmPassword"
                placeholder="••••••••"
                type={showConfirmPassword ? "text" : "password"}
                disabled={isSubmitting}
              />
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">
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
                <span>Updating Password...</span>
              </>
            ) : (
              <>
                <span>Update Password</span>
                <span className="material-symbols-outlined">check_circle</span>
              </>
            )}
          </button>

          <p className="text-center font-body-sm text-body-sm text-on-surface-variant">
            Remembered your credentials?{" "}
            <Link href={AUTH_CONSTANTS.ROUTES.LOGIN} className="text-primary font-bold hover:underline">
              Log In
            </Link>
          </p>

          <div className="pt-6 border-t border-outline-variant text-center">
            <p className="text-[10px] text-outline uppercase tracking-widest">© 2026 Sitaram Medical Group. All Rights Reserved.</p>
          </div>
        </div>
      </form>
    </>
  );
}

export default function ResetPassword() {
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
