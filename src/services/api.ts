import { supabase } from "@/integrations/supabase/client";
import type { ApiResponse, Category } from "@/types/content";

export async function fetchCategory(category: Category): Promise<ApiResponse> {
  const { data, error } = await supabase.functions.invoke("api-proxy", {
    body: { category },
  });

  if (error) throw new Error("Failed to fetch content");
  return data as ApiResponse;
}

export async function fetchSubtitles(srtUrl: string): Promise<string> {
  if (!srtUrl || !srtUrl.endsWith(".srt")) return "";
  try {
    const res = await fetch(srtUrl);
    return await res.text();
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
  const [h, m, rest] = t.split(":");
  const [s, ms] = rest.replace(",", ".").split(".");
  return +h * 3600 + +m * 60 + +s + (+ms || 0) / 1000;
}
