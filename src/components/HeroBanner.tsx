import type { ContentItem } from "@/types/content";
import { Play, Volume2 } from "lucide-react";

interface HeroBannerProps {
  item: ContentItem;
  onPlay: (item: ContentItem) => void;
  onTTS: (text: string) => void;
}

const HeroBanner = ({ item, onPlay, onTTS }: HeroBannerProps) => {
  return (
    <div className="relative h-[70vh] min-h-[500px] w-full overflow-hidden">
      <img
        src={item.previewHdUrl || item.imageUrl}
        alt={item.title}
        className="absolute inset-0 w-full h-full object-cover"
      />
      {/* Gradients */}
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(to right, hsl(0 0% 4% / 0.85) 30%, transparent 70%)" }}
      />
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(to top, hsl(0 0% 4%) 0%, transparent 40%)" }}
      />

      <div className="absolute bottom-20 left-8 right-8 max-w-xl animate-fade-in">
        <h2 className="text-5xl md:text-6xl font-display tracking-wide mb-2">
          {item.title}
        </h2>
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
          {item.tags}
        </p>
        <p className="text-sm text-secondary-foreground leading-relaxed mb-6 line-clamp-3">
          {item.description}
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onPlay(item)}
            className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-primary text-primary-foreground font-semibold text-sm hover:brightness-110 transition"
          >
            <Play className="w-4 h-4" fill="currentColor" />
            Play
          </button>
          <button
            onClick={() => onTTS(item.description)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-border text-foreground text-sm hover:bg-secondary transition"
          >
            <Volume2 className="w-4 h-4" />
            Listen in English
          </button>
        </div>
      </div>
    </div>
  );
};

export default HeroBanner;
