import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { 
  ClipboardCheck, Shield, Scale, Utensils, Sparkles, ThumbsUp, 
  Search, Filter, Clock, User, CheckCircle2, AlertCircle, ArrowRight
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

interface PatientOnboarding {
  patient_id: string;
  full_name: string;
  email: string;
  journey_status: string;
  created_at: string;
  pipeline: {
    anamnesis_completed: boolean;
    body_data_completed: boolean;
    preferences_completed: boolean;
    plan_generated: boolean;
    plan_approved: boolean;
    updated_at: string;
  } | null;
  consent: {
    accepted_at: string;
  } | null;
}

export default function OnboardingTracker() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: patients = [], isLoading } = useQuery({
    queryKey: ["onboarding-tracker", user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Fetch nutritionist's patients and their onboarding pipeline data
      const { data, error } = await supabase
        .from("nutritionist_patients")
        .select(`
          patient_id,
          journey_status,
          created_at,
          profiles:patient_id (full_name, email),
          onboarding_pipelines:patient_id (
            anamnesis_completed,
            body_data_completed,
            preferences_completed,
            plan_generated,
            plan_approved,
            updated_at
          ),
          clinical_consents:patient_id (accepted_at)
        `)
        .eq("nutritionist_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map((d: any) => ({
        patient_id: d.patient_id,
        full_name: d.profiles?.full_name || "Paciente",
        email: d.profiles?.email || "",
        journey_status: d.journey_status,
        created_at: d.created_at,
        pipeline: d.onboarding_pipelines?.[0] || null,
        consent: d.clinical_consents?.[0] || null,
      }));
    },
    enabled: !!user,
    refetchInterval: 30000, // Refresh every 30s for realtime feel
  });

  const filteredPatients = patients.filter(p => 
    p.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStepStatus = (p: PatientOnboarding, step: string) => {
    switch (step) {
      case "invite": return { status: "completed", date: p.created_at };
      case "consent": return p.consent ? { status: "completed", date: p.consent.accepted_at } : { status: "pending" };
      case "anamnesis": return p.pipeline?.anamnesis_completed ? { status: "completed" } : { status: "pending" };
      case "body": return p.pipeline?.body_data_completed ? { status: "completed" } : { status: "pending" };
      case "plan": return p.pipeline?.plan_generated ? { status: "completed" } : { status: "pending" };
      default: return { status: "pending" };
    }
  };

  const calculateProgress = (p: PatientOnboarding) => {
    let completed = 1; // Invite is always completed
    if (p.consent) completed++;
    if (p.pipeline?.anamnesis_completed) completed++;
    if (p.pipeline?.body_data_completed) completed++;
    if (p.pipeline?.preferences_completed) completed++;
    if (p.pipeline?.plan_generated) completed++;
    return (completed / 6) * 100;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Rocket className="h-6 w-6 text-primary" />
              Rastreador de Onboarding
            </h1>
            <p className="text-muted-foreground">Acompanhe o progresso dos novos pacientes em tempo real</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar paciente..." 
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="animate-pulse h-32" />
            ))
          ) : filteredPatients.length === 0 ? (
            <Card className="p-12 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <User className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium">Nenhum paciente encontrado</h3>
              <p className="text-muted-foreground">Novos pacientes aparecerão aqui conforme iniciarem a jornada.</p>
            </Card>
          ) : (
            filteredPatients.map((p, idx) => (
              <motion.div
                key={p.patient_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card className="hover:border-primary/30 transition-all cursor-pointer overflow-hidden" onClick={() => navigate(`/patients/${p.patient_id}`)}>
                  <CardContent className="p-0">
                    <div className="flex flex-col md:flex-row md:items-center">
                      {/* Patient Info */}
                      <div className="p-5 md:w-1/4 border-b md:border-b-0 md:border-r border-border">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                            {p.full_name[0]}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold truncate">{p.full_name}</p>
                            <p className="text-xs text-muted-foreground truncate">{p.email}</p>
                          </div>
                        </div>
                        <div className="mt-4 space-y-1">
                          <p className="text-[10px] text-muted-foreground uppercase font-semibold">Status Geral</p>
                          <Badge variant="outline" className="text-[10px]">
                            {p.journey_status.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                      </div>

                      {/* Progress Tracker */}
                      <div className="flex-1 p-5 space-y-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium">Progresso do Onboarding</span>
                          <span className="text-xs font-bold">{Math.round(calculateProgress(p))}%</span>
                        </div>
                        <Progress value={calculateProgress(p)} className="h-1.5" />

                        <div className="grid grid-cols-5 gap-2">
                          <StepItem icon={Clock} label="Convite" status="completed" />
                          <StepItem 
                            icon={Shield} 
                            label="Consentimento" 
                            status={p.consent ? "completed" : "pending"} 
                          />
                          <StepItem 
                            icon={ClipboardCheck} 
                            label="Anamnese" 
                            status={p.pipeline?.anamnesis_completed ? "completed" : "pending"} 
                          />
                          <StepItem 
                            icon={Scale} 
                            label="Corporal" 
                            status={p.pipeline?.body_data_completed ? "completed" : "pending"} 
                          />
                          <StepItem 
                            icon={Sparkles} 
                            label="Plano" 
                            status={p.pipeline?.plan_generated ? "completed" : "pending"} 
                          />
                        </div>
                      </div>

                      {/* Action */}
                      <div className="p-5 md:w-48 bg-muted/20 flex flex-col items-center justify-center gap-2">
                        <Button variant="ghost" size="sm" className="w-full gap-2">
                          Ver Detalhes <ArrowRight className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

function StepItem({ icon: Icon, label, status }: { icon: any, label: string, status: "completed" | "pending" | "error" }) {
  return (
    <div className="flex flex-col items-center text-center gap-1.5">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
        status === "completed" ? "bg-green-500/10 text-green-500" : "bg-muted text-muted-foreground"
      }`}>
        <Icon className="h-4 w-4" />
      </div>
      <span className={`text-[9px] font-medium leading-tight ${
        status === "completed" ? "text-foreground" : "text-muted-foreground"
      }`}>{label}</span>
      {status === "completed" && (
        <CheckCircle2 className="h-2.5 w-2.5 text-green-500" />
      )}
    </div>
  );
}
