import { useState } from "react";
import type { CheckinData } from "@/lib/coachAnalysisEngine";
import { VISUAL_VERDICT_OPTIONS } from "@/lib/coachAnalysisEngine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Camera, ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  checkins: CheckinData[];
}

export default function CoachPhotoEvolution({ checkins }: Props) {
  const withPhotos = checkins.filter(c => c.front_photo_url || c.side_photo_url || c.back_photo_url);
  const [compareIdx, setCompareIdx] = useState(0);

  if (withPhotos.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Camera className="h-4 w-4 text-primary" />
            Evolução Visual
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhuma foto registrada. Adicione fotos nos check-ins para comparação visual.
          </p>
        </CardContent>
      </Card>
    );
  }

  const current = withPhotos[compareIdx];
  const previous = withPhotos[compareIdx + 1] || null;
  const verdictOpt = VISUAL_VERDICT_OPTIONS.find(v => v.value === current?.visual_verdict);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Camera className="h-4 w-4 text-primary" />
          Evolução Visual
          <Badge variant="outline" className="ml-auto">{withPhotos.length} registros</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Current */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge className="bg-primary/20 text-primary border-primary/30">Atual</Badge>
              <span className="text-xs text-muted-foreground">{new Date(current.checkin_date).toLocaleDateString("pt-BR")}</span>
              {verdictOpt && (
                <Badge variant="outline" className={verdictOpt.color}>{verdictOpt.label}</Badge>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {current.front_photo_url && <img src={current.front_photo_url} alt="Frente" className="rounded-lg aspect-[3/4] object-cover w-full" />}
              {current.side_photo_url && <img src={current.side_photo_url} alt="Lado" className="rounded-lg aspect-[3/4] object-cover w-full" />}
              {current.back_photo_url && <img src={current.back_photo_url} alt="Costas" className="rounded-lg aspect-[3/4] object-cover w-full" />}
            </div>
            {current.visual_observation && (
              <p className="text-xs text-muted-foreground italic">"{current.visual_observation}"</p>
            )}
          </div>

          {/* Previous */}
          {previous ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline">Anterior</Badge>
                <span className="text-xs text-muted-foreground">{new Date(previous.checkin_date).toLocaleDateString("pt-BR")}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {previous.front_photo_url && <img src={previous.front_photo_url} alt="Frente" className="rounded-lg aspect-[3/4] object-cover w-full" />}
                {previous.side_photo_url && <img src={previous.side_photo_url} alt="Lado" className="rounded-lg aspect-[3/4] object-cover w-full" />}
                {previous.back_photo_url && <img src={previous.back_photo_url} alt="Costas" className="rounded-lg aspect-[3/4] object-cover w-full" />}
              </div>
              {previous.visual_observation && (
                <p className="text-xs text-muted-foreground italic">"{previous.visual_observation}"</p>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center rounded-lg border border-dashed border-border p-8">
              <p className="text-sm text-muted-foreground">Sem registro anterior para comparação</p>
            </div>
          )}
        </div>

        {/* Thumbnails */}
        {withPhotos.length > 2 && (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {withPhotos.map((c, i) => (
              <button
                key={c.id || i}
                onClick={() => setCompareIdx(i)}
                className={`shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                  i === compareIdx ? "border-primary" : "border-transparent opacity-60 hover:opacity-100"
                }`}
              >
                <img
                  src={c.front_photo_url || c.side_photo_url || c.back_photo_url || ""}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
