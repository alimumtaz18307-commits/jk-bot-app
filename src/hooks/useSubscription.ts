import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

export interface SubscriptionState {
  isPremium: boolean;
  plan: string | null;
  expiresAt: string | null;
  loading: boolean;
  error: string | null;
}

export function useSubscription() {
  const [state, setState] = useState<SubscriptionState>({
    isPremium: false,
    plan: null,
    expiresAt: null,
    loading: true,
    error: null,
  });

  const checkStatus = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setState({ isPremium: false, plan: null, expiresAt: null, loading: false, error: null });
        return;
      }

      const { data, error } = await supabase
        .from("subscriptions")
        .select("plan, status, expires_at")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data && new Date(data.expires_at) > new Date()) {
        setState({
          isPremium: true,
          plan: data.plan,
          expiresAt: data.expires_at,
          loading: false,
          error: null,
        });
      } else {
        setState({
          isPremium: false,
          plan: null,
          expiresAt: null,
          loading: false,
          error: null,
        });
      }
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : "Failed to check subscription",
      }));
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  return { ...state, checkStatus };
}
