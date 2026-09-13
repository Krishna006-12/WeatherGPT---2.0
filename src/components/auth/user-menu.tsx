"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/context/auth-context";
import { User, Sprout, LogIn, LogOut, Check, Shield } from "lucide-react";

export function UserMenu() {
  const { session, isGuest, isFarmer, signInWithGoogle, setRole, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="User profile & authentication"
        className="flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1 rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)] hover:border-[var(--border-default)] hover:bg-[var(--surface-3)] focus:outline-none transition-all duration-150"
      >
        <div className="relative w-6 h-6 rounded-full bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
          {isFarmer ? <Sprout size={13} /> : <User size={13} />}
          <span
            className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-black ${
              isGuest ? "bg-amber-400" : "bg-emerald-400"
            }`}
          />
        </div>
        <div className="hidden md:flex flex-col text-left leading-none">
          <span className="text-xs font-medium text-[var(--text-primary)]">
            {session.user.name}
          </span>
          <span className="text-[10px] text-[var(--text-tertiary)] flex items-center gap-1">
            {isFarmer ? "Farmer Mode" : "Urban"} • {isGuest ? "Guest" : "Google"}
          </span>
        </div>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 p-3 rounded-2xl bg-[var(--surface-2)] border border-[var(--border-default)] shadow-2xl backdrop-blur-xl z-50 animate-in fade-in zoom-in-95 duration-100">
          {/* Header */}
          <div className="pb-3 border-b border-[var(--border-subtle)]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-white">{session.user.name}</span>
              <span
                className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                  isGuest
                    ? "bg-amber-950/60 border border-amber-800/60 text-amber-300"
                    : "bg-emerald-950/60 border border-emerald-800/60 text-emerald-300"
                }`}
              >
                {isGuest ? "Guest (Unsaved)" : "Verified Google"}
              </span>
            </div>
            <p className="text-[11px] text-[var(--text-tertiary)] truncate">
              {session.user.email || "Rural Offline/Guest Session"}
            </p>
          </div>

          {/* Role Switching */}
          <div className="py-2.5 border-b border-[var(--border-subtle)]">
            <span className="text-[10px] uppercase font-semibold text-[var(--text-tertiary)] tracking-wider block mb-1.5">
              Experience Mode
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setRole("farmer")}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  isFarmer
                    ? "bg-emerald-950/60 border border-emerald-700/50 text-emerald-300"
                    : "bg-[var(--surface-1)] hover:bg-[var(--surface-3)] text-neutral-400"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Sprout size={12} />
                  Farmer
                </span>
                {isFarmer && <Check size={12} />}
              </button>

              <button
                type="button"
                onClick={() => setRole("user")}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  !isFarmer
                    ? "bg-cyan-950/60 border border-cyan-700/50 text-cyan-300"
                    : "bg-[var(--surface-1)] hover:bg-[var(--surface-3)] text-neutral-400"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <User size={12} />
                  General
                </span>
                {!isFarmer && <Check size={12} />}
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2.5 space-y-1.5">
            {isGuest ? (
              <button
                type="button"
                onClick={() => {
                  signInWithGoogle();
                  setIsOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white text-neutral-900 text-xs font-medium hover:bg-neutral-100 transition-colors shadow-sm"
              >
                <LogIn size={13} />
                Sign in with Google
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  signOut();
                  setIsOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded-xl bg-red-950/30 border border-red-900/40 text-red-400 text-xs font-medium hover:bg-red-950/50 transition-colors"
              >
                <LogOut size={13} />
                Sign Out
              </button>
            )}

            <div className="pt-1 flex items-center justify-center gap-1 text-[10px] text-[var(--text-tertiary)]">
              <Shield size={10} />
              <span>Zero data harvesting • Open access</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
