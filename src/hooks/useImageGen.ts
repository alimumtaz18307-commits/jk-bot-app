import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

export interface GeneratedImage {
  url: string;
  prompt: string;
  timestamp: number;
}

export interface ImageGenState {
  isPremium: boolean;
  dailyLimit: number;
  usedToday: number;
  remaining: number;
  loading: boolean;
  generating: boolean;
  error: string | null;
  limitReached: boolean;
}

const IMAGE_GEN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/image-gen`;

export function useImageGen() {
  const [state, setState] = useState<ImageGenState>({
    isPremium: false,
    dailyLimit: 3,
    usedToday: 0,
    remaining: 3,
    loading: true,
    generating: false,
    error: null,
    limitReached: false,
  });

  const [images, setImages] = useState<GeneratedImage[]>([]);

  const getUsage = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setState((prev) => ({ ...prev, loading: false }));
        return;
      }

      const res = await fetch(IMAGE_GEN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ action: "get_usage" }),
      });

      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      const data = await res.json();

      setState({
        isPremium: data.is_premium || false,
        dailyLimit: data.daily_limit || 3,
        usedToday: data.used_today || 0,
        remaining: data.remaining || 0,
        loading: false,
        generating: false,
        error: null,
        limitReached: data.remaining === 0,
      });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : "Failed to check usage",
      }));
    }
  }, []);

  useEffect(() => {
    getUsage();
  }, [getUsage]);

  const generate = useCallback(async (prompt: string): Promise<GeneratedImage | null> => {
    if (!prompt.trim()) return null;

    setState((prev) => ({ ...prev, generating: true, error: null }));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not signed in");

      const res = await fetch(IMAGE_GEN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ action: "generate", prompt, width: 1024, height: 1024, nologo: true }),
      });

      const data = await res.json();

      if (res.status === 429 || data.error === "daily_limit_reached") {
        setState((prev) => ({
          ...prev,
          generating: false,
          limitReached: true,
          error: data.message || "Daily limit reached",
        }));
        return null;
      }

      if (!res.ok) throw new Error(data.error || `Failed: ${res.status}`);

      const img: GeneratedImage = {
        url: data.image_url,
        prompt: data.prompt,
        timestamp: Date.now(),
      };

      setImages((prev) => [img, ...prev]);

      setState((prev) => ({
        ...prev,
        generating: false,
        isPremium: data.is_premium ?? prev.isPremium,
        usedToday: data.used_today ?? prev.usedToday,
        remaining: data.remaining ?? prev.remaining,
        limitReached: (data.remaining ?? 0) === 0,
      }));

      return img;
    } catch (err) {
      setState((prev) => ({
        ...prev,
        generating: false,
        error: err instanceof Error ? err.message : "Failed to generate image",
      }));
      return null;
    }
  }, []);

  return { ...state, images, getUsage, generate };
}
