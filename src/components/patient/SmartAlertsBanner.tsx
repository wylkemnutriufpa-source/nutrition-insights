import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { 
  AlertTriangle, ClipboardList, ListChecks, FileText, 
  ArrowRight, X, Sparkles, ShieldCheck, Flame
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { isCalorieClamped, isMacroInconsistent } from "@/lib/formatMacros";

interface SmartAlert {

  id: string;
  icon: typeof AlertTriangle;
  title: string;
  message: string;
  action?: string;
  actionLabel?: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

interface Props {
  patientId: string;
  onAction?: (action: string) => void;
}

export default function SmartAlertsBanner({ patientId, onAction }: Props) {
  const [alerts, setAlerts] = useState<SmartAlert[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    checkAlerts();
  }, [patientId]);

  // Rotate alerts every 8 seconds
  useEffect(() => {
    const visible = alerts.filter(a => !dismissed.has(a.id));
    if (visible.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % visible.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [alerts, dismissed]);

  const checkAlerts = async () => {
    const detected: SmartAlert[] = [];
    const today = new Date().toISOString().split("T")[0];

    // Parallel checks
    const [anamnesisRes, checklistRes, protocolsRes] = await Promise.all([
      supabase.from("patient_anamnesis").select("id, status").eq("user_id", patientId).order("created_at", { ascending: false }).limit(1),
      supabase.from("checklist_tasks").select("id, completed").eq("patient_id", patientId).eq("date", today),
      supabase.from("patient_protocols").select("id, status, protocol_id").eq("patient_id", patientId).eq("status", "active"),
    ]);

    // 1. Anamnesis not filled
    const anamnesis = anamnesisRes.data?.[0];
    if (!anamnesis || anamnesis.status !== "completed") {
      detected.push({
        id: "anamnesis_missing",
        icon: ClipboardList,
        title: "Anamnese não preenchida",
        message: "O paciente ainda não completou a anamnese. Sem ela, não é possível gerar insights de IA.",
        action: "anamnesis",
        actionLabel: "Preencher",
        color: "text-warning",
        bgColor: "bg-warning/5",
        borderColor: "border-warning/20",
      });
    }

    // 2. Checklist adherence
    const checklistTasks = checklistRes.data || [];
    if (checklistTasks.length > 0) {
      const completed = checklistTasks.filter(t => t.completed).length;
      const pct = Math.round((completed / checklistTasks.length) * 100);
      if (pct < 50) {
        detected.push({
          id: "checklist_low",
          icon: ListChecks,
          title: `Checklist hoje: ${pct}%`,
          message: `Apenas ${completed}/${checklistTasks.length} tarefas concluídas hoje. Adesão abaixo do ideal.`,
          action: "checklist",
          actionLabel: "Ver Checklist",
          color: "text-destructive",
          bgColor: "bg-destructive/5",
          borderColor: "border-destructive/20",
        });
      }
    } else {
      detected.push({
        id: "checklist_empty",
        icon: ListChecks,
        title: "Sem checklist hoje",
        message: "O paciente não possui tarefas no checklist para hoje. Ative um protocolo ou adicione tarefas.",
        action: "checklist",
        actionLabel: "Configurar",
        color: "text-info",
        bgColor: "bg-info/5",
        borderColor: "border-info/20",
      });
    }

    // 3. Active protocols
    const activeProtocols = protocolsRes.data || [];
    if (activeProtocols.length > 0) {
      detected.push({
        id: "protocols_active",
        icon: FileText,
        title: `${activeProtocols.length} protocolo${activeProtocols.length > 1 ? "s" : ""} ativo${activeProtocols.length > 1 ? "s" : ""}`,
        message: "Protocolos ativos sincronizam tarefas automaticamente no checklist diário.",
        action: "protocols",
        actionLabel: "Ver Protocolos",
        color: "text-primary",
        bgColor: "bg-primary/5",
        borderColor: "border-primary/20",
      });
    }

    setAlerts(detected);
  };

  const dismiss = (id: string) => {
    setDismissed(prev => new Set(prev).add(id));
  };

  const visible = alerts.filter(a => !dismissed.has(a.id));
  if (visible.length === 0) return null;

  const current = visible[currentIndex % visible.length];
  if (!current) return null;
  const Icon = current.icon;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={current.id}
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 5 }}
        className={`rounded-xl ${current.bgColor} border ${current.borderColor} p-3 flex items-center gap-3`}
      >
        <Icon className={`w-5 h-5 flex-shrink-0 ${current.color}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">{current.title}</p>
          <p className="text-xs text-muted-foreground">{current.message}</p>
        </div>
        {current.action && onAction && (
          <Button
            size="sm"
            variant="ghost"
            className={`gap-1 text-xs ${current.color} hover:${current.bgColor}`}
            onClick={() => onAction(current.action!)}
          >
            {current.actionLabel} <ArrowRight className="w-3 h-3" />
          </Button>
        )}
        <button onClick={() => dismiss(current.id)} className="text-muted-foreground hover:text-foreground p-1">
          <X className="w-3 h-3" />
        </button>
        {visible.length > 1 && (
          <div className="flex gap-1">
            {visible.map((_, i) => (
              <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === currentIndex % visible.length ? "bg-foreground" : "bg-muted-foreground/30"}`} />
            ))}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
