// "use client";

// import { useState } from "react";
// import { useRouter } from "next/navigation";
// import Link from "next/link";
// import { toast } from "react-hot-toast";
// import { Eye, EyeOff } from "lucide-react";

// export default function LoginPage() {
//   const router = useRouter();
//   const [showPassword, setShowPassword] = useState(false);
//   const [formData, setFormData] = useState({
//     email: "",
//     password: "",
//   });

//   async function handleSubmit(e) {
//     e.preventDefault();

//     const res = await fetch("/api/auth/login", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify(formData),
//     });

//     const data = await res.json();

//    if (data.success) {
//   localStorage.setItem("token", data.token);

//   console.log("TOKEN:", data.token);

//   toast.success("Login Successful");

//   window.location.href = "/";
// } else {
//       toast.error(data.message);
//     }
//   }

//   return (
//     <main className="min-h-screen flex items-center justify-center bg-black text-white">
//       <form
//         onSubmit={handleSubmit}
//         className="bg-zinc-900 p-8 rounded-xl w-[400px] space-y-4"
//       >
//         <h1 className="text-3xl font-bold text-center">
//           Login
//         </h1>

//         <input
//           type="email"
//           placeholder="Email"
//           className="w-full p-3 rounded bg-zinc-800"
//           onChange={(e) =>
//             setFormData({
//               ...formData,
//               email: e.target.value,
//             })
//           }
//         />

//         <div className="relative">
//           <input
//             type={showPassword ? "text" : "password"}
//             placeholder="Password"
//             className="w-full p-3 pr-12 rounded bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-red-500"
//             onChange={(e) =>
//               setFormData({
//                 ...formData,
//                 password: e.target.value,
//               })
//             }
//           />
//           <button
//             type="button"
//             onClick={() => setShowPassword(!showPassword)}
//             className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
//           >
//             {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
//           </button>
//         </div>

//         <button className="w-full bg-red-500 hover:bg-red-600 p-3 rounded font-medium">
//           Login
//         </button>

//         <p className="text-center text-sm text-zinc-400">
//           Don&apos;t have an account?{" "}
//           <Link href="/register" className="text-red-400 hover:text-red-300 transition-colors">
//             Register
//           </Link>
//         </p>
//       </form>
//     </main>
//   );
// }
"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { Eye, EyeOff, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "" });

  const handleChange = (e) =>
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem("token", data.token);
        toast.success("Welcome back!");
        window.location.href = "/";
      } else {
        toast.error(data.message ?? "Login failed");
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex bg-[#0a0a0a] text-white font-sans overflow-hidden relative">

      {/* Background art */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0"
          style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px)", backgroundSize: "40px 40px" }} />
        <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(220,38,38,0.15) 0%, transparent 70%)" }} />
        <div className="absolute -bottom-10 -left-20 w-[300px] h-[300px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(220,38,38,0.08) 0%, transparent 70%)" }} />
        <div className="absolute left-1/2 top-0 bottom-0 w-px opacity-30"
          style={{ background: "linear-gradient(to bottom, transparent, rgba(220,38,38,0.4) 40%, rgba(220,38,38,0.4) 60%, transparent)" }} />
      </div>

      {/* Left panel */}
      <div className="hidden lg:flex w-[45%] flex-col justify-between px-14 py-16 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2" fill="none" />
            </svg>
          </div>
          <span className="text-sm font-medium tracking-wide">MOVIEKART</span>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-5">
            <div className="w-1.5 h-1.5 rounded-full bg-red-600" />
            <span className="text-xs font-medium text-red-500 tracking-widest uppercase">Welcome back</span>
          </div>
          <h1 className="font-serif text-5xl font-bold leading-tight mb-5">
            Discover your next<br />
            <em className="text-red-500">favorite film.</em>
          </h1>
          <p className="text-sm text-white/40 leading-relaxed max-w-xs">
            Sign in to access your curated movie collections and personalized recommendations.
          </p>
          <div className="flex gap-8 mt-12">
            {[["100k+", "Movies Tracked"], ["50k+", "Reviews Written"], ["10k+", "Daily Users"]].map(([n, l]) => (
              <div key={l} className="flex flex-col gap-0.5">
                <span className="text-xl font-medium">{n}</span>
                <span className="text-xs text-white/30 tracking-wide">{l}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-white/20">© 2026 MovieKart Inc. All rights reserved.</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 relative z-10">
        <div className="w-full max-w-sm bg-white/[0.04] border border-white/[0.08] rounded-2xl p-10">
          <h2 className="font-serif text-2xl font-bold mb-1">Sign in</h2>
          <p className="text-sm text-white/35 mb-8">Enter your credentials to continue</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-medium text-white/50 uppercase tracking-widest">Email address</label>
              <input
                type="email" name="email" placeholder="you@example.com" required
                onChange={handleChange}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-red-600/60 focus:bg-red-600/[0.04] transition-all"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-medium text-white/50 uppercase tracking-widest">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"} name="password" placeholder="••••••••" required
                  onChange={handleChange}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-12 text-sm text-white placeholder-white/20 outline-none focus:border-red-600/60 focus:bg-red-600/[0.04] transition-all"
                />
                <button type="button" onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 pb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 accent-red-600 cursor-pointer" />
                <span className="text-[13px] text-white/40">Remember me</span>
              </label>
              <Link href="/forgot-password" className="text-[13px] text-red-500/80 hover:text-red-500 transition-colors">
                Forgot password?
              </Link>
            </div>

            <button type="submit" disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl py-3.5 text-sm font-medium tracking-wide flex items-center justify-center gap-2 transition-all active:scale-[0.99]">
              {loading ? "Signing in…" : <><span>Sign in</span><ArrowRight size={16} /></>}
            </button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-white/[0.08]" />
            <span className="text-xs text-white/20">or continue with</span>
            <div className="flex-1 h-px bg-white/[0.08]" />
          </div>

          <div className="grid grid-cols-2 gap-2.5 mb-7">
            {/* Google & GitHub buttons here */}
          </div>

          <p className="text-center text-[13px] text-white/30">
            No account yet?{" "}
            <Link href="/register" className="text-red-500 font-medium hover:text-red-400 transition-colors">
              Create one free
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}