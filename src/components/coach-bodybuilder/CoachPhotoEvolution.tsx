import { useState } from "react";
import type { CheckinData } from "@v1/lib/coachAnalysisEngine";
import { VISUAL_VERDICT_OPTIONS } from "@v1/lib/coachAnalysisEngine";
import { Card, CardContent, CardHeader, CardTitle } from "@v1/components/ui/card";
import { Badge } from "@v1/components/ui/badge";
import { Button } from "@v1/components/ui/button";
import { Camera, ChevronLeft, ChevronRight, Maximize2, Eye, Layers } from "lucide-react";
import StorageImage from "@v1/components/common/StorageImage";
import { Dialog, DialogContent } from "@v1/components/ui/dialog";

interface Props {
  checkins: CheckinData[];
}

export default function CoachPhotoEvolution({ checkins }: Props) {
  const withPhotos = checkins.filter(c => c.front_photo_url || c.side_photo_url || c.back_photo_url);
  const [compareIdx, setCompareIdx] = useState(0);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"compare" | "timeline">("compare");

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
        <span className="absolute bottom-2 left-2 text-[10px] font-semibold text-white bg-black/60 px-2 py-0.5 rounded-full backdrop-blur-sm">
          {label}
        </span>
      </div>
    );
  };

  return (
    <>
      <Card className="overflow-hidden border-orange-500/15">
        <div className="h-0.5 w-full bg-gradient-to-r from-orange-500 via-red-500 to-orange-500" />
        <CardHeader className="pb-3 border-b border-border/30">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
              <Camera className="h-4 w-4 text-white" />
            </div>
            Evolução Visual Premium
            <div className="ml-auto flex items-center gap-2">
              <Button
                variant={viewMode === "compare" ? "default" : "outline"}
                size="sm"
                className={`text-xs h-7 ${viewMode === "compare" ? "bg-gradient-to-r from-orange-500 to-red-600 text-white border-0" : ""}`}
                onClick={() => setViewMode("compare")}
              >
                <Eye className="h-3 w-3 mr-1" /> Comparar
              </Button>
              <Button
                variant={viewMode === "timeline" ? "default" : "outline"}
                size="sm"
                className={`text-xs h-7 ${viewMode === "timeline" ? "bg-gradient-to-r from-orange-500 to-red-600 text-white border-0" : ""}`}
                onClick={() => setViewMode("timeline")}
              >
                <Layers className="h-3 w-3 mr-1" /> Linha do Tempo
              </Button>
              <Badge variant="outline" className="text-[10px]">{withPhotos.length} registros</Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 space-y-5">
          {viewMode === "compare" ? (
            <>
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
                <div className="text-center">
                  <span className="text-sm text-foreground font-semibold">
                    {new Date(current.checkin_date).toLocaleDateString("pt-BR")}
                  </span>
                  {previous && (
                    <span className="text-sm text-muted-foreground"> vs {new Date(previous.checkin_date).toLocaleDateString("pt-BR")}</span>
                  )}
                </div>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Current */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className="bg-gradient-to-r from-orange-500/20 to-red-600/20 text-orange-400 border-orange-500/30">
                      📸 Atual
                    </Badge>
                    <span className="text-xs text-muted-foreground">{new Date(current.checkin_date).toLocaleDateString("pt-BR")}</span>
                    {verdictOpt && (
                      <Badge variant="outline" className={verdictOpt.color}>{verdictOpt.label}</Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2.5">
                    <PhotoCard url={current.front_photo_url} label="Frente" />
                    <PhotoCard url={current.side_photo_url} label="Lado" />
                    <PhotoCard url={current.back_photo_url} label="Costas" />
                  </div>
                  {/* Visual observation highlight */}
                  {current.visual_observation && (
                    <div className="p-3 rounded-xl bg-gradient-to-r from-orange-500/5 to-transparent border border-orange-500/15">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Eye className="w-3 h-3 text-orange-400" />
                        <span className="text-[10px] text-orange-400 uppercase tracking-wider font-bold">Observação Visual</span>
                      </div>
                      <p className="text-xs text-foreground leading-relaxed italic">"{current.visual_observation}"</p>
                    </div>
                  )}
                  {/* Verdict highlight */}
                  {current.visual_verdict && verdictOpt && (
                    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/30 border border-border/30">
                      <span className="text-[10px] text-muted-foreground">Veredicto:</span>
                      <Badge className={`${verdictOpt.color} text-xs`}>{verdictOpt.label}</Badge>
                    </div>
                  )}
                </div>

                {/* Previous */}
                {previous ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Anterior</Badge>
                      <span className="text-xs text-muted-foreground">{new Date(previous.checkin_date).toLocaleDateString("pt-BR")}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2.5">
                      <PhotoCard url={previous.front_photo_url} label="Frente" />
                      <PhotoCard url={previous.side_photo_url} label="Lado" />
                      <PhotoCard url={previous.back_photo_url} label="Costas" />
                    </div>
                    {previous.visual_observation && (
                      <div className="p-3 rounded-xl bg-muted/20 border border-border/20">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Eye className="w-3 h-3 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Observação</span>
                        </div>
                        <p className="text-xs text-muted-foreground italic">"{previous.visual_observation}"</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center rounded-xl border border-dashed border-border/50 p-8">
                    <p className="text-sm text-muted-foreground">Sem registro anterior para comparação</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Timeline view — mini history */
            <div className="space-y-4">
              {withPhotos.slice(0, 8).map((c, i) => {
                const vOpt = VISUAL_VERDICT_OPTIONS.find(v => v.value === c.visual_verdict);
                return (
                  <div key={c.id || i} className="flex gap-4 items-start">
                    <div className="text-center shrink-0 w-16">
                      <p className="text-xs font-bold text-foreground">{new Date(c.checkin_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</p>
                      {vOpt && <Badge variant="outline" className={`${vOpt.color} text-[9px] mt-1`}>{vOpt.label}</Badge>}
                    </div>
                    <div className="flex gap-2 flex-1 min-w-0">
                      {c.front_photo_url && (
                        <div className="w-20 h-24 shrink-0 cursor-pointer" onClick={() => setLightbox(c.front_photo_url!)}>
                          <StorageImage src={c.front_photo_url} alt="Frente" bucket="coach-photos" className="w-full h-full object-cover rounded-lg border border-border/30" />
                        </div>
                      )}
                      {c.side_photo_url && (
                        <div className="w-20 h-24 shrink-0 cursor-pointer" onClick={() => setLightbox(c.side_photo_url!)}>
                          <StorageImage src={c.side_photo_url} alt="Lado" bucket="coach-photos" className="w-full h-full object-cover rounded-lg border border-border/30" />
                        </div>
                      )}
                      {c.back_photo_url && (
                        <div className="w-20 h-24 shrink-0 cursor-pointer" onClick={() => setLightbox(c.back_photo_url!)}>
                          <StorageImage src={c.back_photo_url} alt="Costas" bucket="coach-photos" className="w-full h-full object-cover rounded-lg border border-border/30" />
                        </div>
                      )}
                      {c.visual_observation && (
                        <p className="text-[11px] text-muted-foreground italic self-center ml-1">"{c.visual_observation}"</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Thumbnails (compare mode) */}
          {viewMode === "compare" && withPhotos.length > 2 && (
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
