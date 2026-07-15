import { useState } from "react";
import { Sparkles, Mail, Lock, Eye, EyeOff, Phone, ArrowLeft } from "lucide-react";
import { supabase } from "../lib/supabase";

interface AuthScreenProps {
  onSignIn: (email: string, password: string) => Promise<{ error: any }>;
  onSignUp: (email: string, password: string) => Promise<{ error: any }>;
}

type Mode = "signin" | "signup" | "forgot";
type InputMode = "email" | "phone";

export default function AuthScreen({ onSignIn, onSignUp }: AuthScreenProps) {
  const [mode, setMode] = useState<Mode>("signin");
  const [inputMode, setInputMode] = useState<InputMode>("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function reset() {
    setError(null);
    setSuccess(null);
    setEmail("");
    setPhone("");
    setPassword("");
    setConfirmPassword("");
  }

  function switchMode(m: Mode) {
    reset();
    setMode(m);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const identifier = inputMode === "email" ? email.trim() : `${phone.trim()}@phone.jkbot.ai`;

    if (mode === "forgot") {
      if (!email.trim()) { setError("Please enter your email address"); return; }
      setLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin,
      });
      setLoading(false);
      if (error) {
        setError(error.message || "Failed to send reset email");
      } else {
        setSuccess("Password reset email sent! Check your inbox.");
      }
      return;
    }

    if (!identifier) { setError("Please fill in all fields"); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    if (mode === "signup" && password !== confirmPassword) { setError("Passwords do not match"); return; }

    setLoading(true);

    if (mode === "signup") {
      const { error } = await onSignUp(identifier, password);
      if (error) {
        setError(
          error.message?.includes("already registered")
            ? "This account already exists. Try signing in."
            : error.message || "Sign up failed"
        );
      } else {
        setSuccess("Account created! You are now signed in.");
      }
    } else {
      const { error } = await onSignIn(identifier, password);
      if (error) {
        setError(
          error.message?.includes("Invalid login")
            ? "Incorrect credentials. Please try again."
            : error.message || "Sign in failed"
        );
      }
    }

    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f0f11] px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-2xl shadow-blue-500/20 mb-4">
            <Sparkles className="text-white" size={30} />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">JK Bot AI</h1>
          <p className="text-sm text-gray-400 mt-1">Your intelligent AI assistant</p>
        </div>

        {/* Card */}
        <div className="bg-[#1a1a1f] border border-white/8 rounded-2xl p-6 shadow-2xl">
          {mode === "forgot" ? (
            <>
              <button
                onClick={() => switchMode("signin")}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white mb-5 transition-colors"
              >
                <ArrowLeft size={14} /> Back to sign in
              </button>
              <h2 className="text-lg font-semibold text-white mb-1">Reset password</h2>
              <p className="text-xs text-gray-500 mb-5">Enter your email and we'll send a reset link.</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block">Email address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={15} />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      className="w-full bg-white/5 text-white placeholder-gray-600 rounded-xl pl-9 pr-3 py-2.5 text-sm border border-white/8 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all"
                    />
                  </div>
                </div>
                {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
                {success && <p className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">{success}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold transition-all active:scale-[0.98]"
                >
                  {loading ? "Sending..." : "Send reset link"}
                </button>
              </form>
            </>
          ) : (
            <>
              {/* Tab switcher */}
              <div className="flex gap-1 bg-white/5 rounded-xl p-1 mb-5">
                <button
                  onClick={() => switchMode("signin")}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                    mode === "signin" ? "bg-blue-600 text-white shadow-sm" : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => switchMode("signup")}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                    mode === "signup" ? "bg-blue-600 text-white shadow-sm" : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  Sign Up
                </button>
              </div>

              {/* Input mode switcher */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => { setInputMode("email"); setError(null); }}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all ${
                    inputMode === "email"
                      ? "bg-blue-500/15 border-blue-500/30 text-blue-400"
                      : "border-white/8 text-gray-500 hover:text-gray-300"
                  }`}
                >
                  <Mail size={12} /> Email
                </button>
                <button
                  onClick={() => { setInputMode("phone"); setError(null); }}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all ${
                    inputMode === "phone"
                      ? "bg-blue-500/15 border-blue-500/30 text-blue-400"
                      : "border-white/8 text-gray-500 hover:text-gray-300"
                  }`}
                >
                  <Phone size={12} /> Phone
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3.5">
                {inputMode === "email" ? (
                  <div>
                    <label className="text-xs text-gray-400 mb-1.5 block">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={15} />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                        className="w-full bg-white/5 text-white placeholder-gray-600 rounded-xl pl-9 pr-3 py-2.5 text-sm border border-white/8 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="text-xs text-gray-400 mb-1.5 block">Phone number</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={15} />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                        placeholder="10-digit mobile number"
                        maxLength={10}
                        required
                        className="w-full bg-white/5 text-white placeholder-gray-600 rounded-xl pl-9 pr-3 py-2.5 text-sm border border-white/8 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all"
                      />
                    </div>
                    <p className="text-[10px] text-gray-600 mt-1">Used as your account identifier</p>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs text-gray-400">Password</label>
                    {mode === "signin" && (
                      <button
                        type="button"
                        onClick={() => switchMode("forgot")}
                        className="text-[11px] text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={15} />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      required
                      className="w-full bg-white/5 text-white placeholder-gray-600 rounded-xl pl-9 pr-10 py-2.5 text-sm border border-white/8 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {mode === "signup" && (
                  <div>
                    <label className="text-xs text-gray-400 mb-1.5 block">Confirm password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={15} />
                      <input
                        type={showConfirm ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
                        required
                        className="w-full bg-white/5 text-white placeholder-gray-600 rounded-xl pl-9 pr-10 py-2.5 text-sm border border-white/8 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                      >
                        {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                )}

                {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
                {success && <p className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">{success}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold transition-all active:scale-[0.98] mt-1"
                >
                  {loading ? "Please wait..." : mode === "signin" ? "Sign In" : "Create Account"}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-xs text-gray-600 mt-6">
          Made with <span className="text-rose-500">❤️</span> by <span className="text-gray-400 font-medium">Mumtaz Ali</span>
        </p>
      </div>
    </div>
  );
}
