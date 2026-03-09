import { useState, useRef, useEffect, useCallback } from "react";
import type { ContentItem } from "@/types/content";
import { fetchSubtitles, parseSRT, type SubtitleCue } from "@/services/api";
import { ArrowLeft, Volume2, VolumeX, Captions } from "lucide-react";

interface VideoPlayerProps {
  item: ContentItem;
  onBack: () => void;
}

const VideoPlayer = ({ item, onBack }: VideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [subtitles, setSubtitles] = useState<SubtitleCue[]>([]);
  const [currentCue, setCurrentCue] = useState("");
  const [showCaptions, setShowCaptions] = useState(true);
  const [ttsActive, setTtsActive] = useState(false);
  const [translatedCues, setTranslatedCues] = useState<Map<string, string>>(new Map());

  // Load subtitles
  useEffect(() => {
    if (item.backgroundUrl) {
      fetchSubtitles(item.backgroundUrl).then((srt) => {
        setSubtitles(parseSRT(srt));
      });
    }
  }, [item.backgroundUrl]);

  // Update current cue based on video time
  const handleTimeUpdate = useCallback(() => {
    if (!videoRef.current || subtitles.length === 0) return;
    const time = videoRef.current.currentTime;
    const cue = subtitles.find((c) => time >= c.start && time <= c.end);
    setCurrentCue(cue?.text || "");
  }, [subtitles]);

  // TTS - speak current cue in English using browser synthesis
  useEffect(() => {
    if (!ttsActive || !currentCue) return;
    const cached = translatedCues.get(currentCue);
    if (cached) {
      speakText(cached);
    } else {
      // Simple translation: use the original text (browser TTS)
      // For real translation you'd call a translation API
      speakText(currentCue);
      setTranslatedCues((prev) => new Map(prev).set(currentCue, currentCue));
    }
  }, [currentCue, ttsActive]);

  const speakText = (text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 1.1;
    window.speechSynthesis.speak(utterance);
  };

  const toggleTTS = () => {
    if (ttsActive) {
      window.speechSynthesis.cancel();
    }
    setTtsActive(!ttsActive);
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-background/90 to-transparent">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>
        <h3 className="font-display text-xl tracking-wide">{item.title}</h3>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCaptions(!showCaptions)}
            className={`p-2 rounded-full transition ${showCaptions ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}
          >
            <Captions className="w-4 h-4" />
          </button>
          <button
            onClick={toggleTTS}
            className={`p-2 rounded-full transition ${ttsActive ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}
          >
            {ttsActive ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Video */}
      <video
        ref={videoRef}
        src={item.videoUrl}
        className="flex-1 w-full h-full object-contain bg-background"
        controls
        autoPlay
        onTimeUpdate={handleTimeUpdate}
        crossOrigin="anonymous"
      />

      {/* Subtitle overlay */}
      {showCaptions && currentCue && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 max-w-2xl px-4 py-2 bg-background/80 rounded-lg backdrop-blur-sm text-center">
          <p className="text-sm text-foreground">{currentCue}</p>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
