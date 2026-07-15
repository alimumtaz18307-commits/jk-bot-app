import { useState, useRef, useCallback, useEffect } from "react";

type CallState = "idle" | "listening" | "processing" | "speaking";

interface VoiceCallOptions {
  onUserTranscript: (text: string) => void;
  onAIReply: (text: string) => void;
  callAI: (text: string) => Promise<string | null>;
  silenceMs?: number;
}

export function useVoiceCall({
  onUserTranscript,
  onAIReply,
  callAI,
  silenceMs = 1500,
}: VoiceCallOptions) {
  const [callState, setCallState] = useState<CallState>("idle");
  const [supported, setSupported] = useState(false);
  const [interimText, setInterimText] = useState("");

  /* Stable refs so callbacks never go stale */
  const recognitionRef      = useRef<any>(null);
  const silenceTimerRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finalTranscriptRef  = useRef("");
  const shouldListenRef     = useRef(false);
  const isSpeakingRef       = useRef(false);
  const isProcessingRef     = useRef(false);   // guard: only one AI call at a time

  const callAIRef            = useRef(callAI);
  const onUserTranscriptRef  = useRef(onUserTranscript);
  const onAIReplyRef         = useRef(onAIReply);

  /* Keep callback refs fresh every render */
  useEffect(() => {
    callAIRef.current           = callAI;
    onUserTranscriptRef.current = onUserTranscript;
    onAIReplyRef.current        = onAIReply;
  });

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setSupported(!!SR && "speechSynthesis" in window);
  }, []);

  /* ── TTS ── */
  const speakResponse = useCallback((text: string) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();

    setCallState("speaking");
    isSpeakingRef.current = true;

    const clean = text
      .replace(/[#*_`~]/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/\n+/g, ". ")
      .trim();

    const u = new SpeechSynthesisUtterance(clean);
    u.lang = "en-US"; u.rate = 1.05; u.pitch = 1.0;

    /* Pick the best available voice */
    const loadVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      return (
        voices.find(v => /Google.*US.*English|Google US English/i.test(v.name))  ||
        voices.find(v => v.name.includes("Google") && v.lang.startsWith("en"))   ||
        voices.find(v => v.lang === "en-US" && v.localService)                   ||
        voices.find(v => v.lang.startsWith("en"))
      );
    };

    const voice = loadVoice();
    if (voice) {
      u.voice = voice;
    } else {
      /* Voices may not have loaded yet — wait for them */
      window.speechSynthesis.onvoiceschanged = () => {
        const v = loadVoice();
        if (v) u.voice = v;
        window.speechSynthesis.onvoiceschanged = null;
      };
    }

    const onDone = () => {
      isSpeakingRef.current  = false;
      isProcessingRef.current = false;
      if (shouldListenRef.current) resumeListening();
      else setCallState("idle");
    };

    /* Chrome TTS watchdog — Chrome sometimes stalls on long text.
       Every 10 s, if synthesis is still speaking, pause/resume to unstick it. */
    const watchdog = setInterval(() => {
      if (!window.speechSynthesis.speaking) { clearInterval(watchdog); return; }
      window.speechSynthesis.pause();
      window.speechSynthesis.resume();
    }, 10_000);

    /* Wrap onDone to also clear the watchdog — must be set ONCE */
    const onDoneWithCleanup = () => { clearInterval(watchdog); onDone(); };
    u.onend   = onDoneWithCleanup;
    u.onerror = (e: SpeechSynthesisErrorEvent) => {
      clearInterval(watchdog);
      if (e.error !== "interrupted") console.warn("TTS error:", e.error);
      onDone();
    };

    window.speechSynthesis.speak(u);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Restart listening after AI speaks ── */
  const resumeListening = useCallback(() => {
    if (!recognitionRef.current) return;
    if (isSpeakingRef.current)   return;
    if (!shouldListenRef.current) return;
    try {
      recognitionRef.current.start();
      setCallState("listening");
    } catch {
      /* recognition already started — safe to ignore */
    }
  }, []);

  /* ── Process accumulated transcript ── */
  const processTranscript = useCallback(async () => {
    /* Prevent concurrent processing */
    if (isProcessingRef.current) return;

    const text = finalTranscriptRef.current.trim();
    if (!text) {
      if (shouldListenRef.current) resumeListening();
      return;
    }

    isProcessingRef.current  = true;
    finalTranscriptRef.current = "";
    setInterimText("");
    setCallState("processing");

    onUserTranscriptRef.current(text);

    let reply: string | null = null;
    try {
      reply = await callAIRef.current(text);
    } catch (err) {
      console.error("Voice AI call failed:", err);
    }

    if (reply) {
      onAIReplyRef.current(reply);
      speakResponse(reply);
    } else {
      isProcessingRef.current = false;
      if (shouldListenRef.current) resumeListening();
      else setCallState("idle");
    }
  }, [speakResponse, resumeListening]);

  /* ── Silence timer (reset on each new speech result) ── */
  const resetSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

    silenceTimerRef.current = setTimeout(() => {
      /* Only process if we have final text and are still in voice mode */
      if (finalTranscriptRef.current.trim() && shouldListenRef.current && !isProcessingRef.current) {
        try { recognitionRef.current?.stop(); } catch { /* ignore */ }
        processTranscript();
      }
    }, silenceMs);
  }, [processTranscript, silenceMs]);

  /* ── Start voice conversation ── */
  const startCall = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR || !("speechSynthesis" in window)) return;

    /* Clean up any previous session */
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* ignore */ }
    }

    const rec = new SR();
    rec.continuous      = true;
    rec.interimResults  = true;
    rec.lang            = "en-US";
    rec.maxAlternatives = 1;

    rec.onresult = (event: any) => {
      if (isSpeakingRef.current || isProcessingRef.current) return;

      let interim = "";
      let gotFinal = false;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscriptRef.current += " " + t;
          gotFinal = true;
        } else {
          interim += t;
        }
      }

      setInterimText(interim);
      if (gotFinal || interim.trim()) resetSilenceTimer();
    };

    rec.onerror = (event: any) => {
      const err = event.error as string;
      if (err === "not-allowed" || err === "service-not-allowed") {
        shouldListenRef.current = false;
        setCallState("idle");
        return;
      }
      /* network / no-speech / aborted — just try resuming */
      if (shouldListenRef.current && !isSpeakingRef.current && !isProcessingRef.current) {
        setTimeout(() => resumeListening(), 400);
      }
    };

    rec.onend = () => {
      /* Auto-restart unless we intentionally stopped */
      if (shouldListenRef.current && !isSpeakingRef.current && !isProcessingRef.current) {
        setTimeout(() => {
          try { rec.start(); } catch { /* ignore */ }
        }, 150);
      }
    };

    recognitionRef.current      = rec;
    shouldListenRef.current     = true;
    isProcessingRef.current     = false;
    finalTranscriptRef.current  = "";
    setInterimText("");

    try {
      rec.start();
      setCallState("listening");
    } catch (e) {
      console.error("Failed to start recognition:", e);
    }
  }, [resumeListening, resetSilenceTimer]);

  /* ── End voice conversation ── */
  const endCall = useCallback(() => {
    shouldListenRef.current    = false;
    isProcessingRef.current    = false;
    isSpeakingRef.current      = false;

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* ignore */ }
    }
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();

    finalTranscriptRef.current = "";
    setInterimText("");
    setCallState("idle");
  }, []);

  /* Cleanup on unmount */
  useEffect(() => {
    return () => {
      shouldListenRef.current = false;
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch { /* ignore */ } }
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  return { callState, supported, interimText, startCall, endCall };
}
