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
  let cleaned = srt.replace(/^WEBVTT[^\n]*\n\n?/, '').replace(/^Kind:.*\n/gm, '').replace(/^Language:.*\n/gm, '').replace(/^NOTE[^\n]*\n/gm, '');
  const blocks = cleaned.trim().split(/\n\s*\n/);
  const timeRegex = /(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/;
  const cues: SubtitleCue[] = [];

  for (const block of blocks) {
    const lines = block.trim().split("\n");
    if (lines.length < 2) continue;
    let timeLineIdx = -1;
    for (let i = 0; i < Math.min(lines.length, 3); i++) {
      if (timeRegex.test(lines[i])) { timeLineIdx = i; break; }
    }
    if (timeLineIdx === -1) continue;
    const match = lines[timeLineIdx].match(timeRegex)!;
    const start = +match[1] * 3600 + +match[2] * 60 + +match[3] + +match[4] / 1000;
    const end = +match[5] * 3600 + +match[6] * 60 + +match[7] + +match[8] / 1000;
    const text = lines.slice(timeLineIdx + 1).join(" ").replace(/<[^>]+>/g, "").trim();
    if (text) cues.push({ start, end, text });
  }

  // Auto-detect and remove hour offset (many SRTs start at 01:00:00 instead of 00:00:00)
  if (cues.length > 0) {
    const minStart = cues[0].start;
    const hourOffset = Math.floor(minStart / 3600) * 3600;
    if (hourOffset >= 3600) {
      for (const cue of cues) {
        cue.start -= hourOffset;
        cue.end -= hourOffset;
      }
    }
  }

  return cues;
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
