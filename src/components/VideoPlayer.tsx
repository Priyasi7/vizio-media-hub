import { useState, useRef, useEffect, useCallback } from "react";
import Hls from "hls.js";
import type { ContentItem } from "@/types/content";
import { fetchSubtitles, parseSRT, type SubtitleCue } from "@/services/api";
import { ArrowLeft, Volume2, VolumeX, Captions, Languages } from "lucide-react";

interface VideoPlayerProps {
  item: ContentItem;
  onBack: () => void;
}

const VideoPlayer = ({ item, onBack }: VideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [subtitles, setSubtitles] = useState<SubtitleCue[]>([]);
  const [translatedSubs, setTranslatedSubs] = useState<SubtitleCue[]>([]);
  const [currentCue, setCurrentCue] = useState("");
  const [currentTranslated, setCurrentTranslated] = useState("");
  const [showCaptions, setShowCaptions] = useState(true);
  const [showOriginal, setShowOriginal] = useState(true);
  const [ttsActive, setTtsActive] = useState(false);
  const [translated, setTranslated] = useState(false);
  const [loading, setLoading] = useState(true);
  const lastSpoken = useRef("");

  // Set up HLS
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const src = item.videoUrl;

    if (Hls.isSupported()) {
      const hls = new Hls({
        xhrSetup: (xhr) => {
          // Allow redirects
        },
      });
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setLoading(false);
        video.play().catch(() => {});
      });
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          // Fallback to direct source
          video.src = src;
          video.play().catch(() => {});
          setLoading(false);
        }
      });
      return () => hls.destroy();
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      video.addEventListener("loadedmetadata", () => {
        setLoading(false);
        video.play().catch(() => {});
      });
    } else {
      video.src = src;
      setLoading(false);
    }
  }, [item.videoUrl]);

  // Load original subtitles
  useEffect(() => {
    if (item.backgroundUrl) {
      fetchSubtitles(item.backgroundUrl, false).then((srt) => {
        setSubtitles(parseSRT(srt));
      });
    }
  }, [item.backgroundUrl]);

  // Always load translated subtitles
  useEffect(() => {
    if (item.backgroundUrl) {
      fetchSubtitles(item.backgroundUrl, true).then((srt) => {
        setTranslatedSubs(parseSRT(srt));
      });
    }
  }, [item.backgroundUrl]);

  // Update current cue
  const handleTimeUpdate = useCallback(() => {
    if (!videoRef.current) return;
    const time = videoRef.current.currentTime;

    if (subtitles.length > 0) {
      const cue = subtitles.find((c) => time >= c.start && time <= c.end);
      setCurrentCue(cue?.text || "");
    }
    if (translatedSubs.length > 0) {
      const cue = translatedSubs.find((c) => time >= c.start && time <= c.end);
      setCurrentTranslated(cue?.text || "");
    }
  }, [subtitles, translatedSubs]);

  // TTS for translated text
  useEffect(() => {
    if (!ttsActive) return;
    const textToSpeak = translated ? currentTranslated : currentCue;
    if (!textToSpeak || textToSpeak === lastSpoken.current) return;

    lastSpoken.current = textToSpeak;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = translated ? "en-US" : "es-ES";
    utterance.rate = 1.1;
    utterance.volume = 0.8;
    window.speechSynthesis.speak(utterance);
  }, [currentCue, currentTranslated, ttsActive, translated]);

  const toggleTTS = () => {
    if (ttsActive) {
      window.speechSynthesis.cancel();
      lastSpoken.current = "";
    }
    setTtsActive(!ttsActive);
  };

  const toggleTranslate = () => {
    setTranslated(!translated);
  };

  const displayCue = translated ? currentTranslated : currentCue;

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
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTranslate}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition ${
              translated ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
            }`}
          >
            <Languages className="w-3.5 h-3.5" />
            {translated ? "EN" : "ES"}
          </button>
          <button
            onClick={() => setShowCaptions(!showCaptions)}
            className={`p-2 rounded-full transition ${
              showCaptions ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
            }`}
          >
            <Captions className="w-4 h-4" />
          </button>
          <button
            onClick={toggleTTS}
            className={`p-2 rounded-full transition ${
              ttsActive ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
            }`}
          >
            {ttsActive ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Video */}
      <video
        ref={videoRef}
        className="flex-1 w-full h-full object-contain bg-background"
        controls
        onTimeUpdate={handleTimeUpdate}
        playsInline
      />

      {/* Subtitle overlay */}
      {showCaptions && displayCue && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 max-w-2xl px-5 py-2.5 bg-background/85 rounded-lg backdrop-blur-sm text-center">
          <p className="text-base text-foreground leading-relaxed">{displayCue}</p>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
