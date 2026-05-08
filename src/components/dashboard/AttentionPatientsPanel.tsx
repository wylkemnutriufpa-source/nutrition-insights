import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowRight, Clock, TrendingDown, UserX, Activity } from "lucide-react";

interface AttentionPatient {
  patient_id: string;
  patient_name: string;
  reason: string;
  priority: "high" | "medium" | "low";
  action_suggested?: string;
}

const priorityConfig = {
  high: { bg: "bg-destructive/10 border-destructive/20", badge: "bg-destructive/20 text-destructive", label: "Alto" },
  medium: { bg: "bg-warning/10 border-warning/20", badge: "bg-warning/20 text-warning", label: "Médio" },
  low: { bg: "bg-info/10 border-info/20", badge: "bg-info/20 text-info", label: "Baixo" },
};

const reasonIcons: Record<string, any> = {
  "baixa adesão": TrendingDown,
  "progresso estagnado": Clock,
  "ausência": UserX,
  "risco": AlertTriangle,
};

function getReasonIcon(reason: string) {
  const lower = reason.toLowerCase();
  for (const [key, icon] of Object.entries(reasonIcons)) {
    if (lower.includes(key)) return icon;
  }
  return Activity;
}

export default function AttentionPatientsPanel({
  patients,
  loading,
}: {
  patients: AttentionPatient[];
  loading: boolean;
}) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="glass rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-warning animate-pulse" />
          <h2 className="font-display font-semibold">Precisam de Atenção</h2>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 rounded-lg bg-muted/50 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4 text-warning" />
          </div>
          <div>
            <h2 className="font-display font-semibold">Precisam de Atenção</h2>
            <p className="text-xs text-muted-foreground">
              {patients.length > 0 ? `${patients.length} paciente${patients.length > 1 ? "s" : ""}` : "Todos em dia ✅"}
            </p>
          </div>
        </div>
        {patients.filter(p => p.priority === "high").length > 0 && (
          <span className="text-xs font-bold px-2 py-1 rounded-full bg-destructive/20 text-destructive animate-pulse">
            {patients.filter(p => p.priority === "high").length} urgente{patients.filter(p => p.priority === "high").length > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {patients.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-sm text-muted-foreground">Nenhum paciente precisa de atenção no momento. 🎉</p>
        </div>
      ) : (
        <div className="space-y-2">
          {patients.slice(0, 6).map((p, i) => {
            const config = priorityConfig[p.priority];
            const Icon = getReasonIcon(p.reason);
            return (
              <motion.div
                key={p.patient_id + i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                onClick={() => navigate(`/patients/${p.patient_id}`)}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:shadow-card transition-all ${config.bg}`}
              >
                <div className="w-9 h-9 rounded-full bg-card flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{p.patient_name}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${config.badge}`}>
                      {config.label}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{p.reason}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
