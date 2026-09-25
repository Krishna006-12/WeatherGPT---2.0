"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/auth-context";
import { useLanguage } from "@/context/language-context";
import { triggerHaptic } from "@/lib/motion/haptics";
import { deriveProfileFromEmail } from "@/lib/storage/auth-storage";
import type { UserRole } from "@/types/auth";
import {
  X,
  Mail,
  Phone,
  Sparkles,
  Sprout,
  User,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
} from "lucide-react";

export function AuthModal() {
  const {
    isAuthModalOpen,
    authModalTab,
    closeAuthModal,
    signInWithGoogle,
    signInWithPhone,
    session,
  } = useAuth();
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState<"google" | "phone">("google");

  // Email form state
  const [email, setEmail] = useState("");
  const [customName, setCustomName] = useState("");
  const [selectedRole, setSelectedRole] = useState<UserRole>("farmer");
  const [emailError, setEmailError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Phone form state
  const [countryCode, setCountryCode] = useState("+91");
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState(["", "", "", ""]);
  const [phoneError, setPhoneError] = useState("");
  const [resendCountdown, setResendCountdown] = useState(30);

  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Sync activeTab with authModalTab on open
  useEffect(() => {
    if (isAuthModalOpen) {
      setActiveTab(authModalTab);
      setEmailError("");
      setPhoneError("");
      setOtpSent(false);
      setOtpCode(["", "", "", ""]);
      setResendCountdown(30);
    }
  }, [isAuthModalOpen, authModalTab]);

  // Resend OTP countdown
  useEffect(() => {
    if (!otpSent || resendCountdown <= 0) return;
    const timer = setInterval(() => {
      setResendCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [otpSent, resendCountdown]);

  // Auto-fill extracted name from email
  useEffect(() => {
    if (email.includes("@")) {
      const { name } = deriveProfileFromEmail(email);
      if (!customName || customName === "WeatherGPT User" || customName === "User") {
        setCustomName(name);
      }
    }
  }, [email, customName]);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isAuthModalOpen) {
        closeAuthModal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAuthModalOpen, closeAuthModal]);

  if (!isAuthModalOpen) return null;

  // Real Email validation
  const validateEmail = (val: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(val.trim());
  };

  const handleGoogleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setEmailError("");

    if (!email.trim()) {
      setEmailError("Please enter your email address");
      return;
    }

    if (!validateEmail(email)) {
      setEmailError("Please enter a valid email format (e.g. arjun@gmail.com)");
      return;
    }

    setIsSubmitting(true);
    triggerHaptic("medium");

    try {
      await signInWithGoogle(email.trim(), customName.trim() || undefined, selectedRole);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickGoogleOneTap = async () => {
    // If user already typed an email, use it; otherwise provide interactive default or prompt
    const targetEmail = email.trim() || "kisan.mitra@gmail.com";
    setIsSubmitting(true);
    triggerHaptic("medium");

    try {
      await signInWithGoogle(targetEmail, customName.trim() || undefined, selectedRole);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendOtp = () => {
    setPhoneError("");
    const cleaned = phone.replace(/[^0-9]/g, "");

    if (cleaned.length < 10) {
      setPhoneError("Please enter a valid 10-digit mobile number");
      return;
    }

    triggerHaptic("medium");
    setOtpSent(true);
    setResendCountdown(30);
    // Focus first OTP field
    setTimeout(() => {
      otpInputRefs.current[0]?.focus();
    }, 100);
  };

  const handleOtpChange = (index: number, val: string) => {
    const digit = val.slice(-1).replace(/[^0-9]/g, "");
    const updated = [...otpCode];
    updated[index] = digit;
    setOtpCode(updated);

    if (digit && index < 3) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpCode[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handlePhoneSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setPhoneError("");

    const fullCode = otpCode.join("");
    if (fullCode.length < 4) {
      setPhoneError("Please enter the 4-digit verification code");
      return;
    }

    setIsSubmitting(true);
    triggerHaptic("heavy");

    const fullPhoneNumber = `${countryCode} ${phone.trim()}`;
    try {
      await signInWithPhone(fullPhoneNumber, customName.trim() || undefined, selectedRole);
    } finally {
      setIsSubmitting(false);
    }
  };

  const derived = email.includes("@") ? deriveProfileFromEmail(email) : null;

  return (
    <div
      role="dialog"
      aria-label="Sign in to WeatherGPT 2.0"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    >
      {/* Subtle Focus Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-md transition-opacity animate-in fade-in"
        onClick={closeAuthModal}
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-md rounded-3xl bg-[#0d1322] border border-cyan-500/30 shadow-[0_0_50px_rgba(6,182,212,0.25),0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden z-10 animate-in zoom-in-95 duration-200">
        {/* Glow accent band */}
        <div className="h-1.5 w-full bg-gradient-to-r from-cyan-500 via-sky-400 to-blue-600" />

        {/* Header */}
        <div className="p-5 sm:p-6 pb-3 flex items-start justify-between">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-[11px] font-semibold text-cyan-300">
              <Sparkles size={12} /> WeatherGPT 2.0 Identity
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {t("auth.modal_title", "Sign in to WeatherGPT")}
            </h2>
            <p className="text-xs text-neutral-400">
              {t(
                "auth.modal_subtitle",
                "Connect your real email or mobile number to sync weather alerts, radar, and farm advice."
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={closeAuthModal}
            aria-label="Close dialog"
            className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Selection: Google/Email vs Phone */}
        <div className="px-5 sm:px-6 pt-2">
          <div className="grid grid-cols-2 p-1 rounded-2xl bg-white/5 border border-white/10">
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                setActiveTab("google");
              }}
              className={`flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-xl transition-all ${
                activeTab === "google"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-sm"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              <Mail size={14} />
              <span>Google / Email</span>
            </button>

            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                setActiveTab("phone");
              }}
              className={`flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-xl transition-all ${
                activeTab === "phone"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 shadow-sm"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              <Phone size={14} />
              <span>Phone / Mobile OTP</span>
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-5 sm:p-6 pt-4 space-y-4">
          {/* TAB 1: GOOGLE & EMAIL */}
          {activeTab === "google" && (
            <form onSubmit={handleGoogleSubmit} className="space-y-4">
              {/* Official Google 1-Click Action */}
              <button
                type="button"
                onClick={handleQuickGoogleOneTap}
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-2xl bg-white hover:bg-neutral-100 text-neutral-900 font-semibold text-xs transition-all shadow-[0_2px_12px_rgba(0,0,0,0.25)] hover:scale-[1.01] active:scale-[0.99]"
              >
                {/* Google "G" SVG */}
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15Z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98Z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>

              <div className="relative flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10" />
                </div>
                <span className="relative px-3 bg-[#0d1322] text-[11px] uppercase tracking-wider text-neutral-400 font-medium">
                  Or enter your real email
                </span>
              </div>

              {/* Email Address Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-neutral-300">
                  Email Address <span className="text-cyan-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. arjun.kisan@gmail.com"
                    autoComplete="email"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 text-sm text-white placeholder-neutral-500 outline-none transition-all"
                  />
                  {derived && (
                    <span className="absolute right-3 top-2.5 text-[10px] font-semibold text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
                      {derived.domain}
                    </span>
                  )}
                </div>
                {emailError && <p className="text-xs text-red-400 mt-1">{emailError}</p>}
              </div>

              {/* Extracted Profile Preview (if typed) */}
              {derived && (
                <div className="p-3 rounded-2xl bg-cyan-950/30 border border-cyan-500/20 flex items-center gap-3">
                  <img
                    src={derived.avatarUrl}
                    alt={derived.name}
                    className="w-9 h-9 rounded-full bg-cyan-900/60 border border-cyan-400/40"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-cyan-200 flex items-center gap-1.5">
                      <span>Detected: {derived.name}</span>
                      <CheckCircle2 size={12} className="text-emerald-400" />
                    </div>
                    <div className="text-[11px] text-neutral-400 truncate">{email}</div>
                  </div>
                </div>
              )}

              {/* Custom Display Name (Optional) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-neutral-300">
                  Your Full Name <span className="text-neutral-500">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g. Ramesh Patel"
                  className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 focus:border-cyan-400 text-sm text-white placeholder-neutral-500 outline-none transition-all"
                />
              </div>

              {/* Role Selection */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-neutral-300">
                  Default Experience Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedRole("farmer")}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all ${
                      selectedRole === "farmer"
                        ? "bg-emerald-950/60 border-emerald-500/60 text-emerald-300"
                        : "bg-white/5 border-white/10 text-neutral-400 hover:text-white"
                    }`}
                  >
                    <Sprout size={15} />
                    <div className="text-left">
                      <div className="font-semibold">Farmer Mode</div>
                      <div className="text-[10px] text-neutral-400">ICAR advisory</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedRole("user")}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all ${
                      selectedRole === "user"
                        ? "bg-cyan-950/60 border-cyan-500/60 text-cyan-300"
                        : "bg-white/5 border-white/10 text-neutral-400 hover:text-white"
                    }`}
                  >
                    <User size={15} />
                    <div className="text-left">
                      <div className="font-semibold">Urban Mode</div>
                      <div className="text-[10px] text-neutral-400">Commute &amp; AQI</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Submit Email Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs shadow-lg shadow-cyan-500/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
              >
                <span>Sign in with Email</span>
                <ArrowRight size={14} />
              </button>
            </form>
          )}

          {/* TAB 2: MOBILE PHONE OTP */}
          {activeTab === "phone" && (
            <form onSubmit={handlePhoneSubmit} className="space-y-4">
              {!otpSent ? (
                <>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-neutral-300">
                      Mobile Phone Number <span className="text-emerald-400">*</span>
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={countryCode}
                        onChange={(e) => setCountryCode(e.target.value)}
                        className="px-2.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white outline-none focus:border-emerald-400"
                      >
                        <option value="+91" className="bg-[#0e1424]">
                          🇮🇳 +91 (India)
                        </option>
                        <option value="+1" className="bg-[#0e1424]">
                          🇺🇸 +1 (USA)
                        </option>
                        <option value="+44" className="bg-[#0e1424]">
                          🇬🇧 +44 (UK)
                        </option>
                        <option value="+971" className="bg-[#0e1424]">
                          🇦🇪 +971 (UAE)
                        </option>
                        <option value="+880" className="bg-[#0e1424]">
                          🇧🇩 +880 (BD)
                        </option>
                      </select>

                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, "").slice(0, 10))}
                        placeholder="98765 43210"
                        autoComplete="tel"
                        required
                        className="flex-1 px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 text-sm text-white placeholder-neutral-500 outline-none transition-all tracking-wider font-mono"
                      />
                    </div>
                    {phoneError && <p className="text-xs text-red-400 mt-1">{phoneError}</p>}
                    <p className="text-[11px] text-neutral-400">
                      Standard SMS verification for seamless rural and smartphone login.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-neutral-300">
                      Your Name <span className="text-neutral-500">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder="e.g. Balwinder Singh"
                      className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 focus:border-emerald-400 text-sm text-white placeholder-neutral-500 outline-none transition-all"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleSendOtp}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-semibold text-xs shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
                  >
                    <span>Get Verification Code (OTP)</span>
                    <ArrowRight size={14} />
                  </button>
                </>
              ) : (
                /* Step 2: OTP Verification */
                <div className="space-y-4">
                  <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 space-y-1 text-center">
                    <div className="text-xs font-medium text-emerald-300">
                      Verification code sent to {countryCode} {phone}
                    </div>
                    <div className="text-[11px] text-neutral-400">
                      Enter the 4-digit code (Demo hint: <span className="font-mono font-bold text-white">4422</span> or any 4 digits)
                    </div>
                  </div>

                  {/* 4-digit OTP Boxes */}
                  <div className="flex justify-center gap-3 py-2">
                    {otpCode.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => {
                          otpInputRefs.current[idx] = el;
                        }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        className="w-12 h-14 text-center text-xl font-bold font-mono rounded-2xl bg-white/5 border-2 border-white/15 focus:border-emerald-400 focus:bg-emerald-950/30 text-white outline-none transition-all"
                      />
                    ))}
                  </div>

                  {phoneError && (
                    <p className="text-xs text-red-400 text-center">{phoneError}</p>
                  )}

                  <div className="flex items-center justify-between text-xs text-neutral-400 pt-1">
                    <button
                      type="button"
                      onClick={() => setOtpSent(false)}
                      className="hover:text-white underline underline-offset-2"
                    >
                      Change Phone Number
                    </button>

                    {resendCountdown > 0 ? (
                      <span className="text-neutral-500">Resend in {resendCountdown}s</span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium"
                      >
                        <RefreshCw size={12} /> Resend OTP
                      </button>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-semibold text-xs shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
                  >
                    <span>Verify &amp; Sign In</span>
                    <CheckCircle2 size={14} />
                  </button>
                </div>
              )}
            </form>
          )}

          {/* Privacy Footnote */}
          <div className="pt-2 border-t border-white/10 flex items-center justify-center gap-2 text-[10px] text-neutral-400">
            <ShieldCheck size={13} className="text-cyan-400 shrink-0" />
            <span>Zero data harvesting • Encrypted session • Local weather persistence</span>
          </div>
        </div>
      </div>
    </div>
  );
}
