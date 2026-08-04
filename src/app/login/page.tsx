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
    <main className="min-h-screen flex flex-col justify-center px-margin-mobile py-12 max-w-md mx-auto relative">
      {/* Brand Title */}
      <h1 className="font-headline-md text-headline-md font-bold text-primary text-center mb-8">
        Login here
      </h1>

      {/* Error Feedback */}
      {errorMsg && (
        <div className="mb-6 p-3 bg-error-container/30 border border-error text-error text-sm rounded-xl flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">error</span>
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Login Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Email Address */}
        <div className="space-y-1.5 group">
          <div className="relative flex items-center">
            <span
              className={`material-symbols-outlined pointer-events-none flex items-center justify-center h-5 w-5 absolute left-4 top-1/2 -translate-y-1/2 text-[20px] leading-none transition-colors ${
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
              className="w-full pl-12 pr-4 h-14 bg-surface-container-lowest border border-outline-variant rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all text-base leading-normal placeholder:text-outline/60"
              id="email"
              placeholder="Email"
              type="email"
              disabled={isSubmitting}
            />
          </div>
          {errors.email && <p className="text-xs text-error ml-1 mt-0.5">{errors.email.message}</p>}
        </div>

        {/* Password */}
        <div className="space-y-1.5 group">
          <div className="relative flex items-center">
            <span
              className={`material-symbols-outlined pointer-events-none flex items-center justify-center h-5 w-5 absolute left-4 top-1/2 -translate-y-1/2 text-[20px] leading-none transition-colors ${
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
              className="w-full pl-12 pr-12 h-14 bg-surface-container-lowest border border-outline-variant rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all text-base leading-normal placeholder:text-outline/60"
              id="password"
              placeholder="Password"
              type={showPassword ? "text" : "password"}
              disabled={isSubmitting}
            />
            <button
              className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center h-6 w-6 text-outline hover:text-primary transition-colors focus:outline-none"
              onClick={() => setShowPassword(!showPassword)}
              type="button"
            >
              <span className="material-symbols-outlined text-[20px] leading-none select-none">
                {showPassword ? "visibility_off" : "visibility"}
              </span>
            </button>
          </div>
          {errors.password && <p className="text-xs text-error ml-1 mt-0.5">{errors.password.message}</p>}
          <div className="flex justify-end pt-1">
            <Link href={AUTH_CONSTANTS.ROUTES.FORGOT_PASSWORD} className="font-label-md text-label-md text-primary hover:underline transition-all">
              Forgot Password?
            </Link>
          </div>
        </div>

        {/* Login Button */}
        <button
          className="w-full h-14 bg-primary text-on-primary rounded-xl font-label-md text-label-md flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-all hover:bg-on-primary-fixed-variant disabled:opacity-75 disabled:cursor-not-allowed mt-8"
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
            <span>Login</span>
          )}
        </button>

        {/* Create New Account Link */}
        <div className="text-center pt-2">
          <Link
            href={AUTH_CONSTANTS.ROUTES.REGISTER}
            className="font-label-md text-label-md text-primary hover:underline transition-all font-medium"
          >
            Create new account
          </Link>
        </div>
      </form>
    </main>
  );
}


