import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  Search, CreditCard, Play, FileCheck, ArrowLeft,
  Users, Loader2, Eye, ChevronRight, DollarSign, ShieldCheck,
  ClipboardList, KeyRound, Send, UserCog, Mail, Copy, MessageCircle
} from "lucide-react";
import { releaseOnboarding } from "@/lib/serverTransitions";
import { acquireActionLock, releaseActionLock, isAtOrPast } from "@/lib/fitjourneyBible";
import { updatePatientJourneyInCache, invalidateLifecycleQueries } from "@/lib/lifecycleCache";
import { useWhatsAppTemplates, useWhatsAppLogs } from "@/hooks/useWhatsAppBusiness";
import { getWhatsAppInvitationMessage, getInvitationUrl } from "@/utils/invitation";
import { copyToClipboard } from "@/utils/clipboard";
import type { PatientInfo } from "@/hooks/queries/usePatientsList";

const JOURNEY_LABELS: Record<string, { label: string; color: string }> = {
  invited: { label: "Convidado", color: "bg-muted text-muted-foreground" },
  awaiting_payment: { label: "Aguard. Pagamento", color: "bg-warning/15 text-warning" },
  awaiting_consent: { label: "Onboarding", color: "bg-primary/15 text-primary" }, // legacy → treated as onboarding
  onboarding_active: { label: "Onboarding", color: "bg-primary/15 text-primary" },
  onboarding_completed: { label: "Onboard. Completo", color: "bg-blue-500/15 text-blue-600" },
  draft_ready_for_review: { label: "Aguard. Revisão", color: "bg-violet-500/15 text-violet-600" },
  plan_published: { label: "Plano Publicado", color: "bg-success/15 text-success" },
  active_followup: { label: "Acompanhamento", color: "bg-success/15 text-success" },
  active: { label: "Ativo (legado)", color: "bg-success/15 text-success" },
};

interface Props {
  patients: PatientInfo[];
  onToggleStatus: (linkId: string, currentStatus: string) => void;
  onClose: () => void;
}

export default function PatientStatusManager({ patients, onToggleStatus, onClose }: Props) {
  const { user } = useAuth();
  const nav = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"all" | "active" | "inactive">("all");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [confirmedPayments, setConfirmedPayments] = useState<Set<string>>(new Set());
  const [releasedOnboarding, setReleasedOnboarding] = useState<Set<string>>(new Set());
  const [sendingLinkId, setSendingLinkId] = useState<string | null>(null);
  const [profName, setProfName] = useState("seu nutricionista");
  const [clinicName, setClinicName] = useState<string | undefined>();
  const { templates } = useWhatsAppTemplates();
  const { logInvitation } = useWhatsAppLogs();
  const isInactivePatient = (patient: PatientInfo) => patient.status !== "active";

  const onboardingLink = useMemo(() => getInvitationUrl(undefined, user?.id, true), [user?.id]);

  useMemo(() => {
    if (!user?.id) return;
    
    // Get professional profile for clinic_name
    supabase.from("professional_profiles").select("clinic_name").eq("user_id", user.id).maybeSingle()
      .then(({ data: profData }) => {
        if (profData?.clinic_name) setClinicName(profData.clinic_name);
      });

    // Get user profile for name
    supabase.from("profiles").select("full_name").eq("id", user.id).single()
      .then(({ data }) => {
        if (data?.full_name) setProfName(data.full_name);
      });
  }, [user?.id]);

  const copyOnboardingLink = async () => {
    const success = await copyToClipboard(onboardingLink);
    if (success) {
      toast.success("Link de onboarding copiado!");
    } else {
      toast.error("Erro ao copiar automaticamente", {
        description: "Use o botão de e-mail ou WhatsApp para enviar o link."
      });
    }
  };

  const sendOnboardingEmail = async (patientId: string, email: string | null | undefined) => {
    if (!email) {
      toast.error("Paciente sem email cadastrado — copie o link e envie manualmente.");
      return;
    }
    if (sendingLinkId) {
      toast.info("Envio já em andamento...");
      return;
    }
    setSendingLinkId(patientId);
    try {
      const { error } = await supabase.functions.invoke("send-onboarding-link", {
        body: { email, patient_id: patientId },
      });
      if (error) throw error;
      toast.success(`✉️ Link de onboarding reenviado para ${email}`);
    } catch (err: any) {
      toast.error(err?.message || "Erro ao reenviar link de onboarding");
    } finally {
      setSendingLinkId(null);
    }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return patients
      .filter(p => {
        if (tab === "active") return !isInactivePatient(p);
        if (tab === "inactive") return isInactivePatient(p);
        return true;
      })
      .filter(p => !q || p.profile?.full_name?.toLowerCase().includes(q) || p.email?.toLowerCase().includes(q))
      .sort((a, b) => (a.profile?.full_name || "").localeCompare(b.profile?.full_name || ""));
  }, [patients, search, tab]);

  const refreshAll = (patientId?: string) => {
    invalidateLifecycleQueries(queryClient, patientId);
  };

  const confirmPayment = async (patientId: string) => {
    if (!acquireActionLock("confirm_payment", patientId)) {
      toast.info("Ação já em andamento...");
      return;
    }
    // ⚡ Optimistic UI — hide button + update status IMMEDIATELY
    setConfirmedPayments(prev => new Set(prev).add(patientId));
    updatePatientJourneyInCache(queryClient, patientId, "onboarding_active");
    setProcessingId(patientId);
    try {
      const { data, error } = await supabase.rpc("confirm_patient_payment", { _patient_id: patientId, _nutritionist_id: user!.id });
      if (error) throw error;
      const result = data as any;
      if (!result?.success) {
        setConfirmedPayments(prev => { const n = new Set(prev); n.delete(patientId); return n; });
        updatePatientJourneyInCache(queryClient, patientId, "awaiting_payment");
        releaseActionLock("confirm_payment", patientId);
        toast.error(result?.error || "Erro ao confirmar pagamento");
      } else {
        toast.success("✅ Pagamento confirmado! Onboarding liberado automaticamente.");
        refreshAll(patientId);
      }
    } catch {
      setConfirmedPayments(prev => { const n = new Set(prev); n.delete(patientId); return n; });
      updatePatientJourneyInCache(queryClient, patientId, "awaiting_payment");
      toast.error("Erro ao confirmar pagamento");
    }
    setProcessingId(null);
  };

  const doReleaseOnboarding = async (patientId: string) => {
    if (!acquireActionLock("release_onboarding", patientId)) {
      toast.info("Ação já em andamento...");
      return;
    }
    const patient = patients.find(p => p.patient_id === patientId);
    const journey = patient ? getJourney(patient) : "active";
    if (isAtOrPast(journey, "onboarding_active")) {
      toast.info("Onboarding já foi liberado ou concluído para este paciente");
      releaseActionLock("release_onboarding", patientId);
      return;
    }
    // ⚡ Optimistic UI — update status IMMEDIATELY
    setReleasedOnboarding(prev => new Set(prev).add(patientId));
    updatePatientJourneyInCache(queryClient, patientId, "onboarding_active");
    setProcessingId(patientId);
    try {
      const result = await releaseOnboarding(patientId, user!.id);
      if (!result.success) {
        setReleasedOnboarding(prev => { const n = new Set(prev); n.delete(patientId); return n; });
        updatePatientJourneyInCache(queryClient, patientId, journey);
        releaseActionLock("release_onboarding", patientId);
        toast.error(result.error || "Erro ao liberar onboarding");
      } else {
        toast.success("✅ Onboarding liberado!");
        refreshAll(patientId);
      }
    } catch {
      setReleasedOnboarding(prev => { const n = new Set(prev); n.delete(patientId); return n; });
      updatePatientJourneyInCache(queryClient, patientId, journey);
      releaseActionLock("release_onboarding", patientId);
      toast.error("Erro ao liberar onboarding");
    }
    setProcessingId(null);
  };

  const getJourney = (p: PatientInfo): string => {
    return p.journey_status || (p as any).journey_status || "active";
  };

  // Check if patient already completed onboarding (don't offer release again)
  const hasCompletedOnboarding = (journey: string) => {
    const completedStatuses = ["onboarding_completed", "draft_ready_for_review", "plan_published", "active_followup"];
    return completedStatuses.includes(journey);
  };

  const counts = {
    all: patients.length,
    active: patients.filter(p => !isInactivePatient(p)).length,
    inactive: patients.filter(p => isInactivePatient(p)).length,
  };

  return (
    <TooltipProvider delayDuration={200}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h2 className="text-lg font-display font-bold flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" /> Controle Rápido de Pacientes
            </h2>
            <p className="text-xs text-muted-foreground">
              {counts.active} ativos · {counts.inactive} inativos · Alterne com um toque
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar paciente..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
            autoFocus
          />
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={v => setTab(v as any)}>
          <TabsList className="w-full">
            <TabsTrigger value="all" className="flex-1 text-xs">
              Todos <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">{counts.all}</Badge>
            </TabsTrigger>
            <TabsTrigger value="active" className="flex-1 text-xs">
              Ativos <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">{counts.active}</Badge>
            </TabsTrigger>
            <TabsTrigger value="inactive" className="flex-1 text-xs">
              Inativos <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">{counts.inactive}</Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Patient List */}
        <ScrollArea className="h-[calc(100vh-320px)] min-h-[300px]">
          <div className="space-y-1">
            {filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                Nenhum paciente encontrado
              </div>
            ) : (
              filtered.map((p, idx) => {
                const name = p.profile?.full_name || p.email || "Paciente";
                const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
                 const isActive = !isInactivePatient(p);
                const journey = getJourney(p);
                const journeyInfo = JOURNEY_LABELS[journey] || JOURNEY_LABELS.active;
                const isProcessing = processingId === p.patient_id;
                const completed = hasCompletedOnboarding(journey);

                // Determine which actions to show
                const showConfirmPayment = isActive && !confirmedPayments.has(p.patient_id) && (journey === "awaiting_payment" || journey === "invited" || journey === "active");
                const showReleaseOnboarding = isActive && !releasedOnboarding.has(p.patient_id) && (journey === "active") && !completed;
                const showReviewPlan = journey === "draft_ready_for_review" || journey === "onboarding_completed";

                return (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(idx * 0.02, 0.3) }}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all hover:bg-accent/5 ${!isActive ? "opacity-70" : ""}`}
                  >
                    {/* Toggle Switch */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <Switch
                            checked={isActive}
                            onCheckedChange={() => onToggleStatus(p.id, p.status)}
                            className="shrink-0"
                          />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p>{isActive ? "Desativar paciente" : "Ativar paciente"}</p>
                      </TooltipContent>
                    </Tooltip>

                    {/* Avatar */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                      {initials}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{name}</p>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${journeyInfo.color}`}>
                          {journeyInfo.label}
                        </span>
                        {p.email && (
                          <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">{p.email}</span>
                        )}
                      </div>
                    </div>

                    {/* Quick Actions - ALWAYS VISIBLE */}
                    <div className="flex items-center gap-1 shrink-0">
                      {showConfirmPayment && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[10px] gap-1 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10"
                              onClick={() => confirmPayment(p.patient_id)}
                              disabled={isProcessing}
                            >
                              {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <DollarSign className="w-3 h-3" />}
                              Pgto
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Confirmar pagamento e liberar acesso</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                      {showReleaseOnboarding && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[10px] gap-1 border-primary/30 text-primary hover:bg-primary/10"
                              onClick={() => doReleaseOnboarding(p.patient_id)}
                              disabled={isProcessing}
                            >
                              {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                              Onboard.
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Liberar onboarding para o paciente</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                      {showReviewPlan && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[10px] gap-1 border-violet-500/30 text-violet-600 hover:bg-violet-500/10"
                              onClick={() => nav(`/patients/${p.patient_id}`)}
                            >
                              <FileCheck className="w-3 h-3" /> Revisar
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Revisar e aprovar o plano do paciente</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                      {/* Resend onboarding link — visible whenever patient hasn't completed onboarding */}
                      {!completed && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => sendOnboardingEmail(p.patient_id, p.email)}
                              disabled={sendingLinkId === p.patient_id}
                            >
                              {sendingLinkId === p.patient_id
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                                : <Mail className="w-3.5 h-3.5 text-primary" />}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Reenviar link de onboarding por email</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                      {!completed && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => {
                                const patientFirstName = p.profile?.full_name?.split(" ")[0] || "Paciente";
                                 const waMsg = getWhatsAppInvitationMessage({
                                  patientName: patientFirstName,
                                  professionalName: profName,
                                  clinicName: clinicName,
                                  invitationCode: "", // Generic onboarding uses nutri ID instead of specific code
                                  professionalId: user?.id,
                                  templateType: 'patient_onboarding',
                                  customTemplate: templates['patient_onboarding']
                                });
                                logInvitation({ patientName: p.profile?.full_name || p.email || "Paciente", invitationType: 'patient_onboarding' });
                                window.open(`https://wa.me/?text=${encodeURIComponent(waMsg)}`, "_blank");
                              }}
                            >
                              <MessageCircle className="w-3.5 h-3.5 text-[#25D366]" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Convidar via WhatsApp</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                      {!completed && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={copyOnboardingLink}
                            >
                              <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Copiar link de onboarding</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                      {completed && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <ShieldCheck className="w-4 h-4 text-success shrink-0" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Onboarding já concluído</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={() => nav(`/patients/${p.patient_id}`)}
                          >
                            <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Ver perfil completo</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>

                    {/* Arrow */}
                    <ChevronRight
                      className="w-3.5 h-3.5 text-muted-foreground cursor-pointer shrink-0 hover:text-foreground transition-colors"
                      onClick={() => nav(`/patients/${p.patient_id}`)}
                    />
                  </motion.div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </motion.div>
    </TooltipProvider>
  );
}
