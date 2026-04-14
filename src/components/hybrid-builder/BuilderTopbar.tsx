import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft, Save, Send, Sparkles, Loader2, CheckCircle2,
  Zap, Flame, Beef, Wheat, Droplets, Bookmark, Pencil, Check, X, PenTool, Lock,
} from "lucide-react";
import { useMealPlanEditorV2Store } from "@/stores/mealPlanEditorV2Store";
import type { ValidationMode } from "./ValidationModeDialog";

interface Props {
  patientName: string;
  objective?: string;
  targetKcal?: number;
  targetProtein?: number;
  targetCarbs?: number;
  targetFat?: number;
  saving: boolean;
  publishing: boolean;
  validating: boolean;
  onBack: () => void;
  onSave: () => void;
  onValidate: () => void;
  onPublish: () => void;
  onSaveAsTemplate?: () => void;
  onRename?: (newTitle: string) => void;
  lockedValidationMode?: ValidationMode | null;
}

export default function BuilderTopbar({
  patientName, objective, targetKcal, targetProtein, targetCarbs, targetFat,
  saving, publishing, validating,
  onBack, onSave, onValidate, onPublish, onSaveAsTemplate, onRename,
  lockedValidationMode,
}: Props) {
  const { plan, items, syncStatus } = useMealPlanEditorV2Store();
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");

  const totalKcal = items.reduce((s, i) => s + (i.calories_target || 0), 0);
  const totalProt = items.reduce((s, i) => s + (i.protein_target || 0), 0);
  const totalCarbs = items.reduce((s, i) => s + (i.carbs_target || 0), 0);
  const totalFat = items.reduce((s, i) => s + (i.fat_target || 0), 0);

  const status = plan?.plan_status;
  const isPublished = status === "published_to_patient";

  return (
    <div className="bg-card/80 backdrop-blur-sm border border-border rounded-xl p-3 space-y-2">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0 h-8 w-8">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {editing ? (
                <div className="flex items-center gap-1">
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="h-7 text-sm font-bold w-48"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && editTitle.trim()) {
                        onRename?.(editTitle.trim());
                        setEditing(false);
                      }
                      if (e.key === "Escape") setEditing(false);
                    }}
                  />
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { if (editTitle.trim()) { onRename?.(editTitle.trim()); } setEditing(false); }}>
                    <Check className="w-3 h-3 text-emerald-500" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditing(false)}>
                    <X className="w-3 h-3 text-destructive" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 group cursor-pointer" onClick={() => { setEditTitle(plan?.title || ""); setEditing(true); }}>
                  <h1 className="font-display text-base font-bold truncate">{plan?.title || "Novo Plano"}</h1>
                  <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              )}
              <Badge variant="outline" className="text-[10px] shrink-0">
                <Zap className="w-3 h-3 mr-1" /> Builder Híbrido
              </Badge>
              {isPublished && (
                <Badge className="text-[10px] bg-emerald-500/15 text-emerald-600 border-emerald-500/30">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Publicado
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {patientName}{objective ? ` • ${objective}` : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onSaveAsTemplate && (
            <Button variant="outline" size="sm" onClick={onSaveAsTemplate} className="h-8 gap-1.5 text-xs">
              <Bookmark className="w-3.5 h-3.5" />
              Salvar como Modelo
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onSave} disabled={saving || syncStatus === "saving"} className="h-8 gap-1.5 text-xs">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Salvar
          </Button>
          <Button variant="outline" size="sm" onClick={onValidate} disabled={validating} className="h-8 gap-1.5 text-xs gradient-primary text-white border-0">
            {validating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            Validar e Corrigir
          </Button>
          <Button size="sm" onClick={onPublish} disabled={publishing} className="h-8 gap-1.5 text-xs">
            {publishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            Publicar
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs overflow-x-auto pb-1">
        <MacroChip icon={<Flame className="w-3 h-3" />} label="Kcal" current={totalKcal} target={targetKcal} />
        <MacroChip icon={<Beef className="w-3 h-3" />} label="Prot" current={totalProt} target={targetProtein} unit="g" />
        <MacroChip icon={<Wheat className="w-3 h-3" />} label="Carb" current={totalCarbs} target={targetCarbs} unit="g" />
        <MacroChip icon={<Droplets className="w-3 h-3" />} label="Gord" current={totalFat} target={targetFat} unit="g" />
        <div className="ml-auto text-muted-foreground">
          {items.length} refeições
        </div>
      </div>
    </div>
  );
}

function MacroChip({ icon, label, current, target, unit = "" }: {
  icon: React.ReactNode; label: string; current: number; target?: number; unit?: string;
}) {
  const delta = target ? current - target : 0;
  const overUnder = target ? (Math.abs(delta) / target > 0.1 ? (delta > 0 ? "over" : "under") : "ok") : "ok";
  const colorClass = overUnder === "over" ? "text-destructive" : overUnder === "under" ? "text-warning" : "text-primary";

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      {icon}
      <span className="text-muted-foreground">{label}:</span>
      <span className={`font-semibold ${target ? colorClass : "text-foreground"}`}>
        {Math.round(current)}{unit}
      </span>
      {target && (
        <span className="text-muted-foreground">/ {Math.round(target)}{unit}</span>
      )}
    </div>
  );
}
