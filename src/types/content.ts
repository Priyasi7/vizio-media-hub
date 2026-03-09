export interface ContentItem {
  id: number;
  title: string;
  description: string;
  imageUrl: string;
  videoUrl: string;
  backgroundUrl: string; // SRT subtitle URL
  duration: number;
  channel: string;
  tags: string;
  previewHdUrl?: string;
  previewPortraitUrl?: string;
}

export interface Playlist {
  name: string;
  items: ContentItem[];
}

export interface ApiResponse {
  app: {
    id: number;
    name: string;
    headerImageUrl: string;
  };
  playlists: Playlist[];
}

export type Category = "home" | "series" | "short-films" | "podcast" | "music";

export const CATEGORIES: { key: Category; label: string }[] = [
  { key: "home", label: "Films" },
  { key: "series", label: "Series" },
  { key: "short-films", label: "Short Films" },
  { key: "podcast", label: "Podcast" },
  { key: "music", label: "Music" },
];
