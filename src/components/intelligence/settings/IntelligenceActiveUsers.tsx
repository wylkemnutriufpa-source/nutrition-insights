/**
 * Intelligence Active Users — Shows which patients currently have IFJ enabled
 * and their engagement status for controlled rollout feedback.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Brain, Clock, CheckCircle2, AlertCircle, Loader2, Users } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ActiveUser {
  user_id: string;
  full_name: string;
  enabled: boolean;
  onboarded: boolean;
  firstExperienceSeen: boolean;
  accessMode: string | null;
  expiresAt: string | null;
  lastSeenAt: string | null;
}

export default function IntelligenceActiveUsers() {
  const { user } = useAuth();
  const [users, setUsers] = useState<ActiveUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    loadActiveUsers();
  }, [user?.id]);

  async function loadActiveUsers() {
    setLoading(true);

    // Get patients linked to this nutritionist
    const { data: links } = await supabase
      .from("nutritionist_patients")
      .select("patient_id")
      .eq("nutritionist_id", user!.id)
      .eq("status", "active");

    if (!links || links.length === 0) {
      setUsers([]);
      setLoading(false);
      return;
    }

    const patientIds = links.map((l) => l.patient_id);

    // Get profiles with IFJ fields
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, fit_intelligence_enabled, fit_intelligence_onboarded, fit_intelligence_first_experience_seen, fit_intelligence_access_mode, fit_intelligence_expires_at, fit_intelligence_last_seen_at")
      .in("user_id", patientIds);

    // Also get patients with active premium prestige (Premium plan = display_order >= 4)
    const { data: prestigeData } = await supabase
      .from("patient_prestige")
      .select("patient_id, plan_id")
      .in("patient_id", patientIds)
      .eq("is_active", true);

    const { data: premiumPlans } = await supabase
      .from("prestige_plans")
      .select("id, name, display_order")
      .gte("display_order", 4);

    const premiumPlanIds = new Set((premiumPlans || []).map((p: any) => p.id));
    const premiumPatientIds = new Set(
      (prestigeData || [])
        .filter((pp: any) => premiumPlanIds.has(pp.plan_id))
        .map((pp: any) => pp.patient_id)
    );

    const result: ActiveUser[] = (profiles || [])
      .filter((p: any) => p.fit_intelligence_enabled === true || premiumPatientIds.has(p.user_id))
      .map((p: any) => ({
        user_id: p.user_id,
        full_name: p.full_name || "Paciente",
        enabled: p.fit_intelligence_enabled || premiumPatientIds.has(p.user_id),
        onboarded: p.fit_intelligence_onboarded || false,
        firstExperienceSeen: p.fit_intelligence_first_experience_seen || false,
        accessMode: p.fit_intelligence_access_mode,
        expiresAt: p.fit_intelligence_expires_at,
        lastSeenAt: p.fit_intelligence_last_seen_at,
      }));

    setUsers(result);
    setLoading(false);
  }

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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard
          icon={<Users className="w-5 h-5 text-amber-500" />}
          label="Total Ativos"
          value={users.length}
        />
        <SummaryCard
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-500" />}
          label="Onboarding OK"
          value={users.filter((u) => u.onboarded).length}
        />
        <SummaryCard
          icon={<Brain className="w-5 h-5 text-primary" />}
          label="Experiência Vista"
          value={users.filter((u) => u.firstExperienceSeen).length}
        />
        <SummaryCard
          icon={<AlertCircle className="w-5 h-5 text-amber-400" />}
          label="Pendente Wizard"
          value={users.filter((u) => !u.onboarded).length}
        />
      </div>

      {users.length === 0 ? (
        <div className="text-center py-12">
          <Brain className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">
            Nenhum paciente com Inteligência FitJourney ativa
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Ative no perfil do paciente → aba Prestígio
          </p>
        </div>
      ) : (
        <ScrollArea className="max-h-[65vh]">
          <div className="space-y-2">
            {users.map((u) => {
              const isExpired = u.expiresAt && new Date(u.expiresAt) < new Date();
              return (
                <div
                  key={u.user_id}
                  className="flex items-center justify-between p-3 rounded-xl bg-card border border-border hover:border-amber-500/20 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                      style={{
                        background: u.onboarded
                          ? "linear-gradient(135deg, hsl(45 80% 50% / 0.15), hsl(45 80% 50% / 0.05))"
                          : "hsl(var(--muted))",
                      }}
                    >
                      <Brain
                        className={`w-5 h-5 ${u.onboarded ? "text-amber-500" : "text-muted-foreground"}`}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{u.full_name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {u.lastSeenAt && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Último: {format(new Date(u.lastSeenAt), "dd/MM HH:mm", { locale: ptBR })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {u.onboarded ? (
                      <Badge className="bg-emerald-500/10 text-emerald-500 text-[10px]">
                        Ativo
                      </Badge>
                    ) : u.firstExperienceSeen ? (
                      <Badge className="bg-amber-500/10 text-amber-500 text-[10px]">
                        Wizard pendente
                      </Badge>
                    ) : (
                      <Badge className="bg-muted text-muted-foreground text-[10px]">
                        Aguardando
                      </Badge>
                    )}
                    {isExpired && (
                      <Badge variant="destructive" className="text-[10px]">
                        Expirado
                      </Badge>
                    )}
                    {u.accessMode === "timed" && u.expiresAt && !isExpired && (
                      <span className="text-[10px] text-muted-foreground">
                        até {format(new Date(u.expiresAt), "dd/MM/yy")}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="glass rounded-xl p-3 flex items-center gap-2.5">
      {icon}
      <div>
        <p className="text-lg font-bold">{value}</p>
        <p className="text-[10px] text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
