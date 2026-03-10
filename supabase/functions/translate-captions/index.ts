import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { srtText } = await req.json();
    if (!srtText || typeof srtText !== "string") {
      return new Response(JSON.stringify({ error: "Missing srtText" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract only text lines from SRT (skip indices and timestamps)
    const blocks = srtText.trim().split(/\n\s*\n/);
    const textLines: { blockIdx: number; text: string }[] = [];

    for (let i = 0; i < blocks.length; i++) {
      const lines = blocks[i].split("\n");
      const textOnly = lines
        .filter((l) => !/^\d+$/.test(l.trim()) && !l.includes("-->"))
        .join(" ")
        .replace(/<[^>]*>/g, "")
        .trim();
      if (textOnly) {
        textLines.push({ blockIdx: i, text: textOnly });
      }
    }

    if (textLines.length === 0) {
      return new Response(JSON.stringify({ translatedSrt: srtText }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Batch translate - send all lines at once
    const numberedLines = textLines.map((t, i) => `${i + 1}. ${t.text}`).join("\n");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content:
              "You are a professional subtitle translator. Translate the following numbered Spanish subtitle lines to natural English. Keep the same numbering. Return ONLY the numbered translations, one per line. Do not add explanations.",
          },
          {
            role: "user",
            content: numberedLines,
          },
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, try again later" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      return new Response(JSON.stringify({ error: "Translation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await response.json();
    const translatedText = aiData.choices?.[0]?.message?.content || "";

    // Parse numbered translations back
    const translatedMap = new Map<number, string>();
    const lineRegex = /^(\d+)\.\s*(.+)$/gm;
    let match;
    while ((match = lineRegex.exec(translatedText)) !== null) {
      translatedMap.set(parseInt(match[1]) - 1, match[2].trim());
    }

    // Rebuild SRT with translated text
    const translatedBlocks = blocks.map((block, blockIdx) => {
      const lines = block.split("\n");
      const textLineEntry = textLines.find((t) => t.blockIdx === blockIdx);
      if (!textLineEntry) return block;

      const idx = textLines.indexOf(textLineEntry);
      const translated = translatedMap.get(idx);
      if (!translated) return block;

      // Replace text lines with translation
      const newLines = lines.map((l) => {
        if (/^\d+$/.test(l.trim()) || l.includes("-->")) return l;
        return null; // mark for replacement
      }).filter((l) => l !== null);

      // Find where text was and insert translation
      const timeLine = lines.findIndex((l) => l.includes("-->"));
      const result = lines.slice(0, timeLine + 1);
      result.push(translated);
      return result.join("\n");
    });

    return new Response(
      JSON.stringify({ translatedSrt: translatedBlocks.join("\n\n") }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("translate-captions error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
