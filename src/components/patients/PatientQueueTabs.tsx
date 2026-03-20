import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Clock, CreditCard, Play, CheckCircle2, Activity,
  UserCheck, Loader2, Rocket
} from "lucide-react";
import OnboardingReleaseDialog from "@/components/patient/OnboardingReleaseDialog";

interface QueuePatient {
  id: string;
  patient_id: string;
  nutritionist_id: string;
  journey_status: string;
  created_at: string;
  profile: { full_name: string; avatar_url: string | null; phone: string | null } | null;
}

const QUEUE_TABS = [
  { value: "awaiting_payment", label: "Aguardando Pgto", icon: CreditCard, color: "text-warning" },
  { value: "awaiting_onboarding_release", label: "Aguardando Liberação", icon: Clock, color: "text-blue-500" },
  { value: "onboarding_active", label: "Onboarding Ativo", icon: Play, color: "text-primary" },
  { value: "lead_created", label: "Leads", icon: UserCheck, color: "text-muted-foreground" },
];

export default function PatientQueueTabs() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("awaiting_payment");
  const [patients, setPatients] = useState<QueuePatient[]>([]);
  const [loading, setLoading] = useState(false);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [releasePatientId, setReleasePatientId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchCounts();
    fetchPatients(tab);
  }, [user, tab]);

  const fetchCounts = async () => {
    if (!user) return;
    const statuses = ["awaiting_payment", "awaiting_onboarding_release", "onboarding_active", "lead_created"];
    const results: Record<string, number> = {};
    await Promise.all(
      statuses.map(async (s) => {
        const { count } = await supabase
          .from("nutritionist_patients")
          .select("id", { count: "exact", head: true })
          .eq("nutritionist_id", user.id)
          .eq("journey_status", s as any);
        results[s] = count || 0;
      })
    );
    setCounts(results);
  };

  const fetchPatients = async (status: string) => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("nutritionist_patients")
      .select("id, patient_id, nutritionist_id, journey_status, created_at")
      .eq("nutritionist_id", user.id)
      .eq("journey_status", status as any)
      .order("created_at", { ascending: false })
      .limit(50);

    if (data && data.length > 0) {
      const patientIds = data.map(d => d.patient_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, phone")
        .in("user_id", patientIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      setPatients(data.map(d => ({
        ...d,
        profile: profileMap.get(d.patient_id) || null,
      })));
    } else {
      setPatients([]);
    }
    setLoading(false);
  };

  const handleReleaseOnboarding = async (patientId: string) => {
    setReleasePatientId(patientId);
  };

  const handleQuickRelease = async (patientId: string) => {
    if (!user) return;
    await supabase
      .from("nutritionist_patients")
      .update({ journey_status: "onboarding_active" } as any)
      .eq("patient_id", patientId)
      .eq("nutritionist_id", user.id);

    // Also update onboarding pipeline if exists
    await supabase
      .from("onboarding_pipelines")
      .update({ release_status: "released", released_at: new Date().toISOString(), released_by: user.id } as any)
      .eq("patient_id", patientId)
      .eq("nutritionist_id", user.id);

    // Notify patient
    await supabase.from("notifications").insert({
      user_id: patientId,
      title: "Onboarding liberado!",
      message: "Seu profissional liberou seu acesso ao onboarding. Comece agora!",
      type: "onboarding_released",
      entity_type: "onboarding",
      target_route: "/onboarding",
    } as any);

    toast.success("Onboarding liberado com sucesso!");
    fetchCounts();
    fetchPatients(tab);
  };

  const totalPending = Object.values(counts).reduce((a, b) => a + b, 0);

  if (totalPending === 0) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Rocket className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-foreground">Fila de Pacientes</h3>
        <Badge variant="secondary" className="text-xs">{totalPending}</Badge>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v)}>
        <TabsList className="w-full justify-start bg-muted/50 overflow-x-auto">
          {QUEUE_TABS.map(t => (
            <TabsTrigger key={t.value} value={t.value} className="gap-1.5 text-xs">
              <t.icon className={`w-3.5 h-3.5 ${t.color}`} />
              {t.label}
              {(counts[t.value] || 0) > 0 && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-1">{counts[t.value]}</Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {QUEUE_TABS.map(t => (
          <TabsContent key={t.value} value={t.value} className="mt-3">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : patients.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhum paciente nesta fila</p>
            ) : (
              <div className="space-y-2">
                {patients.map((p, idx) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-accent/5 transition-all"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-primary">
                        {p.profile?.full_name?.[0]?.toUpperCase() || "?"}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground truncate">
                        {p.profile?.full_name || "Paciente"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(p.created_at).toLocaleDateString("pt-BR")}
                        {p.profile?.phone && ` · ${p.profile.phone}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {(tab === "awaiting_payment" || tab === "awaiting_onboarding_release" || tab === "lead_created") && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => { e.stopPropagation(); handleQuickRelease(p.patient_id); }}
                          className="text-xs gap-1"
                        >
                          <Play className="w-3 h-3" /> Liberar
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => navigate(`/patients/${p.patient_id}`)}
                        className="text-xs"
                      >
                        Ver
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {releasePatientId && (
        <OnboardingReleaseDialog
          patientId={releasePatientId}
          patientName={patients.find(p => p.patient_id === releasePatientId)?.profile?.full_name || "Paciente"}
          open={!!releasePatientId}
          onOpenChange={(open) => !open && setReleasePatientId(null)}
          onReleased={() => { setReleasePatientId(null); fetchCounts(); fetchPatients(tab); }}
        />
      )}
    </div>
  );
}
