"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import useAuth from "@/hooks/useAuth";
import NotificationBell from "@/components/dashboard/NotificationBell";

interface HeaderProps {
  title?: string;
  icon?: string;
  rightActions?: React.ReactNode;
}

export default function Header({ title, icon, rightActions }: HeaderProps) {
  const { logout, user } = useAuth();


  const pathname = usePathname();

  // Determine dynamic defaults based on pathname
  let defaultTitle = "Sitaram Medical";
  let defaultIcon = "medical_services";

  if (pathname === "/dashboard") {
    defaultTitle = "Inventory";
    defaultIcon = "inventory_2";
  } else if (pathname.startsWith("/dashboard/catalog")) {
    defaultTitle = "Medicines";
    defaultIcon = "verified_user";
  } else if (pathname.startsWith("/dashboard/otp")) {
    defaultTitle = "Orders";
    defaultIcon = "local_shipping";
  } else if (pathname.startsWith("/dashboard/cart")) {
    defaultTitle = "Cart";
    defaultIcon = "shopping_cart";
  } else if (pathname.startsWith("/dashboard/checkout")) {
    defaultTitle = "Checkout";
    defaultIcon = "assignment_turned_in";
  } else if (pathname.startsWith("/dashboard/notifications")) {
    defaultTitle = "Notifications";
    defaultIcon = "notifications";
  } else if (pathname.startsWith("/dashboard/ocr")) {
    defaultTitle = "Scan Prescription";
    defaultIcon = "document_scanner";
  } else if (pathname.startsWith("/profile")) {
    defaultTitle = "Profile";
    defaultIcon = "person";
  }

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayTitle = title ?? defaultTitle;
  const displayIcon = icon ?? defaultIcon;

  const links = [
    { name: "Orders", href: "/dashboard/otp" },
    { name: "Scan Prescription", href: "/dashboard/ocr" },
    { name: "Email Prescriptions", href: "/dashboard/notifications" },
    { name: "Profile", href: "/profile" },
  ];

  return (
    <>
      {/* ── DESKTOP HEADER ── */}
      <header className="hidden md:block w-full bg-white border-b border-[#e0e3e5] sticky top-0 z-50 shadow-sm transition-all duration-300">
        <div className="max-w-[1440px] xl:max-w-[1600px] 2xl:max-w-[1760px] mx-auto px-4 sm:px-6 lg:px-8 h-16 relative flex justify-between items-center">
          {/* Brand Name on Left */}
          <Link href="/dashboard/otp" className="flex items-center hover:opacity-90 transition-opacity">
            <span className="text-xl font-bold text-[#003d9b] tracking-tight">
              Sitaram Medical
            </span>
          </Link>

          {/* Navigation Links - Centered in Middle */}
          <nav className="absolute left-1/2 -translate-x-1/2 flex items-center gap-8 sm:gap-10">
            {links.map((link) => {
              const isActive =
                link.href === "/dashboard/otp"
                  ? pathname.startsWith("/dashboard/otp") || pathname === "/dashboard"
                  : pathname.startsWith(link.href);

              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`text-sm font-semibold transition-colors relative py-1 hover:text-[#003d9b] ${
                    isActive
                      ? "text-[#003d9b] font-bold"
                      : "text-[#505f76]"
                  }`}
                >
                  {link.name}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 w-full h-[2px] bg-[#003d9b] rounded-full" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Top Right Actions: Notification Bell + Profile Dropdown */}
          <div className="flex items-center gap-3">
            <NotificationBell />

            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#e0e3e5] hover:bg-[#eceef0]/50 transition-all font-semibold text-sm text-[#505f76] hover:text-[#003d9b]"
              >
                <div className="w-6 h-6 rounded-full bg-[#003d9b]/10 text-[#003d9b] flex items-center justify-center font-bold text-[10px]">
                  {user?.name?.slice(0, 2).toUpperCase() || "RC"}
                </div>
                <span>{user?.name || "Chemist"}</span>
                <span
                  className="material-symbols-outlined text-[16px] transition-transform duration-200"
                  style={{ transform: isDropdownOpen ? "rotate(180deg)" : "none" }}
                >
                  keyboard_arrow_down
                </span>
              </button>

              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-[#e0e3e5] rounded-xl shadow-lg py-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="px-4 py-2 border-b border-[#e0e3e5]">
                    <p className="text-sm font-semibold text-on-surface truncate mt-0.5">{user?.name || "Registered Chemist"}</p>
                    <p className="text-xs text-[#737685] truncate">{user?.email || "chemist@gmail.com"}</p>
                  </div>
                  <div className="py-1">
                    <Link
                      href="/profile"
                      onClick={() => setIsDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-sm text-[#505f76] hover:bg-[#eceef0]/50 hover:text-[#003d9b] transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">person</span>
                      <span>Profile</span>
                    </Link>
                  </div>
                  <div className="border-t border-[#e0e3e5] pt-1">
                    <button
                      onClick={() => {
                        setIsDropdownOpen(false);
                        logout();
                      }}
                      className="w-full text-left flex items-center gap-2.5 px-4 py-2 text-sm text-[#ba1a1a] hover:bg-[#ffdad6]/40 transition-colors font-semibold"
                    >
                      <span className="material-symbols-outlined text-[18px]">logout</span>
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ── MOBILE HEADER ── */}
      <header className="md:hidden sticky top-0 z-40 bg-surface-container-lowest shadow-sm h-16 flex items-center px-4 justify-between border-b border-outline-variant">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-container rounded-lg flex items-center justify-center text-on-primary">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
              {displayIcon}
            </span>
          </div>
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-[#003d9b] font-bold">
            {displayTitle}
          </h1>
        </div>
        {rightActions || (
          <div className="flex items-center gap-3">
            <NotificationBell />
          </div>
        )}
      </header>
    </>
  );
}
