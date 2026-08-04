"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import { useRouter } from "next/navigation";
import useAuth from "@/hooks/useAuth";
import { AUTH_CONSTANTS } from "@/services/auth.constants";

const registerSchema = zod
  .object({
    name: zod.string().min(2, "Name must be at least 2 characters"),
    email: zod.string().min(1, "Email is required").email("Please enter a valid email address"),
    mobile: zod
      .string()
      .min(10, "Mobile number must be at least 10 digits")
      .regex(/^\+?[0-9\s\-]+$/, "Mobile must contain only numbers, spaces, or dashes"),
    location: zod.string().min(2, "Location must be at least 2 characters"),
    password: zod
      .string()
      .min(6, "Password must be at least 6 characters")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[0-9]/, "Password must contain at least one number")
      .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
    confirmPassword: zod.string().min(6, "Confirm password must be at least 6 characters"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RegisterFormValues = zod.infer<typeof registerSchema>;

export default function Register() {
  const { register: registerUser } = useAuth();
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Form setup
  const {
    register: registerField,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      mobile: "",
      location: "",
      password: "",
      confirmPassword: "",
    },
  });

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setValue("location", `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`, { shouldValidate: true });
        },
        (error) => {
          console.error(error);
          setErrorMsg("Could not fetch location automatically. Please enter your location.");
        }
      );
    } else {
      setErrorMsg("Geolocation is not supported by your browser.");
    }
  };

  const onSubmit = async (values: RegisterFormValues) => {
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await registerUser({
        name: values.name,
        email: values.email,
        mobile: values.mobile,
        location: values.location,
        password: values.password,
        confirmPassword: values.confirmPassword,
      });
      setSuccessMsg("Pharmacy registered successfully! Redirecting to login...");
      setTimeout(() => {
        router.push(AUTH_CONSTANTS.ROUTES.LOGIN);
      }, 2000);
    } catch (err) {
      console.error(err);
      setErrorMsg(err instanceof Error ? err.message : "Registration failed. Email might already exist.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col justify-center px-margin-mobile py-12 max-w-md mx-auto relative">
      {/* Brand Title */}
      <h1 className="font-headline-md text-headline-md font-bold text-primary text-center mb-6">
        Create Account
      </h1>

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

      {/* Registration Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
          {/* Full Name */}
          <div className="space-y-1 group">
            <div className="relative flex items-center">
              <span
                className={`material-symbols-outlined pointer-events-none flex items-center justify-center h-5 w-5 absolute left-4 top-1/2 -translate-y-1/2 text-[20px] leading-none transition-colors ${
                  focusedField === "name" ? "text-primary" : "text-on-surface-variant"
                }`}
                style={{ fontVariationSettings: focusedField === "name" ? "'FILL' 1" : "'FILL' 0" }}
              >
                person
              </span>
              <input
                {...registerField("name")}
                onFocus={() => setFocusedField("name")}
                onBlur={() => setFocusedField(null)}
                className="w-full pl-12 pr-4 h-14 bg-surface-container-lowest border border-outline-variant rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all text-base leading-normal placeholder:text-outline/60"
                id="fullname"
                placeholder="Full Name"
                type="text"
              />
            </div>
            {errors.name && <p className="text-xs text-error ml-1 mt-0.5">{errors.name.message}</p>}
          </div>

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
                placeholder="Email Address"
                type="email"
              />
            </div>
            {errors.email && <p className="text-xs text-error ml-1 mt-0.5">{errors.email.message}</p>}
          </div>

          {/* Mobile Number */}
          <div className="space-y-1 group">
            <div className="relative flex items-center">
              <span
                className={`material-symbols-outlined pointer-events-none flex items-center justify-center h-5 w-5 absolute left-4 top-1/2 -translate-y-1/2 text-[20px] leading-none transition-colors ${
                  focusedField === "mobile" ? "text-primary" : "text-on-surface-variant"
                }`}
                style={{ fontVariationSettings: focusedField === "mobile" ? "'FILL' 1" : "'FILL' 0" }}
              >
                call
              </span>
              <input
                {...registerField("mobile")}
                onFocus={() => setFocusedField("mobile")}
                onBlur={() => setFocusedField(null)}
                className="w-full pl-12 pr-4 h-14 bg-surface-container-lowest border border-outline-variant rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all text-base leading-normal placeholder:text-outline/60"
                id="phone"
                placeholder="Mobile Number"
                type="tel"
              />
            </div>
            {errors.mobile && <p className="text-xs text-error ml-1 mt-0.5">{errors.mobile.message}</p>}
          </div>

          {/* Location */}
          <div className="space-y-1 group">
            <div className="relative flex items-center">
              <span
                className={`material-symbols-outlined pointer-events-none flex items-center justify-center h-5 w-5 absolute left-4 top-1/2 -translate-y-1/2 text-[20px] leading-none transition-colors ${
                  focusedField === "location" ? "text-primary" : "text-on-surface-variant"
                }`}
                style={{ fontVariationSettings: focusedField === "location" ? "'FILL' 1" : "'FILL' 0" }}
              >
                location_on
              </span>
              <input
                {...registerField("location")}
                onFocus={() => setFocusedField("location")}
                onBlur={() => setFocusedField(null)}
                className="w-full pl-12 pr-12 h-14 bg-surface-container-lowest border border-outline-variant rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all text-base leading-normal placeholder:text-outline/60"
                id="location"
                placeholder="Location"
                type="text"
              />
              <button
                onClick={handleGetLocation}
                className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center h-6 w-6 text-primary hover:text-primary-container active:scale-90 transition-transform focus:outline-none"
                type="button"
                title="Get current location"
              >
                <span className="material-symbols-outlined text-[20px] leading-none">my_location</span>
              </button>
            </div>
            {errors.location && <p className="text-xs text-error ml-1 mt-0.5">{errors.location.message}</p>}
          </div>

          {/* Password */}
          <div className="space-y-1 group">
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
                <span>Completing Registration...</span>
              </>
            ) : (
              <span>Create Account</span>
            )}
          </button>

          <p className="text-center font-body-sm text-body-sm text-on-surface-variant">
            Already have an account?{" "}
            <Link href={AUTH_CONSTANTS.ROUTES.LOGIN} className="text-primary font-bold hover:underline">
              Log In
            </Link>
          </p>
        </div>
      </form>
    </main>
  );
}
