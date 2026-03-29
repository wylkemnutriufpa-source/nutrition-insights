import { useState } from "react";
import type { CheckinData } from "@/lib/coachAnalysisEngine";
import { VISUAL_VERDICT_OPTIONS } from "@/lib/coachAnalysisEngine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Camera, ChevronLeft, ChevronRight, Maximize2 } from "lucide-react";
import StorageImage from "@/components/common/StorageImage";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface Props {
  checkins: CheckinData[];
}

export default function CoachPhotoEvolution({ checkins }: Props) {
  const withPhotos = checkins.filter(c => c.front_photo_url || c.side_photo_url || c.back_photo_url);
  const [compareIdx, setCompareIdx] = useState(0);
  const [lightbox, setLightbox] = useState<string | null>(null);

  if (withPhotos.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
            <Camera className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground mb-1">Nenhuma foto registrada</p>
          <p className="text-xs text-muted-foreground">Adicione fotos nos check-ins para comparação visual.</p>
        </CardContent>
      </Card>
    );
  }

  const current = withPhotos[compareIdx];
  const previous = withPhotos[compareIdx + 1] || null;
  const verdictOpt = VISUAL_VERDICT_OPTIONS.find(v => v.value === current?.visual_verdict);

  const PhotoCard = ({ url, label }: { url: string | null | undefined; label: string }) => {
    if (!url) return null;
    return (
      <div className="relative group cursor-pointer" onClick={() => setLightbox(url)}>
        <StorageImage
          src={url}
          alt={label}
          className="rounded-xl aspect-[3/4] object-cover w-full border border-border/30 shadow-sm"
          bucket="coach-photos"
        />
        <div className="absolute inset-0 rounded-xl bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
          <Maximize2 className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <span className="absolute bottom-2 left-2 text-[10px] font-semibold text-white bg-black/50 px-2 py-0.5 rounded-full backdrop-blur-sm">
          {label}
        </span>
      </div>
    );
  };

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="pb-3 border-b border-border/30">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
              <Camera className="h-4 w-4 text-white" />
            </div>
            Evolução Visual
            <Badge variant="outline" className="ml-auto text-[10px]">{withPhotos.length} registros</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 space-y-5">
          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              disabled={compareIdx >= withPhotos.length - 1}
              onClick={() => setCompareIdx(i => Math.min(i + 1, withPhotos.length - 1))}
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
            </Button>
            <span className="text-sm text-muted-foreground font-medium">
              {new Date(current.checkin_date).toLocaleDateString("pt-BR")}
              {previous && ` vs ${new Date(previous.checkin_date).toLocaleDateString("pt-BR")}`}
            </span>
            <Button
              variant="ghost"
              size="sm"
              disabled={compareIdx <= 0}
              onClick={() => setCompareIdx(i => Math.max(i - 1, 0))}
            >
              Próximo <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>

          {/* Comparison grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Current */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge className="bg-gradient-to-r from-orange-500/20 to-red-600/20 text-orange-400 border-orange-500/30">Atual</Badge>
                <span className="text-xs text-muted-foreground">{new Date(current.checkin_date).toLocaleDateString("pt-BR")}</span>
                {verdictOpt && (
                  <Badge variant="outline" className={verdictOpt.color}>{verdictOpt.label}</Badge>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <PhotoCard url={current.front_photo_url} label="Frente" />
                <PhotoCard url={current.side_photo_url} label="Lado" />
                <PhotoCard url={current.back_photo_url} label="Costas" />
              </div>
              {current.visual_observation && (
                <p className="text-xs text-muted-foreground italic bg-muted/30 rounded-lg px-3 py-2">"{current.visual_observation}"</p>
              )}
            </div>

            {/* Previous */}
            {previous ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Anterior</Badge>
                  <span className="text-xs text-muted-foreground">{new Date(previous.checkin_date).toLocaleDateString("pt-BR")}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <PhotoCard url={previous.front_photo_url} label="Frente" />
                  <PhotoCard url={previous.side_photo_url} label="Lado" />
                  <PhotoCard url={previous.back_photo_url} label="Costas" />
                </div>
                {previous.visual_observation && (
                  <p className="text-xs text-muted-foreground italic bg-muted/30 rounded-lg px-3 py-2">"{previous.visual_observation}"</p>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center rounded-xl border border-dashed border-border/50 p-8">
                <p className="text-sm text-muted-foreground">Sem registro anterior para comparação</p>
              </div>
            )}
          </div>

          {/* Thumbnails */}
          {withPhotos.length > 2 && (
            <div className="flex gap-2 overflow-x-auto pb-2 pt-1">
              {withPhotos.map((c, i) => (
                <button
                  key={c.id || i}
                  onClick={() => setCompareIdx(i)}
                  className={`shrink-0 w-14 h-14 rounded-xl overflow-hidden border-2 transition-all ${
                    i === compareIdx ? "border-orange-500 shadow-lg shadow-orange-500/20" : "border-transparent opacity-60 hover:opacity-100"
                  }`}
                >
                  <StorageImage
                    src={c.front_photo_url || c.side_photo_url || c.back_photo_url || ""}
                    alt=""
                    bucket="coach-photos"
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lightbox */}
      <Dialog open={!!lightbox} onOpenChange={() => setLightbox(null)}>
        <DialogContent className="max-w-3xl p-2 bg-black/95 border-none">
          {lightbox && (
            <StorageImage
              src={lightbox}
              alt="Foto ampliada"
              bucket="coach-photos"
              className="w-full max-h-[85vh] object-contain rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
