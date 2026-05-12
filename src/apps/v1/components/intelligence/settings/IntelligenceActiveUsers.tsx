/**
 * Intelligence Active Users — Full patient list with IFJ control
 * Badges: IFJ ON/OFF, mode, customized indicator
 * Auto-creates default permissions on toggle ON
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@v1/integrations/supabase/client";
import { useAuth } from "@v1/lib/auth";
import { Badge } from "@v1/components/ui/badge";
import { Button } from "@v1/components/ui/button";
import { Switch } from "@v1/components/ui/switch";
import { Input } from "@v1/components/ui/input";
import { ScrollArea } from "@v1/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@v1/components/ui/select";
import { Brain, Loader2, Users, Search, CheckCircle2, XCircle, Settings2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import IFJPermissionsModal from "../IFJPermissionsModal";

interface PatientIFJ {
  patient_id: string;
  full_name: string;
  ifj_enabled: boolean;
  ifj_mode: string;
  is_customized: boolean;
}

const DEFAULT_PERMS_ALL_ON = {
  meal_plan: true, recipes: true, checklist: true, hydration: true,
  progress: true, appointments: true, substitutions: true, messages: true, recommendations: true,
};

export default function IntelligenceActiveUsers() {
  const { user, roles } = useAuth();
  const [patients, setPatients] = useState<PatientIFJ[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "on" | "off">("all");
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [permModalOpen, setPermModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<{ id: string; name: string } | null>(null);

  const isAdmin = roles?.includes("admin");

  const loadPatients = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      let patientQuery = supabase
        .from("nutritionist_patients")
        .select("patient_id")
        .eq("status", "active");
      if (!isAdmin) patientQuery = patientQuery.eq("nutritionist_id", user.id);

      const { data: links } = await patientQuery;
      if (!links || links.length === 0) { setPatients([]); setLoading(false); return; }

      const patientIds = links.map(l => l.patient_id);

      const [{ data: profiles }, { data: perms }] = await Promise.all([
        supabase.from("profiles").select("user_id, full_name").in("user_id", patientIds),
        supabase.from("ifj_patient_permissions" as any).select("*").in("patient_id", patientIds),
      ]);

      const permsMap = new Map((perms || []).map((p: any) => [p.patient_id, p]));

      const result: PatientIFJ[] = (profiles || []).map((p: any) => {
        const perm = permsMap.get(p.user_id) as any;
        const hasRecord = !!perm;
        const allOn = hasRecord && Object.keys(DEFAULT_PERMS_ALL_ON).every(k => perm[k] !== false);
        const isCustomized = hasRecord && !allOn;
        return {
          patient_id: p.user_id,
          full_name: p.full_name || "Paciente",
          ifj_enabled: hasRecord && perm.meal_plan !== false,
          ifj_mode: perm?.ifj_mode || "standard",
          is_customized: isCustomized,
        };
      }).sort((a, b) => a.full_name.localeCompare(b.full_name));

      setPatients(result);
    } catch (e) {
      console.error("Error loading patients:", e);
    }
    setLoading(false);
  }, [user, isAdmin]);

  useEffect(() => { loadPatients(); }, [loadPatients]);

  const toggleIFJ = async (patientId: string, enable: boolean) => {
    setTogglingId(patientId);
    try {
      if (enable) {
        // Auto-create default permissions record
        const payload: any = {
          patient_id: patientId,
          ...DEFAULT_PERMS_ALL_ON,
          ifj_mode: "standard",
          updated_at: new Date().toISOString(),
        };
        const { error } = await supabase
          .from("ifj_patient_permissions" as any)
          .upsert(payload as any, { onConflict: "patient_id" });
        if (error) throw error;
      } else {
        // Disable: set all permissions to false
        const payload: any = {
          patient_id: patientId,
          meal_plan: false, recipes: false, checklist: false, hydration: false,
          progress: false, appointments: false, substitutions: false, messages: false, recommendations: false,
          updated_at: new Date().toISOString(),
        };
        const { error } = await supabase
          .from("ifj_patient_permissions" as any)
          .upsert(payload as any, { onConflict: "patient_id" });
        if (error) throw error;
      }

      // Also update profiles.fit_intelligence_enabled for frontend guards
      await supabase.from("profiles").update({ fit_intelligence_enabled: enable } as any).eq("user_id", patientId);

      setPatients(prev => prev.map(p =>
        p.patient_id === patientId ? { ...p, ifj_enabled: enable, ifj_mode: enable ? "standard" : p.ifj_mode } : p
      ));
      toast.success(enable ? "IFJ ativado ✓" : "IFJ desativado");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao atualizar IFJ");
    }
    setTogglingId(null);
  };

  const bulkToggle = async (enable: boolean) => {
    const targets = getFiltered().filter(p => p.ifj_enabled !== enable);
    if (!targets.length) return;
    for (const p of targets) await toggleIFJ(p.patient_id, enable);
    toast.success(`${targets.length} paciente(s) ${enable ? "ativados" : "desativados"}`);
  };

  const getFiltered = () => {
    let list = patients;
    if (search) { const s = search.toLowerCase(); list = list.filter(p => p.full_name.toLowerCase().includes(s)); }
    if (filter === "on") list = list.filter(p => p.ifj_enabled);
    if (filter === "off") list = list.filter(p => !p.ifj_enabled);
    return list;
  };

  const filtered = getFiltered();
  const enabledCount = patients.filter(p => p.ifj_enabled).length;

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-amber-500" /></div>;

  const getModeLabel = (mode: string) => {
    switch (mode) {
      case "premium": return { label: "Premium", class: "bg-purple-500/10 text-purple-400 border-purple-500/30" };
      case "basic": return { label: "Básico", class: "bg-blue-500/10 text-blue-400 border-blue-500/30" };
      default: return { label: "Padrão", class: "bg-amber-500/10 text-amber-400 border-amber-500/30" };
    }
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-card p-3 flex items-center gap-2.5">
          <Users className="w-5 h-5 text-amber-500" />
          <div><p className="text-lg font-bold">{patients.length}</p><p className="text-[10px] text-muted-foreground">Total Ativos</p></div>
        </div>
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 flex items-center gap-2.5">
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          <div><p className="text-lg font-bold text-emerald-500">{enabledCount}</p><p className="text-[10px] text-muted-foreground">IFJ ON</p></div>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 flex items-center gap-2.5">
          <XCircle className="w-5 h-5 text-muted-foreground" />
          <div><p className="text-lg font-bold">{patients.length - enabledCount}</p><p className="text-[10px] text-muted-foreground">IFJ OFF</p></div>
        </div>
      </div>

      {/* Search + Filter + Bulk */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar paciente..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 border-amber-500/20" />
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
          <SelectTrigger className="w-[140px] border-amber-500/20"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="on">IFJ ON</SelectItem>
            <SelectItem value="off">IFJ OFF</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" className="text-xs border-emerald-500/20 text-emerald-600 hover:bg-emerald-500/10" onClick={() => bulkToggle(true)}>Ativar todos</Button>
          <Button variant="outline" size="sm" className="text-xs border-border hover:bg-muted" onClick={() => bulkToggle(false)}>Desativar todos</Button>
        </div>
      </div>

      {/* Patient List */}
      {patients.length === 0 ? (
        <div className="text-center py-12">
          <Brain className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">Nenhum paciente ativo encontrado</p>
        </div>
      ) : (
        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-1">
            {filtered.map((p) => {
              const modeInfo = getModeLabel(p.ifj_mode);
              return (
                <div key={p.patient_id} className="flex items-center justify-between p-3 rounded-xl bg-card border border-border hover:border-amber-500/20 transition-all group">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${p.ifj_enabled ? "bg-gradient-to-br from-amber-500/20 to-yellow-500/10" : "bg-muted"}`}>
                      <Brain className={`w-4 h-4 ${p.ifj_enabled ? "text-amber-500" : "text-muted-foreground"}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{p.full_name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        {/* IFJ ON/OFF badge */}
                        <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${p.ifj_enabled ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10" : "border-red-500/30 text-red-400 bg-red-500/10"}`}>
                          {p.ifj_enabled ? "IFJ ON" : "IFJ OFF"}
                        </Badge>
                        {/* Mode badge */}
                        {p.ifj_enabled && (
                          <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${modeInfo.class}`}>
                            {modeInfo.label}
                          </Badge>
                        )}
                        {/* Customized badge */}
                        {p.ifj_enabled && p.is_customized && (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-orange-500/30 text-orange-400 bg-orange-500/10">
                            <Sparkles className="w-2.5 h-2.5 mr-0.5" /> Custom
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {p.ifj_enabled && (
                      <Button variant="ghost" size="sm" className="h-7 text-[10px] text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 px-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => { setSelectedPatient({ id: p.patient_id, name: p.full_name }); setPermModalOpen(true); }}>
                        <Settings2 className="w-3 h-3 mr-1" /> Config
                      </Button>
                    )}
                    <Switch checked={p.ifj_enabled} disabled={togglingId === p.patient_id} onCheckedChange={(v) => toggleIFJ(p.patient_id, v)} />
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}

      {selectedPatient && (
        <IFJPermissionsModal open={permModalOpen} onOpenChange={(o) => { setPermModalOpen(o); if (!o) loadPatients(); }} patientId={selectedPatient.id} patientName={selectedPatient.name} />
      )}
    </div>
  );
}
