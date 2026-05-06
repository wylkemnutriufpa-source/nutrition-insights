import { useState, useMemo, useCallback, useEffect } from "react";
import { useExperienceMode } from "@/hooks/useExperienceMode";
import { useSafeInteraction } from "@/hooks/useSafeInteraction";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Users, Plus, UserCheck, UserX, ChevronRight, Search,
  TrendingUp, TrendingDown, Minus, Target, Loader2, ToggleLeft, ToggleRight, X, CalendarDays,
  LayoutGrid, List, Crown, Settings2, ShieldAlert, Copy, Zap, CheckCircle2, MessageCircle, Link2, Sparkles, UserPlus,
  UtensilsCrossed, User, FileText
} from "lucide-react";
import { BASE_URL } from "@/lib/config";
import { useNavigate, Link } from "react-router-dom";
import { getWhatsAppInvitationMessage } from "@/utils/invitation";
import { useWhatsAppTemplates, useWhatsAppLogs } from "@/hooks/useWhatsAppBusiness";
import PatientStatusManager from "@/components/patients/PatientStatusManager";
import PrestigeBadge from "@/components/prestige/PrestigeBadge";
import { useOnlinePatients } from "@/hooks/useOnlinePatients";
import {
  usePatientsList, useTogglePatientStatus, useAddPatient,
  useRemoveFromProgram, useUpdateExpiry, useBulkToggle, useAssignToProgram,
  trackPatientView, DEFAULT_PAGE_SIZE,
} from "@/hooks/queries/usePatientsList";
import type { PatientInfo, ProgramInfo, PatientsListParams } from "@/hooks/queries/usePatientsList";
import type { PrestigePlan } from "@/hooks/usePrestige";
import PaginationControls from "@/components/patients/PaginationControls";
import PatientQueueTabs from "@/components/patients/PatientQueueTabs";
import { EngineSelector } from "@/features/editor-v3/components/EngineSelector";

// ─── Score helpers ───
function getScoreTier(score: number): { label: string; color: string; bg: string; ring: string; icon: React.ReactNode; description: string } {
  if (score >= 70) return {
    label: "Ótimo", color: "text-success", bg: "bg-success", ring: "ring-success/30",
    icon: <TrendingUp className="w-3 h-3" />, description: "Paciente engajado"
  };
  if (score >= 40) return {
    label: "Médio", color: "text-warning", bg: "bg-warning", ring: "ring-warning/30",
    icon: <Minus className="w-3 h-3" />, description: "Precisa de atenção"
  };
  return {
    label: "Crítico", color: "text-destructive", bg: "bg-destructive", ring: "ring-destructive/30",
    icon: <TrendingDown className="w-3 h-3" />, description: "Contato urgente"
  };
}

function ScoreRing({ score }: { score: number }) {
  const tier = getScoreTier(score);
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  return (
    <div className="relative w-12 h-12 flex items-center justify-center flex-shrink-0">
      <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r={radius} fill="none" stroke="currentColor" strokeWidth="4" className="text-muted/20" />
        <circle cx="24" cy="24" r={radius} fill="none" strokeWidth="4"
          strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round"
          className={`transition-all duration-700 ${score >= 70 ? "stroke-success" : score >= 40 ? "stroke-warning" : "stroke-destructive"}`}
        />
      </svg>
      <span className={`absolute text-xs font-bold ${tier.color}`}>{score}</span>
    </div>
  );
}

function ScoreBar({ score, label }: { score: number; label: string }) {
  const tier = getScoreTier(score);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className={`font-semibold flex items-center gap-1 ${tier.color}`}>{tier.icon} {tier.label}</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${score}%` }} transition={{ duration: 0.8, ease: "easeOut" }} className={`h-full rounded-full ${tier.bg}`} />
      </div>
      <p className="text-xs text-muted-foreground">{tier.description}</p>
    </div>
  );
}

// ─── Assign to Program Dialog ───
function AssignProgramDialog({
  open, onOpenChange, patient, programs, onAssigned
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  patient: PatientInfo | null;
  programs: ProgramInfo[];
  onAssigned: () => void;
}) {
  const [selectedProgram, setSelectedProgram] = useState("");
  const { isOpen, setIsOpen, log, withLoading, loading } = useSafeInteraction("AssignProgram");
  const assignMutation = useAssignToProgram();

  // Sync internal state with prop
  useEffect(() => {
    if (open !== isOpen) {
      setIsOpen(open);
      if (open) log("modal_opened", { patientId: patient?.patient_id });
    }
  }, [open, isOpen, setIsOpen, log, patient]);

  // Sync prop with internal state changes (e.g. from Dialog close)
  const handleOpenChange = (val: boolean) => {
    log("onOpenChange", { val });
    setIsOpen(val);
    onOpenChange(val);
  };

  const alreadyEnrolled = new Set(patient?.programs?.map(p => p.id) || []);
  const available = programs.filter(p => !alreadyEnrolled.has(p.id));

  const handleAssign = async () => {
    if (!patient || !selectedProgram) {
      log("assign_blocked", { hasPatient: !!patient, selectedProgram });
      return;
    }
    
    await withLoading(async () => {
      await assignMutation.mutateAsync({ patientId: patient.patient_id, programId: selectedProgram });
      log("assign_completed");
      onAssigned();
      handleOpenChange(false);
      setSelectedProgram("");
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm border-border/40 bg-background/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2 text-foreground">
            <Target className="w-5 h-5 text-primary" /> Adicionar a Programa
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 pt-2">
          <p className="text-sm text-muted-foreground">
            Adicionando <strong>{patient?.profile?.full_name}</strong> a um programa
          </p>
          
          {patient?.programs && patient.programs.length > 0 && (
            <div className="bg-accent/5 p-3 rounded-lg border border-border/30">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 block">Programas atuais</Label>
              <div className="flex flex-wrap gap-1.5">
                {patient.programs.map(pg => (
                  <Badge key={pg.id} variant="secondary" className="text-[10px] bg-background/50 border-border/50">{pg.title}</Badge>
                ))}
              </div>
            </div>
          )}
          
          {available.length === 0 ? (
            <div className="text-center py-6 bg-accent/5 rounded-xl border border-dashed border-border/50">
              <p className="text-xs text-muted-foreground px-4">
                {programs.length === 0 
                  ? "Nenhum programa criado ainda. Crie programas na aba de Programas." 
                  : "Este paciente já está inscrito em todos os programas disponíveis."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-foreground ml-0.5">Selecionar Programa</Label>
                <Select 
                  value={selectedProgram} 
                  onValueChange={(val) => {
                    log("program_selected", { val });
                    setSelectedProgram(val);
                  }}
                  onOpenChange={(open) => log("select_open_change", { open })}
                  disabled={loading}
                >
                  <SelectTrigger className="w-full bg-background/50 border-border/50 h-11 focus:ring-primary/20">
                    <SelectValue placeholder="Selecione um programa..." />
                  </SelectTrigger>
                  <SelectContent className="z-[150] bg-background border-border shadow-2xl" position="popper" sideOffset={5}>
                    {available.map(p => (
                      <SelectItem key={p.id} value={p.id} className="cursor-pointer">
                        {p.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <Button 
                onClick={handleAssign} 
                disabled={!selectedProgram || loading} 
                className="w-full h-11 gap-2 shadow-lg shadow-primary/10 transition-all hover:scale-[1.01] active:scale-[0.99]"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Confirmar Inscrição
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PatientCard({ p, idx, navigate, toggleStatus, setAssignTarget, setAssignDialogOpen, removeFromProgram, onUpdateExpiry, allPrestigePlans = [], isOnline = false, setExpiryTarget }: {
  p: PatientInfo; idx: number; navigate: any;
  toggleStatus: (id: string, status: string) => void;
  setAssignTarget: (p: PatientInfo) => void;
  setAssignDialogOpen: (v: boolean) => void;
  removeFromProgram: (patientId: string, programId: string, programTitle: string) => void;
  onUpdateExpiry: (id: string, date: string | null) => void;
  allPrestigePlans?: PrestigePlan[];
  isOnline?: boolean;
  setExpiryTarget: (p: { id: string, name: string, current: string | null }) => void;
}) {
  const isInactive = p.status === "inactive";
  const score = p.priorityScore || 0;
  const tier = getScoreTier(score);
  const hasPrograms = p.programs && p.programs.length > 0;
  const displayName = p.profile?.full_name || p.email || "Paciente";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.04 }}
      whileHover={{ y: -2 }}
      className={`glass-premium rounded-xl p-5 shadow-card shimmer-sweep cursor-pointer ring-2 ${isInactive ? "ring-muted/30 opacity-60" : tier.ring} transition-all relative metric-glow`}
      onClick={() => navigate(p.patient_id)}
    >
      {isInactive && (
        <div className="absolute top-2 right-2 text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
          Fora das métricas
        </div>
      )}
      <div className="flex items-center gap-3 mb-3">
        <div className="relative w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <span className="text-lg font-bold text-primary">
            {displayName[0].toUpperCase()}
          </span>
          <span
            className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-card animate-pulse ${isOnline ? 'bg-success' : 'bg-destructive'}`}
            title={isOnline ? 'Online agora' : 'Offline'}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="font-display font-semibold truncate" style={p.prestigePlan?.crown_enabled ? { color: p.prestigePlan.color } : undefined}>{displayName}</h3>
            {p.prestigePlan && <PrestigeBadge plan={p.prestigePlan} allPlans={allPrestigePlans} size="sm" showLabel={false} />}
            {p.requires_medical_review && (
              <Badge variant="destructive" className="h-4 px-1.5 text-[9px] gap-0.5 animate-pulse">
                <ShieldAlert className="w-2.5 h-2.5" /> Revisão
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              !isInactive ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
            }`}>
              {!isInactive 
                ? p.expires_at 
                  ? (() => {
                      const exp = new Date(p.expires_at);
                      const now = new Date();
                      const diffDays = Math.ceil((exp.getTime() - now.getTime()) / 86400000);
                      const formatted = exp.toLocaleDateString("pt-BR");
                      if (diffDays < 0) return `Vencido ${formatted}`;
                      if (diffDays <= 7) return `Ativo até ${formatted} ⚠️`;
                      return `Ativo até ${formatted}`;
                    })()
                  : "Ativo"
                : "Inativo"
              }
            </span>
            {!isInactive && p.expires_at && (() => {
              const diffDays = Math.ceil((new Date(p.expires_at).getTime() - Date.now()) / 86400000);
              if (diffDays < 0) return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive font-medium">Vencido</span>;
              if (diffDays <= 7) return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-warning/10 text-warning font-medium">{diffDays}d restantes</span>;
              return null;
            })()}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setExpiryTarget({ id: p.id, name: displayName, current: p.expires_at });
              }}
              className="text-muted-foreground hover:text-primary p-0.5" title="Definir vencimento"
            >
              <CalendarDays className="w-3 h-3" />
            </button>
            {hasPrograms && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary flex items-center gap-1">
                <Target className="w-3 h-3" /> {p.programs!.length} programa{p.programs!.length > 1 ? "s" : ""}
              </span>
            )}
            {p.stats?.current_streak ? (
              <span className="text-xs text-muted-foreground">🔥 {p.stats.current_streak}d</span>
            ) : null}
          </div>
        </div>
        <ScoreRing score={score} />
        <div className="flex items-center gap-1">
          <Button
            onClick={(e) => { 
              e.stopPropagation(); 
              if (!p.patient_id) {
                toast.error("ID do paciente não encontrado");
                return;
              }
              // Navigate to patient detail where they can choose the correct editor version
              navigate(p.patient_id); 
            }}
            size="sm"
            className="h-9 px-4 rounded-xl bg-primary hover:bg-primary/90 font-bold gap-2 shadow-lg shadow-primary/20"
          >
            <User className="w-3.5 h-3.5" />
            VER PERFIL
          </Button>
          <div className="flex items-center gap-0.5 ml-2">
            <button
              onClick={(e) => { e.stopPropagation(); navigate(`${p.patient_id}?section=plan`); }}
              className="text-muted-foreground hover:text-primary p-1.5 transition-colors" title="Plano Alimentar"
            >
              <FileText className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setAssignTarget(p); setAssignDialogOpen(true); }}
              className="text-muted-foreground hover:text-primary p-1.5 transition-colors" title="Adicionar a programa"
            >
              <Target className="w-4 h-4" />
            </button>
            <button
                onClick={(e) => { e.stopPropagation(); toggleStatus(p.id, p.status); }}
                className="text-muted-foreground hover:text-foreground p-1.5 transition-colors" title={!isInactive ? "Desativar" : "Ativar"}
            >
                {!isInactive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
            </button>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground ml-1" />
        </div>
      </div>

      {hasPrograms && (
        <div className="flex flex-wrap gap-1 mb-3">
          {p.programs!.map(pg => (
            <Badge key={pg.id} variant="outline" className="text-xs gap-1 pr-1">
              <Target className="w-3 h-3" /> {pg.title}
              <button
                onClick={(e) => { e.stopPropagation(); removeFromProgram(p.patient_id, pg.id, pg.title); }}
                className="ml-0.5 hover:bg-destructive/20 rounded-full p-0.5 transition-colors"
                title={`Remover de ${pg.title}`}
              >
                <X className="w-3 h-3 text-destructive" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <ScoreBar score={score} label="Engajamento" />

      <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-border/50">
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Checklist</p>
          <p className={`text-sm font-bold ${
            (p.checklistAdherence || 0) >= 70 ? "text-success" :
            (p.checklistAdherence || 0) >= 40 ? "text-warning" : "text-destructive"
          }`}>{p.checklistAdherence ?? "—"}%</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Refeições</p>
          <p className="text-sm font-bold">
            {p.stats?.last_meal_date
              ? (() => {
                  const d = Math.floor((Date.now() - new Date(p.stats!.last_meal_date!).getTime()) / 86400000);
                  return d === 0 ? "Hoje" : d === 1 ? "Ontem" : `${d}d`;
                })()
              : "—"}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Streak</p>
          <p className="text-sm font-bold">{p.stats?.current_streak ?? "—"}🔥</p>
        </div>
      </div>
    </motion.div>
  );
}

function PatientRow({ p, idx, navigate, toggleStatus, setAssignTarget, setAssignDialogOpen, removeFromProgram, onUpdateExpiry, allPrestigePlans = [], setExpiryTarget }: {
  p: PatientInfo; idx: number; navigate: any;
  toggleStatus: (id: string, status: string) => void;
  setAssignTarget: (p: PatientInfo) => void;
  setAssignDialogOpen: (v: boolean) => void;
  removeFromProgram: (patientId: string, programId: string, programTitle: string) => void;
  onUpdateExpiry: (id: string, date: string | null) => void;
  allPrestigePlans?: PrestigePlan[];
  setExpiryTarget: (p: { id: string, name: string, current: string | null }) => void;
}) {
  const isInactive = p.status === "inactive";
  const score = p.priorityScore || 0;
  const displayName = p.profile?.full_name || p.email || "Paciente";

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: idx * 0.03 }}
      className={`glass-premium rounded-lg px-4 py-3 cursor-pointer flex items-center gap-3 hover:bg-accent/5 transition-all metric-glow ${isInactive ? "opacity-60" : ""}`}
      onClick={() => navigate(p.patient_id)}
    >
      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
        <span className="text-sm font-bold text-primary">{displayName[0].toUpperCase()}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="font-semibold text-sm truncate" style={p.prestigePlan?.crown_enabled ? { color: p.prestigePlan.color } : undefined}>{displayName}</p>
          {p.prestigePlan && <PrestigeBadge plan={p.prestigePlan} allPlans={allPrestigePlans} size="sm" showLabel={false} />}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
            !isInactive ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
          }`}>
            {!isInactive
              ? p.expires_at
                ? (() => {
                    const exp = new Date(p.expires_at);
                    const diffDays = Math.ceil((exp.getTime() - Date.now()) / 86400000);
                    const formatted = exp.toLocaleDateString("pt-BR");
                    if (diffDays < 0) return `Vencido ${formatted}`;
                    if (diffDays <= 7) return `Ativo até ${formatted} ⚠️`;
                    return `Ativo até ${formatted}`;
                  })()
                : "Ativo"
              : "Inativo"
            }
          </span>
          {p.programs && p.programs.length > 0 && (
            <span className="text-[10px] text-muted-foreground">{p.programs.length} prog.</span>
          )}
        </div>
      </div>
      <div className="hidden sm:flex items-center gap-4 text-xs text-muted-foreground">
        <div className="text-center w-14">
          <p className="text-[10px]">Checklist</p>
          <p className={`font-bold ${(p.checklistAdherence || 0) >= 70 ? "text-success" : (p.checklistAdherence || 0) >= 40 ? "text-warning" : "text-destructive"}`}>
            {p.checklistAdherence ?? "—"}%
          </p>
        </div>
        <div className="text-center w-14">
          <p className="text-[10px]">Streak</p>
          <p className="font-bold">{p.stats?.current_streak ?? "—"}🔥</p>
        </div>
      </div>
      <ScoreRing score={score} />
      <div className="flex items-center gap-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpiryTarget({ id: p.id, name: displayName, current: p.expires_at });
          }}
          className="text-muted-foreground hover:text-primary p-0.5" title="Definir vencimento"
        >
          <CalendarDays className="w-3.5 h-3.5" />
        </button>
        <button onClick={(e) => { e.stopPropagation(); setAssignTarget(p); setAssignDialogOpen(true); }}
          className="text-muted-foreground hover:text-primary p-1" title="Adicionar a programa">
          <Target className="w-4 h-4" />
        </button>
        <button onClick={(e) => { e.stopPropagation(); toggleStatus(p.id, p.status); }}
          className="text-muted-foreground hover:text-foreground p-1" title={p.status === "active" ? "Desativar" : "Ativar"}>
          {p.status === "active" ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
        </button>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </div>
    </motion.div>
  );
}

function PatientGrid({ patients, navigate, toggleStatus, setAssignTarget, setAssignDialogOpen, removeFromProgram, onUpdateExpiry, search, emptyMessage, layout, allPrestigePlans = [], onlineSet, setExpiryTarget }: {
  patients: PatientInfo[]; navigate: any;
  toggleStatus: (id: string, status: string) => void;
  setAssignTarget: (p: PatientInfo) => void;
  setAssignDialogOpen: (v: boolean) => void;
  removeFromProgram: (patientId: string, programId: string, programTitle: string) => void;
  onUpdateExpiry: (id: string, date: string | null) => void;
  search: string;
  emptyMessage: string;
  layout: "grid" | "list";
  allPrestigePlans?: PrestigePlan[];
  onlineSet?: Set<string>;
  setExpiryTarget: (p: { id: string, name: string, current: string | null }) => void;
}) {
  const sorted = onlineSet && onlineSet.size > 0
    ? [...patients].sort((a, b) => {
        const aOn = onlineSet.has(a.patient_id) ? 1 : 0;
        const bOn = onlineSet.has(b.patient_id) ? 1 : 0;
        return bOn - aOn;
      })
    : patients;

  if (sorted.length === 0) {
    return (
      <div className="glass-premium rounded-xl p-12 text-center">
        <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
        <h3 className="font-display font-semibold text-lg mb-1">{search ? "Nenhum resultado" : emptyMessage}</h3>
        <p className="text-muted-foreground">{search ? "Tente outro termo" : ""}</p>
      </div>
    );
  }

  if (layout === "list") {
    return (
      <div className="space-y-2">
        {sorted.map((p, idx) => (
          <PatientRow key={p.id} p={p} idx={idx} navigate={navigate}
            toggleStatus={toggleStatus} setAssignTarget={setAssignTarget}
            setAssignDialogOpen={setAssignDialogOpen} removeFromProgram={removeFromProgram}
            onUpdateExpiry={onUpdateExpiry} allPrestigePlans={allPrestigePlans} 
            setExpiryTarget={setExpiryTarget} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {sorted.map((p, idx) => (
        <PatientCard key={p.id} p={p} idx={idx} navigate={navigate}
          toggleStatus={toggleStatus} setAssignTarget={setAssignTarget}
          setAssignDialogOpen={setAssignDialogOpen} removeFromProgram={removeFromProgram}
          onUpdateExpiry={onUpdateExpiry} allPrestigePlans={allPrestigePlans}
          isOnline={onlineSet?.has(p.patient_id)} 
          setExpiryTarget={setExpiryTarget} />
      ))}
    </div>
  );
}

// ─── Skeleton Loading ───
function PatientsListSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-28 rounded-2xl" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
      </div>
      <Skeleton className="h-10 rounded-lg" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-48 rounded-xl" />)}
      </div>
    </div>
  );
}

export default function Patients() {
  const { user, profile } = useAuth();
  const { minMode, isBasic } = useExperienceMode();
  const nav = useNavigate();
  const navigateToPatient = useCallback((patientId: string) => {
    trackPatientView(patientId);
    nav(`/patients/${patientId}`);
  }, [nav]);

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [statusTab, setStatusTab] = useState<"active" | "inactive" | "all">("active");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [expiryTarget, setExpiryTarget] = useState<{ id: string, name: string, current: string | null } | null>(null);
  const [engineSelectorTarget, setEngineSelectorTarget] = useState<{ id: string, name: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string, name: string } | null>(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [alertConfig, setAlertConfig] = useState<{ title: string, desc: string, action: () => void } | null>(null);

  // Build params for server-side query
  const queryParams: PatientsListParams = {
    page,
    pageSize,
    statusFilter: statusTab,
    search: debouncedSearch,
  };

  // React Query hooks
  const { data, isLoading, isError, isFetching } = usePatientsList(queryParams);
  const toggleStatusMutation = useTogglePatientStatus();
  const addPatientMutation = useAddPatient();
  const removeFromProgramMutation = useRemoveFromProgram();
  const updateExpiryMutation = useUpdateExpiry();
  const bulkToggleMutation = useBulkToggle();

  const patients = data?.patients ?? [];
  const programs = data?.programs ?? [];
  const prestigePlansList = data?.prestigePlans ?? [];
  const pagination = data?.pagination ?? { page: 1, pageSize, totalCount: 0, hasNextPage: false, hasPreviousPage: false, totalPages: 0 };
  const counts = data?.counts ?? { active: 0, inactive: 0 };

  // Local UI state
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [patientName, setPatientName] = useState("");
  const [patientPassword, setPatientPassword] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "critical" | "medium" | "good">("all");
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<PatientInfo | null>(null);
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const [prestigeFilter, setPrestigeFilter] = useState<string>("all");
  const [onlineFilter, setOnlineFilter] = useState(false);
  const [bulkManageOpen, setBulkManageOpen] = useState(false);
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [bulkSearch, setBulkSearch] = useState("");
  const [bulkMode, setBulkMode] = useState<"deactivate" | "activate">("deactivate");
  const [statusManagerOpen, setStatusManagerOpen] = useState(false);
  const [statusManagerSearch, setStatusManagerSearch] = useState("");
  const [statusManagerMode, setStatusManagerMode] = useState(false);
  const { onlineUsers } = useOnlinePatients();
  const { templates } = useWhatsAppTemplates();
  const { logInvitation } = useWhatsAppLogs();
  const onlineSet = useMemo(() => new Set(onlineUsers.map(u => u.user_id)), [onlineUsers]);

  // Debounced search: proper cleanup with useEffect
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      if (search !== debouncedSearch) setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Page change handler
  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // Page size change handler
  const handlePageSizeChange = useCallback((newSize: number) => {
    setPageSize(newSize);
    setPage(1); // Reset to page 1
  }, []);

  // Tab change handler (server-side status filter)
  const handleTabChange = useCallback((tab: string) => {
    if (tab === "ativos") setStatusTab("active");
    else if (tab === "inativos") setStatusTab("inactive");
    else setStatusTab("all");
    setPage(1); // Reset page on tab change
  }, []);

  const addPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validations
    if (!patientName.trim()) {
      toast.error("Informe o nome do paciente");
      return;
    }
    
    if (!email.trim() || !email.includes("@")) {
      toast.error("Informe um email válido");
      return;
    }

    if (patientPassword.length < 6) {
      toast.error("Senha deve ter no mínimo 6 caracteres");
      return;
    }
    
    try {
      const patientId = await addPatientMutation.mutateAsync({ 
        email: email.trim().toLowerCase(), 
        name: patientName.trim(), 
        password: patientPassword 
      });

      if (!patientId) {
        toast.error("Erro: Falha ao obter ID do paciente");
        return;
      }

      // Success cleanup and navigation
      setOpen(false);
      setEmail("");
      setPatientName("");
      setPatientPassword("");
      
      navigateToPatient(patientId);
    } catch (error: any) {
      // Error is already handled by the mutation's onError (toast.error)
      console.error("Error adding patient:", error);
    }
  };

  const toggleStatus = (id: string, currentStatus: string) => {
    toggleStatusMutation.mutate({ linkId: id, currentStatus });
  };

  const bulkToggle = (newStatus: "active" | "inactive") => {
    const ids = patients.filter(p => p.status !== newStatus).map(p => p.id);
    if (ids.length === 0) { toast.info(`Todos já estão ${newStatus === "active" ? "ativos" : "inativos"}`); return; }
    if (!confirm(`${newStatus === "active" ? "Ativar" : "Desativar"} ${ids.length} pacientes?`)) return;
    bulkToggleMutation.mutate({ ids, newStatus });
  };

  const openBulkManage = (mode: "deactivate" | "activate") => {
    setBulkMode(mode);
    setBulkSelected(new Set());
    setBulkSearch("");
    setBulkManageOpen(true);
  };

  const isInactivePatient = useCallback((patient: PatientInfo) => patient.status === "inactive", []);

  const bulkManageList = useMemo(() => {
    const source = bulkMode === "deactivate"
      ? patients.filter(p => !isInactivePatient(p))
      : patients.filter(p => isInactivePatient(p));
    if (!bulkSearch.trim()) return source;
    const q = bulkSearch.toLowerCase();
    return source.filter(p =>
      p.profile?.full_name?.toLowerCase().includes(q) || p.email?.toLowerCase().includes(q)
    );
  }, [patients, bulkMode, bulkSearch, isInactivePatient]);

  const toggleBulkSelect = (id: string) => {
    setBulkSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAllBulk = () => {
    const allIds = bulkManageList.map(p => p.id);
    setBulkSelected(prev => prev.size === allIds.length ? new Set() : new Set(allIds));
  };

  const executeBulkAction = () => {
    if (bulkSelected.size === 0) { toast.info("Selecione pelo menos um paciente"); return; }
    const newStatus = bulkMode === "deactivate" ? "inactive" : "active";
    
    setAlertConfig({
      title: `${bulkMode === "deactivate" ? "Desativar" : "Ativar"} ${bulkSelected.size} pacientes?`,
      desc: `Eles ${bulkMode === "deactivate" ? "deixarão de ser contabilizados nas métricas de engajamento" : "voltarão a aparecer na sua lista principal"}.`,
      action: () => {
        bulkToggleMutation.mutate({ ids: Array.from(bulkSelected), newStatus });
        setBulkManageOpen(false);
      }
    });
  };

  const removeFromProgram = (patientId: string, programId: string, programTitle: string) => {
    const isBiquini = programTitle.toLowerCase().includes("biqu");
    if (isBiquini) {
      setDeleteTarget({ id: `${patientId}:${programId}`, name: `paciente do programa "${programTitle}"` });
    } else {
      setAlertConfig({
        title: "Remover do Programa",
        desc: `Tem certeza que deseja remover este paciente do programa "${programTitle}"?`,
        action: () => {
          removeFromProgramMutation.mutate({ patientId, programId }, {
            onSuccess: () => toast.success(`Paciente removido de "${programTitle}"`),
          });
        }
      });
    }
  };

  const confirmDeleteAction = () => {
    if (!deleteTarget) return;
    const isProgramRemoval = deleteTarget.id.includes(":");
    
    if (deleteTarget.name.includes("programa")) {
      // It's a protected program removal
      if (deletePassword !== "Wylk3mkl3yton") {
        toast.error("Senha incorreta. Remoção cancelada.");
        return;
      }
      const [patientId, programId] = deleteTarget.id.split(":");
      removeFromProgramMutation.mutate({ patientId, programId }, {
        onSuccess: () => {
          toast.success(`Paciente removido com sucesso`);
          setDeleteTarget(null);
          setDeletePassword("");
        },
      });
    }
  };

  const updateExpiry = (id: string, date: string | null) => {
    updateExpiryMutation.mutate({ linkId: id, date });
  };

  // Filters
  // Search is handled server-side via debouncedSearch, no client-side filter needed
  const searchFilter = (_p: PatientInfo) => true;

  const scoreFilter = (p: PatientInfo) => {
    const score = p.priorityScore || 0;
    if (filter === "all") return true;
    if (isInactivePatient(p)) return true;
    if (filter === "critical") return score < 40;
    if (filter === "medium") return score >= 40 && score < 70;
    return score >= 70;
  };

  const prestigeFilterFn = (p: PatientInfo) => {
    if (prestigeFilter === "all") return true;
    if (prestigeFilter === "none") return !p.prestigePlan;
    return p.prestigePlan?.slug === prestigeFilter;
  };

  const onlineFilterFn = (p: PatientInfo) =>
    !onlineFilter || onlineSet.has(p.patient_id);

  // Client-side filters applied on current page of server-paginated results
  const filteredPatients = useMemo(() =>
    patients.filter(p => scoreFilter(p) && prestigeFilterFn(p) && onlineFilterFn(p)),
    [patients, filter, prestigeFilter, onlineFilter, onlineSet]
  );

  // Client-side score filter counts (on current page only)
  const scoreCounts = {
    all: patients.length,
    critical: patients.filter(p => (p.priorityScore || 0) < 40).length,
    medium: patients.filter(p => { const s = p.priorityScore || 0; return s >= 40 && s < 70; }).length,
    good: patients.filter(p => (p.priorityScore || 0) >= 70).length,
  };

  const filterButtons: { key: typeof filter; label: string }[] = [
    { key: "all", label: "Todos" },
    { key: "critical", label: "🔴 Críticos" },
    { key: "medium", label: "🟡 Atenção" },
    { key: "good", label: "🟢 Ótimos" },
  ];

  return (
    <DashboardLayout>
      {statusManagerMode ? (
        <PatientStatusManager
          patients={patients}
          onToggleStatus={toggleStatus}
          onClose={() => setStatusManagerMode(false)}
        />
      ) : (
      <div className="space-y-6">
        {/* Patient Queue — PRO+ */}
        {minMode("pro") && <PatientQueueTabs />}
        {/* Premium Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl gradient-border particles-bg"
        >
          <div className="glass-premium rounded-2xl p-6 shimmer-sweep">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h1 className="font-display text-2xl font-bold flex items-center gap-2">
                  <Users className="w-7 h-7 text-primary" /> Pacientes
                </h1>
                <p className="text-muted-foreground text-sm">
                  {counts.active} visíveis · {counts.inactive} inativos · página {pagination.page} de {pagination.totalPages || 1}
                  {isFetching && !isLoading && <span className="ml-2 text-xs text-primary animate-pulse">atualizando...</span>}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {minMode("advanced") && (
                  <Button variant="outline" size="sm" onClick={() => setStatusManagerMode(true)} className="gap-1.5 text-xs">
                    <Settings2 className="w-3.5 h-3.5" /> Controle Rápido
                  </Button>
                )}
                <Link to="/invite-patient">
                  <Button variant="outline" className="gap-2 border-amber-500/30 text-amber-600 hover:bg-amber-500/5">
                    <UserPlus className="w-4 h-4" /> Convidar Paciente
                  </Button>
                </Link>
                <Link to="/editor-v3">
                  <Button variant="outline" className="gap-2 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/5">
                    <Zap className="w-4 h-4" /> Editor V3
                  </Button>
                </Link>
                <Dialog open={open} onOpenChange={setOpen}>
                  <DialogTrigger asChild>
                    <Button className="gradient-primary gap-2 shadow-glow">
                      <Plus className="w-4 h-4" /> Cadastro Rápido
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle className="font-display">Adicionar Paciente</DialogTitle>
                    </DialogHeader>
                    <Tabs defaultValue="manual" className="w-full">
                      <TabsList className="grid w-full grid-cols-2 mb-4">
                        <TabsTrigger value="manual">Manual</TabsTrigger>
                        <TabsTrigger value="link">Link de Convite</TabsTrigger>
                      </TabsList>
                      <TabsContent value="manual">
                        <form onSubmit={addPatient} className="space-y-4">
                          <div>
                            <Label>Nome do paciente</Label>
                            <Input value={patientName} onChange={(e) => setPatientName(e.target.value)} placeholder="Nome completo" required />
                          </div>
                          <div>
                            <Label>Email do paciente</Label>
                            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="paciente@email.com" required />
                          </div>
                          <div>
                            <Label>Senha inicial</Label>
                            <Input type="password" value={patientPassword} onChange={(e) => setPatientPassword(e.target.value)} placeholder="Ex: Fit@2026!" minLength={6} required />
                            <p className="text-xs text-muted-foreground mt-1">Senha forte obrigatória (ex: Fit@2026!). O paciente poderá alterar depois em Configurações.</p>
                          </div>
                          <Button type="submit" className="w-full gradient-primary" disabled={addPatientMutation.isPending}>
                            {addPatientMutation.isPending ? "Criando conta..." : "Cadastrar Paciente"}
                          </Button>
                        </form>
                      </TabsContent>
                      <TabsContent value="link" className="space-y-4">
                        {(() => {
                          const inviteLink = `${BASE_URL}/cadastro?nutri=${user?.id}`;
                          const proName = profile?.full_name || "seu nutricionista";
                          const clinicName = (profile as any)?.professional_profiles?.[0]?.clinic_name;
                          const waMsg = getWhatsAppInvitationMessage({
                            patientName: "",
                            professionalName: proName,
                            clinicName: clinicName,
                            invitationCode: user?.id || "",
                            templateType: 'patient_invite',
                            customTemplate: templates?.['patient_invite']
                          });
                          const waUrl = `https://wa.me/?text=${encodeURIComponent(waMsg)}`;

                          return (
                            <>
                              {/* Hero card premium */}
                              <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5">
                                <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-primary/10 blur-2xl" />
                                <div className="relative">
                                  <div className="flex items-start gap-3 mb-4">
                                    <div className="p-2 rounded-xl bg-primary/15 ring-1 ring-primary/20">
                                      <Sparkles className="w-5 h-5 text-primary" />
                                    </div>
                                    <div className="flex-1">
                                      <h4 className="font-display font-bold text-base text-foreground">
                                        Link de Cadastro Inteligente
                                      </h4>
                                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                                        Compartilhe e o paciente já entra <strong className="text-foreground">vinculado a você</strong>.
                                      </p>
                                    </div>
                                  </div>

                                  {/* URL preview */}
                                  <div className="flex items-center gap-2 p-3 rounded-xl bg-background/80 border border-border/60 mb-3">
                                    <Link2 className="w-4 h-4 text-muted-foreground shrink-0" />
                                    <code className="flex-1 text-xs text-foreground font-mono truncate">
                                      {inviteLink}
                                    </code>
                                  </div>

                                  {/* Action buttons */}
                                  <div className="grid grid-cols-2 gap-2">
                                    <Button
                                      variant="outline"
                                      className="gap-2 h-11 border-primary/30 hover:bg-primary/5"
                                      onClick={() => {
                                        navigator.clipboard.writeText(inviteLink);
                                        toast.success("Link copiado!", { description: "Cole onde preferir." });
                                      }}
                                    >
                                      <Copy className="w-4 h-4" /> Copiar
                                    </Button>
                                    <Button
                                      className="gap-2 h-11 bg-[#25D366] hover:bg-[#1fb858] text-white"
                                      onClick={() => {
                                        logInvitation({ patientName: "Quick Invite", invitationType: 'patient_invite' });
                                        window.open(waUrl, "_blank");
                                      }}
                                    >
                                      <MessageCircle className="w-4 h-4" /> WhatsApp
                                    </Button>
                                  </div>

                                  {/* Trust badge */}
                                  <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                                    <span>Vínculo automático • Termos assinados • Sem retrabalho</span>
                                  </div>
                                </div>
                              </div>

                              {/* How it works */}
                              <div className="bg-muted/30 p-4 rounded-xl space-y-2">
                                <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Como funciona?</p>
                                <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside leading-relaxed">
                                  <li>Você compartilha o link via WhatsApp ou onde preferir</li>
                                  <li>O paciente faz o cadastro em 1 minuto e aceita os termos</li>
                                  <li>Ele aparece automaticamente na sua lista, pronto para começar</li>
                                </ol>
                              </div>
                            </>
                          );
                        })()}
                      </TabsContent>
                    </Tabs>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>
        </motion.div>

        {isLoading ? (
          <PatientsListSkeleton />
        ) : isError ? (
          <div className="glass-premium rounded-xl p-12 text-center">
            <Users className="w-16 h-16 mx-auto text-destructive mb-4" />
            <h3 className="font-display font-semibold text-lg mb-1">Erro ao carregar pacientes</h3>
            <p className="text-muted-foreground">Tente recarregar a página.</p>
          </div>
        ) : (
          <>
            {/* Summary cards — PRO+ */}
            {minMode("pro") && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {filterButtons.map(fb => (
                  <button
                    key={fb.key}
                    onClick={() => setFilter(fb.key)}
                    className={`glass-premium rounded-xl p-4 text-left transition-all border-2 metric-glow ${filter === fb.key ? "border-primary shadow-glow" : "border-transparent"}`}
                  >
                    <p className="text-2xl font-display font-bold">{scoreCounts[fb.key]}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{fb.label}</p>
                  </button>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Buscar paciente..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
              </div>
              {minMode("pro") && (
                <button
                  onClick={() => setOnlineFilter(!onlineFilter)}
                  className={`inline-flex items-center gap-1.5 px-3 rounded-lg text-xs font-medium transition-all border ${
                    onlineFilter
                      ? "border-success bg-success/10 text-success"
                      : "border-border bg-card text-muted-foreground hover:text-foreground"
                  }`}
                  title="Filtrar online"
                >
                  <span className={`w-2 h-2 rounded-full ${onlineFilter ? 'bg-success animate-pulse' : 'bg-muted-foreground'}`} />
                  Online ({onlineSet.size})
                </button>
              )}
              <div className="flex rounded-lg border border-border overflow-hidden">
                <button
                  onClick={() => setLayout("grid")}
                  className={`p-2.5 transition-colors ${layout === "grid" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"}`}
                  title="Grade"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setLayout("list")}
                  className={`p-2.5 transition-colors ${layout === "list" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"}`}
                  title="Lista"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Prestige Filter Buttons — PRO+ */}
            {minMode("pro") && prestigePlansList.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setPrestigeFilter("all")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                    prestigeFilter === "all"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Crown className="w-3.5 h-3.5" /> Todos os planos
                </button>
                {prestigePlansList.map((pp) => {
                  const count = patients.filter(p => p.prestigePlan?.slug === pp.slug).length;
                  return (
                    <button
                      key={pp.slug}
                      onClick={() => setPrestigeFilter(prestigeFilter === pp.slug ? "all" : pp.slug)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                        prestigeFilter === pp.slug
                          ? "shadow-md"
                          : "bg-card hover:opacity-80"
                      }`}
                      style={{
                        borderColor: prestigeFilter === pp.slug ? pp.color : undefined,
                        backgroundColor: prestigeFilter === pp.slug ? pp.color + "15" : undefined,
                        color: prestigeFilter === pp.slug ? pp.color : undefined,
                      }}
                    >
                      <span>{pp.badge_icon}</span>
                      {pp.name}
                      {pp.crown_enabled && <Crown className="w-3 h-3" style={{ color: pp.color }} />}
                      <span className="ml-0.5 opacity-70">{count}</span>
                    </button>
                  );
                })}
                <button
                  onClick={() => setPrestigeFilter(prestigeFilter === "none" ? "all" : "none")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                    prestigeFilter === "none"
                      ? "border-muted-foreground bg-muted text-foreground"
                      : "border-border bg-card text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Sem prestígio
                  <span className="opacity-70">{patients.filter(p => !p.prestigePlan).length}</span>
                </button>
              </div>
            )}

            {/* Status Tabs (server-side filter) */}
            <Tabs value={statusTab === "active" ? "ativos" : statusTab === "inactive" ? "inativos" : "todos"} onValueChange={handleTabChange} className="space-y-4">
              <TabsList className="flex flex-wrap h-auto gap-1">
                <TabsTrigger value="ativos" className="gap-1.5">
                  <UserCheck className="w-3.5 h-3.5" /> Lista principal
                  <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">{counts.active}</Badge>
                </TabsTrigger>
                <TabsTrigger value="inativos" className="gap-1.5">
                  <UserX className="w-3.5 h-3.5" /> Inativos
                  <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">{counts.inactive}</Badge>
                </TabsTrigger>
              </TabsList>

              {/* Single content area with paginated results */}
              <div>
                {/* Client-side filtered list from current page */}
                <PatientGrid
                  patients={filteredPatients}
                  navigate={navigateToPatient}
                  toggleStatus={toggleStatus}
                  setAssignTarget={setAssignTarget}
                  setAssignDialogOpen={setAssignDialogOpen}
                  removeFromProgram={removeFromProgram}
                  onUpdateExpiry={updateExpiry}
                  search={search}
                  emptyMessage={statusTab === "active" ? "Nenhum paciente ativo na lista principal" : statusTab === "inactive" ? "Nenhum paciente inativo" : "Nenhum paciente encontrado"}
                  layout={layout}
                  allPrestigePlans={prestigePlansList}
                  onlineSet={onlineSet}
                  setExpiryTarget={setExpiryTarget}
                />

                {/* Pagination Controls */}
                <PaginationControls
                  pagination={pagination}
                  onPageChange={handlePageChange}
                  onPageSizeChange={handlePageSizeChange}
                  isLoading={isFetching}
                />
              </div>
            </Tabs>
          </>
        )}
      </div>
      )}

      {/* Bulk Manage Dialog */}
      <Dialog open={bulkManageOpen} onOpenChange={setBulkManageOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              {bulkMode === "deactivate" ? (
                <><ToggleLeft className="w-5 h-5 text-destructive" /> Desativar Pacientes</>
              ) : (
                <><ToggleRight className="w-5 h-5 text-success" /> Ativar Pacientes</>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={bulkSearch}
                onChange={e => setBulkSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex items-center justify-between text-sm">
              <button onClick={selectAllBulk} className="text-primary hover:underline text-xs">
                {bulkSelected.size === bulkManageList.length ? "Desmarcar todos" : "Selecionar todos"}
              </button>
              <span className="text-muted-foreground text-xs">
                {bulkSelected.size} de {bulkManageList.length} selecionados
              </span>
            </div>

            <ScrollArea className="h-[350px] rounded-lg border border-border">
              <div className="divide-y divide-border">
                {bulkManageList.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground text-sm">
                    {bulkMode === "deactivate" ? "Nenhum paciente ativo encontrado" : "Nenhum paciente inativo encontrado"}
                  </div>
                ) : (
                  bulkManageList.map(p => (
                    <label
                      key={p.id}
                      className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-muted/50 ${
                        bulkSelected.has(p.id) ? "bg-primary/5" : ""
                      }`}
                    >
                      <Checkbox
                        checked={bulkSelected.has(p.id)}
                        onCheckedChange={() => toggleBulkSelect(p.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {p.profile?.full_name || "Sem nome"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{p.email || "—"}</p>
                      </div>
                      {p.priorityScore !== undefined && p.status === "active" && (
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          Score {p.priorityScore}
                        </Badge>
                      )}
                    </label>
                  ))
                )}
              </div>
            </ScrollArea>

            <Button
              onClick={executeBulkAction}
              disabled={bulkSelected.size === 0 || bulkToggleMutation.isPending}
              className={`w-full gap-2 ${bulkMode === "deactivate" ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground" : "gradient-primary"}`}
            >
              {bulkToggleMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : bulkMode === "deactivate" ? (
                <ToggleLeft className="w-4 h-4" />
              ) : (
                <ToggleRight className="w-4 h-4" />
              )}
              {bulkMode === "deactivate" ? "Desativar" : "Ativar"} {bulkSelected.size} pacientes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Global Alert Dialog for confirmations */}
      <AlertDialog open={!!alertConfig} onOpenChange={(open) => !open && setAlertConfig(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{alertConfig?.title}</AlertDialogTitle>
            <AlertDialogDescription>{alertConfig?.desc}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              alertConfig?.action();
              setAlertConfig(null);
            }}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AssignProgramDialog
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        patient={assignTarget}
        programs={programs}
        onAssigned={() => {}}
      />

      <EngineSelector 
        isOpen={!!engineSelectorTarget}
        onClose={() => setEngineSelectorTarget(null)}
        patientName={engineSelectorTarget?.name}
        onSelect={(version) => {
          if (!engineSelectorTarget) return;
          const patientId = engineSelectorTarget.id;
          setEngineSelectorTarget(null);
          if (version === 'v3') {
            nav(`/editor-v3/${patientId}`);
          } else {
            nav(`/editor-v2/${patientId}`);
          }
        }}
      />

      {/* Expiry Date Dialog */}
      <Dialog open={!!expiryTarget} onOpenChange={(open) => !open && setExpiryTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Definir Vencimento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">Paciente: <strong>{expiryTarget?.name}</strong></p>
            <div className="space-y-2">
              <Label>Data de Vencimento</Label>
              <Input 
                type="date" 
                defaultValue={expiryTarget?.current || ""} 
                onChange={(e) => {
                  if (expiryTarget) {
                    setExpiryTarget({ ...expiryTarget, current: e.target.value });
                  }
                }}
              />
            </div>
            <Button 
              className="w-full gradient-primary"
              onClick={() => {
                if (expiryTarget) {
                  updateExpiry(expiryTarget.id, expiryTarget.current || null);
                  setExpiryTarget(null);
                  toast.success("Vencimento atualizado");
                }
              }}
            >
              Salvar Alteração
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Protected Action Password Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-destructive" /> Ação Protegida
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Para remover <strong>{deleteTarget?.name}</strong>, digite a senha de administrador.
            </p>
            <div className="space-y-2">
              <Label>Senha de Administrador</Label>
              <Input 
                type="password" 
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Digite a senha..."
                autoFocus
              />
            </div>
            <Button 
              variant="destructive"
              className="w-full"
              onClick={confirmDeleteAction}
              disabled={!deletePassword}
            >
              Confirmar Remoção
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
