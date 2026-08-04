"use client";

import { useEffect } from "react";
import useAuth from "@/hooks/useAuth";
import Header from "@/components/dashboard/Header";
import BottomNav from "@/components/dashboard/BottomNav";
import { LogOut } from "lucide-react";
import GmailConnectCard from "@/components/dashboard/GmailConnectCard";

export default function Profile() {
  const { user, logout, refreshProfile } = useAuth();

  useEffect(() => {
    if (!user) {
      refreshProfile();
    }
  }, [user, refreshProfile]);

  return (
    <div className="min-h-screen bg-background trust-gradient pb-24 md:pb-12 text-on-surface">
      {/* Shared Header Component */}
      <Header />

      {/* Main Panel */}
      <main className="max-w-[800px] mx-auto px-margin-mobile md:px-margin-desktop py-xl">
        {/* Profile Card */}
        <div className="bg-surface border border-outline-variant shadow-sm rounded-xl p-6 glass-card space-y-6">
          <div className="flex items-center gap-4 border-b border-outline-variant pb-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-xl border border-primary/20">
              {user?.name?.slice(0, 2).toUpperCase() || "RC"}
            </div>
            <div>
              <h2 className="text-headline-md font-bold text-on-surface">{user?.name}</h2>
              <span className="text-xs font-semibold text-accent-cyan uppercase tracking-wider">Registered Chemist Member</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-1">
              <span className="text-xs text-outline block font-medium">Full Name</span>
              <span className="font-semibold text-on-surface text-base">{user?.name}</span>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-outline block font-medium">Email Address</span>
              <span className="font-semibold text-on-surface text-base">{user?.email}</span>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-outline block font-medium">Mobile Number</span>
              <span className="font-semibold text-on-surface text-base">{user?.mobile}</span>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-outline block font-medium">Location</span>
              <span className="font-semibold text-on-surface text-base">{user?.location}</span>
            </div>
          </div>

          <div className="pt-6 border-t border-outline-variant flex justify-end">
            <button
              onClick={logout}
              className="w-full sm:w-auto px-6 py-3 bg-error text-on-error hover:bg-error/90 active:scale-[0.98] transition-all rounded-xl font-label-md text-label-md flex items-center justify-center gap-2 shadow-md cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Gmail Integration Card */}
        {user?.email && (
          <div className="mt-6">
            <GmailConnectCard chemistEmail={user.email} />
          </div>
        )}
      </main>

      {/* Shared Responsive Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
