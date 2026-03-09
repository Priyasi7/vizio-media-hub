import { useRef, useState } from "react";
import type { ContentItem } from "@/types/content";
import { ChevronLeft, ChevronRight, Play, Volume2 } from "lucide-react";

interface ContentRowProps {
  title: string;
  items: ContentItem[];
  onSelect: (item: ContentItem) => void;
  translate?: (text: string) => string;
}

const ContentRow = ({ title, items, onSelect, translate }: ContentRowProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [speakingId, setSpeakingId] = useState<number | null>(null);
  const t = translate || ((s: string) => s);

  const scroll = (dir: number) => {
    scrollRef.current?.scrollBy({ left: dir * 300, behavior: "smooth" });
  };

  const handleTTS = (e: React.MouseEvent, item: ContentItem) => {
    e.stopPropagation();
    window.speechSynthesis.cancel();

    if (speakingId === item.id) {
      setSpeakingId(null);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(t(item.description));
    utterance.lang = "en-US";
    utterance.rate = 0.9;
    utterance.onend = () => setSpeakingId(null);
    window.speechSynthesis.speak(utterance);
    setSpeakingId(item.id);
  };

  return (
    <section className="px-8 mb-10">
      <h3 className="text-2xl font-display tracking-wide mb-4">{title}</h3>
      <div className="relative group">
        <button
          onClick={() => scroll(-1)}
          className="absolute left-0 top-0 bottom-0 z-10 w-10 bg-gradient-to-r from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition flex items-center justify-center"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto scrollbar-hide scroll-smooth"
        >
          {items.map((item) => (
            <div
              key={item.id}
              className="flex-shrink-0 w-44 cursor-pointer group/card transition-transform hover:scale-105"
            >
              <div className="relative aspect-video rounded-md overflow-hidden mb-2 shadow-lg">
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                {/* Hover overlay with Play & TTS */}
                <div className="absolute inset-0 bg-background/60 opacity-0 group-hover/card:opacity-100 transition flex items-center justify-center gap-2">
                  <button
                    onClick={() => onSelect(item)}
                    className="p-2 rounded-full bg-primary text-primary-foreground hover:brightness-110 transition"
                  >
                    <Play className="w-4 h-4" fill="currentColor" />
                  </button>
                  <button
                    onClick={(e) => handleTTS(e, item)}
                    className={`p-2 rounded-full transition ${
                      speakingId === item.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground hover:bg-accent"
                    }`}
                    title="Listen in English"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <p className="text-xs text-secondary-foreground truncate">
                {t(item.title)}
              </p>
            </div>
          ))}
        </div>
        <button
          onClick={() => scroll(1)}
          className="absolute right-0 top-0 bottom-0 z-10 w-10 bg-gradient-to-l from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition flex items-center justify-center"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>
    </section>
  );
};

export default ContentRow;
