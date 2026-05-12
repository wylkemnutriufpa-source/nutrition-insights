import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@v1/components/ui/dialog";
import { Badge } from "@v1/components/ui/badge";
import { Video, X } from "lucide-react";

interface Props {
  videoUrl: string | null;
  exerciseName: string;
  open: boolean;
  onClose: () => void;
}

export default function ExerciseVideoPlayer({ videoUrl, exerciseName, open, onClose }: Props) {
  if (!videoUrl) return null;

  // Detect video type
  const isYoutube = videoUrl.includes("youtube.com") || videoUrl.includes("youtu.be");
  const getYoutubeEmbedUrl = (url: string) => {
    const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([^&?\s]+)/);
    return match ? `https://www.youtube.com/embed/${match[1]}?autoplay=1` : url;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="flex items-center gap-2 text-sm">
            <Video className="w-4 h-4 text-primary" />
            {exerciseName}
          </DialogTitle>
        </DialogHeader>
        <div className="aspect-video bg-black">
          {isYoutube ? (
            <iframe
              src={getYoutubeEmbedUrl(videoUrl)}
              className="w-full h-full"
              allowFullScreen
              allow="autoplay; encrypted-media"
              title={exerciseName}
            />
          ) : (
            <video
              src={videoUrl}
              controls
              autoPlay
              className="w-full h-full object-contain"
            >
              Seu navegador não suporta vídeos.
            </video>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
