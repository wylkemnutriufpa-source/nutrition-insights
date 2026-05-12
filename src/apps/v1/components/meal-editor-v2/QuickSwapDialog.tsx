/**
 * QuickSwapDialog — modo Dia Padrão
 * ----------------------------------------------------------------
 * Experiência rápida de "Trocar opção" para single_day:
 *   • mostra opções equivalentes
 *   • PRÉ-VISUALIZA a diferença de macros antes de confirmar
 *   • só persiste após confirmação explícita
 */
import { useMemo, useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@v1/components/ui/dialog";
import { Button } from "@v1/components/ui/button";
import { ScrollArea } from "@v1/components/ui/scroll-area";
import { ArrowLeftRight, Flame, Beef, Wheat, Droplets, Check, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export interface QuickSwapOption {
  id: string;
  title: string;
  description?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  emoji?: string;
}

export interface QuickSwapCurrent {
  title: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  current: QuickSwapCurrent | null;
  options: QuickSwapOption[];
  onConfirm: (choice: QuickSwapOption) => Promise<void> | void;
  /** Tolerância (em kcal) para considerar a substituição equivalente */
  caloriesTolerance?: number;
}

const fmtDelta = (n: number, suffix = "") =>
  `${n > 0 ? "+" : ""}${Math.round(n * 10) / 10}${suffix}`;

export default function QuickSwapDialog({
  open,
  onOpenChange,
  current,
  options,
  onConfirm,
  caloriesTolerance = 50,
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const selected = useMemo(
    () => options.find((o) => o.id === selectedId) ?? null,
    [options, selectedId]
  );

  const preview = useMemo(() => {
    if (!current || !selected) return null;
    const dCal = selected.calories - current.calories;
    const dPro = selected.protein - current.protein;
    const dCarb = selected.carbs - current.carbs;
    const dFat = selected.fat - current.fat;
    const equivalent = Math.abs(dCal) <= caloriesTolerance;
    return { dCal, dPro, dCarb, dFat, equivalent };
  }, [current, selected, caloriesTolerance]);

  const handleConfirm = useCallback(async () => {
    if (!selected) return;
    try {
      setConfirming(true);
      await onConfirm(selected);
      toast.success(`Trocado por ${selected.title}`);
      onOpenChange(false);
      setSelectedId(null);
    } catch (err) {
      toast.error("Não foi possível trocar a opção", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setConfirming(false);
    }
  }, [selected, onConfirm, onOpenChange]);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) setSelectedId(null);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <ArrowLeftRight className="w-4 h-4 text-primary" />
            Trocar opção
          </DialogTitle>
        </DialogHeader>

        {current && (
          <div className="rounded-lg border border-border bg-muted/30 p-2.5">
            <p className="text-[10px] uppercase text-muted-foreground tracking-wide">Atual</p>
            <p className="text-sm font-semibold truncate">{current.title}</p>
            <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-0.5"><Flame className="w-3 h-3 text-orange-400" />{current.calories}</span>
              <span className="flex items-center gap-0.5"><Beef className="w-3 h-3 text-red-400" />{current.protein}g</span>
              <span className="flex items-center gap-0.5"><Wheat className="w-3 h-3 text-amber-500" />{current.carbs}g</span>
              <span className="flex items-center gap-0.5"><Droplets className="w-3 h-3 text-blue-400" />{current.fat}g</span>
            </div>
          </div>
        )}

        <ScrollArea className="max-h-[300px] -mx-1">
          <div className="space-y-1.5 px-1">
            {options.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">Sem opções equivalentes mapeadas.</p>
            ) : (
              options.map((opt) => {
                const isCurrent = current && opt.title.toLowerCase() === current.title.toLowerCase();
                const active = selectedId === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => !isCurrent && setSelectedId(opt.id)}
                    disabled={!!isCurrent}
                    className={`w-full text-left rounded-lg border p-2.5 text-xs transition-all ${
                      active
                        ? "border-primary bg-primary/5 ring-1 ring-primary/40"
                        : isCurrent
                          ? "border-border bg-muted/30 opacity-60 cursor-not-allowed"
                          : "border-border bg-card hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {opt.emoji && <span className="text-lg shrink-0">{opt.emoji}</span>}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold truncate">{opt.title}</p>
                          {isCurrent && <span className="text-[8px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">atual</span>}
                          {active && <Check className="w-3.5 h-3.5 text-primary" />}
                        </div>
                        {opt.description && (
                          <p className="text-[9px] text-muted-foreground truncate">{opt.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[9px] pl-0">
                      <span className="flex items-center gap-0.5"><Flame className="w-2.5 h-2.5 text-orange-400" />{opt.calories}</span>
                      <span className="flex items-center gap-0.5"><Beef className="w-2.5 h-2.5 text-red-400" />{opt.protein}g</span>
                      <span className="flex items-center gap-0.5"><Wheat className="w-2.5 h-2.5 text-amber-500" />{opt.carbs}g</span>
                      <span className="flex items-center gap-0.5"><Droplets className="w-2.5 h-2.5 text-blue-400" />{opt.fat}g</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </ScrollArea>

        {/* Preview de impacto */}
        {preview && selected && (
          <div
            className={`rounded-lg border p-2.5 ${
              preview.equivalent
                ? "border-green-500/30 bg-green-500/5"
                : "border-amber-500/30 bg-amber-500/5"
            }`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              {preview.equivalent ? (
                <Check className="w-3.5 h-3.5 text-green-600" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              )}
              <p className="text-[11px] font-semibold">
                {preview.equivalent ? "Equivalente nutricional" : "Atenção: diferença significativa"}
              </p>
            </div>
            <div className="grid grid-cols-4 gap-2 text-[10px]">
              <div>
                <p className="text-muted-foreground flex items-center gap-1"><Flame className="w-2.5 h-2.5" />kcal</p>
                <p className="font-semibold">{fmtDelta(preview.dCal)}</p>
              </div>
              <div>
                <p className="text-muted-foreground flex items-center gap-1"><Beef className="w-2.5 h-2.5" />prot</p>
                <p className="font-semibold">{fmtDelta(preview.dPro, "g")}</p>
              </div>
              <div>
                <p className="text-muted-foreground flex items-center gap-1"><Wheat className="w-2.5 h-2.5" />carb</p>
                <p className="font-semibold">{fmtDelta(preview.dCarb, "g")}</p>
              </div>
              <div>
                <p className="text-muted-foreground flex items-center gap-1"><Droplets className="w-2.5 h-2.5" />gord</p>
                <p className="font-semibold">{fmtDelta(preview.dFat, "g")}</p>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} disabled={confirming}>
            Cancelar
          </Button>
          <Button size="sm" onClick={handleConfirm} disabled={!selected || confirming}>
            {confirming ? "Trocando…" : "Confirmar troca"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
