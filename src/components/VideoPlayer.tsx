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
  const hlsRef = useRef<Hls | null>(null);
  const [subtitles, setSubtitles] = useState<SubtitleCue[]>([]);
  const [translatedSubs, setTranslatedSubs] = useState<SubtitleCue[]>([]);
  const [currentCue, setCurrentCue] = useState("");
  const [currentTranslated, setCurrentTranslated] = useState("");
  const [showCaptions, setShowCaptions] = useState(true);
  const [ttsActive, setTtsActive] = useState(false);
  const [translated, setTranslated] = useState(true);
  const [loading, setLoading] = useState(true);
  const [translating, setTranslating] = useState(false);
  const [captionSource, setCaptionSource] = useState<"srt" | "ai" | "none">("none");
  const lastSpoken = useRef("");

  // Fix mixed-content: rewrite http to https
  const fixUrl = (url: string) => url.replace(/^http:\/\//, "https://");

  // Set up HLS with robust error recovery
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const src = fixUrl(item.videoUrl);

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        fragLoadingMaxRetry: 6,
        fragLoadingRetryDelay: 1000,
        manifestLoadingMaxRetry: 4,
        levelLoadingMaxRetry: 4,
        xhrSetup: (xhr, url) => {
          // Rewrite any http URLs in manifests/segments
          const fixedUrl = fixUrl(url);
          if (fixedUrl !== url) {
            xhr.open("GET", fixedUrl, true);
          }
        },
      });

      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setLoading(false);
        video.play().catch(() => {});
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.warn("HLS network error, attempting recovery...");
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.warn("HLS media error, attempting recovery...");
              hls.recoverMediaError();
              break;
            default:
              console.error("HLS fatal error, falling back to direct src");
              hls.destroy();
              video.src = src;
              video.play().catch(() => {});
              setLoading(false);
              break;
          }
        }
      });

      return () => {
        hls.destroy();
        hlsRef.current = null;
      };
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

  // Load original subtitles, fallback to AI description captions
  useEffect(() => {
    let cancelled = false;

    const loadSubs = async () => {
      if (item.backgroundUrl) {
        const srt = await fetchSubtitles(item.backgroundUrl, false);
        const parsed = parseSRT(srt);
        if (!cancelled && parsed.length > 0) {
          setSubtitles(parsed);
          setCaptionSource("srt");
          return;
        }
      }

      // No valid SRT — generate simple captions from description
      if (!cancelled && item.description) {
        const descCue: SubtitleCue = {
          start: 0,
          end: 999999,
          text: item.description,
        };
        setSubtitles([descCue]);
        setCaptionSource("ai");
      }
    };

    loadSubs();
    return () => { cancelled = true; };
  }, [item.backgroundUrl, item.description]);

  // Load translated subtitles via AI
  useEffect(() => {
    if (!translated || translatedSubs.length > 0) return;

    let cancelled = false;

    const loadTranslated = async () => {
      if (item.backgroundUrl && captionSource === "srt") {
        setTranslating(true);
        const srt = await fetchSubtitles(item.backgroundUrl, true);
        const parsed = parseSRT(srt);
        if (!cancelled) {
          if (parsed.length > 0) {
            setTranslatedSubs(parsed);
          }
          setTranslating(false);
        }
      } else if (captionSource === "ai" && item.description) {
        // Description is likely already mixed lang; show as-is for translation
        setTranslatedSubs([{
          start: 0,
          end: 999999,
          text: item.description,
        }]);
      }
    };

    loadTranslated();
    return () => { cancelled = true; };
  }, [translated, translatedSubs.length, captionSource, item.backgroundUrl, item.description]);

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

  // Handle video stalling - auto-retry
  const handleStalled = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    
    if (hlsRef.current) {
      console.warn("Video stalled, restarting HLS load...");
      hlsRef.current.startLoad();
    } else {
      // For non-HLS, try reloading from current position
      const currentTime = video.currentTime;
      video.load();
      video.currentTime = currentTime;
      video.play().catch(() => {});
    }
  }, []);

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

      {/* Translating indicator */}
      {translating && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 px-4 py-2 bg-card/90 rounded-full backdrop-blur-sm">
          <p className="text-xs text-muted-foreground animate-pulse">Generating English captions...</p>
        </div>
      )}

      {/* Caption source badge */}
      {captionSource === "ai" && showCaptions && (
        <div className="absolute top-16 right-4 z-20 px-3 py-1 bg-accent/20 rounded-full">
          <p className="text-[10px] text-accent-foreground">Auto Caption</p>
        </div>
      )}

      {/* Video */}
      <video
        ref={videoRef}
        className="flex-1 w-full h-full object-contain bg-background"
        controls
        onTimeUpdate={handleTimeUpdate}
        onStalled={handleStalled}
        onWaiting={() => setLoading(true)}
        onPlaying={() => setLoading(false)}
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
