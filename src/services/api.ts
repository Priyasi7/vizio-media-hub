import { supabase } from "@/integrations/supabase/client";
import type { ApiResponse, Category } from "@/types/content";

export async function fetchCategory(category: Category): Promise<ApiResponse> {
  const { data, error } = await supabase.functions.invoke("api-proxy", {
    body: { category },
  });

  if (error) throw new Error("Failed to fetch content");
  return data as ApiResponse;
}

export async function fetchSubtitles(srtUrl: string, translate = false): Promise<string> {
  if (!srtUrl) return "";
  try {
    // Try original URL first
    const { data, error } = await supabase.functions.invoke("api-proxy", {
      body: { subtitleUrl: srtUrl, translate: false },
    });
    
    let srtText = data?.text || "";
    
    // Check if response is an error (XML error from CDN)
    if (error || srtText.includes("<Error>") || srtText.includes("AccessDenied") || !srtText.trim()) {
      // Try alternate CDN URL pattern
      const altUrl = srtUrl
        .replace("adcdn.nyc3.cdn.digitaloceanspaces.com", "nyc3.digitaloceanspaces.com/adcdn")
        .replace("nyc3.digitaloceanspaces.com/adcdn", "adcdn.nyc3.cdn.digitaloceanspaces.com");
      
      if (altUrl !== srtUrl) {
        const { data: altData } = await supabase.functions.invoke("api-proxy", {
          body: { subtitleUrl: altUrl, translate: false },
        });
        if (altData?.text && !altData.text.includes("<Error>")) {
          srtText = altData.text;
        } else {
          return "";
        }
      } else {
        return "";
      }
    }

    if (!translate) return srtText;

    // Use AI translation
    const { data: translated, error: translateError } = await supabase.functions.invoke("translate-captions", {
      body: { srtText },
    });
    if (translateError || !translated?.translatedSrt) return srtText;
    return translated.translatedSrt;
  } catch {
    return "";
  }
}

export interface SubtitleCue {
  start: number;
  end: number;
  text: string;
}

export function parseSRT(srt: string): SubtitleCue[] {
  if (!srt) return [];
  const blocks = srt.trim().split(/\n\s*\n/);
  return blocks.map((block) => {
    const lines = block.split("\n");
    const timeLine = lines.find((l) => l.includes("-->"));
    if (!timeLine) return null;
    const [startStr, endStr] = timeLine.split("-->");
    const text = lines
      .slice(lines.indexOf(timeLine) + 1)
      .join(" ")
      .replace(/<[^>]*>/g, "");
    return {
      start: parseTime(startStr.trim()),
      end: parseTime(endStr.trim()),
      text,
    };
  }).filter(Boolean) as SubtitleCue[];
}

function parseTime(t: string): number {
  const parts = t.split(":");
  if (parts.length === 3) {
    const [h, m, rest] = parts;
    const secs = rest.replace(",", ".");
    return +h * 3600 + +m * 60 + parseFloat(secs);
  }
  if (parts.length === 2) {
    const [m, rest] = parts;
    const secs = rest.replace(",", ".");
    return +m * 60 + parseFloat(secs);
  }
  return 0;
}
