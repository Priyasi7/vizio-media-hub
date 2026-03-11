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
    const { data, error } = await supabase.functions.invoke("api-proxy", {
      body: { subtitleUrl: srtUrl, translate },
    });
    if (error) return "";
    return data?.text || "";
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
  // Strip VTT header if present
  let cleaned = srt.replace(/^WEBVTT[^\n]*\n\n?/, '').replace(/^Kind:.*\n/gm, '').replace(/^Language:.*\n/gm, '');
  const blocks = cleaned.trim().split(/\n\s*\n/);
  return blocks.map((block) => {
    const lines = block.split("\n");
    const timeLine = lines.find((l) => l.includes("-->"));
    if (!timeLine) return null;
    const [startStr, endStr] = timeLine.split("-->");
    const text = lines
      .slice(lines.indexOf(timeLine) + 1)
      .join(" ")
      .replace(/<[^>]*>/g, "")
      .trim();
    if (!text) return null;
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
