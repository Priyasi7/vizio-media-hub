import { useState, useCallback } from "react";
import Navbar from "@/components/Navbar";
import HeroBanner from "@/components/HeroBanner";
import ContentRow from "@/components/ContentRow";
import VideoPlayer from "@/components/VideoPlayer";
import { useContent } from "@/hooks/useContent";
import type { Category, ContentItem } from "@/types/content";
import { Skeleton } from "@/components/ui/skeleton";

const Index = () => {
  const [category, setCategory] = useState<Category>("home");
  const [playing, setPlaying] = useState<ContentItem | null>(null);
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

  const featuredItem = data?.playlists?.[0]?.items?.[0];

  if (playing) {
    return <VideoPlayer item={playing} onBack={() => setPlaying(null)} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar active={category} onSelect={setCategory} />

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
            />
          )}

          <div className="relative z-10 -mt-10">
            {data?.playlists?.map((playlist) => (
              <ContentRow
                key={playlist.name}
                title={playlist.name}
                items={playlist.items}
                onSelect={handlePlay}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default Index;
