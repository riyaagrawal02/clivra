import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Clock, Eye } from "lucide-react";
import type { YouTubeVideo } from "@/hooks/useYoutubeRecommendations";

interface YouTubeVideoCardProps {
  video: YouTubeVideo;
}

function formatViewCount(count: string): string {
  const num = parseInt(count, 10);
  if (isNaN(num)) return count;

  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(0)}K`;
  }
  return count;
}

export function YouTubeVideoCard({ video }: YouTubeVideoCardProps) {
  const handleWatch = () => {
    window.open(`https://www.youtube.com/watch?v=${video.id}`, "_blank", "noopener,noreferrer");
  };

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-0">
        <div className="flex gap-3">
          {/* Thumbnail */}
          <div className="relative w-32 h-24 flex-shrink-0">
            <img
              src={video.thumbnail}
              alt={video.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 rounded">
              {video.duration}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 py-2 pr-3 flex flex-col justify-between">
            <div>
              <h4 className="text-sm font-medium line-clamp-2 leading-tight">
                {video.title}
              </h4>
              <p className="text-xs text-muted-foreground mt-1">
                {video.channelName}
              </p>
            </div>

            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  {formatViewCount(video.viewCount)}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {video.duration}
                </span>
              </div>

              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-primary hover:text-primary"
                onClick={handleWatch}
              >
                <ExternalLink className="h-3.5 w-3.5 mr-1" />
                Watch
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}