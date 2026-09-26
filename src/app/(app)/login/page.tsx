"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { useLanguage } from "@/context/language-context";
import { triggerHaptic } from "@/lib/motion/haptics";
import { deriveProfileFromEmail } from "@/lib/storage/auth-storage";
import type { UserRole } from "@/types/auth";
import {
  Mail,
  Phone,
  Sparkles,
  Sprout,
  User,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  Cloud,
  Smartphone,
  Laptop,
  AlertCircle,
  CloudRain,
  LogOut,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const {
    session,
    isGuest,
    signInWithGoogle,
    signInWithEmail,
    requestPhoneOtp,
    verifyPhoneOtpAndSignIn,
    signOut,
  } = useAuth();
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState<"google" | "phone">("google");

  // Email / Google state
  const [email, setEmail] = useState("");
  const [customName, setCustomName] = useState("");
  const [selectedRole, setSelectedRole] = useState<UserRole>("farmer");
  const [emailError, setEmailError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);

  // Phone state
  const [countryCode, setCountryCode] = useState("+91");
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState(["", "", "", "", "", ""]);
  const [phoneError, setPhoneError] = useState("");
  const [resendCountdown, setResendCountdown] = useState(30);
  const [activeDevOtp, setActiveDevOtp] = useState<string | null>(null);

  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Auto-fill extracted name
  useEffect(() => {
    if (email.includes("@")) {
      const { name } = deriveProfileFromEmail(email);
      if (!customName || customName === "WeatherGPT User" || customName === "User") {
        setCustomName(name);
      }
    }
  }, [email, customName]);

  // Resend countdown
  useEffect(() => {
    if (!otpSent || resendCountdown <= 0) return;
    const timer = setInterval(() => {
      setResendCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [otpSent, resendCountdown]);

  const validateEmail = (val: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(val.trim());
  };

  const handleGoogleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setEmailError("");

    const targetEmail = email.trim();
    if (!targetEmail) {
      setEmailError("Please enter your Gmail / Google address");
      return;
    }

    if (!validateEmail(targetEmail)) {
      setEmailError("Please enter a valid email format (e.g. yourname@gmail.com)");
      return;
    }

    setIsSubmitting(true);
    setSyncStatusMsg("Connecting to WeatherGPT Cloud & syncing account...");
    triggerHaptic("medium");

    try {
      await signInWithGoogle(targetEmail, customName.trim() || undefined, selectedRole);
      router.push("/");
    } finally {
      setIsSubmitting(false);
      setSyncStatusMsg(null);
    }
  };

  const handleSendOtp = async () => {
    setPhoneError("");
    const cleaned = phone.replace(/[^0-9]/g, "");

    if (cleaned.length < 10) {
      setPhoneError("Please enter a valid 10-digit mobile number");
      return;
    }

    setIsSubmitting(true);
    triggerHaptic("medium");

    const fullPhoneNumber = `${countryCode}${cleaned}`;
    try {
      if (requestPhoneOtp) {
        const result = await requestPhoneOtp(fullPhoneNumber);
        if (result.success) {
          setOtpSent(true);
          setResendCountdown(30);
          if (result.devOtp) {
            setActiveDevOtp(result.devOtp);
          }
          setTimeout(() => {
            otpInputRefs.current[0]?.focus();
          }, 150);
        } else {
          setPhoneError(result.error || "Failed to send OTP. Please try again.");
        }
      } else {
        setOtpSent(true);
        setActiveDevOtp("123456");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOtpChange = (index: number, val: string) => {
    const digit = val.slice(-1).replace(/[^0-9]/g, "");
    const updated = [...otpCode];
    updated[index] = digit;
    setOtpCode(updated);

    if (digit && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpCode[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text").replace(/[^0-9]/g, "").slice(0, 6);
    if (!pasteData) return;

    const newCode = [...otpCode];
    for (let i = 0; i < pasteData.length; i++) {
      newCode[i] = pasteData[i] ?? "";
    }
    setOtpCode(newCode);

    const nextIndex = Math.min(pasteData.length, 5);
    otpInputRefs.current[nextIndex]?.focus();
  };

  const handleAutoFillOtp = () => {
    if (!activeDevOtp) return;
    const digits = activeDevOtp.split("").slice(0, 6);
    const updated = ["", "", "", "", "", ""];
    digits.forEach((d, i) => {
      updated[i] = d;
    });
    setOtpCode(updated);
    triggerHaptic("light");
    otpInputRefs.current[5]?.focus();
  };

  const handlePhoneSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setPhoneError("");

    const fullCode = otpCode.join("");
    if (fullCode.length < 6 && fullCode.length < 4) {
      setPhoneError("Please enter the complete verification code");
      return;
    }

    setIsSubmitting(true);
    setSyncStatusMsg("Verifying OTP & restoring cross-device profile...");
    triggerHaptic("heavy");

    const fullPhoneNumber = `${countryCode} ${phone.trim()}`;
    try {
      if (verifyPhoneOtpAndSignIn) {
        const res = await verifyPhoneOtpAndSignIn(
          fullPhoneNumber,
          fullCode,
          customName.trim() || undefined,
          selectedRole
        );
        if (res.success) {
          router.push("/");
        } else {
          setPhoneError(res.error || "Incorrect code. Please check and re-enter.");
        }
      }
    } finally {
      setIsSubmitting(false);
      setSyncStatusMsg(null);
    }
  };

  const derived = email.includes("@") ? deriveProfileFromEmail(email) : null;

  return (
    <div className="min-h-screen py-8 px-4 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background Atmospheric Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-cyan-600/15 via-blue-600/10 to-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/70 border border-cyan-500/30 text-xs font-semibold text-cyan-300">
            <CloudRain size={14} className="text-cyan-400" />
            <span>WeatherGPT 2.0 Identity</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Welcome to WeatherGPT
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 max-w-sm mx-auto">
            Log in to automatically synchronize your favorite locations, alerts, and farm intelligence across phone and PC.
          </p>
        </div>

        {/* If already authenticated, show account card with fast action */}
        {!isGuest && session.user && (
          <div className="p-5 rounded-3xl bg-[#0d1322] border border-cyan-500/30 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <img
                src={session.user.image || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(session.user.name)}`}
                alt={session.user.name}
                className="w-12 h-12 rounded-full border border-cyan-400/40 bg-cyan-950"
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-white truncate">{session.user.name}</div>
                <div className="text-xs text-neutral-400 truncate">
                  {session.user.email || session.user.phone || "Active Account"}
                </div>
                <div className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
                  <CheckCircle2 size={11} /> Synced &amp; Active
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => router.push("/")}
                className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold text-xs shadow-md shadow-cyan-500/20 hover:scale-[1.01] transition-all"
              >
                Go to Dashboard
              </button>
              <button
                type="button"
                onClick={signOut}
                className="w-full py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all"
              >
                <LogOut size={13} /> Switch Account
              </button>
            </div>
          </div>
        )}

        {/* Login Card */}
        {(isGuest || !session.user) && (
          <div className="rounded-3xl bg-[#0d1322] border border-cyan-500/30 shadow-[0_0_50px_rgba(6,182,212,0.2),0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden">
            <div className="h-1.5 w-full bg-gradient-to-r from-cyan-500 via-sky-400 to-emerald-500" />

            {/* Tab Header */}
            <div className="p-4 sm:p-5 pb-2">
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

            {/* Sync Progress Status Banner */}
            {syncStatusMsg && (
              <div className="mx-5 mt-2 px-3 py-2 rounded-xl bg-cyan-950/60 border border-cyan-500/40 flex items-center gap-2 text-xs text-cyan-300 animate-pulse">
                <RefreshCw size={13} className="animate-spin text-cyan-400" />
                <span>{syncStatusMsg}</span>
              </div>
            )}

            {/* Tab 1: Google & Email */}
            <div className="p-5 pt-3 space-y-4">
              {activeTab === "google" && (
                <form onSubmit={handleGoogleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-neutral-300">
                      Gmail or Email Address <span className="text-cyan-400">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (emailError) setEmailError("");
                        }}
                        placeholder="e.g. arjun.kisan@gmail.com"
                        autoComplete="email"
                        required
                        className={`w-full px-3.5 py-2.5 rounded-xl bg-white/5 border ${
                          emailError
                            ? "border-red-400 focus:border-red-400"
                            : "border-white/10 focus:border-cyan-400"
                        } focus:ring-1 focus:ring-cyan-400 text-sm text-white placeholder-neutral-500 outline-none transition-all`}
                      />
                      {derived && (
                        <span className="absolute right-3 top-2.5 text-[10px] font-semibold text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
                          {derived.domain}
                        </span>
                      )}
                    </div>

                    <div className="flex gap-1.5 pt-1">
                      {["gmail.com", "outlook.com", "yahoo.com"].map((dom) => (
                        <button
                          key={dom}
                          type="button"
                          onClick={() => {
                            const [name] = email.split("@");
                            setEmail(`${name || "user"}@${dom}`);
                            setEmailError("");
                          }}
                          className="px-2 py-0.5 text-[10px] rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-400 hover:text-cyan-300 transition-colors"
                        >
                          @{dom}
                        </button>
                      ))}
                    </div>

                    {emailError && (
                      <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                        <AlertCircle size={12} /> {emailError}
                      </p>
                    )}
                  </div>

                  {derived && (
                    <div className="p-3 rounded-2xl bg-cyan-950/30 border border-cyan-500/20 flex items-center gap-3">
                      <img
                        src={derived.avatarUrl}
                        alt={derived.name}
                        className="w-9 h-9 rounded-full bg-cyan-900/60 border border-cyan-400/40"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-cyan-200 flex items-center gap-1.5">
                          <span>Detected: {customName || derived.name}</span>
                          <CheckCircle2 size={12} className="text-emerald-400" />
                        </div>
                        <div className="text-[11px] text-neutral-400 truncate">{email}</div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-neutral-300">
                      Your Full Name <span className="text-neutral-500">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder="e.g. Rajesh Sharma"
                      className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 focus:border-cyan-400 text-sm text-white placeholder-neutral-500 outline-none transition-all"
                    />
                  </div>

                  {/* Mode Selector */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-neutral-300">
                      Account Experience Mode
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

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs shadow-lg shadow-cyan-500/20 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                  >
                    <span>{isSubmitting ? "Connecting..." : "Sign In & Sync Account"}</span>
                    <ArrowRight size={14} />
                  </button>
                </form>
              )}

              {/* Tab 2: Phone OTP */}
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
                            onChange={(e) => {
                              setPhone(e.target.value.replace(/[^0-9]/g, "").slice(0, 10));
                              if (phoneError) setPhoneError("");
                            }}
                            placeholder="98765 43210"
                            autoComplete="tel"
                            required
                            className="flex-1 px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 text-sm text-white placeholder-neutral-500 outline-none transition-all tracking-wider font-mono"
                          />
                        </div>
                        {phoneError && <p className="text-xs text-red-400 mt-1">{phoneError}</p>}
                        <p className="text-[11px] text-neutral-400">
                          Enter phone number to receive instant SMS verification.
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
                        disabled={isSubmitting}
                        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-semibold text-xs shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                      >
                        <span>{isSubmitting ? "Sending OTP..." : "Get Verification Code (OTP)"}</span>
                        <ArrowRight size={14} />
                      </button>
                    </>
                  ) : (
                    /* Step 2: OTP Verification */
                    <div className="space-y-4">
                      <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 space-y-1.5 text-center">
                        <div className="text-xs font-semibold text-emerald-300">
                          Verification code sent to {countryCode} {phone}
                        </div>
                        {activeDevOtp && (
                          <div className="flex items-center justify-center gap-2 pt-1">
                            <span className="text-[11px] text-neutral-300">Code:</span>
                            <span className="px-2 py-0.5 font-mono font-bold text-xs bg-emerald-900/80 text-emerald-200 rounded border border-emerald-600/50">
                              {activeDevOtp}
                            </span>
                            <button
                              type="button"
                              onClick={handleAutoFillOtp}
                              className="px-2 py-0.5 text-[11px] font-semibold text-emerald-300 bg-emerald-500/20 hover:bg-emerald-500/30 rounded border border-emerald-400/40 transition-colors flex items-center gap-1"
                            >
                              <Sparkles size={11} /> Auto-fill
                            </button>
                          </div>
                        )}
                      </div>

                      {/* 6-digit OTP Inputs */}
                      <div className="flex justify-center gap-2 py-2">
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
                            onPaste={handleOtpPaste}
                            className="w-10 h-13 sm:w-11 sm:h-14 text-center text-lg sm:text-xl font-bold font-mono rounded-xl sm:rounded-2xl bg-white/5 border-2 border-white/15 focus:border-emerald-400 focus:bg-emerald-950/30 text-white outline-none transition-all"
                          />
                        ))}
                      </div>

                      {phoneError && (
                        <p className="text-xs text-red-400 text-center flex items-center justify-center gap-1">
                          <AlertCircle size={12} /> {phoneError}
                        </p>
                      )}

                      <div className="flex items-center justify-between text-xs text-neutral-400 pt-1">
                        <button
                          type="button"
                          onClick={() => setOtpSent(false)}
                          className="hover:text-white underline underline-offset-2"
                        >
                          Change Number
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
                        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-semibold text-xs shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                      >
                        <span>{isSubmitting ? "Verifying..." : "Verify & Restore Account"}</span>
                        <CheckCircle2 size={14} />
                      </button>
                    </div>
                  )}
                </form>
              )}
            </div>

            {/* Sync Guarantee Footer */}
            <div className="p-4 bg-white/[0.02] border-t border-white/10 flex items-center justify-center gap-4 text-xs text-neutral-400">
              <div className="flex items-center gap-1.5 text-cyan-300">
                <Laptop size={14} />
                <span>PC</span>
              </div>
              <span className="text-neutral-600">⇄</span>
              <div className="flex items-center gap-1.5 text-emerald-300">
                <Smartphone size={14} />
                <span>Mobile</span>
              </div>
              <span className="text-neutral-600">•</span>
              <span className="text-[11px] text-neutral-300">Real-time sync active</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
