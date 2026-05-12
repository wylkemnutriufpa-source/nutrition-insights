import { useState, useMemo } from "react";
import { useAuth } from "@v1/lib/auth";
import { supabase } from "@v1/integrations/supabase/client";
import DashboardLayout from "@v1/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@v1/components/ui/card";
import { Button } from "@v1/components/ui/button";
import { Badge } from "@v1/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@v1/components/ui/tabs";
import { Textarea } from "@v1/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@v1/components/ui/dialog";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Heart, Users, TrendingUp, AlertTriangle, UserCheck, UserX,
  MessageSquare, Star, Target, ArrowRight, Clock, Zap,
  BarChart3, Shield, Rocket, Eye, ChevronRight
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

const PIPELINE_STAGES = [
  { key: "lead_created", label: "Lead", icon: Users, color: "border-blue-500/30 bg-blue-500/5" },
  { key: "onboarding_active", label: "Onboarding", icon: Rocket, color: "border-purple-500/30 bg-purple-500/5" },
  { key: "clinical_followup_active", label: "Acompanhamento", icon: Target, color: "border-emerald-500/30 bg-emerald-500/5" },
  { key: "retention_risk", label: "Em Risco", icon: AlertTriangle, color: "border-amber-500/30 bg-amber-500/5" },
  { key: "inactive", label: "Inativo", icon: UserX, color: "border-red-500/30 bg-red-500/5" },
];

const ENGAGEMENT_COLORS: Record<string, string> = {
  engaged: "bg-emerald-500/10 text-emerald-600",
  stable: "bg-blue-500/10 text-blue-600",
  attention: "bg-amber-500/10 text-amber-600",
  high_risk: "bg-red-500/10 text-red-600",
};

interface CRMPatient {
  id: string;
  patient_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
  created_at: string;
}

export default function ClinicalCRM() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [tab, setTab] = useState("pipeline");
  const [noteDialog, setNoteDialog] = useState<{ patientId: string; name: string } | null>(null);
  const [noteText, setNoteText] = useState("");

  // Fetch real patients via nutritionist_patients + profiles
  const { data: patients = [] } = useQuery({
    queryKey: ["crm-patients", user?.id],
    queryFn: async (): Promise<CRMPatient[]> => {
      if (!user) return [];
      const { data: npData } = await supabase
        .from("nutritionist_patients")
        .select("id, patient_id, status, created_at, notes")
        .eq("nutritionist_id", user.id)
        .order("created_at", { ascending: false });

      if (!npData || npData.length === 0) return [];

      const patientIds = npData.map(np => np.patient_id);
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, full_name, phone")
        .in("user_id", patientIds);

      const profileMap = new Map((profilesData || []).map(p => [p.user_id, p]));

      return npData.map(np => {
        const profile = profileMap.get(np.patient_id);
        return {
          id: np.id,
          patient_id: np.patient_id,
          name: profile?.full_name || "Paciente",
          email: null,
          phone: profile?.phone || null,
          status: np.status || "lead_created",
          created_at: np.created_at,
        };
      });
    },
    enabled: !!user,
  });

  const { data: scores = [] } = useQuery({
    queryKey: ["crm-scores", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const patientIds = patients.map(p => p.patient_id);
      if (patientIds.length === 0) return [];
      const { data } = await supabase
        .from("patient_relationship_scores")
        .select("*")
        .in("patient_id", patientIds);
      return data || [];
    },
    enabled: !!user && patients.length > 0,
  });

  const { data: notes = [] } = useQuery({
    queryKey: ["crm-notes", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("relationship_notes")
        .select("*")
        .eq("professional_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!user,
  });

  const getScore = (patientId: string) => scores.find((s: any) => s.patient_id === patientId);

  const pipelineData = useMemo(() => {
    const stages: Record<string, CRMPatient[]> = {};
    PIPELINE_STAGES.forEach(s => { stages[s.key] = []; });
    patients.forEach((p) => {
      const stageKey = PIPELINE_STAGES.find(s => s.key === p.status)?.key || "lead_created";
      stages[stageKey]?.push(p);
    });
    return stages;
  }, [patients]);

  const smartLists = useMemo(() => ({
    atRisk: patients.filter((p) => {
      const sc = getScore(p.patient_id);
      return sc && (sc.engagement_level === "high_risk" || sc.engagement_level === "attention");
    }),
    highPerformers: patients.filter((p) => {
      const sc = getScore(p.patient_id);
      return sc && (sc.relationship_score ?? 0) >= 80;
    }),
    upgradeReady: patients.filter((p) => {
      const sc = getScore(p.patient_id);
      return sc && (sc.upgrade_moment_score ?? 0) >= 70;
    }),
    newPatients: patients.filter((p) => {
      const created = new Date(p.created_at);
      return (Date.now() - created.getTime()) < 14 * 24 * 60 * 60 * 1000;
    }),
  }), [patients, scores]);

  const saveNote = async () => {
    if (!noteDialog || !noteText || !user) return;
    const { error } = await supabase.from("relationship_notes").insert({
      patient_id: noteDialog.patientId,
      professional_id: user.id,
      note: noteText,
    });
    if (error) {
      toast.error("Erro ao salvar nota");
      return;
    }
    toast.success("Nota salva!");
    queryClient.invalidateQueries({ queryKey: ["crm-notes"] });
    setNoteDialog(null);
    setNoteText("");
  };

  const goToPatient = (patientId: string) => {
    navigate(`/patients/${patientId}`);
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
              <Heart className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold">CRM Clínico</h1>
              <p className="text-sm text-muted-foreground">Gestão de relacionamento terapêutico</p>
            </div>
          </div>
        </motion.div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Pacientes", value: patients.length, icon: Users, color: "text-primary" },
            { label: "Em Risco", value: smartLists.atRisk.length, icon: AlertTriangle, color: "text-amber-500" },
            { label: "Alta Performance", value: smartLists.highPerformers.length, icon: Star, color: "text-emerald-500" },
            { label: "Prontos p/ Upgrade", value: smartLists.upgradeReady.length, icon: TrendingUp, color: "text-purple-500" },
          ].map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <stat.icon className={`w-8 h-8 ${stat.color}`} />
                    <div>
                      <p className="text-2xl font-bold">{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid grid-cols-3 w-full max-w-md">
            <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
            <TabsTrigger value="lists">Listas</TabsTrigger>
            <TabsTrigger value="notes">Notas</TabsTrigger>
          </TabsList>

          <TabsContent value="pipeline" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {PIPELINE_STAGES.map(stage => (
                <Card key={stage.key} className={`${stage.color}`}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <stage.icon className="w-4 h-4" />
                      {stage.label}
                      <Badge variant="outline" className="ml-auto">{pipelineData[stage.key]?.length || 0}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {(pipelineData[stage.key] || []).slice(0, 5).map((p) => {
                      const sc = getScore(p.patient_id);
                      return (
                        <div
                          key={p.id}
                          onClick={() => goToPatient(p.patient_id)}
                          className="p-2 rounded-lg bg-background/80 hover:bg-background transition-colors cursor-pointer"
                        >
                          <p className="text-xs font-medium truncate">{p.name}</p>
                          {sc && (
                            <div className="flex items-center gap-1 mt-1">
                              <div className="w-12 h-1 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-primary rounded-full" style={{ width: `${sc.relationship_score ?? 0}%` }} />
                              </div>
                              <span className="text-[9px] text-muted-foreground">{Math.round(sc.relationship_score ?? 0)}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {(pipelineData[stage.key]?.length || 0) > 5 && (
                      <p className="text-[10px] text-muted-foreground text-center">+{(pipelineData[stage.key]?.length || 0) - 5} mais</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="lists" className="mt-4 space-y-4">
            {[
              { title: "Pacientes em Risco", list: smartLists.atRisk, icon: AlertTriangle, color: "text-amber-500" },
              { title: "Alta Performance", list: smartLists.highPerformers, icon: Star, color: "text-emerald-500" },
              { title: "Prontos para Upgrade", list: smartLists.upgradeReady, icon: TrendingUp, color: "text-purple-500" },
              { title: "Novos (últimos 14 dias)", list: smartLists.newPatients, icon: Zap, color: "text-blue-500" },
            ].map(section => (
              <Card key={section.title}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <section.icon className={`w-5 h-5 ${section.color}`} />
                    {section.title}
                    <Badge variant="outline" className="ml-auto">{section.list.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {section.list.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum paciente nesta lista</p>
                  ) : (
                    <div className="space-y-2">
                      {section.list.slice(0, 10).map((p) => (
                        <div
                          key={p.id}
                          onClick={() => goToPatient(p.patient_id)}
                          className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 cursor-pointer transition-colors"
                        >
                          <div>
                            <p className="text-sm font-medium">{p.name}</p>
                            {p.phone && <p className="text-xs text-muted-foreground">{p.phone}</p>}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                setNoteDialog({ patientId: p.patient_id, name: p.name });
                              }}
                            >
                              <MessageSquare className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="ghost">
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="notes" className="mt-4">
            <Card>
              <CardHeader><CardTitle>Notas de Relacionamento</CardTitle></CardHeader>
              <CardContent>
                {notes.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhuma nota ainda</p>
                ) : (
                  <div className="space-y-3">
                    {notes.map((n: any) => (
                      <div key={n.id} className="p-3 rounded-lg bg-secondary/30">
                        <p className="text-sm">{n.note}</p>
                        <p className="text-xs text-muted-foreground mt-1">{n.created_at ? new Date(n.created_at).toLocaleDateString("pt-BR") : ""}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Note Dialog */}
        <Dialog open={!!noteDialog} onOpenChange={() => setNoteDialog(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Nota - {noteDialog?.name}</DialogTitle></DialogHeader>
            <Textarea placeholder="Observação estratégica..." value={noteText} onChange={e => setNoteText(e.target.value)} rows={3} />
            <Button onClick={saveNote} disabled={!noteText}>Salvar Nota</Button>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
