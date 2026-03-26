/**
 * Intelligence Active Users — Full patient list with IFJ ON/OFF toggle
 * Shows ALL active patients (not just those with IFJ enabled) for quick activation
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Brain, Loader2, Users, Search, CheckCircle2, XCircle, Settings2, Bell, Send } from "lucide-react";
import { toast } from "sonner";
import IFJPermissionsModal from "../IFJPermissionsModal";

interface PatientIFJ {
  patient_id: string;
  full_name: string;
  ifj_enabled: boolean;
  ifj_mode: string;
}

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
      // Get active patients
      let patientQuery = supabase
        .from("nutritionist_patients")
        .select("patient_id")
        .eq("status", "active");

      if (!isAdmin) {
        patientQuery = patientQuery.eq("nutritionist_id", user.id);
      }

      const { data: links } = await patientQuery;
      if (!links || links.length === 0) {
        setPatients([]);
        setLoading(false);
        return;
      }

      const patientIds = links.map(l => l.patient_id);

      // Get profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", patientIds);

      // Get IFJ permissions
      const { data: perms } = await supabase
        .from("ifj_patient_permissions" as any)
        .select("patient_id, meal_plan, ifj_mode")
        .in("patient_id", patientIds);

      const permsMap = new Map((perms || []).map((p: any) => [p.patient_id, p]));

      const result: PatientIFJ[] = (profiles || []).map((p: any) => {
        const perm = permsMap.get(p.user_id) as any;
        return {
          patient_id: p.user_id,
          full_name: p.full_name || "Paciente",
          ifj_enabled: perm ? perm.meal_plan !== false : false, // if no permission record, IFJ is OFF
          ifj_mode: perm?.ifj_mode || "standard",
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
      const payload: any = {
        patient_id: patientId,
        meal_plan: enable,
        recipes: enable,
        checklist: enable,
        hydration: enable,
        progress: enable,
        appointments: enable,
        substitutions: enable,
        messages: enable,
        recommendations: enable,
        ifj_mode: "standard",
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("ifj_patient_permissions" as any)
        .upsert(payload as any, { onConflict: "patient_id" });

      if (error) throw error;

      setPatients(prev => prev.map(p =>
        p.patient_id === patientId ? { ...p, ifj_enabled: enable } : p
      ));

      toast.success(enable ? "IFJ ativado ✓" : "IFJ desativado");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao atualizar IFJ");
    }
    setTogglingId(null);
  };

  const bulkToggle = async (enable: boolean) => {
    const filtered = getFiltered();
    for (const p of filtered) {
      if (p.ifj_enabled !== enable) {
        await toggleIFJ(p.patient_id, enable);
      }
    }
    toast.success(enable ? `IFJ ativado para ${filtered.length} pacientes` : `IFJ desativado para ${filtered.length} pacientes`);
  };

  const getFiltered = () => {
    let list = patients;
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(p => p.full_name.toLowerCase().includes(s));
    }
    if (filter === "on") list = list.filter(p => p.ifj_enabled);
    if (filter === "off") list = list.filter(p => !p.ifj_enabled);
    return list;
  };

  const filtered = getFiltered();
  const enabledCount = patients.filter(p => p.ifj_enabled).length;
  const disabledCount = patients.length - enabledCount;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-card p-3 flex items-center gap-2.5">
          <Users className="w-5 h-5 text-amber-500" />
          <div>
            <p className="text-lg font-bold">{patients.length}</p>
            <p className="text-[10px] text-muted-foreground">Total Ativos</p>
          </div>
        </div>
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 flex items-center gap-2.5">
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          <div>
            <p className="text-lg font-bold text-emerald-500">{enabledCount}</p>
            <p className="text-[10px] text-muted-foreground">IFJ ON</p>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 flex items-center gap-2.5">
          <XCircle className="w-5 h-5 text-muted-foreground" />
          <div>
            <p className="text-lg font-bold">{disabledCount}</p>
            <p className="text-[10px] text-muted-foreground">IFJ OFF</p>
          </div>
        </div>
      </div>

      {/* Search + Filter + Bulk */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar paciente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 border-amber-500/20"
          />
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
          <SelectTrigger className="w-[140px] border-amber-500/20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="on">IFJ ON</SelectItem>
            <SelectItem value="off">IFJ OFF</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" className="text-xs border-emerald-500/20 text-emerald-600 hover:bg-emerald-500/10" onClick={() => bulkToggle(true)}>
            Ativar todos
          </Button>
          <Button variant="outline" size="sm" className="text-xs border-border hover:bg-muted" onClick={() => bulkToggle(false)}>
            Desativar todos
          </Button>
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
            {filtered.map((p) => (
              <div
                key={p.patient_id}
                className="flex items-center justify-between p-3 rounded-xl bg-card border border-border hover:border-amber-500/20 transition-all"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                      p.ifj_enabled
                        ? "bg-gradient-to-br from-amber-500/20 to-yellow-500/10"
                        : "bg-muted"
                    }`}
                  >
                    <Brain className={`w-4 h-4 ${p.ifj_enabled ? "text-amber-500" : "text-muted-foreground"}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{p.full_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {p.ifj_enabled && (
                        <Badge className="bg-amber-500/10 text-amber-500 text-[9px] px-1.5 py-0">
                          {p.ifj_mode === "premium" ? "Premium" : p.ifj_mode === "basic" ? "Básico" : "Padrão"}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {p.ifj_enabled && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-[10px] text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 px-2"
                      onClick={() => {
                        setSelectedPatient({ id: p.patient_id, name: p.full_name });
                        setPermModalOpen(true);
                      }}
                    >
                      <Settings2 className="w-3 h-3 mr-1" /> Permissões
                    </Button>
                  )}
                  <Switch
                    checked={p.ifj_enabled}
                    disabled={togglingId === p.patient_id}
                    onCheckedChange={(v) => toggleIFJ(p.patient_id, v)}
                  />
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Permissions Modal */}
      {selectedPatient && (
        <IFJPermissionsModal
          open={permModalOpen}
          onOpenChange={setPermModalOpen}
          patientId={selectedPatient.id}
          patientName={selectedPatient.name}
        />
      )}
    </div>
  );
}
