import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ENDPOINTS: Record<string, string> = {
  home: "https://trackingrkx.com/roku/app/918",
  series: "https://trackingrkx.com/roku/app/919",
  "short-films": "https://trackingrkx.com/roku/app/920",
  podcast: "https://trackingrkx.com/roku/app/921",
  music: "https://trackingrkx.com/roku/app/922",
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { category, subtitleUrl, translate } = await req.json();

    // Proxy subtitle files
    if (subtitleUrl) {
      try {
        // Build list of URLs to try: original + fallback variants
        const urlsToTry = [subtitleUrl];
        
        // If CDN URL fails, try non-CDN URL and vice versa
        if (subtitleUrl.includes('adcdn.nyc3.cdn.digitaloceanspaces.com/content/')) {
          urlsToTry.push(subtitleUrl.replace('adcdn.nyc3.cdn.digitaloceanspaces.com/content/', 'nyc3.digitaloceanspaces.com/adcdn/content/'));
        } else if (subtitleUrl.includes('nyc3.digitaloceanspaces.com/adcdn/content/')) {
          urlsToTry.push(subtitleUrl.replace('nyc3.digitaloceanspaces.com/adcdn/content/', 'adcdn.nyc3.cdn.digitaloceanspaces.com/content/'));
        }

        let text = "";
        let fetched = false;

        for (const url of urlsToTry) {
          try {
            const res = await fetch(url, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': '*/*',
                'Referer': 'https://trackingrkx.com/',
              },
            });
            if (res.ok) {
              text = await res.text();
              fetched = true;
              console.log(`Subtitle fetched OK from: ${url}`);
              break;
            }
            console.error(`Subtitle ${res.status} for ${url}`);
          } catch (e) {
            console.error(`Subtitle fetch error for ${url}: ${e}`);
          }
        }

        if (!fetched) {
          return new Response(JSON.stringify({ text: "", error: "All subtitle URLs failed" }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        // Convert VTT to SRT-like format
        if (subtitleUrl.endsWith('.vtt') || text.startsWith('WEBVTT')) {
          text = text.replace(/^WEBVTT[^\n]*\n\n?/, '').replace(/^Kind:.*\n/gm, '').replace(/^Language:.*\n/gm, '');
        }

        if (translate) {
          const translated = simpleTranslate(text);
          return new Response(JSON.stringify({ text: translated }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify({ text }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (fetchErr) {
        console.error(`Subtitle fetch error: ${fetchErr}`);
        return new Response(JSON.stringify({ text: "", error: String(fetchErr) }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Proxy category API
    const url = ENDPOINTS[category];
    if (!url) {
      return new Response(JSON.stringify({ error: "Invalid category" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const response = await fetch(url);
    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Failed to fetch data" }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Basic Spanish-to-English translation dictionary for common words
const dict: Record<string, string> = {
  "y": "and", "el": "the", "la": "the", "los": "the", "las": "the",
  "de": "of", "en": "in", "que": "that", "un": "a", "una": "a",
  "es": "is", "no": "no", "se": "itself", "con": "with", "por": "for",
  "para": "for", "su": "his", "pero": "but", "yo": "I", "me": "me",
  "mi": "my", "tu": "your", "te": "you", "lo": "it", "si": "if",
  "como": "like", "más": "more", "ya": "already", "todo": "all",
  "esta": "this", "este": "this", "ser": "to be", "tiene": "has",
  "muy": "very", "bien": "well", "aquí": "here", "donde": "where",
  "cuando": "when", "hay": "there is", "fue": "was", "son": "are",
  "está": "is", "era": "was", "tiene": "has", "puede": "can",
  "vamos": "let's go", "quiero": "I want", "tengo": "I have",
  "hola": "hello", "gracias": "thanks", "bueno": "good",
  "casa": "house", "vida": "life", "mundo": "world", "tiempo": "time",
  "hombre": "man", "mujer": "woman", "día": "day", "noche": "night",
  "agua": "water", "amor": "love", "hijo": "son", "hija": "daughter",
  "padre": "father", "madre": "mother", "hermano": "brother",
  "nada": "nothing", "algo": "something", "nunca": "never",
  "siempre": "always", "también": "also", "ahora": "now",
  "después": "after", "antes": "before", "sobre": "about",
  "sin": "without", "hasta": "until", "entre": "between",
  "otro": "another", "otra": "another", "mismo": "same",
  "soy": "I am", "eres": "you are", "somos": "we are",
  "hacer": "to do", "ir": "to go", "ver": "to see",
  "saber": "to know", "poder": "to be able", "decir": "to say",
  "dar": "to give", "creo": "I think", "dios": "god",
  "tierra": "earth", "pueblo": "town", "país": "country",
  "qué": "what", "quién": "who", "cómo": "how", "cuándo": "when",
  "dónde": "where", "por qué": "why", "porque": "because",
};

function simpleTranslate(srt: string): string {
  return srt.replace(/^(?!\d+$)(?![\d:,\-\s>]+$)(.+)$/gm, (line) => {
    if (/^\d+$/.test(line.trim()) || /-->/.test(line)) return line;
    const words = line.split(/\s+/);
    const translated = words.map(w => {
      const clean = w.toLowerCase().replace(/[.,!?¡¿]/g, '');
      const punct = w.match(/[.,!?¡¿]+$/)?.[0] || '';
      return (dict[clean] || w) + punct;
    });
    return translated.join(' ');
  });
}
