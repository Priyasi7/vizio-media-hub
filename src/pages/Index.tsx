import { useState, useCallback } from "react";
import Navbar from "@/components/Navbar";
import HeroBanner from "@/components/HeroBanner";
import ContentRow from "@/components/ContentRow";
import VideoPlayer from "@/components/VideoPlayer";
import { useContent } from "@/hooks/useContent";
import type { Category, ContentItem } from "@/types/content";
import { Skeleton } from "@/components/ui/skeleton";
import { Languages } from "lucide-react";

// Simple Spanish→English dictionary for UI text translation
const dict: Record<string, string> = {
  "y": "and", "el": "the", "la": "the", "los": "the", "las": "the",
  "de": "of", "en": "in", "que": "that", "un": "a", "una": "a",
  "es": "is", "no": "no", "se": "itself", "con": "with", "por": "for",
  "para": "for", "su": "his", "pero": "but", "como": "like",
  "más": "more", "ya": "already", "todo": "all", "esta": "this",
  "muy": "very", "bien": "well", "aquí": "here", "donde": "where",
  "cuando": "when", "fue": "was", "son": "are", "está": "is",
  "tiene": "has", "puede": "can", "quiero": "I want", "tengo": "I have",
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
  "creo": "I think", "dios": "god", "tierra": "earth",
  "pueblo": "town", "país": "country", "ser": "to be",
  "al": "upon", "del": "of the", "unico": "only", "único": "only",
  "trabajo": "work", "medio": "middle", "crisis": "crisis",
  "económica": "economic", "economica": "economic",
  "actriz": "actress", "carrera": "career", "años": "years",
  "niño": "boy", "nino": "boy", "decide": "decides",
  "retomar": "resume", "despedida": "fired", "lleva": "leads",
  "cuestionar": "question", "vocación": "vocation", "vocacion": "vocation",
  "rol": "role", "infomerciales": "infomercials",
};

function translateText(text: string): string {
  if (!text) return text;
  const words = text.split(/(\s+)/);
  return words.map(w => {
    const clean = w.toLowerCase().replace(/[.,!?¡¿:;""'']/g, '');
    const punct = w.match(/[.,!?¡¿:;""'']+$/)?.[0] || '';
    const prefix = w.match(/^[¡¿""'']+/)?.[0] || '';
    if (dict[clean]) {
      return prefix + dict[clean] + punct;
    }
    return w;
  }).join('');
}

const Index = () => {
  const [category, setCategory] = useState<Category>("home");
  const [playing, setPlaying] = useState<ContentItem | null>(null);
  const [translatePage, setTranslatePage] = useState(false);
  const { data, isLoading } = useContent(category);

  const handlePlay = useCallback((item: ContentItem) => {
    setPlaying(item);
  }, []);

  const handleTTS = useCallback((text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.9;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, []);

  // Optionally translate item fields for display
  const t = (text: string) => translatePage ? translateText(text) : text;

  const featuredItem = data?.playlists?.[0]?.items?.[0];

  if (playing) {
    return <VideoPlayer item={playing} onBack={() => setPlaying(null)} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar active={category} onSelect={setCategory}>
        <button
          onClick={() => setTranslatePage(!translatePage)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition ${
            translatePage
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Languages className="w-3.5 h-3.5" />
          {translatePage ? "English" : "Translate"}
        </button>
      </Navbar>

      {isLoading ? (
        <div className="pt-16">
          <Skeleton className="h-[70vh] w-full" />
          <div className="px-8 mt-10 space-y-4">
            <Skeleton className="h-8 w-48" />
            <div className="flex gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="w-44 aspect-video rounded-md" />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          {featuredItem && (
            <HeroBanner
              item={featuredItem}
              onPlay={handlePlay}
              onTTS={handleTTS}
              translate={t}
            />
          )}

          <div className="relative z-10 -mt-10">
            {data?.playlists?.map((playlist) => (
              <ContentRow
                key={playlist.name}
                title={t(playlist.name)}
                items={playlist.items}
                onSelect={handlePlay}
                translate={t}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default Index;
