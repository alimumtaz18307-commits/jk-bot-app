import { useState, useRef, useCallback, useEffect } from "react";

interface DictationOptions {
  onResult: (text: string) => void; // called with the full transcript as user speaks
  lang?: string;
}

export function useDictation({ onResult, lang = "en-US" }: DictationOptions) {
  const [listening,  setListening]  = useState(false);
  const [supported,  setSupported]  = useState(false);
  const [interimText, setInterimText] = useState("");

  const recRef      = useRef<any>(null);
  const accRef      = useRef(""); // accumulated final transcript this session
  const onResultRef = useRef(onResult);

  useEffect(() => { onResultRef.current = onResult; });

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setSupported(!!SR);
  }, []);

  const stop = useCallback(() => {
    if (recRef.current) {
      try { recRef.current.stop(); } catch { /* ignore */ }
    }
    setListening(false);
    setInterimText("");
  }, []);

  const start = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    /* Clean up any running session */
    if (recRef.current) { try { recRef.current.stop(); } catch { /* ignore */ } }

    const rec = new SR();
    rec.continuous     = true;
    rec.interimResults = true;
    rec.lang           = lang;
    rec.maxAlternatives = 1;

    accRef.current = "";

    rec.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          accRef.current += t + " ";
          onResultRef.current(accRef.current.trim());
        } else {
          interim += t;
        }
      }
      setInterimText(interim);
    };

    rec.onerror = (e: any) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        setListening(false);
        setInterimText("");
      }
    };

    rec.onend = () => {
      /* If still in listening state, restart (continuous mode) */
      if (recRef.current === rec && listening) {
        try { rec.start(); } catch { /* ignore */ }
      } else {
        setListening(false);
        setInterimText("");
      }
    };

    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch (e) {
      console.error("Dictation start failed:", e);
    }
  }, [lang, listening]);

  const toggle = useCallback(() => {
    if (listening) stop();
    else start();
  }, [listening, start, stop]);

  /* Cleanup */
  useEffect(() => () => {
    if (recRef.current) { try { recRef.current.stop(); } catch { /* ignore */ } }
  }, []);

  return { listening, supported, interimText, toggle, stop };
}
