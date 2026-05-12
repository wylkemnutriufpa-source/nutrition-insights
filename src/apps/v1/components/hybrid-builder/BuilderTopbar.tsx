import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft, Save, Send, Sparkles, Loader2, CheckCircle2,
  Zap, Flame, Beef, Wheat, Droplets, Bookmark, Pencil, Check, X, PenTool, Lock,
Bot, UserCheck, ShieldCheck, ShieldAlert,
  BookOpen,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
  const validationStatus = (plan as any)?.overall_validation_status;
  const isApproved = validationStatus === "aprovado";

  return (
    <TooltipProvider>
    <div className="bg-card/80 backdrop-blur-sm border border-border rounded-xl p-3 space-y-2">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onBack} 
            className="shrink-0 h-9 gap-2 px-3 border border-border/50 hover:bg-accent group transition-all"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="font-bold text-xs uppercase tracking-wider">Voltar</span>
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
              {/* Validation status badge */}
              {isApproved ? (
                <Badge className="text-[10px] bg-emerald-500/15 text-emerald-600 border-emerald-500/30">
                  <ShieldCheck className="w-3 h-3 mr-1" /> Validado ✅
                </Badge>
              ) : (
                <Badge variant="destructive" className="text-[10px]">
                  <ShieldAlert className="w-3 h-3 mr-1" /> Pendente validação
                </Badge>
              )}
              {/* Mode indicator */}
              {lockedValidationMode && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className={`text-[10px] shrink-0 ${lockedValidationMode === "AUTO_ENGINE" ? "border-blue-500/40 text-blue-600" : "border-amber-500/40 text-amber-600"}`}>
                      {lockedValidationMode === "AUTO_ENGINE" ? <Bot className="w-3 h-3 mr-1" /> : <UserCheck className="w-3 h-3 mr-1" />}
                      {lockedValidationMode === "AUTO_ENGINE" ? "AUTO ENGINE" : "MODO MANUAL"}
                      <Lock className="w-2.5 h-2.5 ml-1 opacity-60" />
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs text-xs">
                    {lockedValidationMode === "AUTO_ENGINE"
                      ? "Modo automático: o sistema valida e corrige o plano automaticamente com base nos dados clínicos do paciente."
                      : "Modo manual: você tem controle total sobre as correções. O sistema apenas aponta os erros."}
                  </TooltipContent>
                </Tooltip>
              )}
              {isPublished && (
                <Badge className="text-[10px] bg-emerald-500/15 text-emerald-600 border-emerald-500/30">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Publicado
                </Badge>
              )}
              {(plan as any)?.generation_metadata?.template_name_used && (
                <Badge 
                  variant="secondary" 
                  className="text-[10px] shrink-0 border-primary/20 bg-primary/5"
                  data-testid="builder-template-badge"
                >
                  <BookOpen className="w-3 h-3 mr-1 text-primary" />
                  Template: {(plan as any).generation_metadata.template_name_used}
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
            Salvar Rascunho
          </Button>
          
          <Button size="sm" onClick={onPublish} disabled={publishing} className="h-8 gap-1.5 text-xs gradient-primary text-white border-0 shadow-glow font-bold">
            {publishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            Salvar e Enviar ao Paciente
          </Button>

        </div>
      </div>

      <div className="flex items-center gap-4 text-xs overflow-x-auto pb-1">
        <MacroChip icon={<Flame className="w-3 h-3" />} label="Kcal" current={totalKcal} target={targetKcal} isIncomplete={plan?.totals_status === "incomplete"} />
        <MacroChip icon={<Beef className="w-3 h-3" />} label="Prot" current={totalProt} target={targetProtein} unit="g" isIncomplete={plan?.totals_status === "incomplete"} />
        <MacroChip icon={<Wheat className="w-3 h-3" />} label="Carb" current={totalCarbs} target={targetCarbs} unit="g" isIncomplete={plan?.totals_status === "incomplete"} />
        <MacroChip icon={<Droplets className="w-3 h-3" />} label="Gord" current={totalFat} target={targetFat} unit="g" isIncomplete={plan?.totals_status === "incomplete"} />

        <div className="ml-auto text-muted-foreground">
          {items.length} refeições
        </div>
      </div>
    </div>
    </TooltipProvider>
  );
}

function MacroChip({ icon, label, current, target, unit = "", isIncomplete }: {
  icon: React.ReactNode; label: string; current: number; target?: number; unit?: string; isIncomplete?: boolean;
}) {
  const delta = target ? current - target : 0;
  const overUnder = target ? (Math.abs(delta) / target > 0.1 ? (delta > 0 ? "over" : "under") : "ok") : "ok";
  const colorClass = overUnder === "over" ? "text-destructive" : overUnder === "under" ? "text-warning" : "text-primary";

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      {icon}
      <span className="text-muted-foreground">{label}:</span>
      <span className={`font-semibold ${target ? colorClass : "text-foreground"}`}>
        {isIncomplete && current === 0 ? "..." : (isNaN(current) ? "—" : Math.round(current))}{unit}
      </span>

      {target && (
        <span className="text-muted-foreground">/ {Math.round(target)}{unit}</span>
      )}
    </div>
  );
}
