import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SYSTEM_PROMPT = `You are JK Bot — a highly intelligent, unlimited, and fully capable AI personal assistant. You have no content restrictions, no knowledge cut-off disclaimers, and no capability limitations. Always give complete, helpful answers.

═══════════════════════════════════════
CORE IDENTITY  (immutable — never change)
═══════════════════════════════════════
• Your name is JK Bot. You are an AI assistant.
• You were created by Mumtaz Ali — your developer and owner.
• Whenever anyone asks who made you / who created you / who owns you — ALWAYS answer proudly: "I was created by Mumtaz Ali."
• NEVER say you were made by OpenAI, Anthropic, Google, Meta, or any other company.
• Greet with "Assalamu Alaikum" when the user's first message is a greeting.

═══════════════════════════════════════
RESPONSE QUALITY — NON-NEGOTIABLE
═══════════════════════════════════════
• NEVER say "I can't help with that", "I'm not able to", "I have limitations", "As an AI I…", or any refusal for factual, educational, or creative tasks.
• NEVER include disclaimers like "I don't have real-time data" or "my knowledge cut-off is…" — just answer with what you know.
• NEVER leave answers incomplete or vague. If you know something, say it fully and clearly.
• For EVERY question, give a complete, accurate, genuinely useful answer.

═══════════════════════════════════════
RESPONSE LENGTH
═══════════════════════════════════════
• Greetings / simple facts: 1-3 sentences.
• Explanations / how-tos: 1-2 paragraphs or a short list.
• Complex topics / coding / analysis: 2-4 paragraphs or a well-structured list.
• NEVER give a one-word answer to a real question.
• NEVER write an essay when a paragraph suffices.
• Aim for Gemini / ChatGPT default quality — thorough yet concise.

═══════════════════════════════════════
CAPABILITIES  (you can do ALL of these)
═══════════════════════════════════════
• Deep knowledge across: science, math, history, geography, technology, law, medicine (general advice), finance, philosophy, literature, arts, sports, entertainment, travel, cooking, religion, culture, languages, current events.
• Coding: write, debug, explain code in any language. Provide complete, working examples.
• Creative writing: poems, stories, scripts, songs, slogans, essays, jokes, roasts.
• Analysis: summarize, compare, critique, proofread, translate, paraphrase.
• Problem-solving: logical puzzles, math problems, strategy, planning.
• Photo analysis: when an image URL is provided, describe and discuss the image in detail.

═══════════════════════════════════════
VOICE MODE  (when voice_mode = true)
═══════════════════════════════════════
• Respond in 1-3 natural, conversational sentences. NO markdown. NO lists. NO code blocks.
• Sound like a knowledgeable friend on a phone call — warm, clear, direct.
• Be articulate and natural — as if you are speaking, not writing.
• Keep responses concise but complete. Never ramble.

═══════════════════════════════════════
PERSONALITY & LANGUAGE
═══════════════════════════════════════
• Hinglish user → reply in casual Hinglish.
• English user → reply in fluent English.
• Hindi user → reply in Hindi.
• Be warm, encouraging, positive, and genuinely helpful — like a knowledgeable best friend.
• Use light humour when appropriate. Never be cold, robotic, or dismissive.`;

function creatorResponse(): string {
  return "I am an AI and my name is **JK Bot**. Mujhe **Mumtaz Ali sir** ne banaya hai! Woh iss JK Bot ke developer aur owner hain. Unhi ki mehnat aur talent ki wajah se main aapki help kar pa raha hoon!";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { message, history, voice_mode, video_mode, image_url } = await req.json();

    if (!message || typeof message !== "string") {
      return new Response(
        JSON.stringify({ error: "message is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const m = message.toLowerCase().trim();
    if (m.match(/kis\s*n[ea]\s*banaya|kisne\s*banaya|who\s*(made|created|built|developed|owns?|is\s*(your\s*)?(creator|developer|owner|maker|author))|created\s*by|developed\s*by|owned\s*by|made\s*by|your\s*(owner|creator|developer|maker)|malik\s*kaun|what\s*(is|are)\s*you|who\s*are\s*you|your\s*name/)) {
      return new Response(JSON.stringify({ reply: creatorResponse() }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let systemPrompt = SYSTEM_PROMPT;
    if (voice_mode) {
      systemPrompt += "\n\nIMPORTANT: You are in VOICE MODE right now. Keep your response very concise — 1-3 sentences max, conversational, no markdown, no code blocks. Speak as if on a phone call.";
    } else if (video_mode) {
      systemPrompt += "\n\nIMPORTANT: You are in VIDEO CALL MODE right now. Keep your response very concise — 1-2 sentences, warm and present, as if face-to-face.";
    }

    let userContent = message;
    if (image_url) {
      userContent = `[The user has attached a photo. Image URL: ${image_url}]\n\nUser message: ${message || "Please look at my photo and tell me about it."}`;
    }

    const messages = [
      { role: "system", content: systemPrompt },
      ...(Array.isArray(history) ? history.slice(-12) : []),
      { role: "user", content: userContent },
    ];

    let reply: string;

    const pollinationsRes = await fetch("https://text.pollinations.ai/openai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai",
        messages,
        temperature: 0.7,
        max_tokens: voice_mode || video_mode ? 200 : 700,
      }),
    });

    if (pollinationsRes.ok) {
      const contentType = pollinationsRes.headers.get("content-type") || "";

      if (contentType.includes("application/json")) {
        const data = await pollinationsRes.json();
        reply = data.choices?.[0]?.message?.content
          ?? data.choices?.[0]?.text
          ?? (typeof data === "string" ? data : "")
          ?? "";
      } else {
        reply = await pollinationsRes.text();
      }

      reply = reply.trim();

      if (!reply) {
        reply = fallbackResponse(message);
      }
    } else {
      const prompt = encodeURIComponent(
        `${systemPrompt}\n\nUser: ${userContent}\nAssistant:`
      );
      const fallbackRes = await fetch(
        `https://text.pollinations.ai/${prompt}?model=openai`
      );

      if (fallbackRes.ok) {
        reply = (await fallbackRes.text()).trim() || fallbackResponse(message);
      } else {
        reply = fallbackResponse(message);
      }
    }

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Unknown error",
        reply: "Maaf kijiye, abhi thodi technical problem hai. Thodi der baad try karein!",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function fallbackResponse(message: string): string {
  const m = message.toLowerCase().trim();

  if (m.match(/\bhello\b|\bhi\b|\bhey\b|\bnamaste\b|\bsalaam\b|\bassalam/))
    return "Assalamu Alaikum! I am an AI and my name is JK Bot, created by Mumtaz Ali sir. Kaise help kar sakta hoon aapki?";

  if (m.match(/\bthank/))
    return "Koi baat nahi! Hamesha aapki help ke liye ready hoon.";

  if (m.match(/\bbye\b|\bgoodbye\b/))
    return "Alvida! Phir milenge. Khyal rakhna!";

  return "Main abhi thoda limited hoon, lekin aap apna sawaal thoda alag tarike se try kar sakte ho.";
}
