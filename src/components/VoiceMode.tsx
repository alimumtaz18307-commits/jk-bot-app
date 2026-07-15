import { useState, useEffect, useRef, useCallback } from "react";
import { Mic, MicOff, PhoneOff, Loader as Loader2, Radio, Volume2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import { stripMarkdown } from "../lib/types";

interface VoiceModeProps {
  onClose: () => void;
}

type VoiceState = "idle" | "listening" | "thinking" | "speaking";

interface TurnMessage {
  role: "user" | "assistant";
  text: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

export default function VoiceMode({ onClose }: VoiceModeProps) {
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TurnMessage[]>([]);
  const [interimText, setInterimText] = useState("");

  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const mutedRef = useRef(false);
  const speakingRef = useRef(false);
  const historyRef = useRef<TurnMessage[]>([]);
  const shouldListenRef = useRef(true);
  const manualStopRef = useRef(false);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  // ── Init speech synthesis ──
  useEffect(() => {
    synthRef.current = window.speechSynthesis;
    return () => {
      if (synthRef.current) synthRef.current.cancel();
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch { /* */ }
      }
    };
  }, []);

  // ── Auto-scroll transcript ──
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript, interimText]);

  // ── Pick a warm, natural voice ──
  const pickVoice = useCallback((): SpeechSynthesisVoice | null => {
    if (!synthRef.current) return null;
    const voices = synthRef.current.getVoices();
    if (!voices.length) return null;

    const preferred = [
      "Google UK English Female",
      "Google US English",
      "Microsoft Aria Online (Natural) - English (United States)",
      "Microsoft Jenny Online (Natural) - English (United States)",
      "Samantha",
      "Microsoft Zira",
      "Google Hindi",
    ];

    for (const name of preferred) {
      const v = voices.find((v) => v.name === name);
      if (v) return v;
    }

    const enFemale = voices.find((v) => v.lang.startsWith("en") && /female|aria|jenny|zira|samantha/i.test(v.name));
    if (enFemale) return enFemale;

    const enVoice = voices.find((v) => v.lang.startsWith("en"));
    return enVoice || voices[0];
  }, []);

  // ── Speak text via TTS ──
  const speak = useCallback((text: string): Promise<void> => {
    return new Promise((resolve) => {
      if (!synthRef.current || !text.trim()) {
        resolve();
        return;
      }

      synthRef.current.cancel();

      const cleanText = stripMarkdown(text);
      const utterance = new SpeechSynthesisUtterance(cleanText);
      const voice = pickVoice();
      if (voice) utterance.voice = voice;

      utterance.rate = 1.0;
      utterance.pitch = 1.05;
      utterance.volume = 1.0;

      utterance.onstart = () => {
        speakingRef.current = true;
        setVoiceState("speaking");
      };

      utterance.onend = () => {
        speakingRef.current = false;
        resolve();
        if (!manualStopRef.current && shouldListenRef.current) {
          setTimeout(() => startListening(), 300);
        } else {
          setVoiceState("idle");
        }
      };

      utterance.onerror = () => {
        speakingRef.current = false;
        resolve();
        if (!manualStopRef.current && shouldListenRef.current) {
          setTimeout(() => startListening(), 300);
        } else {
          setVoiceState("idle");
        }
      };

      synthRef.current.speak(utterance);
    });
  }, [pickVoice]);

  // ── Send to AI and speak response ──
  const sendToAI = useCallback(async (userText: string) => {
    setVoiceState("thinking");

    const userTurn: TurnMessage = { role: "user", text: userText };
    historyRef.current = [...historyRef.current, userTurn].slice(-12);
    setTranscript((prev) => [...prev, userTurn]);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not signed in");

      const historyPayload = historyRef.current.slice(-10).map((m) => ({
        role: m.role,
        content: m.text,
      }));

      const res = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          message: userText,
          history: historyPayload,
          voice_mode: true,
        }),
      });

      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const data = await res.json();
      const reply = data.reply || data.error || "Sorry, I didn't catch that.";

      const aiTurn: TurnMessage = { role: "assistant", text: reply };
      historyRef.current = [...historyRef.current, aiTurn].slice(-12);
      setTranscript((prev) => [...prev, aiTurn]);

      if (mutedRef.current) {
        setVoiceState("idle");
        if (shouldListenRef.current) setTimeout(() => startListening(), 500);
      } else {
        await speak(reply);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection error");
      setVoiceState("idle");
      if (shouldListenRef.current) setTimeout(() => startListening(), 1000);
    }
  }, [speak]);

  // ── Start speech recognition ──
  const startListening = useCallback(() => {
    if (manualStopRef.current || !shouldListenRef.current) return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError("Voice recognition is not supported in this browser. Please use Chrome or Edge.");
      setVoiceState("idle");
      return;
    }

    try {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch { /* */ }
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-US";
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setVoiceState("listening");
        setInterimText("");
      };

      recognition.onresult = (event: any) => {
        let interim = "";
        let final = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += transcript;
          } else {
            interim += transcript;
          }
        }

        if (interim) setInterimText(interim);

        if (final.trim()) {
          setInterimText("");
          recognition.stop();
          sendToAI(final.trim());
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error === "no-speech" || event.error === "aborted") {
          if (!manualStopRef.current && shouldListenRef.current && !speakingRef.current) {
            setTimeout(() => startListening(), 500);
          }
        } else if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          setError("Microphone access denied. Please allow microphone permissions.");
          setVoiceState("idle");
          shouldListenRef.current = false;
        } else {
          if (!manualStopRef.current && shouldListenRef.current && !speakingRef.current) {
            setTimeout(() => startListening(), 800);
          }
        }
      };

      recognition.onend = () => {
        if (!manualStopRef.current && shouldListenRef.current && !speakingRef.current && voiceState !== "thinking") {
          setTimeout(() => startListening(), 300);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      if (!manualStopRef.current && shouldListenRef.current) {
        setTimeout(() => startListening(), 1000);
      }
    }
  }, [sendToAI, voiceState]);

  // ── Start voice session on mount ──
  useEffect(() => {
    manualStopRef.current = false;
    shouldListenRef.current = true;
    const timer = setTimeout(() => startListening(), 500);
    return () => {
      clearTimeout(timer);
      manualStopRef.current = true;
      shouldListenRef.current = false;
      if (synthRef.current) synthRef.current.cancel();
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch { /* */ }
      }
    };
  }, []);

  // ── Mute toggle ──
  const toggleMute = () => {
    const newMuted = !muted;
    setMuted(newMuted);
    mutedRef.current = newMuted;

    if (newMuted) {
      if (synthRef.current) synthRef.current.cancel();
      speakingRef.current = false;
      if (voiceState === "speaking") {
        setVoiceState("idle");
        setTimeout(() => startListening(), 300);
      }
    }
  };

  // ── Disconnect ──
  const handleDisconnect = () => {
    manualStopRef.current = true;
    shouldListenRef.current = false;
    if (synthRef.current) synthRef.current.cancel();
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* */ }
    }
    setVoiceState("idle");
    onClose();
  };

  const stateConfig: Record<VoiceState, { label: string; color: string; icon: any }> = {
    idle: { label: "Tap to speak", color: "text-gray-500", icon: Mic },
    listening: { label: "Listening...", color: "text-emerald-400", icon: Radio },
    thinking: { label: "Thinking...", color: "text-amber-400", icon: Loader2 },
    speaking: { label: "Speaking...", color: "text-blue-400", icon: Volume2 },
  };

  const currentState = stateConfig[voiceState];
  const StateIcon = currentState.icon;

  return (
    <div className="fixed inset-0 z-50 bg-[#0a0a0f] flex flex-col animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
            <Mic size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Voice Conversation</p>
            <p className="text-[10px] text-gray-500">Talk naturally with JK Bot</p>
          </div>
        </div>
        <button
          onClick={handleDisconnect}
          className="w-9 h-9 rounded-full bg-red-500/15 border border-red-500/25 flex items-center justify-center hover:bg-red-500/25 transition-colors"
          title="Disconnect"
        >
          <PhoneOff size={16} className="text-red-400" />
        </button>
      </div>

      {/* Visual indicator + transcript */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 overflow-hidden">
        {/* Animated orb */}
        <div className="relative flex items-center justify-center mb-8">
          {voiceState === "listening" && (
            <>
              <div className="absolute w-32 h-32 rounded-full bg-emerald-500/20 animate-pulse-ring" />
              <div className="absolute w-40 h-40 rounded-full bg-emerald-500/10 animate-pulse-ring" style={{ animationDelay: "0.3s" }} />
            </>
          )}
          {voiceState === "speaking" && (
            <>
              <div className="absolute w-32 h-32 rounded-full bg-blue-500/20 animate-pulse-ring" />
              <div className="absolute w-40 h-40 rounded-full bg-blue-500/10 animate-pulse-ring" style={{ animationDelay: "0.3s" }} />
            </>
          )}
          {voiceState === "thinking" && (
            <div className="absolute w-32 h-32 rounded-full bg-amber-500/15 animate-pulse" />
          )}

          <div
            className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-500 ${
              voiceState === "listening"
                ? "bg-gradient-to-br from-emerald-500 to-teal-600 scale-110"
                : voiceState === "speaking"
                ? "bg-gradient-to-br from-blue-500 to-cyan-600 scale-110"
                : voiceState === "thinking"
                ? "bg-gradient-to-br from-amber-500 to-orange-600"
                : "bg-gradient-to-br from-gray-700 to-gray-800"
            } shadow-2xl`}
          >
            <StateIcon
              size={36}
              className={`text-white ${voiceState === "thinking" ? "animate-spin" : ""}`}
            />
          </div>
        </div>

        {/* State label */}
        <p className={`text-sm font-semibold mb-6 ${currentState.color}`}>
          {currentState.label}
        </p>

        {/* Voice wave bars (when listening or speaking) */}
        {(voiceState === "listening" || voiceState === "speaking") && (
          <div className="flex items-center gap-1 mb-6 h-8">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div
                key={i}
                className="voice-bar w-1 rounded-full"
                style={{
                  height: "100%",
                  background: voiceState === "listening" ? "#34d399" : "#3b82f6",
                  animationDelay: `${i * 0.1}s`,
                  animationDuration: `${0.6 + (i % 3) * 0.2}s`,
                }}
              />
            ))}
          </div>
        )}

        {/* Transcript */}
        <div className="w-full max-w-md flex-1 overflow-y-auto space-y-3 pb-4 min-h-0">
          {transcript.length === 0 && !interimText && (
            <p className="text-center text-xs text-gray-600 mt-4">
              Start speaking and JK Bot will respond naturally.
            </p>
          )}
          {transcript.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                  msg.role === "user"
                    ? "bg-blue-600/20 text-blue-200 rounded-br-sm"
                    : "bg-white/5 text-gray-300 rounded-bl-sm"
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
          {interimText && (
            <div className="flex justify-end">
              <div className="max-w-[80%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed bg-blue-600/10 text-blue-300/60 italic rounded-br-sm">
                {interimText}
              </div>
            </div>
          )}
          {error && (
            <div className="text-center text-xs text-red-400 px-4">{error}</div>
          )}
          <div ref={transcriptEndRef} />
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-6 px-6 py-6 border-t border-white/8">
        <button
          onClick={toggleMute}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
            muted
              ? "bg-gray-700 hover:bg-gray-600"
              : "bg-white/10 hover:bg-white/15"
          }`}
          title={muted ? "Unmute" : "Mute"}
        >
          {muted ? <MicOff size={22} className="text-gray-400" /> : <Mic size={22} className="text-white" />}
        </button>

        <button
          onClick={handleDisconnect}
          className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-all shadow-lg shadow-red-500/20"
          title="Disconnect"
        >
          <PhoneOff size={26} className="text-white" />
        </button>

        <div className="w-14 h-14 flex items-center justify-center">
          <div className={`w-3 h-3 rounded-full ${
            voiceState === "listening" ? "bg-emerald-400 animate-pulse" :
            voiceState === "speaking" ? "bg-blue-400 animate-pulse" :
            voiceState === "thinking" ? "bg-amber-400 animate-pulse" :
            "bg-gray-600"
          }`} />
        </div>
      </div>
    </div>
  );
}
