import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Shield, Sparkles, Zap, Rocket, XCircle, CheckCircle2, Clock, History, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface PatientProjectGovernanceProps {
  patientId: string;
  isProfessionalView?: boolean;
  onProtocolChanged?: () => void;
}

interface ProjectHistory {
  id: string;
  project_code: string;
  status: string;
  started_at: string | null;
  ended_at: string | null;
  notes: string | null;
  created_at: string;
  program_id: string | null;
}

interface ActiveProject {
  project_code: string;
  program_title: string;
  program_id: string;
  started_at: string;
}

interface PendingRequest {
  id: string;
  program_id: string;
  program_title: string;
  message: string | null;
  created_at: string;
  patient_name: string;
  patient_id: string;
}

const PROJECT_DISPLAY: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  fitjourney_master: { label: "FitJourney Master", color: "text-primary", icon: Shield },
  bikini_branco: { label: "Biquíni Branco", color: "text-pink-500", icon: Sparkles },
};

function getProjectDisplay(code: string) {
  return PROJECT_DISPLAY[code] || { label: code, color: "text-foreground", icon: Zap };
}

export default function PatientProjectGovernance({ patientId, isProfessionalView = false, onProtocolChanged }: PatientProjectGovernanceProps) {
  const { user } = useAuth();
  const [activeProject, setActiveProject] = useState<ActiveProject | null>(null);
  const [history, setHistory] = useState<ProjectHistory[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [ending, setEnding] = useState(false);

  useEffect(() => {
    if (!patientId) return;
    loadData();
  }, [patientId]);

  async function loadData() {
    setLoading(true);
    const [historyRes, activeProtocolRes] = await Promise.all([
      supabase
        .from("patient_project_history")
        .select("*")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("patient_protocols")
        .select("protocol_key, status, start_date, protocol_id")
        .eq("patient_id", patientId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1),
    ]);

    setHistory((historyRes.data || []) as ProjectHistory[]);

    // Determine active project from protocol
    const activeProtocol = (activeProtocolRes.data || [])[0] as any;
    if (activeProtocol && activeProtocol.protocol_key && activeProtocol.protocol_key !== "fitjourney_master") {
      // Find the program associated
      const { data: programData } = await supabase
        .from("programs")
        .select("id, title")
        .eq("protocol_key", activeProtocol.protocol_key)
        .limit(1)
        .maybeSingle();

      setActiveProject({
        project_code: activeProtocol.protocol_key,
        program_title: programData?.title || getProjectDisplay(activeProtocol.protocol_key).label,
        program_id: programData?.id || "",
        started_at: activeProtocol.start_date,
      });
    } else {
      setActiveProject(null);
    }

    // Load pending requests for professional view
    if (isProfessionalView && user) {
      const { data: reqs } = await supabase
        .from("program_join_requests")
        .select("id, program_id, message, created_at, patient_id, status")
        .eq("patient_id", patientId)
        .eq("status", "pending");

      if (reqs && reqs.length > 0) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", patientId)
          .maybeSingle();

        const { data: programs } = await supabase
          .from("programs")
          .select("id, title")
          .in("id", reqs.map((r: any) => r.program_id));

        const programMap = new Map((programs || []).map((p: any) => [p.id, p.title]));

        setPendingRequests(
          reqs.map((r: any) => ({
            ...r,
            program_title: programMap.get(r.program_id) || "Programa",
            patient_name: profile?.full_name || "Paciente",
          }))
        );
      }
    }

    setLoading(false);
  }

  async function handleApprove(requestId: string) {
    if (!user) return;
    const { error } = await supabase
      .from("program_join_requests")
      .update({
        status: "approved",
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    if (error) {
      toast.error("Erro ao aprovar: " + error.message);
    } else {
      toast.success("✅ Projeto aprovado! Protocolo do projeto ativado.");
      onProtocolChanged?.();
      loadData();
    }
  }

  async function handleReject(requestId: string) {
    if (!user) return;
    const { error } = await supabase
      .from("program_join_requests")
      .update({
        status: "rejected",
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    if (error) {
      toast.error("Erro ao recusar: " + error.message);
    } else {
      toast.success("Solicitação recusada.");
      loadData();
    }
  }

  async function handleEndProject() {
    if (!activeProject || !user) return;
    setEnding(true);
    const { data, error } = await supabase.rpc("end_patient_project", {
      _patient_id: patientId,
      _program_id: activeProject.program_id,
      _reason: "Encerrado pelo profissional",
    });
    if (error) {
      toast.error("Erro ao encerrar: " + error.message);
    } else {
      toast.success("Projeto encerrado. Protocolo FitJourney Master reativado.");
      onProtocolChanged?.();
      loadData();
    }
    setEnding(false);
  }

  const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    active: { label: "Ativo", variant: "default" },
    ended: { label: "Encerrado", variant: "secondary" },
    rejected: { label: "Recusado", variant: "destructive" },
    returned_to_base: { label: "Retornou ao base", variant: "outline" },
    requested: { label: "Solicitado", variant: "outline" },
  };

  if (loading) {
    return (
      <Card className="border-border/50 bg-card/50">
        <CardContent className="p-4">
          <div className="h-16 animate-pulse bg-muted/30 rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  const currentDisplay = activeProject
    ? getProjectDisplay(activeProject.project_code)
    : getProjectDisplay("fitjourney_master");
  const CurrentIcon = currentDisplay.icon;

  return (
    <Card className="border-border/50 bg-card/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Rocket className="w-4 h-4 text-primary" />
          Governança de Protocolo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Protocol */}
        <div className={cn(
          "flex items-center justify-between p-3 rounded-xl border",
          activeProject
            ? "border-pink-500/30 bg-pink-500/5"
            : "border-primary/30 bg-primary/5"
        )}>
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center",
              activeProject ? "bg-pink-500/15" : "bg-primary/15"
            )}>
              <CurrentIcon className={cn("w-5 h-5", currentDisplay.color)} />
            </div>
            <div>
              <p className="text-sm font-semibold">
                {activeProject ? activeProject.program_title : "FitJourney Master"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {activeProject
                  ? `Projeto ativo desde ${format(new Date(activeProject.started_at), "dd/MM/yyyy", { locale: ptBR })}`
                  : "Protocolo base do sistema"
                }
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={activeProject ? "default" : "outline"} className={cn(
              "text-[10px]",
              activeProject ? "bg-pink-500/20 text-pink-500 border-pink-500/30" : ""
            )}>
              {activeProject ? "Projeto Ativo" : "Protocolo Base"}
            </Badge>
            {activeProject && isProfessionalView && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 text-destructive hover:text-destructive">
                    <XCircle className="w-3.5 h-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Encerrar projeto?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Ao encerrar o projeto "{activeProject.program_title}", o paciente retornará automaticamente para o Protocolo FitJourney Master.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleEndProject} disabled={ending}>
                      {ending ? "Encerrando..." : "Encerrar Projeto"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>

        {/* Pending Requests (Professional View) */}
        {isProfessionalView && pendingRequests.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Solicitações Pendentes
            </p>
            {pendingRequests.map((req) => (
              <div key={req.id} className="flex items-center justify-between p-3 rounded-lg border border-warning/30 bg-warning/5">
                <div className="flex-1">
                  <p className="text-sm font-medium">{req.program_title}</p>
                  {req.message && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{req.message}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-1">
                    <Clock className="w-3 h-3 inline mr-1" />
                    {format(new Date(req.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </p>
                </div>
                <div className="flex gap-1.5 ml-3">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleReject(req.id)}
                  >
                    <XCircle className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 px-3 gap-1 text-[11px]"
                    onClick={() => handleApprove(req.id)}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Aprovar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* History */}
        {history.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <History className="w-3.5 h-3.5" />
              Histórico de Projetos
            </p>
            <ScrollArea className="max-h-[200px]">
              <div className="space-y-1.5">
                {history.map((h) => {
                  const display = getProjectDisplay(h.project_code);
                  const Icon = display.icon;
                  const st = statusLabels[h.status] || { label: h.status, variant: "outline" as const };
                  return (
                    <div key={h.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/20 text-xs">
                      <Icon className={cn("w-3.5 h-3.5 shrink-0", display.color)} />
                      <span className="font-medium">{display.label}</span>
                      <Badge variant={st.variant} className="text-[9px] h-4 px-1.5">{st.label}</Badge>
                      <span className="text-muted-foreground ml-auto text-[10px]">
                        {format(new Date(h.created_at), "dd/MM/yy", { locale: ptBR })}
                      </span>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
