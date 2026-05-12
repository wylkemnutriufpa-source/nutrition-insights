import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Pill, Clock, Calendar, AlertTriangle, FileText } from "lucide-react";

export default function PatientPhytotherapySection({ patientId }: { patientId?: string }) {
  const { user } = useAuth();
  const id = patientId || user?.id;

  const { data: protocols = [], isLoading } = useQuery({
    queryKey: ["patient-phytotherapy", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patient_phytotherapy_protocols")
        .select("*")
        .eq("patient_id", id!)
        .eq("is_active", true)
        .order("started_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((p: any) => ({
        ...p,
        phytotherapics: Array.isArray(p.phytotherapics) ? p.phytotherapics : [],
      }));
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border/60 bg-card p-5">
        <div className="h-6 w-48 bg-muted/50 animate-pulse rounded mb-4" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-muted/30 animate-pulse rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (protocols.length === 0) return null;

  return (
    <div className="space-y-4">
      {protocols.map((protocol: any) => (
        <div key={protocol.id} className="rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent p-5">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Pill className="w-4.5 h-4.5 text-emerald-500" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">{protocol.name}</h3>
              <p className="text-xs text-muted-foreground">{protocol.objective}</p>
            </div>
          </div>

          {/* Ativos */}
          <div className="space-y-1.5 mb-4">
            {protocol.phytotherapics.map((p: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-background/50 text-sm">
                <span>{p.name}</span>
                <span className="text-emerald-500 font-mono text-xs">{p.amount}</span>
              </div>
            ))}
          </div>

          {/* Meta info */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            {protocol.dosage && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Pill className="w-3.5 h-3.5" />
                <span>{protocol.dosage}</span>
              </div>
            )}
            {protocol.schedule && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="w-3.5 h-3.5" />
                <span>{protocol.schedule}</span>
              </div>
            )}
            {protocol.duration && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Calendar className="w-3.5 h-3.5" />
                <span>{protocol.duration}</span>
              </div>
            )}
          </div>

          {/* Patient instructions */}
          {protocol.patient_instructions && (
            <div className="mt-4 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
              <div className="flex items-center gap-1.5 mb-1">
                <FileText className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-xs font-semibold text-emerald-500">Orientações</span>
              </div>
              <p className="text-xs text-muted-foreground whitespace-pre-wrap">{protocol.patient_instructions}</p>
            </div>
          )}

          {/* Contraindications */}
          {protocol.contraindications && (
            <div className="mt-3 p-3 rounded-lg bg-red-500/5 border border-red-500/10">
              <div className="flex items-center gap-1.5 mb-1">
                <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                <span className="text-xs font-semibold text-red-400">Atenção</span>
              </div>
              <p className="text-xs text-red-400/80 whitespace-pre-wrap">{protocol.contraindications}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
