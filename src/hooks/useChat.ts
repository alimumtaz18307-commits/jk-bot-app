import { useState, useEffect, useRef, useCallback } from "react";
import { supabase, EDGE_FUNCTION_URL } from "../lib/supabase";
import type { ChatMessage } from "../lib/types";

const WELCOME_MSG = `**Welcome to JK Bot AI!** 👋

I'm your intelligent personal assistant, created by **Mumtaz Ali**. I'm here to help you with anything — questions, ideas, creative work, coding, and more.

How can I help you today?`;

async function callEdgeFunction(
  message: string,
  history: { role: string; content: string }[],
  options: { voiceMode?: boolean; imageUrl?: string | null } = {}
): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token ?? "";

  const res = await fetch(EDGE_FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      message: message.trim() || (options.imageUrl ? "Please describe this image." : ""),
      history,
      voice_mode: options.voiceMode ?? false,
      image_url:  options.imageUrl ?? null,
    }),
  });

  if (!res.ok) throw new Error(`Server error: ${res.status}`);
  const data = await res.json();
  return data.reply || "Sorry, I didn't catch that. Could you rephrase?";
}

function makeWelcome(): ChatMessage {
  return {
    id: "welcome",
    role: "assistant",
    content: WELCOME_MSG,
    image_url: null,
    created_at: new Date().toISOString(),
  };
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([makeWelcome()]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const initialized = useRef(false);
  const messagesRef = useRef<ChatMessage[]>([makeWelcome()]);

  useEffect(() => { messagesRef.current = messages; }, [messages]);

  /* ── On mount: always start fresh (do NOT load previous messages into view).
        Old messages stay in DB and are accessible via Chat History in the profile. ── */
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    // Always show clean welcome — history lives in DB for the profile section
    setMessages([makeWelcome()]);
  }, []);

  /* ── Image upload ── */
  const uploadImage = useCallback(async (file: File): Promise<string | null> => {
    const ext = file.name.split(".").pop() || "jpg";
    const fileName = `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage
      .from("chat-photos")
      .upload(fileName, file, { cacheControl: "3600", upsert: false });
    if (error) { console.error("Upload error:", error.message); return null; }
    return supabase.storage.from("chat-photos").getPublicUrl(fileName).data?.publicUrl ?? null;
  }, []);

  /* ── Build history for AI context (last 12 non-welcome messages) ── */
  function buildHistory(n = 12) {
    return messagesRef.current
      .filter(m => m.id !== "welcome")
      .slice(-n)
      .map(m => ({ role: m.role, content: m.content }));
  }

  /* ── Persist to DB (fire-and-forget) ── */
  function persist(role: "user" | "assistant", content: string, imageUrl: string | null = null) {
    supabase.from("chat_messages")
      .insert({ role, content, image_url: imageUrl })
      .then(({ error }) => { if (error) console.error("DB persist:", error.message); });
  }

  /* ── Standard send (with loading state for UI spinner) ── */
  const sendMessage = useCallback(async (
    text: string,
    _voiceMode = false,
    imageUrl: string | null = null,
  ): Promise<string | null> => {
    if (!text.trim() && !imageUrl) return null;
    if (loading) return null;

    setError(null);
    setLoading(true);

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text.trim() || (imageUrl ? "[Photo shared]" : ""),
      image_url: imageUrl,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);
    persist("user", userMsg.content, imageUrl);

    try {
      const reply = await callEdgeFunction(text, buildHistory(), { imageUrl });
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: reply,
        image_url: null,
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, assistantMsg]);
      persist("assistant", reply);
      return reply;
    } catch (err) {
      const msg = "Connection issue — please try again in a moment.";
      setError(err instanceof Error ? err.message : "Unknown error");
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(), role: "assistant", content: msg,
        image_url: null, created_at: new Date().toISOString(),
      }]);
      return null;
    } finally {
      setLoading(false);
    }
  }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Voice send — bypasses loading guard ── */
  const sendVoiceMessage = useCallback(async (text: string): Promise<string | null> => {
    if (!text.trim()) return null;
    try {
      return await callEdgeFunction(text, buildHistory(), { voiceMode: true });
    } catch (err) {
      console.error("Voice AI error:", err);
      return "Sorry, I had a little trouble. Please try again.";
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Add a message to UI + DB (called by voice callbacks) ── */
  const addVoiceMessage = useCallback((role: "user" | "assistant", content: string) => {
    const msg: ChatMessage = {
      id: crypto.randomUUID(), role, content, image_url: null,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, msg]);
    persist(role, content);
  }, []);

  /* ── Clear — wipes DB and resets to welcome ── */
  const clearChat = useCallback(async () => {
    const { error } = await supabase
      .from("chat_messages")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) { setError(error.message); return; }
    setMessages([makeWelcome()]);
  }, []);

  return { messages, loading, error, sendMessage, sendVoiceMessage, addVoiceMessage, clearChat, uploadImage };
}
