import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send, Camera, Mic, MicOff, X,
  ImagePlus, Radio, Volume2,
} from "lucide-react";
import { useChat } from "../hooks/useChat";
import { useVoiceCall } from "../hooks/useVoiceCall";
import { useDictation } from "../hooks/useDictation";
import { Markdown } from "./Markdown";
import { stripMarkdown } from "../lib/types";

const SUGGESTIONS = [
  "What can you help me with?",
  "Tell me something interesting",
  "Write a short poem",
  "Explain quantum computing simply",
];

export default function ChatPanel() {
  const {
    messages, loading,
    sendMessage, sendVoiceMessage, addVoiceMessage,
    uploadImage,
  } = useChat();

  const [input,         setInput]         = useState("");
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [uploading,     setUploading]     = useState(false);
  const [showCameraMenu,setShowCameraMenu]= useState(false);
  const [voiceMode,     setVoiceMode]     = useState(false);
  const [ttsEnabled,    setTtsEnabled]    = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);
  const fileRef   = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  /* ── Dictation: mic → text in input bar ── */
  const dictation = useDictation({
    onResult: (text) => {
      setInput(text);
      /* Keep textarea scrolled to bottom as text grows */
      setTimeout(() => {
        if (inputRef.current) inputRef.current.scrollTop = inputRef.current.scrollHeight;
      }, 0);
    },
  });

  /* ── Voice-to-voice conversation (1.5 s silence) ── */
  const voiceConv = useVoiceCall({
    onUserTranscript: (text) => addVoiceMessage("user", text),
    onAIReply:        (text) => addVoiceMessage("assistant", text),
    callAI:           (text) => sendVoiceMessage(text),
    silenceMs: 1500,
  });

  /* Auto-scroll */
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  /* Auto-resize textarea */
  useEffect(() => {
    if (!inputRef.current) return;
    inputRef.current.style.height = "auto";
    inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 160) + "px";
  }, [input]);

  /* TTS for text-mode AI replies */
  const lastMsg = messages[messages.length - 1];
  useEffect(() => {
    if (!ttsEnabled || loading || voiceMode) return;
    if (lastMsg?.role === "assistant" && lastMsg.id !== "welcome") speakText(lastMsg.content);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastMsg?.id, loading, ttsEnabled, voiceMode]);

  function speakText(text: string) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(stripMarkdown(text));
    u.lang = "en-US"; u.rate = 1.05;
    const voices = window.speechSynthesis.getVoices();
    const v = voices.find(v => v.name.includes("Google") && v.lang.startsWith("en"))
           || voices.find(v => v.lang.startsWith("en"));
    if (v) u.voice = v;
    window.speechSynthesis.speak(u);
  }

  const handleSend = useCallback(() => {
    if ((!input.trim() && !attachedImage) || loading) return;
    /* Stop dictation if active before sending */
    if (dictation.listening) dictation.stop();
    const text = input; const img = attachedImage;
    setInput(""); setAttachedImage(null);
    sendMessage(text, false, img);
  }, [input, loading, sendMessage, attachedImage, dictation]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setShowCameraMenu(false);
    const url = await uploadImage(file);
    if (url) setAttachedImage(url);
    setUploading(false);
    e.target.value = "";
  }

  function toggleVoiceMode() {
    if (voiceMode) { voiceConv.endCall(); setVoiceMode(false); }
    else {
      /* Stop dictation before entering voice-to-voice mode */
      if (dictation.listening) dictation.stop();
      setVoiceMode(true);
      voiceConv.startCall();
    }
  }

  /* Mic button handler:
     - In voice-to-voice mode: no-op (voice mode handles mic itself)
     - Otherwise: toggle dictation (speech → text in input bar)      */
  function handleMicClick() {
    if (voiceMode) return;
    dictation.toggle();
  }

  const voiceStateLabel =
    voiceConv.callState === "listening"  ? "Listening…"  :
    voiceConv.callState === "processing" ? "Thinking…"   :
    voiceConv.callState === "speaking"   ? "Speaking…"   : "";

  const inputDisabled = uploading || voiceMode;

  return (
    <div
      className="flex flex-col h-full relative"
      style={{ background: "#08080f" }}
      onClick={() => setShowCameraMenu(false)}
    >
      {/* Hidden file pickers */}
      <input ref={fileRef}   type="file" accept="image/*"                    onChange={handleFileSelect} className="hidden" />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={handleFileSelect} className="hidden" />

      {/* Camera picker menu */}
      {showCameraMenu && (
        <div
          className="absolute bottom-[5.5rem] left-3 z-30 rounded-2xl border border-white/10 shadow-2xl overflow-hidden animate-fade-in"
          style={{ background: "#13131a", minWidth: "11rem" }}
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={() => { fileRef.current?.click(); setShowCameraMenu(false); }}
            className="flex items-center gap-3 w-full px-4 py-3 text-sm text-gray-300 hover:bg-white/6 transition-colors"
          >
            <ImagePlus size={15} style={{ color: "#00d4ff" }} /> Gallery
          </button>
          <div className="border-t border-white/6 mx-3" />
          <button
            onClick={() => { cameraRef.current?.click(); setShowCameraMenu(false); }}
            className="flex items-center gap-3 w-full px-4 py-3 text-sm text-gray-300 hover:bg-white/6 transition-colors"
          >
            <Camera size={15} style={{ color: "#10b981" }} /> Live Camera
          </button>
        </div>
      )}

      {/* ── Voice mode active banner ── */}
      {voiceMode && (
        <div
          className="flex items-center justify-between px-4 py-2.5 border-b animate-fade-in flex-shrink-0"
          style={{ background: "rgba(0,212,255,0.04)", borderColor: "rgba(0,212,255,0.12)" }}
        >
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-8 h-8">
              {voiceConv.callState === "listening" && (
                <>
                  <span className="absolute inset-0 rounded-full border border-cyan-500/40 animate-ping" style={{ animationDuration: "1.2s" }} />
                  <span className="absolute inset-1 rounded-full border border-cyan-500/20 animate-ping" style={{ animationDuration: "1.8s" }} />
                </>
              )}
              <div className={`w-7 h-7 rounded-full flex items-center justify-center ${
                voiceConv.callState === "listening"  ? "bg-cyan-600"    :
                voiceConv.callState === "speaking"   ? "bg-emerald-600" :
                voiceConv.callState === "processing" ? "bg-amber-600"   : "bg-gray-700"
              }`}>
                <Mic size={13} className="text-white" />
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold" style={{ color: "#00d4ff" }}>
                Voice Conversation
                {voiceStateLabel && <span className="ml-2 font-normal text-gray-400">— {voiceStateLabel}</span>}
              </p>
              {voiceConv.interimText ? (
                <p className="text-[10px] text-gray-500 italic">"{voiceConv.interimText}"</p>
              ) : (
                <p className="text-[10px] text-gray-600">AI replies 1.5s after you stop speaking</p>
              )}
            </div>
          </div>
          <button
            onClick={toggleVoiceMode}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border transition-all"
            style={{ color: "#f87171", background: "rgba(239,68,68,0.08)", borderColor: "rgba(239,68,68,0.2)" }}
          >
            <MicOff size={12} /> End
          </button>
        </div>
      )}

      {/* ── Dictation indicator banner ── */}
      {dictation.listening && !voiceMode && (
        <div
          className="flex items-center gap-3 px-4 py-2 border-b animate-fade-in flex-shrink-0"
          style={{ background: "rgba(139,92,246,0.06)", borderColor: "rgba(139,92,246,0.15)" }}
        >
          <div className="relative w-5 h-5 flex-shrink-0">
            <span className="absolute inset-0 rounded-full border border-violet-500/50 animate-ping" />
            <Mic size={14} className="relative text-violet-400" />
          </div>
          <p className="text-xs text-violet-300 font-medium flex-1 min-w-0">
            Dictating…
            {dictation.interimText && (
              <span className="text-gray-500 font-normal ml-1 italic truncate"> "{dictation.interimText}"</span>
            )}
          </p>
          <button
            onClick={dictation.stop}
            className="text-[10px] text-violet-400 hover:text-violet-200 border border-violet-500/20 px-2 py-1 rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      )}

      {/* ── Suggestion chips (first load) ── */}
      {messages.length <= 1 && !voiceMode && (
        <div className="px-4 py-4 border-b flex-shrink-0" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
          <p className="text-[10px] uppercase tracking-widest text-gray-600 mb-2.5 font-bold">Try asking</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map(s => (
              <button
                key={s}
                onClick={() => sendMessage(s)}
                className="text-xs text-gray-400 hover:text-cyan-300 rounded-full px-3 py-1.5 border border-white/8 hover:border-cyan-500/25 hover:bg-cyan-500/6 transition-all"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Messages ── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex gap-3 animate-slide-up ${msg.role === "user" ? "flex-row-reverse" : ""}`}
          >
            {/* Avatar */}
            <div
              className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[11px] font-bold mt-0.5"
              style={msg.role === "assistant"
                ? { background: "linear-gradient(135deg,#06b6d4,#3b82f6)", boxShadow: "0 0 10px rgba(6,182,212,0.25)", color: "white" }
                : { background: "rgba(255,255,255,0.08)", color: "rgba(209,213,219,0.9)" }
              }
            >
              {msg.role === "assistant" ? "JK" : "U"}
            </div>

            {/* Bubble */}
            <div
              className={`group relative max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === "user" ? "rounded-tr-sm" : "rounded-tl-sm border border-white/6"
              }`}
              style={msg.role === "user"
                ? { background: "linear-gradient(135deg,#1d4ed8,#0891b2)", color: "white", boxShadow: "0 4px 20px rgba(29,78,216,0.22)" }
                : { background: "#14141e", color: "rgba(229,231,235,0.95)" }
              }
            >
              {msg.image_url && (
                <img src={msg.image_url} alt="Attached" className="rounded-xl mb-2.5 max-w-full max-h-52 object-cover border border-white/8" />
              )}
              {msg.content && (
                msg.role === "assistant"
                  ? <Markdown content={msg.content} />
                  : <p className="whitespace-pre-wrap">{msg.content}</p>
              )}
              {/* Speak button on AI bubbles */}
              {msg.role === "assistant" && msg.id !== "welcome" && "speechSynthesis" in window && (
                <button
                  onClick={() => speakText(msg.content)}
                  title="Read aloud"
                  className="absolute -bottom-2.5 -right-2 w-6 h-6 rounded-full border border-white/8 hover:border-cyan-500/40 text-gray-600 hover:text-cyan-400 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                  style={{ background: "#1e1e2e" }}
                >
                  <Volume2 size={11} />
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="flex gap-3 animate-fade-in">
            <div
              className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[11px] font-bold text-white mt-0.5"
              style={{ background: "linear-gradient(135deg,#06b6d4,#3b82f6)", boxShadow: "0 0 10px rgba(6,182,212,0.25)" }}
            >JK</div>
            <div className="rounded-2xl rounded-tl-sm border border-white/6 px-4 py-3.5 flex gap-1.5 items-center" style={{ background: "#14141e" }}>
              {[0, 0.18, 0.36].map((d, i) => (
                <span
                  key={i}
                  className="w-1.5 h-1.5 rounded-full animate-bounce-dot"
                  style={{ background: "#00d4ff", animationDelay: `${d}s` }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Attached image preview ── */}
      {attachedImage && (
        <div
          className="flex-shrink-0 px-4 py-2.5 border-t animate-slide-up"
          style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.05)" }}
        >
          <div className="relative inline-block">
            <img src={attachedImage} alt="To send" className="h-16 w-16 object-cover rounded-xl border border-white/10" />
            <button
              onClick={() => setAttachedImage(null)}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg"
            >
              <X size={10} />
            </button>
          </div>
        </div>
      )}

      {/* ── Input area ── */}
      <div
        className="flex-shrink-0 border-t px-3 pt-3 pb-3"
        style={{ background: "#0e0e16", borderColor: "rgba(255,255,255,0.06)" }}
      >
        {/*
          Left → Right:
          [Camera] ─── [Textarea] ─── [Mic/Dictation] [Send] [Voice-to-voice]
        */}
        <div
          className="flex items-end gap-1.5 rounded-2xl border px-2 py-2 transition-all"
          style={{
            background: "#14141e",
            borderColor: dictation.listening
              ? "rgba(139,92,246,0.4)"
              : voiceMode
              ? "rgba(0,212,255,0.3)"
              : "rgba(255,255,255,0.08)",
            boxShadow: dictation.listening
              ? "0 0 0 2px rgba(139,92,246,0.1)"
              : voiceMode
              ? "0 0 0 2px rgba(0,212,255,0.08)"
              : "none",
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Camera — far left */}
          <button
            onClick={e => { e.stopPropagation(); setShowCameraMenu(v => !v); }}
            disabled={uploading}
            title="Attach photo"
            className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all"
            style={
              uploading        ? { color: "#f59e0b", opacity: 0.7 } :
              showCameraMenu   ? { background: "rgba(0,212,255,0.12)", color: "#00d4ff" } :
                                 { color: "rgba(156,163,175,0.6)" }
            }
          >
            <Camera size={19} />
          </button>

          {/* Textarea */}
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              voiceMode          ? "Voice mode — speak naturally…" :
              dictation.listening? "Listening — speak now…"        :
              uploading          ? "Uploading image…"              :
                                   "Message JK Bot AI…"
            }
            rows={1}
            disabled={inputDisabled}
            className="flex-1 resize-none bg-transparent text-gray-100 placeholder-gray-700 text-sm focus:outline-none min-h-[36px] max-h-[160px] py-1.5 leading-relaxed disabled:opacity-40"
          />

          {/* Mic — dictation (speech → text in input) */}
          <button
            onClick={handleMicClick}
            disabled={voiceMode || !dictation.supported}
            title={
              voiceMode           ? "Mic used by voice conversation" :
              dictation.listening ? "Stop dictation" :
                                    "Dictate message (speech-to-text)"
            }
            className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all"
            style={
              dictation.listening
                ? { background: "rgba(139,92,246,0.18)", color: "#a78bfa", boxShadow: "0 0 10px rgba(139,92,246,0.2)" }
                : voiceMode || !dictation.supported
                ? { color: "rgba(107,114,128,0.35)", cursor: "not-allowed" }
                : ttsEnabled
                ? { background: "rgba(0,212,255,0.1)", color: "#00d4ff" }
                : { color: "rgba(156,163,175,0.55)" }
            }
          >
            {dictation.listening ? <MicOff size={17} /> : <Mic size={17} />}
          </button>

          {/* Send */}
          <button
            onClick={handleSend}
            disabled={(!input.trim() && !attachedImage) || loading || voiceMode}
            title="Send message"
            className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95"
            style={
              (input.trim() || attachedImage) && !loading && !voiceMode
                ? { background: "linear-gradient(135deg,#06b6d4,#3b82f6)", color: "white", boxShadow: "0 2px 14px rgba(6,182,212,0.3)" }
                : { color: "rgba(107,114,128,0.4)", cursor: "not-allowed" }
            }
          >
            <Send size={16} />
          </button>

          {/* Voice-to-voice — far right */}
          <button
            onClick={toggleVoiceMode}
            disabled={!voiceConv.supported}
            title={voiceMode ? "End voice conversation" : "Start voice-to-voice conversation"}
            className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all border"
            style={
              voiceMode
                ? { background: "rgba(239,68,68,0.12)", color: "#f87171", borderColor: "rgba(239,68,68,0.25)" }
                : voiceConv.supported
                ? { background: "rgba(255,255,255,0.03)", color: "rgba(156,163,175,0.55)", borderColor: "rgba(255,255,255,0.07)" }
                : { color: "rgba(107,114,128,0.3)", borderColor: "rgba(255,255,255,0.05)", cursor: "not-allowed" }
            }
          >
            {voiceMode ? <MicOff size={16} /> : <Radio size={16} />}
          </button>
        </div>

        {/* TTS toggle — subtle, below the bar */}
        <div className="flex items-center justify-between mt-2 px-1">
          <button
            onClick={() => {
              if (voiceMode) return;
              setTtsEnabled(p => { if (p) window.speechSynthesis?.cancel(); return !p; });
            }}
            disabled={voiceMode}
            title={ttsEnabled ? "AI voice replies: ON" : "AI voice replies: OFF"}
            className="flex items-center gap-1.5 text-[11px] transition-all"
            style={{ color: ttsEnabled ? "#00d4ff" : "rgba(107,114,128,0.5)" }}
          >
            <Volume2 size={12} />
            {ttsEnabled ? "Voice on" : "Voice off"}
          </button>

          {/* Made with love — centered */}
          <p className="text-[11px] select-none" style={{ color: "rgba(107,114,128,0.6)" }}>
            Made with <span style={{ color: "#f43f5e" }}>❤️</span> by{" "}
            <span style={{ color: "rgba(156,163,175,0.8)", fontWeight: 500 }}>Mumtaz Ali</span>
          </p>
        </div>
      </div>
    </div>
  );
}
