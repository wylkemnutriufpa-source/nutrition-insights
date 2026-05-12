/**
 * Admin toggle to enable FitJourney Intelligence for a patient.
 * Now includes expiry date or unlimited access config.
 */
import { useState } from "react";
import { supabase } from "@v1/integrations/supabase/client";
import { Switch } from "@v1/components/ui/switch";
import { Label } from "@v1/components/ui/label";
import { Badge } from "@v1/components/ui/badge";
import { Button } from "@v1/components/ui/button";
import { Input } from "@v1/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@v1/components/ui/select";
import { toast } from "sonner";
import { Brain, Loader2, Calendar, Infinity, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  patientId: string;
  enabled: boolean;
  onboarded: boolean;
  expiresAt?: string | null;
  accessMode?: "unlimited" | "timed";
  onToggle: (enabled: boolean) => void;
}

export default function FitIntelligenceToggle({ patientId, enabled, onboarded, expiresAt, accessMode = "unlimited", onToggle }: Props) {
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [mode, setMode] = useState<"unlimited" | "timed">(expiresAt ? "timed" : (accessMode || "unlimited"));
  const [expiry, setExpiry] = useState(expiresAt || "");

  const handleToggle = async (checked: boolean) => {
    setSaving(true);
    const updates: Record<string, any> = {
      fit_intelligence_enabled: checked,
    };
    if (!checked) {
      updates.fit_intelligence_expires_at = null;
      updates.fit_intelligence_access_mode = "unlimited";
    }
    const { error } = await supabase
      .from("profiles")
      .update(updates as any)
      .eq("user_id", patientId);

    if (error) {
      console.warn("[FitIntelligence] Toggle error:", error.message);
      toast.error("Não foi possível atualizar. Tente novamente.");
    } else {
      toast.success(checked ? "Inteligência FitJourney ativada! 🧠" : "Inteligência FitJourney desativada");
      onToggle(checked);
    }
    setSaving(false);
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    const updates: Record<string, any> = {
      fit_intelligence_access_mode: mode,
      fit_intelligence_expires_at: mode === "timed" && expiry ? expiry : null,
    };
    const { error } = await supabase
      .from("profiles")
      .update(updates as any)
      .eq("user_id", patientId);

    if (error) {
      console.warn("[FitIntelligence] Config save error:", error.message);
      toast.error("Erro ao salvar configuração");
    } else {
      toast.success("Configuração de acesso atualizada ✓");
    }
    setSaving(false);
  };

  const isExpired = mode === "timed" && expiry && new Date(expiry) < new Date();

  return (
    <div className="rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-amber-600/5 overflow-hidden">
      {/* Main toggle row */}
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, hsl(45 100% 45% / 0.2), hsl(35 100% 35% / 0.1))" }}>
            <Brain className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Label className="font-semibold text-sm">Inteligência FitJourney</Label>
              {onboarded && (
                <Badge variant="outline" className="text-[10px] py-0 text-amber-500 border-amber-500/30">
                  Configurada
                </Badge>
              )}
              {isExpired && (
                <Badge variant="destructive" className="text-[10px] py-0">
                  Expirada
                </Badge>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground">Assistente comportamental adaptativo premium</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {saving && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
          <Switch checked={enabled} onCheckedChange={handleToggle} disabled={saving} />
        </div>
      </div>

      {/* Expandable config */}
      {enabled && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-center gap-1 py-1.5 text-[10px] text-amber-500/70 hover:text-amber-500 transition-colors border-t border-amber-500/10"
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {expanded ? "Fechar configuração" : "Configurar acesso"}
          </button>

          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-3 pb-3 space-y-3 border-t border-amber-500/10">
                  <div className="pt-3 space-y-2">
                    <Label className="text-xs font-medium">Modo de Acesso</Label>
                    <Select value={mode} onValueChange={(v) => setMode(v as any)}>
                      <SelectTrigger className="h-8 text-xs border-amber-500/20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unlimited">
                          <span className="flex items-center gap-1.5">
                            <Infinity className="w-3 h-3" /> Uso liberado (sem data final)
                          </span>
                        </SelectItem>
                        <SelectItem value="timed">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-3 h-3" /> Com data de expiração
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {mode === "timed" && (
                    <div className="space-y-1">
                      <Label className="text-xs">Data de Expiração</Label>
                      <Input
                        type="date"
                        value={expiry}
                        onChange={(e) => setExpiry(e.target.value)}
                        min={new Date().toISOString().split("T")[0]}
                        className="h-8 text-xs border-amber-500/20"
                      />
                    </div>
                  )}

                  <Button
                    size="sm"
                    onClick={handleSaveConfig}
                    disabled={saving || (mode === "timed" && !expiry)}
                    className="w-full h-7 text-xs gap-1 bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-amber-950 font-semibold"
                  >
                    {saving ? "Salvando..." : "Salvar Configuração de Acesso"}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
