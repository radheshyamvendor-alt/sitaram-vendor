"use client";

import { useEffect, useState } from "react";

export default function SplashOverlay() {
  const [isVisible, setIsVisible] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // Start fading out after 2000ms (2 seconds)
    const fadeTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, 1000);

    // Completely remove overlay from DOM after fade animation finishes (2500ms)
    const removeTimer = setTimeout(() => {
      setIsVisible(false);
    }, 1000);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] bg-gradient-to-br from-[#001d4a] via-[#002d72] to-[#0040a2] text-white flex flex-col items-center justify-center transition-all duration-500 ease-out select-none ${
        isFadingOut ? "opacity-0 scale-105 pointer-events-none" : "opacity-100 scale-100"
      }`}
    >
      {/* Background Ambient Glows */}
      <div className="absolute w-72 h-72 bg-blue-400/20 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute w-96 h-96 bg-indigo-500/15 rounded-full blur-[100px]"></div>

      {/* Main Content & Animation */}
      <div className="relative flex flex-col items-center z-10 space-y-6">
        {/* Animated Icon Container */}
        <div className="relative flex items-center justify-center">
          {/* Outer Rotating Ring */}
          <div className="w-24 h-24 rounded-full border-2 border-white/20 border-t-white animate-spin"></div>

          {/* Pulse Circle */}
          <div className="absolute w-20 h-20 bg-white/10 rounded-full flex items-center justify-center animate-ping opacity-25"></div>

          {/* Central Medical Icon */}
          <div className="absolute w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-md border border-white/30 shadow-2xl flex items-center justify-center text-white">
            <span className="material-symbols-outlined text-4xl animate-pulse">
              local_hospital
            </span>
          </div>
        </div>

        {/* Brand Name */}
        <div className="text-center space-y-1.5">
          <h1 className="text-3xl font-extrabold tracking-tight text-white drop-shadow-md">
            Sitaram Medical
          </h1>
          <p className="text-xs uppercase tracking-widest text-blue-200/80 font-medium">
            Healthcare Logistics & Pharmacy Network
          </p>
        </div>

        {/* 2-Second Animated Progress Bar */}
        <div className="w-48 h-1 bg-white/20 rounded-full overflow-hidden mt-4 relative">
          <div className="h-full bg-gradient-to-r from-blue-400 via-indigo-300 to-white animate-splash-bar"></div>
        </div>
      </div>
    </div>
  );
}
