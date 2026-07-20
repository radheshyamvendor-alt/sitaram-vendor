"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import useAuth from "@/hooks/useAuth";
import { AUTH_CONSTANTS } from "@/services/auth.constants";

const loginSchema = zod.object({
  email: zod.string().min(1, "Email is required").email("Please enter a valid email address"),
  password: zod
    .string()
    .min(6, "Password must be at least 6 characters")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
  remember: zod.boolean().optional(),
});

type LoginFormValues = zod.infer<typeof loginSchema>;

export default function Login() {
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const {
    register: registerField,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      remember: false,
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await login({
        email: values.email,
        password: values.password,
      });
    } catch (err) {
      console.error(err);
      setErrorMsg(err instanceof Error ? err.message : "Invalid credentials. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col px-margin-mobile pt-12 pb-10 max-w-md mx-auto relative">
      {/* Subtle Background Decorations */}
      <div className="fixed -bottom-24 -right-24 w-64 h-64 bg-primary-container/20 rounded-full blur-3xl -z-10"></div>
      <div className="fixed top-1/4 -left-12 w-48 h-48 bg-secondary-container/10 rounded-full blur-2xl -z-10"></div>

      {/* Brand & Spacer */}
      <div className="flex items-center justify-between mb-8">
        <div className="w-10"></div>
        <span className="font-headline-md text-headline-md font-bold text-primary text-center">Sitaram Medical</span>
        <div className="w-10"></div> {/* Spacer for symmetry */}
      </div>

      {/* Header card resembling step details */}
      <div className="mb-10 bg-surface-container-lowest rounded-xl p-4 flex items-center gap-4 shadow-sm border border-outline-variant">
        <div className="bg-primary-container/20 w-12 h-12 rounded-full flex items-center justify-center text-primary">
          <span className="material-symbols-outlined text-[24px]">vpn_key</span>
        </div>
        <div>
          <p className="font-label-md text-label-md text-on-surface-variant mb-0.5">Secure Access</p>
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">Member Login</h1>
        </div>
      </div>

      {/* Error/Success Feedbacks */}
      {errorMsg && (
        <div className="mb-6 p-3 bg-error-container/30 border border-error text-error text-sm rounded-xl flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">error</span>
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Login Form */}
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
              Username or Email
            </label>
            <div className="relative">
              <span
                className={`material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[20px] transition-colors ${
                  focusedField === "email" ? "text-primary" : "text-on-surface-variant"
                }`}
                style={{ fontVariationSettings: focusedField === "email" ? "'FILL' 1" : "'FILL' 0" }}
              >
                person
              </span>
              <input
                {...registerField("email")}
                onFocus={() => setFocusedField("email")}
                onBlur={() => setFocusedField(null)}
                className="w-full pl-12 pr-4 py-3.5 bg-surface-container-lowest border border-outline-variant rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-body-md text-body-md placeholder:text-outline/60"
                id="email"
                placeholder="pharmacy_admin_01@gmail.com"
                type="text"
                disabled={isSubmitting}
              />
            </div>
            {errors.email && <p className="text-xs text-error ml-1 mt-0.5">{errors.email.message}</p>}
          </div>

          {/* Password */}
          <div className="space-y-1.5 group">
            <div className="flex justify-between items-center px-1">
              <label
                className={`font-label-md text-label-md transition-colors ${
                  focusedField === "password" ? "text-primary" : "text-on-surface-variant"
                }`}
                htmlFor="password"
              >
                Password
              </label>
              <Link href={AUTH_CONSTANTS.ROUTES.FORGOT_PASSWORD} className="font-label-md text-label-md text-primary hover:underline transition-all">
                Forgot Password?
              </Link>
            </div>
            <div className="relative">
              <span
                className={`material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[20px] transition-colors ${
                  focusedField === "password" ? "text-primary" : "text-on-surface-variant"
                }`}
                style={{ fontVariationSettings: focusedField === "password" ? "'FILL' 1" : "'FILL' 0" }}
              >
                lock
              </span>
              <input
                {...registerField("password")}
                onFocus={() => setFocusedField("password")}
                onBlur={() => setFocusedField(null)}
                className="w-full pl-12 pr-12 py-3.5 bg-surface-container-lowest border border-outline-variant rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-body-md text-body-md placeholder:text-outline/60"
                id="password"
                placeholder="••••••••"
                type={showPassword ? "text" : "password"}
                disabled={isSubmitting}
              />
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors"
                onClick={() => setShowPassword(!showPassword)}
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">
                  {showPassword ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
            {errors.password && <p className="text-xs text-error ml-1 mt-0.5">{errors.password.message}</p>}
          </div>

          {/* Remember Me Checkbox */}
          <div className="pt-2">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                {...registerField("remember")}
                type="checkbox"
                id="remember"
                className="mt-1 w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary"
                disabled={isSubmitting}
              />
              <span className="font-body-sm text-body-sm text-on-surface-variant leading-tight select-none">
                Remember this device for 30 days
              </span>
            </label>
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
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <span>Login</span>
                <span className="material-symbols-outlined">login</span>
              </>
            )}
          </button>

          <p className="text-center font-body-sm text-body-sm text-on-surface-variant">
            New to Radheshyam Network?{" "}
            <Link href={AUTH_CONSTANTS.ROUTES.REGISTER} className="text-primary font-bold hover:underline">
              Register New Pharmacy
            </Link>
          </p>

          {/* Trust Badges & Footer */}
          <div className="pt-6 border-t border-outline-variant text-center space-y-4">
            <div className="flex justify-center items-center gap-4 opacity-60">
              <div className="flex items-center gap-1">
                <span className="material-symbols-outlined text-body-md">verified_user</span>
                <span className="font-label-sm text-label-sm uppercase tracking-wider">HIPAA Compliant</span>
              </div>
              <div className="flex items-center gap-1 border-l border-outline-variant pl-4">
                <span className="material-symbols-outlined text-body-md">shield</span>
                <span className="font-label-sm text-label-sm uppercase tracking-wider">AES-256 Encrypted</span>
              </div>
            </div>
            <p className="text-[10px] text-outline uppercase tracking-widest pt-2">© 2026 Sitaram Medical Group. All Rights Reserved.</p>
          </div>
        </div>
      </form>
    </main>
  );
}
