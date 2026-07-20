"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import useAuth from "@/hooks/useAuth";

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
    { name: "Medicines", href: "/dashboard/catalog" },
    { name: "Scan Prescription", href: "/dashboard/ocr" },
    { name: "Orders", href: "/dashboard/otp" },
    { name: "Inventry", href: "/dashboard", displayName: "Inventory" },
    { name: "Profile", href: "/profile" },
    { name: "Notifications", href: "/dashboard/notifications" },
  ];

  return (
    <>
      {/* ── DESKTOP HEADER ── */}
      <header className="hidden md:block w-full bg-white border-b border-[#e0e3e5] sticky top-0 z-50 shadow-sm transition-all duration-300">
        <div className="max-w-[1440px] xl:max-w-[1600px] 2xl:max-w-[1760px] mx-auto px-4 sm:px-6 lg:px-8 h-20 xl:h-16 flex justify-between items-center transition-all duration-300">
          {/* Brand Name / Logo on Left */}
          <div className="flex items-center gap-6 xl:gap-8">
            <Link href="/dashboard" className="flex items-center hover:opacity-90 transition-opacity gap-2">
              <span className="text-xl sm:text-2xl font-bold text-[#003d9b] xl:hidden">
                Sitaram Medical
              </span>
              <div className="hidden xl:flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#003d9b] to-[#0052cc] flex items-center justify-center text-white shadow-sm shrink-0">
                  <span className="material-symbols-outlined text-[18px] font-bold" style={{ fontVariationSettings: "'FILL' 1" }}>pulse</span>
                </div>
                <span className="text-lg font-black text-[#003d9b] tracking-tight">SM</span>
              </div>
            </Link>
            {/* Navigation Links - Desktop */}
            <nav className="flex items-center gap-2 xl:gap-3">
              {links.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    className={`text-sm font-semibold transition-all pb-1 xl:pb-0 xl:px-3 xl:py-1.5 xl:rounded-lg hover:text-[#003d9b] ${
                      isActive
                        ? "text-[#003d9b] border-b-2 border-[#003d9b] xl:border-b-0 xl:bg-[#003d9b]/5 xl:text-[#003d9b] font-bold"
                        : "text-[#505f76] xl:hover:bg-[#eceef0]/50"
                    }`}
                  >
                    {link.displayName || link.name}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* User profile / Logout on Right */}
          <div className="flex items-center gap-4">
            {/* Old layout for md/lg, hidden on xl */}
            <div className="flex xl:hidden items-center gap-4">
              <button
                onClick={logout}
                className="text-sm font-semibold text-[#505f76] hover:text-[#ba1a1a] transition-colors"
              >
                Logout
              </button>
              <div className="w-10 h-10 rounded-full bg-surface-container-highest overflow-hidden border border-[#e0e3e5] shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt="User Avatar"
                  className="w-full h-full object-cover"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuA8DDlvrxN56DhF-qAbAW49-l1xusXm4nU0pdNonwGYZJ5XE97jF2-h1-CIu5lqxQRe4_l_1C9v8gpdU2UHA4B9pUiFcZ_8EkVK5rH-JQlDXvDyJc3XAb5YYm-K_B5cXypPVBNdez3Mm8Eii1Iocaj39DhKO8q2uDFva2VFjDDBLk8MI4oW367fb0ujikN0DxZJQqs0buCuPl3oVMDL-u5GPciNVlsEY6DtmneJ9hcVSThwQuosj7WkEYmN0onNVD-DBwKf0cH1Q0k"
                />
              </div>
            </div>

            {/* New premium dropdown on xl */}
            <div className="hidden xl:block relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#e0e3e5] hover:bg-[#eceef0]/50 transition-all font-semibold text-sm text-[#505f76] hover:text-[#003d9b]"
              >
                <div className="w-6 h-6 rounded-full bg-[#003d9b]/10 text-[#003d9b] flex items-center justify-center font-bold text-[10px]">
                  {user?.name?.slice(0, 2).toUpperCase() || "RC"}
                </div>
                <span>{user?.name || "Chemist"}</span>
                <span className="material-symbols-outlined text-[16px] transition-transform duration-200" style={{ transform: isDropdownOpen ? "rotate(180deg)" : "none" }}>keyboard_arrow_down</span>
              </button>

              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-[#e0e3e5] rounded-xl shadow-lg py-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="px-4 py-2 border-b border-[#e0e3e5]">
                    <p className="text-[10px] font-bold text-[#737685] uppercase tracking-wider">Account</p>
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
                    <Link
                      href="/dashboard/notifications"
                      onClick={() => setIsDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-sm text-[#505f76] hover:bg-[#eceef0]/50 hover:text-[#003d9b] transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">notifications</span>
                      <span>Notifications</span>
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
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/notifications"
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-high transition-colors text-on-surface-variant"
            >
              <span className="material-symbols-outlined">notifications</span>
            </Link>
          </div>
        )}
      </header>
    </>
  );
}
