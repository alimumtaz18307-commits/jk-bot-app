import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "./lib/supabase";
import { getGreeting, type ChatMessage } from "./lib/types";
import { useSubscription } from "./hooks/useSubscription";
import PricingModal from "./components/PricingModal";
import VoiceMode from "./components/VoiceMode";
import ImageGenPanel from "./components/ImageGenPanel";
import { Send, Mic, Image as ImageIcon, Crown, Sparkles, Loader as Loader2, LogOut, X, Menu, MessageSquare, Zap } from "lucide-react";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

type View = "chat" | "image";
type AuthView = "signin" | "signup";

interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [authView, setAuthView] = useState<AuthView>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [view, setView] = useState<View>("chat");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [showVoice, setShowVoice] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const subscription = useSubscription();

  // ── Auth state ──
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, sess) => {
      (async () => {
        setSession(sess);
        if (event === "SIGNED_OUT") {
          setMessages([]);
          setView("chat");
        }
      })();
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  // ── Load chat history ──
  useEffect(() => {
    if (!session?.user) return;
    (async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: true })
        .limit(50);
      if (data) setMessages(data);
    })();
  }, [session]);

  // ── Auto-scroll ──
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Auth handlers ──
  const handleAuth = async () => {
    setAuthError(null);
    if (!email.trim() || !password.trim()) {
      setAuthError("Please enter your email and password.");
      return;
    }
    setAuthLoading(true);
    try {
      const { error } = authView === "signup"
        ? await supabase.auth.signUp({ email: email.trim(), password })
        : await supabase.auth.signInWithPassword({ email: email.trim(), password });

      if (error) throw error;
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSidebarOpen(false);
  };

  // ── Send chat message ──
  const sendMessage = useCallback(async () => {
    if (!input.trim() || sending) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
      image_url: null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    const userText = input.trim();
    setInput("");
    setSending(true);

    try {
      const history: ChatTurn[] = [...messages, userMsg]
        .slice(-12)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ message: userText, history }),
      });

      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const data = await res.json();
      const reply = data.reply || data.error || "Sorry, I couldn't process that.";

      const aiMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: reply,
        image_url: null,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, aiMsg]);

      // Persist to DB
      await supabase.from("chat_messages").insert([
        { ...userMsg, user_id: session.user.id },
        { ...aiMsg, user_id: session.user.id },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Connection error. Please try again.",
          image_url: null,
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setSending(false);
    }
  }, [input, sending, messages, session]);

  // ── Clear chat ──
  const clearChat = async () => {
    if (!session?.user) return;
    await supabase.from("chat_messages").delete().eq("user_id", session.user.id);
    setMessages([]);
    setSidebarOpen(false);
  };

  // ── Loading screen ──
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center animate-pulse">
            <Sparkles size={24} className="text-white" />
          </div>
          <p className="text-sm text-gray-500">Loading JK Bot...</p>
        </div>
      </div>
    );
  }

  // ── Auth screen ──
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-blue-500/20">
              <Sparkles size={28} className="text-white" />
            </div>
            <h1 className="text-xl font-bold text-white">JK Bot</h1>
            <p className="text-sm text-gray-500 mt-1">Your AI Assistant</p>
          </div>

          <div className="bg-[#1a1a1f] border border-white/10 rounded-2xl p-5">
            <div className="flex gap-1 mb-4 bg-black/30 rounded-xl p-1">
              <button
                onClick={() => setAuthView("signin")}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  authView === "signin" ? "bg-white/10 text-white" : "text-gray-500"
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => setAuthView("signup")}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  authView === "signup" ? "bg-white/10 text-white" : "text-gray-500"
                }`}
              >
                Sign Up
              </button>
            </div>

            <div className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className="w-full text-sm bg-slate-800/60 text-white placeholder-slate-500 rounded-xl px-3 py-2.5 border border-white/8 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleAuth(); }}
                placeholder="Password"
                className="w-full text-sm bg-slate-800/60 text-white placeholder-slate-500 rounded-xl px-3 py-2.5 border border-white/8 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />

              {authError && (
                <p className="text-xs text-red-400 px-1">{authError}</p>
              )}

              <button
                onClick={handleAuth}
                disabled={authLoading}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:opacity-40 text-white text-sm font-semibold transition-all flex items-center justify-center gap-2"
              >
                {authLoading ? <Loader2 size={16} className="animate-spin" /> : null}
                {authView === "signup" ? "Create Account" : "Sign In"}
              </button>
            </div>
          </div>

          <p className="text-center text-[11px] text-gray-600 mt-4">
            Created by Mumtaz Ali
          </p>
        </div>
      </div>
    );
  }

  // ── Voice mode (full screen overlay) ──
  if (showVoice) {
    return <VoiceMode onClose={() => setShowVoice(false)} />;
  }

  // ── Main app ──
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/8 bg-[#0f0f14]">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <Menu size={16} className="text-gray-400" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <Sparkles size={14} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-white">JK Bot</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {subscription.isPremium ? (
            <span className="flex items-center gap-1 text-[10px] font-medium text-amber-400 bg-amber-500/10 rounded-full px-2 py-0.5">
              <Crown size={10} /> Premium
            </span>
          ) : (
            <button
              onClick={() => setShowPricing(true)}
              className="flex items-center gap-1 text-[10px] font-medium text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 rounded-full px-2.5 py-1 transition-colors"
            >
              <Crown size={10} /> Upgrade
            </button>
          )}
        </div>
      </header>

      {/* Sidebar */}
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 z-30 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="fixed left-0 top-0 bottom-0 w-64 bg-[#121218] border-r border-white/8 z-40 flex flex-col animate-slide-up">
            <div className="p-4 border-b border-white/8 flex items-center justify-between">
              <span className="text-sm font-semibold text-white">Menu</span>
              <button
                onClick={() => setSidebarOpen(false)}
                className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center"
              >
                <X size={14} className="text-gray-400" />
              </button>
            </div>

            <div className="flex-1 p-3 space-y-1">
              <button
                onClick={() => { setView("chat"); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                  view === "chat" ? "bg-white/10 text-white" : "text-gray-400 hover:bg-white/5"
                }`}
              >
                <MessageSquare size={16} /> Chat
              </button>
              <button
                onClick={() => { setView("image"); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                  view === "image" ? "bg-white/10 text-white" : "text-gray-400 hover:bg-white/5"
                }`}
              >
                <ImageIcon size={16} /> Image Generator
              </button>
              <button
                onClick={() => { setShowVoice(true); setSidebarOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:bg-white/5 transition-colors"
              >
                <Mic size={16} /> Voice Conversation
              </button>
              <button
                onClick={() => { setShowPricing(true); setSidebarOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:bg-white/5 transition-colors"
              >
                <Crown size={16} /> Premium
              </button>
            </div>

            <div className="p-3 border-t border-white/8 space-y-1">
              <button
                onClick={clearChat}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:bg-white/5 transition-colors"
              >
                <X size={16} /> Clear Chat
              </button>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <LogOut size={16} /> Sign Out
              </button>
            </div>
          </div>
        </>
      )}

      {/* Main content */}
      {view === "image" ? (
        <div className="flex-1 flex flex-col">
          <ImageGenPanel onUpgrade={() => setShowPricing(true)} />
          <div className="px-4 py-2 border-t border-white/8 flex justify-center">
            <button
              onClick={() => setView("chat")}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors"
            >
              <MessageSquare size={14} /> Back to Chat
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col max-w-2xl w-full mx-auto">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-4 shadow-lg shadow-blue-500/20">
                  <Sparkles size={28} className="text-white" />
                </div>
                <p className="text-base font-semibold text-white mb-1">{getGreeting()}!</p>
                <p className="text-sm text-gray-500 max-w-xs">
                  I'm JK Bot, your AI assistant. Ask me anything — I can help with coding, writing, analysis, and more.
                </p>
                <div className="flex gap-2 mt-6">
                  <button
                    onClick={() => setShowVoice(true)}
                    className="flex items-center gap-1.5 text-xs text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 rounded-full px-3 py-1.5 transition-colors"
                  >
                    <Mic size={13} /> Try Voice Mode
                  </button>
                  <button
                    onClick={() => setView("image")}
                    className="flex items-center gap-1.5 text-xs text-purple-400 bg-purple-500/10 hover:bg-purple-500/20 rounded-full px-3 py-1.5 transition-colors"
                  >
                    <ImageIcon size={13} /> Generate Images
                  </button>
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white rounded-br-sm"
                      : "bg-[#1a1a1f] border border-white/8 text-gray-200 rounded-bl-sm"
                  }`}
                >
                  {msg.content.split("\n").map((line, i) => (
                    <p key={i} className={i > 0 ? "mt-1" : ""}>{line}</p>
                  ))}
                </div>
              </div>
            ))}

            {sending && (
              <div className="flex justify-start">
                <div className="bg-[#1a1a1f] border border-white/8 rounded-2xl rounded-bl-sm px-4 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: "0s" }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: "0.15s" }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: "0.3s" }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input bar */}
          <div className="px-4 py-3 border-t border-white/8 bg-[#0f0f14]">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowVoice(true)}
                className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/25 hover:bg-blue-500/25 flex items-center justify-center transition-colors flex-shrink-0"
                title="Voice Conversation"
              >
                <Mic size={18} className="text-blue-400" />
              </button>

              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="Message JK Bot..."
                disabled={sending}
                className="flex-1 text-sm bg-slate-800/60 text-white placeholder-slate-500 rounded-xl px-3.5 py-2.5 border border-white/8 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-50"
              />

              <button
                onClick={sendMessage}
                disabled={!input.trim() || sending}
                className="w-10 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white flex items-center justify-center transition-colors flex-shrink-0"
              >
                {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pricing modal */}
      {showPricing && (
        <PricingModal
          onClose={() => setShowPricing(false)}
          isPremium={subscription.isPremium}
          expiresAt={subscription.expiresAt}
        />
      )}
    </div>
  );
}
