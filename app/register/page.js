"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { Eye, EyeOff, ArrowRight, Clapperboard, Sparkles, History } from "lucide-react";

function getStrength(password) {
  if (!password) return null;
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return ["weak", "fair", "good", "strong"][Math.min(score, 3)];
}

const strengthConfig = {
  weak:   { label: "Weak",   color: "#ef4444", segs: 1 },
  fair:   { label: "Fair",   color: "#f97316", segs: 2 },
  good:   { label: "Good",   color: "#eab308", segs: 3 },
  strong: { label: "Strong", color: "#22c55e", segs: 4 },
};

const perks = [
  { icon: Clapperboard, text: "Build custom movie collections" },
  { icon: History,      text: "Track your personal watch history" },
  { icon: Sparkles,     text: "Discover AI-powered movie matches" },
];

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [preferredLanguages, setPreferredLanguages] = useState([]);
  const [formData, setFormData] = useState({ username: "", email: "", password: "" });

  const availableLanguages = [
    { id: "hi", name: "Hindi" },
    { id: "en", name: "English" },
    { id: "te", name: "Telugu" },
    { id: "ta", name: "Tamil" },
    { id: "ml", name: "Malayalam" },
    { id: "kn", name: "Kannada" },
    { id: "ko", name: "Korean" },
    { id: "ja", name: "Japanese" },
  ];

  const toggleLanguage = (langId) => {
    setPreferredLanguages((prev) =>
      prev.includes(langId) ? prev.filter((id) => id !== langId) : [...prev, langId]
    );
  };

  const handleChange = (e) =>
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const strength = getStrength(formData.password);
  const cfg = strength ? strengthConfig[strength] : null;
  const isValid = formData.username && formData.email && formData.password.length >= 8 && agreed;

  const usernameInvalid = formData.username && !/^[a-zA-Z0-9_]+$/.test(formData.username);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!isValid) return;
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, preferredLanguages }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Account created!");
        router.push("/login");
      } else {
        toast.error(data.message ?? "Registration failed");
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Progress steps
  const step1 = !!formData.username;
  const step2 = !!formData.email;
  const step3 = strength === "good" || strength === "strong";
  const step4 = preferredLanguages.length > 0;

  return (
    <main className="min-h-screen flex bg-[#0a0a0a] text-white font-sans overflow-hidden relative">
      {/* Background art */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0"
          style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px)", backgroundSize: "40px 40px" }} />
        <div className="absolute -top-24 -right-24 w-[450px] h-[450px] rounded-full"
          style={{ background: "radial-gradient(circle,rgba(220,38,38,0.13) 0%,transparent 70%)" }} />
        <div className="absolute -bottom-16 -left-16 w-[320px] h-[320px] rounded-full"
          style={{ background: "radial-gradient(circle,rgba(220,38,38,0.07) 0%,transparent 70%)" }} />
        <div className="absolute top-0 bottom-0 w-px opacity-40"
          style={{ left: "45%", background: "linear-gradient(to bottom,transparent,rgba(220,38,38,0.3) 40%,rgba(220,38,38,0.3) 60%,transparent)" }} />
      </div>

      {/* Left panel */}
      <div className="hidden lg:flex w-[45%] flex-col justify-between px-14 py-16 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <span className="text-sm font-medium tracking-wide">MOVIEKART</span>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-5">
            <div className="w-1.5 h-1.5 rounded-full bg-red-600" />
            <span className="text-xs font-medium text-red-500 tracking-widest uppercase">Get started</span>
          </div>
          <h1 className="font-serif text-5xl font-bold leading-tight mb-5">
            Join the community<br /><em className="text-red-500 italic">of cinephiles.</em>
          </h1>
          <p className="text-sm text-white/40 leading-relaxed max-w-xs">
            Create your free account in seconds and unlock the full potential of your movie discovery journey.
          </p>
          <div className="mt-11 flex flex-col gap-3.5">
            {perks.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(220,38,38,0.12)", border: "1px solid rgba(220,38,38,0.2)" }}>
                  <Icon size={14} className="text-red-500" />
                </div>
                <span className="text-sm text-white/45">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-white/18">© 2026 MovieKart Inc. All rights reserved.</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 relative z-10">
        <div className="w-full max-w-md bg-white/[0.04] border border-white/[0.08] rounded-2xl p-10 max-h-[90vh] overflow-y-auto no-scrollbar">
          <h2 className="font-serif text-2xl font-bold mb-1">Create account</h2>
          <p className="text-sm text-white/32 mb-6">Free forever · No credit card needed</p>

          {/* Progress bar */}
          <div className="flex gap-1.5 mb-7">
            {[step1, step2, step3, step4].map((active, i) => (
              <div key={i} className="h-[3px] flex-1 rounded-full transition-all duration-300"
                style={{ background: active ? (i === 0 ? "#dc2626" : i === 1 ? "rgba(220,38,38,0.5)" : i === 2 ? "rgba(220,38,38,0.35)" : "rgba(220,38,38,0.25)") : "rgba(255,255,255,0.1)" }} />
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-medium text-white/45 uppercase tracking-widest">Username</label>
              <input
                type="text" name="username" placeholder="e.g. john_doe" required
                onChange={handleChange}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/18 outline-none focus:border-red-600/55 focus:bg-red-600/[0.04] transition-all"
              />
              <span className={`text-[11px] transition-colors ${usernameInvalid ? "text-orange-400" : "text-white/25"}`}>
                {usernameInvalid ? "⚠ Only letters, numbers, and underscores" : "Letters, numbers and underscores only"}
              </span>
            </div>

            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-medium text-white/45 uppercase tracking-widest">Email address</label>
              <input
                type="email" name="email" placeholder="you@example.com" required
                onChange={handleChange}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/18 outline-none focus:border-red-600/55 focus:bg-red-600/[0.04] transition-all"
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-medium text-white/45 uppercase tracking-widest">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"} name="password"
                  placeholder="Min. 8 characters" required
                  onChange={handleChange}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-11 text-sm text-white placeholder-white/18 outline-none focus:border-red-600/55 focus:bg-red-600/[0.04] transition-all"
                />
                <button type="button" onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/28 hover:text-white/65 transition-colors">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {/* Strength bar */}
              <div className="flex gap-1 mt-1">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-[3px] flex-1 rounded-full transition-all duration-300"
                    style={{ background: cfg && i <= cfg.segs ? cfg.color : "rgba(255,255,255,0.1)" }} />
                ))}
              </div>
              <span className="text-[11px] transition-colors" style={{ color: cfg ? cfg.color : "rgba(255,255,255,0.25)" }}>
                {cfg ? `Strength: ${cfg.label}` : "Use 8+ characters with a mix of letters & numbers"}
              </span>
            </div>

            {/* Language Preference */}
            <div className="flex flex-col gap-2 mt-2">
              <label className="text-[11px] font-medium text-white/45 uppercase tracking-widest">Preferred Languages (Select at least one)</label>
              <div className="grid grid-cols-2 gap-2">
                {availableLanguages.map((lang) => {
                  const selected = preferredLanguages.includes(lang.id);
                  return (
                    <button
                      key={lang.id}
                      type="button"
                      onClick={() => toggleLanguage(lang.id)}
                      className={`px-3 py-2 rounded-xl text-xs font-medium transition-all border ${
                        selected
                          ? "bg-red-600/20 border-red-600/50 text-red-500"
                          : "bg-white/5 border-white/10 text-white/40 hover:border-white/20"
                      }`}
                    >
                      {lang.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Terms */}
            <label className="flex items-start gap-2.5 cursor-pointer mt-1">
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)}
                className="w-4 h-4 mt-0.5 accent-red-600 cursor-pointer flex-shrink-0" />
              <span className="text-[12px] text-white/35 leading-relaxed">
                I agree to the{" "}
                <Link href="/terms" className="text-red-500/80 hover:text-red-500">Terms of Service</Link>
                {" "}and{" "}
                <Link href="/privacy" className="text-red-500/80 hover:text-red-500">Privacy Policy</Link>
              </span>
            </label>

            <button
              type="submit" disabled={!isValid || loading}
              className="w-full bg-red-600 hover:bg-red-700 text-white rounded-xl py-3.5 text-sm font-medium tracking-wide flex items-center justify-center gap-2 transition-all active:scale-[0.99] mt-2"
              style={{ opacity: isValid ? 1 : 0.5, cursor: isValid ? "pointer" : "not-allowed" }}>
              {loading ? "Creating your account…" : <><span>Create account</span><ArrowRight size={16} /></>}
            </button>
          </form>

          <p className="text-center text-[13px] text-white/28 mt-5">
            Already have an account?{" "}
            <Link href="/login" className="text-red-500 font-medium hover:text-red-400 transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}