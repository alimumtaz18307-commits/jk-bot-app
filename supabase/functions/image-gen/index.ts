import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const FREE_DAILY_LIMIT = 3;
const PREMIUM_DAILY_LIMIT = 50;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action, prompt, width, height, model, seed, nologo } = body;

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: sub } = await serviceClient
      .from("subscriptions")
      .select("expires_at")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const isPremium = !!sub && new Date(sub.expires_at) > new Date();
    const dailyLimit = isPremium ? PREMIUM_DAILY_LIMIT : FREE_DAILY_LIMIT;

    const today = new Date().toISOString().split("T")[0];
    const { data: usage } = await serviceClient
      .from("image_generation_usage")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", today)
      .maybeSingle();

    const currentCount = usage?.count || 0;

    if (action === "get_usage") {
      return new Response(JSON.stringify({
        is_premium: isPremium,
        daily_limit: dailyLimit,
        used_today: currentCount,
        remaining: Math.max(0, dailyLimit - currentCount),
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "generate") {
      if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
        return new Response(JSON.stringify({ error: "Prompt is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (currentCount >= dailyLimit) {
        return new Response(JSON.stringify({
          error: "daily_limit_reached",
          message: isPremium
            ? "You've reached your daily image generation limit. Try again tomorrow!"
            : "You've reached your free daily limit of 3 images. Upgrade to Premium for 50 images per day!",
          is_premium: isPremium,
          daily_limit: dailyLimit,
          used_today: currentCount,
        }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const params = new URLSearchParams();
      params.set("width", String(width || 1024));
      params.set("height", String(height || 1024));
      params.set("model", model || "flux");
      if (seed) params.set("seed", String(seed));
      if (nologo) params.set("nologo", "true");

      const encodedPrompt = encodeURIComponent(prompt.trim());
      const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?${params.toString()}`;

      if (usage) {
        await serviceClient
          .from("image_generation_usage")
          .update({ count: currentCount + 1 })
          .eq("id", usage.id);
      } else {
        await serviceClient
          .from("image_generation_usage")
          .insert({ user_id: user.id, date: today, count: 1 });
      }

      return new Response(JSON.stringify({
        image_url: imageUrl,
        prompt: prompt.trim(),
        is_premium: isPremium,
        daily_limit: dailyLimit,
        used_today: currentCount + 1,
        remaining: Math.max(0, dailyLimit - currentCount - 1),
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Image gen function error:", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
