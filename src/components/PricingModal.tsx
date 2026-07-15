import { useState } from "react";
import { X, Crown, Check, Copy, Loader as Loader2, QrCode, ArrowLeft, ShieldCheck } from "lucide-react";
import { supabase } from "../lib/supabase";

interface PricingModalProps {
  onClose: () => void;
  isPremium: boolean;
  expiresAt: string | null;
}

const UPI_ID = "Alimumtaz18307-1@okaxis";
const PAYEE_NAME = "Mumtaz Ali";

const PLANS = [
  {
    id: "semi_annual",
    name: "6 Months",
    price: "₹415",
    period: "per 6 months",
    features: ["50 image generations/day", "Priority AI responses", "No ads", "Unlimited chat"],
    best: false,
  },
  {
    id: "annual",
    name: "1 Year",
    price: "₹830",
    period: "per year • save 33%",
    features: ["50 image generations/day", "Priority AI responses", "No ads", "Unlimited chat", "Save ₹165"],
    best: true,
  },
] as const;

export default function PricingModal({ onClose, isPremium, expiresAt }: PricingModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<(typeof PLANS)[number] | null>(null);
  const [txnId, setTxnId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

  function buildUpiLink(plan: (typeof PLANS)[number]): string {
    const amount = plan.id === "annual" ? "830" : "415";
    const params = new URLSearchParams({
      pa: UPI_ID,
      pn: PAYEE_NAME,
      am: amount,
      cu: "INR",
      tn: `JK Bot Premium — ${plan.name}`,
    });
    return `upi://pay?${params.toString()}`;
  }

  function getQrUrl(plan: (typeof PLANS)[number]): string {
    const upiLink = buildUpiLink(plan);
    return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(upiLink)}`;
  }

  async function copyUpiId() {
    try {
      await navigator.clipboard.writeText(UPI_ID);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  async function handleActivate() {
    setSubmitMsg(null);
    if (!txnId.trim()) {
      setSubmitMsg({ type: "error", text: "Please enter your UPI transaction reference number." });
      return;
    }
    if (!selectedPlan) return;

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not signed in");

      const months = selectedPlan.id === "annual" ? 12 : 6;
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + months);

      const { error } = await supabase.from("subscriptions").insert({
        plan: selectedPlan.id,
        status: "active",
        started_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        upi_transaction_id: txnId.trim(),
      });

      if (error) throw error;

      setSubmitMsg({
        type: "success",
        text: "Your payment has been submitted! Your premium will be activated once your transaction is verified. This usually takes a few minutes.",
      });
      setTxnId("");
    } catch (err) {
      setSubmitMsg({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to submit. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#1a1a1f] border border-white/10 rounded-2xl max-w-sm w-full overflow-hidden shadow-2xl animate-fade-in max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative p-6 text-center border-b border-white/8 flex-shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <X size={14} className="text-gray-400" />
          </button>
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-amber-500/20">
            <Crown size={24} className="text-white" />
          </div>
          <h2 className="text-lg font-bold text-white">JK Bot Premium</h2>
          <p className="text-xs text-gray-400 mt-1">Unlock the full power of AI</p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isPremium ? (
            <div className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-3">
                <Crown size={22} className="text-amber-400" />
              </div>
              <p className="text-sm font-semibold text-white mb-1">You're already Premium!</p>
              <p className="text-xs text-gray-500">
                Active{expiresAt ? ` until ${fmtDate(expiresAt)}` : ""}.
              </p>
              <button
                onClick={onClose}
                className="mt-5 w-full py-2.5 rounded-xl bg-white/8 hover:bg-white/12 text-gray-300 text-sm font-medium transition-colors"
              >
                Close
              </button>
            </div>
          ) : !selectedPlan ? (
            <div className="p-5 space-y-3">
              {PLANS.map((plan) => (
                <div
                  key={plan.id}
                  className={`rounded-xl p-4 border relative ${
                    plan.best
                      ? "border-blue-500/40 bg-blue-500/5"
                      : "border-white/8 bg-white/3"
                  }`}
                >
                  {plan.best && (
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                      BEST VALUE
                    </span>
                  )}
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-white">{plan.name}</p>
                    <div className="text-right">
                      <span className="text-xl font-bold text-white">{plan.price}</span>
                      <span className="text-[10px] text-gray-500 block">{plan.period}</span>
                    </div>
                  </div>
                  <ul className="space-y-1 mb-3">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-1.5 text-xs text-gray-400">
                        <Check size={11} className="text-emerald-400 flex-shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => {
                      setSelectedPlan(plan);
                      setSubmitMsg(null);
                    }}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-sm font-semibold transition-all shadow-lg shadow-amber-500/10"
                  >
                    Pay via UPI
                  </button>
                </div>
              ))}
              <p className="text-center text-[11px] text-gray-600 pt-1">
                Secure UPI payment directly to the developer's bank account.
              </p>
            </div>
          ) : (
            <div className="p-5 space-y-4">
              <button
                onClick={() => {
                  setSelectedPlan(null);
                  setSubmitMsg(null);
                }}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft size={13} /> Back to plans
              </button>

              <div className="flex items-center justify-between rounded-xl border border-white/8 bg-white/3 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-white">{selectedPlan.name} Plan</p>
                  <p className="text-[11px] text-gray-500">{selectedPlan.period}</p>
                </div>
                <span className="text-xl font-bold text-white">{selectedPlan.price}</span>
              </div>

              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <img
                    src={getQrUrl(selectedPlan)}
                    alt="UPI Payment QR Code"
                    className="w-48 h-48 rounded-xl bg-white p-2"
                  />
                  <div className="absolute -top-1.5 -right-1.5 w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center shadow-lg">
                    <QrCode size={14} className="text-white" />
                  </div>
                </div>
                <p className="text-[11px] text-gray-500 text-center max-w-[220px] leading-relaxed">
                  Scan this QR code with any UPI app (GPay, PhonePe, Paytm, etc.) to pay
                </p>
              </div>

              <div className="rounded-xl border border-white/8 bg-white/3 px-4 py-3">
                <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">UPI ID</p>
                <div className="flex items-center justify-between gap-2">
                  <code className="text-sm text-cyan-400 font-medium truncate">{UPI_ID}</code>
                  <button
                    onClick={copyUpiId}
                    className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-white transition-colors flex-shrink-0"
                  >
                    {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
                <p className="text-[10px] text-gray-600 mt-1">Payee: {PAYEE_NAME}</p>
              </div>

              <a
                href={buildUpiLink(selectedPlan)}
                className="block text-center w-full py-2.5 rounded-xl bg-blue-600/15 border border-blue-500/25 text-blue-400 text-sm font-medium hover:bg-blue-600/25 transition-colors"
              >
                Open in UPI App
              </a>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-white/8" />
                <span className="text-[10px] text-gray-600 uppercase tracking-wider">After Payment</span>
                <div className="flex-1 h-px bg-white/8" />
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">
                  Enter UPI Transaction Reference Number
                </label>
                <input
                  type="text"
                  value={txnId}
                  onChange={(e) => setTxnId(e.target.value)}
                  placeholder="e.g. 452188123456789"
                  className="w-full text-sm bg-slate-800/60 text-white placeholder-slate-500 rounded-xl px-3 py-2.5 border border-white/8 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                />
                <p className="text-[10px] text-gray-600 mt-1.5">
                  Find this in your UPI app's payment receipt or transaction history.
                </p>
              </div>

              <button
                onClick={handleActivate}
                disabled={submitting || !txnId.trim()}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 disabled:opacity-40 text-white text-sm font-semibold transition-all flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 size={15} className="animate-spin" /> Submitting...
                  </>
                ) : (
                  <>
                    <ShieldCheck size={15} /> I've Paid — Activate Premium
                  </>
                )}
              </button>

              {submitMsg && (
                <div
                  className={`rounded-xl px-4 py-3 text-xs leading-relaxed ${
                    submitMsg.type === "success"
                      ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                      : "bg-red-500/10 border border-red-500/20 text-red-400"
                  }`}
                >
                  {submitMsg.text}
                </div>
              )}

              <p className="text-center text-[10px] text-gray-600 leading-relaxed">
                Your premium will be activated once your payment is verified by the developer.
                For help, contact Mumtaz Ali.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
