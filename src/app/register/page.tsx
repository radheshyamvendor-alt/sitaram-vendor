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
  const [step, setStep] = useState(1);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Compliance Agreements
  const [agreedToHIPAA, setAgreedToHIPAA] = useState(false);
  const [agreedToStorage, setAgreedToStorage] = useState(false);

  // Form setup
  const {
    register: registerField,
    handleSubmit,
    trigger,
    getValues,
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

  const getProgressDetails = () => {
    switch (step) {
      case 1:
        return { label: "Step 1: Personal", title: "Create Profile", offset: 94.2 };
      case 2:
        return { label: "Step 2: Security", title: "Secure Account", offset: 62.8 };
      case 3:
        return { label: "Step 3: Compliance", title: "Agreements", offset: 31.4 };
      case 4:
        return { label: "Step 4: Verification", title: "Review Details", offset: 0 };
      default:
        return { label: "Step 1: Personal", title: "Create Profile", offset: 94.2 };
    }
  };

  const handleNextStep = async () => {
    setErrorMsg(null);
    let fieldsToValidate: Array<keyof RegisterFormValues> = [];
    if (step === 1) {
      fieldsToValidate = ["name", "email", "mobile", "location"];
    } else if (step === 2) {
      fieldsToValidate = ["password", "confirmPassword"];
    }

    if (fieldsToValidate.length > 0) {
      const isValid = await trigger(fieldsToValidate);
      if (isValid) {
        setStep(step + 1);
      }
    } else if (step === 3) {
      if (!agreedToHIPAA || !agreedToStorage) {
        setErrorMsg("Please accept all security and compliance agreements to proceed.");
        return;
      }
      setStep(step + 1);
    }
  };

  const handleBackStep = () => {
    setErrorMsg(null);
    if (step === 1) {
      router.push(AUTH_CONSTANTS.ROUTES.LOGIN);
    } else {
      setStep(step - 1);
    }
  };

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
    if (!agreedToHIPAA || !agreedToStorage) {
      setErrorMsg("Please accept the HIPAA compliance and storage agreements.");
      return;
    }

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

  const progress = getProgressDetails();

  return (
    <main className="min-h-screen flex flex-col px-margin-mobile pt-12 pb-10 max-w-md mx-auto relative">
      {/* Subtle Background Decorations */}
      <div className="fixed -bottom-24 -right-24 w-64 h-64 bg-primary-container/20 rounded-full blur-3xl -z-10"></div>
      <div className="fixed top-1/4 -left-12 w-48 h-48 bg-secondary-container/10 rounded-full blur-2xl -z-10"></div>

      {/* Brand & Back Action */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={handleBackStep}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-container-lowest shadow-sm border border-outline-variant text-on-surface-variant active:scale-95 transition-transform"
          type="button"
          aria-label="Go back"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <span className="font-headline-md text-headline-md font-bold text-primary">Sitaram Medical</span>
        <div className="w-10"></div> {/* Spacer for symmetry */}
      </div>

      {/* Progress Indicator */}
      <div className="mb-10 bg-surface-container-lowest rounded-xl p-4 flex items-center gap-4 shadow-sm border border-outline-variant">
        <div className="relative w-12 h-12">
          <svg className="w-12 h-12 transform -rotate-90">
            <circle className="text-surface-container" cx="24" cy="24" fill="transparent" r="20" stroke="currentColor" strokeWidth="4"></circle>
            <circle
              className="text-primary progress-ring"
              cx="24"
              cy="24"
              fill="transparent"
              r="20"
              stroke="currentColor"
              stroke-dasharray="125.6"
              stroke-dashoffset={progress.offset}
              strokeWidth="4"
            ></circle>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-label-sm text-label-sm text-primary">{step}/4</span>
          </div>
        </div>
        <div>
          <p className="font-label-md text-label-md text-on-surface-variant mb-0.5">{progress.label}</p>
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">{progress.title}</h1>
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

      {/* Registration Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="flex-grow flex flex-col justify-between">
        <div className="space-y-6">
          {step === 1 && (
            <>
              {/* Full Name */}
              <div className="space-y-1.5 group">
                <label
                  className={`font-label-md text-label-md ml-1 transition-colors ${
                    focusedField === "name" ? "text-primary" : "text-on-surface-variant"
                  }`}
                  htmlFor="fullname"
                >
                  Full Name
                </label>
                <div className="relative">
                  <span
                    className={`material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[20px] transition-colors ${
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
                    className="w-full pl-12 pr-4 py-3.5 bg-surface-container-lowest border border-outline-variant rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-body-md text-body-md placeholder:text-outline/60"
                    id="fullname"
                    placeholder="Dr. Sameer Sharma"
                    type="text"
                  />
                </div>
                {errors.name && <p className="text-xs text-error ml-1 mt-0.5">{errors.name.message}</p>}
              </div>

              {/* Email Address */}
              <div className="space-y-1.5 group">
                <label
                  className={`font-label-md text-label-md ml-1 transition-colors ${
                    focusedField === "email" ? "text-primary" : "text-on-surface-variant"
                  }`}
                  htmlFor="email"
                >
                  Email Address
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
                  />
                </div>
                {errors.email && <p className="text-xs text-error ml-1 mt-0.5">{errors.email.message}</p>}
              </div>

              {/* Mobile Number */}
              <div className="space-y-1.5 group">
                <label
                  className={`font-label-md text-label-md ml-1 transition-colors ${
                    focusedField === "mobile" ? "text-primary" : "text-on-surface-variant"
                  }`}
                  htmlFor="phone"
                >
                  Mobile Number
                </label>
                <div className="relative">
                  <span
                    className={`material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[20px] transition-colors ${
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
                    className="w-full pl-12 pr-4 py-3.5 bg-surface-container-lowest border border-outline-variant rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-body-md text-body-md placeholder:text-outline/60"
                    id="phone"
                    placeholder="+91 98765 43210"
                    type="tel"
                  />
                </div>
                {errors.mobile && <p className="text-xs text-error ml-1 mt-0.5">{errors.mobile.message}</p>}
              </div>

              {/* Location */}
              <div className="space-y-1.5 group">
                <label
                  className={`font-label-md text-label-md ml-1 transition-colors ${
                    focusedField === "location" ? "text-primary" : "text-on-surface-variant"
                  }`}
                  htmlFor="location"
                >
                  Location
                </label>
                <div className="relative">
                  <span
                    className={`material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[20px] transition-colors ${
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
                    className="w-full pl-12 pr-12 py-3.5 bg-surface-container-lowest border border-outline-variant rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-body-md text-body-md placeholder:text-outline/60"
                    id="location"
                    placeholder="Mumbai, Maharashtra"
                    type="text"
                  />
                  <button
                    onClick={handleGetLocation}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-primary hover:text-primary-container active:scale-90 transition-transform"
                    type="button"
                    title="Get current location"
                  >
                    <span className="material-symbols-outlined text-[20px]">my_location</span>
                  </button>
                </div>
                {errors.location && <p className="text-xs text-error ml-1 mt-0.5">{errors.location.message}</p>}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              {/* Password */}
              <div className="space-y-1.5 group">
                <label
                  className={`font-label-md text-label-md ml-1 transition-colors ${
                    focusedField === "password" ? "text-primary" : "text-on-surface-variant"
                  }`}
                  htmlFor="password"
                >
                  Password
                </label>
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
            </>
          )}

          {step === 3 && (
            <>
              {/* HIPAA / AES Guidelines Info Card */}
              <div className="bg-surface-container-high rounded-2xl p-5 border border-outline-variant space-y-4">
                <div className="flex items-center gap-2 text-primary">
                  <span className="material-symbols-outlined">gavel</span>
                  <h3 className="font-semibold text-body-lg">Privacy &amp; Regulatory Standard</h3>
                </div>
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  Sitaram Medical matches enterprise-grade healthcare communication and database storage guidelines. All operations are processed using AES-256 bit encryption to ensure confidentiality, integrity, and availability.
                </p>
              </div>

              {/* Compliance checkboxes */}
              <div className="space-y-4 pt-2">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreedToHIPAA}
                    onChange={(e) => setAgreedToHIPAA(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary"
                  />
                  <span className="font-body-sm text-body-sm text-on-surface-variant leading-tight select-none">
                    Agree to the HIPAA Compliance guidelines and AES-256 data encryption storage standard.
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreedToStorage}
                    onChange={(e) => setAgreedToStorage(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary"
                  />
                  <span className="font-body-sm text-body-sm text-on-surface-variant leading-tight select-none">
                    I authorize Sitaram Medical to store facility contact credentials and location parameters.
                  </span>
                </label>
              </div>
            </>
          )}

          {step === 4 && (
            <>
              {/* Review card */}
              <div className="bg-surface-container-high rounded-2xl p-5 border border-outline-variant space-y-4">
                <span className="text-xs uppercase text-outline block tracking-wider font-semibold">Review Profile Details</span>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="col-span-2 md:col-span-1">
                    <span className="text-xs text-on-surface-variant block mb-0.5">Full Name</span>
                    <span className="font-semibold text-on-surface text-body-md block">{getValues("name")}</span>
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <span className="text-xs text-on-surface-variant block mb-0.5">Email Address</span>
                    <span className="font-semibold text-on-surface text-body-md block break-all">{getValues("email")}</span>
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <span className="text-xs text-on-surface-variant block mb-0.5">Mobile Number</span>
                    <span className="font-semibold text-on-surface text-body-md block">{getValues("mobile")}</span>
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <span className="text-xs text-on-surface-variant block mb-0.5">Location</span>
                    <span className="font-semibold text-on-surface text-body-md block">{getValues("location")}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* CTA Section */}
        <div className="mt-10 space-y-4">
          {step < 4 ? (
            <button
              onClick={handleNextStep}
              className="w-full h-14 bg-primary text-on-primary rounded-xl font-label-md text-label-md flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-all hover:bg-on-primary-fixed-variant"
              type="button"
            >
              <span>Next Step</span>
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          ) : (
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
                <>
                  <span>Complete Onboarding</span>
                  <span className="material-symbols-outlined">check_circle</span>
                </>
              )}
            </button>
          )}

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
