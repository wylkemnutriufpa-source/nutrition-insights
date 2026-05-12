/**
 * IFJ Permissions Modal — Granular feature control per patient
 * Includes quick presets: Essencial, Acompanhamento, Completo, Premium
 */
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Brain, Loader2, UtensilsCrossed, BookOpen, CheckSquare, Droplets, TrendingUp, Calendar, Repeat, MessageSquare, Lightbulb, Zap } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  patientName: string;
}

const PERMISSION_FIELDS = [
  { key: "meal_plan", label: "Plano Alimentar", desc: "Consultar refeições e macros", icon: UtensilsCrossed },
  { key: "recipes", label: "Receitas", desc: "Ver receitas do plano", icon: BookOpen },
  { key: "checklist", label: "Checklist Diário", desc: "Tarefas e hábitos", icon: CheckSquare },
  { key: "hydration", label: "Hidratação", desc: "Meta e registro de água", icon: Droplets },
  { key: "progress", label: "Progresso", desc: "Evolução corporal e peso", icon: TrendingUp },
  { key: "appointments", label: "Consultas", desc: "Próximas consultas", icon: Calendar },
  { key: "substitutions", label: "Substituições", desc: "Trocar alimentos do plano", icon: Repeat },
  { key: "messages", label: "Mensagens IFJ", desc: "Receber orientações automáticas", icon: MessageSquare },
  { key: "recommendations", label: "Recomendações", desc: "Sugestões personalizadas", icon: Lightbulb },
] as const;

type PermKey = typeof PERMISSION_FIELDS[number]["key"];
type PermsMap = Record<PermKey, boolean>;

const PRESETS: Record<string, { label: string; desc: string; color: string; perms: PermsMap; mode: string }> = {
  essencial: {
    label: "Essencial",
    desc: "Plano + Checklist + Substituições",
    color: "border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20",
    mode: "basic",
    perms: { meal_plan: true, recipes: true, checklist: true, hydration: false, progress: false, appointments: false, substitutions: true, messages: false, recommendations: false },
  },
  acompanhamento: {
    label: "Acompanhamento",
    desc: "Plano + Checklist + Progresso + Substituições",
    color: "border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20",
    mode: "standard",
    perms: { meal_plan: true, recipes: true, checklist: true, hydration: true, progress: true, appointments: true, substitutions: true, messages: false, recommendations: false },
  },
  completo: {
    label: "Completo",
    desc: "Todas as funções com substituições",
    color: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20",
    mode: "standard",
    perms: { meal_plan: true, recipes: true, checklist: true, hydration: true, progress: true, appointments: true, substitutions: true, messages: true, recommendations: true },
  },
  premium: {
    label: "Premium",
    desc: "Acesso total com substituições e IA",
    color: "border-purple-500/30 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20",
    mode: "premium",
    perms: { meal_plan: true, recipes: true, checklist: true, hydration: true, progress: true, appointments: true, substitutions: true, messages: true, recommendations: true },
  },
};

const DEFAULT_PERMS: PermsMap = {
  meal_plan: true, recipes: true, checklist: true, hydration: true,
  progress: true, appointments: true, substitutions: true, messages: true, recommendations: true,
};

function isCustomized(perms: PermsMap, mode: string): boolean {
  return !Object.values(PRESETS).some(p => p.mode === mode && PERMISSION_FIELDS.every(f => p.perms[f.key] === perms[f.key]));
}

export default function IFJPermissionsModal({ open, onOpenChange, patientId, patientName }: Props) {
  const [perms, setPerms] = useState<PermsMap>({ ...DEFAULT_PERMS });
  const [mode, setMode] = useState("standard");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !patientId) return;
    setLoading(true);
    supabase
      .from("ifj_patient_permissions" as any)
      .select("*")
      .eq("patient_id", patientId)
      .maybeSingle()
      .then(({ data }: any) => {
        if (data) {
          const d = data as any;
          const updated: any = {};
          PERMISSION_FIELDS.forEach(f => { updated[f.key] = d[f.key] !== undefined ? d[f.key] : true; });
          setPerms(updated);
          setMode(d.ifj_mode || "standard");
        } else {
          setPerms({ ...DEFAULT_PERMS });
          setMode("standard");
        }
        setLoading(false);
      });
  }, [open, patientId]);

  const applyPreset = (presetKey: string) => {
    const preset = PRESETS[presetKey];
    if (!preset) return;
    setPerms({ ...preset.perms });
    setMode(preset.mode);
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = { patient_id: patientId, ...perms, ifj_mode: mode, updated_at: new Date().toISOString() };

    const { error } = await supabase
      .from("ifj_patient_permissions" as any)
      .upsert(payload as any, { onConflict: "patient_id" });

    if (error) {
      toast.error("Erro ao salvar permissões");
      console.error(error);
    } else {
      toast.success("Permissões IFJ atualizadas ✓");
      onOpenChange(false);
    }
    setSaving(false);
  };

  const customized = isCustomized(perms, mode);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-amber-500/20">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-400">
            <Brain className="h-5 w-5" /> Permissões IFJ
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{patientName}</p>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Quick Presets */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <Zap className="h-3 w-3 text-amber-500" /> Presets Rápidos
              </Label>
              <div className="grid grid-cols-2 gap-1.5">
                {Object.entries(PRESETS).map(([key, preset]) => (
                  <button
                    key={key}
                    onClick={() => applyPreset(key)}
                    className={`p-2 rounded-lg border text-left transition-all text-xs ${preset.color}`}
                  >
                    <p className="font-semibold">{preset.label}</p>
                    <p className="text-[9px] opacity-70 mt-0.5">{preset.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Mode Selector */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Modo IFJ</Label>
                {customized && (
                  <Badge variant="outline" className="text-[9px] border-orange-500/30 text-orange-400 bg-orange-500/10">
                    Customizado
                  </Badge>
                )}
              </div>
              <Select value={mode} onValueChange={setMode}>
                <SelectTrigger className="h-9 border-amber-500/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">Básico — Respostas simplificadas</SelectItem>
                  <SelectItem value="standard">Padrão — Experiência completa</SelectItem>
                  <SelectItem value="premium">Premium — Máxima inteligência</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Permission Switches */}
            <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1">
              {PERMISSION_FIELDS.map(f => (
                <div key={f.key} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <f.icon className="h-4 w-4 text-amber-500/70" />
                    <div>
                      <p className="text-sm font-medium">{f.label}</p>
                      <p className="text-[10px] text-muted-foreground">{f.desc}</p>
                    </div>
                  </div>
                  <Switch
                    checked={perms[f.key]}
                    onCheckedChange={(v) => setPerms(prev => ({ ...prev, [f.key]: v }))}
                  />
                </div>
              ))}
            </div>

            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-amber-950 font-semibold"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Salvar Permissões
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
