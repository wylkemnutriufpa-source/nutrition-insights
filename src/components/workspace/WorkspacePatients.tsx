import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, ExternalLink, Brain, Settings2, Loader2, CheckCheck, XCircle } from "lucide-react";
import { toast } from "sonner";
import IFJPermissionsModal from "@/components/intelligence/IFJPermissionsModal";

interface Props { search: string; }

export default function WorkspacePatients({ search }: Props) {
  const { user } = useAuth();
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [ifjFilter, setIfjFilter] = useState<"all" | "on" | "off">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [permModalPatient, setPermModalPatient] = useState<{ id: string; name: string } | null>(null);

  const fetchPatients = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from("nutritionist_patients")
      .select("patient_id, status, journey_status, profiles!nutritionist_patients_patient_id_fkey(full_name, phone, fit_intelligence_enabled)")
      .eq("nutritionist_id", user.id)
      .eq("status", "active");
    setPatients(data || []);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { fetchPatients(); }, [fetchPatients]);

  const filtered = patients.filter((p: any) => {
    const profile = p.profiles as any;
    const name = profile?.full_name || "";
    if (search && !name.toLowerCase().includes(search.toLowerCase())) return false;
    if (ifjFilter === "on" && !profile?.fit_intelligence_enabled) return false;
    if (ifjFilter === "off" && profile?.fit_intelligence_enabled) return false;
    return true;
  });

  const toggleIFJ = async (patientId: string, enabled: boolean) => {
    // Optimistic update
    setPatients(prev => prev.map(p => {
      if (p.patient_id === patientId) {
        return { ...p, profiles: { ...(p.profiles as any), fit_intelligence_enabled: enabled } };
      }
      return p;
    }));

    const { error } = await supabase
      .from("profiles")
      .update({ fit_intelligence_enabled: enabled } as any)
      .eq("user_id", patientId);

    if (error) {
      toast.error("Erro ao atualizar IFJ");
      fetchPatients(); // revert
    } else {
      toast.success(enabled ? "IFJ ativada ✓" : "IFJ desativada");
    }
  };

  const handleBulkToggle = async (enable: boolean) => {
    if (selected.size === 0) return;
    setBulkLoading(true);
    const ids = Array.from(selected);

    // Optimistic
    setPatients(prev => prev.map(p => {
      if (ids.includes(p.patient_id)) {
        return { ...p, profiles: { ...(p.profiles as any), fit_intelligence_enabled: enable } };
      }
      return p;
    }));

    const promises = ids.map(id =>
      supabase.from("profiles").update({ fit_intelligence_enabled: enable } as any).eq("user_id", id)
    );
    const results = await Promise.all(promises);
    const errors = results.filter(r => r.error);

    if (errors.length > 0) {
      toast.error(`${errors.length} erro(s) ao atualizar`);
      fetchPatients();
    } else {
      toast.success(`${ids.length} paciente(s) ${enable ? "ativados" : "desativados"} ✓`);
    }
    setSelected(new Set());
    setBulkLoading(false);
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const selectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(p => p.patient_id)));
    }
  };

  if (loading) return <div className="text-sm text-muted-foreground py-8 text-center">Carregando pacientes...</div>;

  return (
    <div className="space-y-3">
      {/* Header & Controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">{filtered.length} pacientes ativos</p>
          <Select value={ifjFilter} onValueChange={(v) => setIfjFilter(v as any)}>
            <SelectTrigger className="h-7 w-[130px] text-xs border-amber-500/20">
              <Brain className="h-3 w-3 mr-1 text-amber-500" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="on">IFJ ON</SelectItem>
              <SelectItem value="off">IFJ OFF</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <>
              <span className="text-xs text-muted-foreground">{selected.size} selecionado(s)</span>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-green-500/30 text-green-500 hover:bg-green-500/10"
                onClick={() => handleBulkToggle(true)} disabled={bulkLoading}>
                {bulkLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCheck className="h-3 w-3" />}
                Liberar IFJ
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-red-500/30 text-red-500 hover:bg-red-500/10"
                onClick={() => handleBulkToggle(false)} disabled={bulkLoading}>
                <XCircle className="h-3 w-3" /> Bloquear IFJ
              </Button>
            </>
          )}
          <Link to="/invite-patient">
            <Button size="sm" variant="outline" className="gap-1.5">
              <UserPlus className="w-4 h-4" /> Convidar
            </Button>
          </Link>
        </div>
      </div>

      {/* Select All */}
      {filtered.length > 0 && (
        <div className="flex items-center gap-2 px-1">
          <Checkbox
            checked={selected.size === filtered.length && filtered.length > 0}
            onCheckedChange={selectAll}
            className="h-3.5 w-3.5"
          />
          <span className="text-[10px] text-muted-foreground">Selecionar todos</span>
        </div>
      )}

      {/* Patient List */}
      <div className="grid gap-2">
        {filtered.map((p: any) => {
          const profile = p.profiles as any;
          const name = profile?.full_name || "Sem nome";
          const initials = name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
          const status = (p as any).journey_status || "unknown";
          const ifjEnabled = profile?.fit_intelligence_enabled || false;

          return (
            <div
              key={p.patient_id}
              className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/30 transition-all group"
            >
              {/* Checkbox */}
              <Checkbox
                checked={selected.has(p.patient_id)}
                onCheckedChange={() => toggleSelect(p.patient_id)}
                className="h-3.5 w-3.5 shrink-0"
              />

              {/* Avatar + Info (link) */}
              <Link to={`/patients/${p.patient_id}`} className="flex items-center gap-3 flex-1 min-w-0">
                <Avatar className="w-9 h-9">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{name}</p>
                  <p className="text-xs text-muted-foreground">{profile?.phone || "Sem telefone"}</p>
                </div>
              </Link>

              {/* Status Badge */}
              <Badge variant="outline" className="text-[10px] shrink-0">
                {status.replace(/_/g, " ")}
              </Badge>

              {/* IFJ Toggle */}
              <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                <Brain className={`h-3.5 w-3.5 ${ifjEnabled ? "text-amber-500" : "text-muted-foreground/40"}`} />
                <Switch
                  checked={ifjEnabled}
                  onCheckedChange={(v) => toggleIFJ(p.patient_id, v)}
                  className="scale-75"
                />
              </div>

              {/* Config button */}
              <Button
                variant="ghost" size="icon"
                className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => { e.stopPropagation(); setPermModalPatient({ id: p.patient_id, name }); }}
              >
                <Settings2 className="h-3.5 w-3.5 text-amber-500/70" />
              </Button>

              <Link to={`/patients/${p.patient_id}`} className="shrink-0">
                <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum paciente encontrado</p>
        )}
      </div>

      {/* Permissions Modal */}
      {permModalPatient && (
        <IFJPermissionsModal
          open={!!permModalPatient}
          onOpenChange={(o) => { if (!o) setPermModalPatient(null); }}
          patientId={permModalPatient.id}
          patientName={permModalPatient.name}
        />
      )}
    </div>
  );
}
