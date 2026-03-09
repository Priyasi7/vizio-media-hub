import { useRef } from "react";
import type { ContentItem } from "@/types/content";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ContentRowProps {
  title: string;
  items: ContentItem[];
  onSelect: (item: ContentItem) => void;
}

const ContentRow = ({ title, items, onSelect }: ContentRowProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: number) => {
    scrollRef.current?.scrollBy({ left: dir * 300, behavior: "smooth" });
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
              onClick={() => onSelect(item)}
              className="flex-shrink-0 w-44 cursor-pointer group/card transition-transform hover:scale-105"
            >
              <div className="relative aspect-video rounded-md overflow-hidden mb-2 shadow-lg">
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <p className="text-xs text-secondary-foreground truncate">
                {item.title}
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
