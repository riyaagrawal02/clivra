export interface YouTubeVideo {
  id: string;
  title: string;
  channelName: string;
  duration: string;
  durationSeconds: number;
  thumbnail: string;
  viewCount: string;
  publishedAt: string;
}

export function parseDuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);
  return hours * 3600 + minutes * 60 + seconds;
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

export function filterVideos(videos: YouTubeVideo[]): YouTubeVideo[] {
  return videos.filter((video) => {
    if (video.durationSeconds < 600 || video.durationSeconds > 2400) {
      return false;
    }
    const title = video.title.toLowerCase();
    if (title.includes("#shorts") || title.includes("short")) {
      return false;
    }
    return true;
  });
}
