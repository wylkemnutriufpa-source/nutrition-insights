import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getPatientFlagsByDomain, DOMAIN_CONFIG, type FlagWithCatalog } from "@/lib/clinicalFlags";
import { AlertTriangle, CheckCircle2, Shield } from "lucide-react";

interface ClinicalFlagsSummaryProps {
  patientId: string;
  compact?: boolean;
}

export default function ClinicalFlagsSummary({ patientId, compact = false }: ClinicalFlagsSummaryProps) {
  const [flagsByDomain, setFlagsByDomain] = useState<Record<string, FlagWithCatalog[]>>({});
  const [loading, setLoading] = useState(true);
  const [totalFlags, setTotalFlags] = useState(0);

  useEffect(() => {
    if (!patientId) return;
    setLoading(true);
    getPatientFlagsByDomain(patientId)
      .then((grouped) => {
        setFlagsByDomain(grouped);
        setTotalFlags(Object.values(grouped).flat().length);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [patientId]);

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-6 w-48" />
        <div className="grid grid-cols-2 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (totalFlags === 0) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-muted/30 text-sm text-muted-foreground">
        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
        <span>Nenhuma flag clínica detectada. Complete a anamnese para gerar o perfil clínico.</span>
      </div>
    );
  }

  const domains = Object.keys(flagsByDomain).sort((a, b) => {
    return (flagsByDomain[b]?.length || 0) - (flagsByDomain[a]?.length || 0);
  });

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Shield className="w-4 h-4 text-primary" />
          <span>{totalFlags} flags clínicas ativas</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {domains.map((domain) =>
            flagsByDomain[domain].map((flag) => {
              const config = DOMAIN_CONFIG[domain] || DOMAIN_CONFIG.geral;
              return (
                <Badge
                  key={flag.id}
                  variant="outline"
                  className="text-xs gap-1 py-0.5"
                  title={flag.description || flag.display_name}
                >
                  <span>{config.icon}</span>
                  {flag.display_name}
                  {flag.confidence < 0.8 && (
                    <span className="text-[10px] text-muted-foreground">({Math.round(flag.confidence * 100)}%)</span>
                  )}
                </Badge>
              );
            })
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          Perfil Clínico — {totalFlags} flags detectadas
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <AnimatePresence mode="popLayout">
          {domains.map((domain, idx) => {
            const config = DOMAIN_CONFIG[domain] || DOMAIN_CONFIG.geral;
            const flags = flagsByDomain[domain];

            return (
              <motion.div
                key={domain}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.06, duration: 0.4 }}
                className="rounded-xl border border-border bg-card p-4 space-y-2.5"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{config.icon}</span>
                  <span className={`font-medium text-sm ${config.color}`}>{config.label}</span>
                  <Badge variant="secondary" className="text-[10px] ml-auto">{flags.length}</Badge>
                </div>

                <div className="space-y-1.5">
                  {flags.map((flag) => (
                    <div
                      key={flag.id}
                      className="flex items-center justify-between gap-2 text-sm py-1 px-2 rounded-md bg-muted/40"
                    >
                      <span className="text-foreground">{flag.display_name}</span>
                      <div className="flex items-center gap-1.5">
                        {flag.confidence >= 0.9 && (
                          <span className="text-[10px] text-emerald-500 font-medium">Alta</span>
                        )}
                        {flag.confidence >= 0.7 && flag.confidence < 0.9 && (
                          <span className="text-[10px] text-amber-500 font-medium">Média</span>
                        )}
                        {flag.confidence < 0.7 && (
                          <span className="text-[10px] text-muted-foreground font-medium">Baixa</span>
                        )}
                        <div
                          className="w-8 h-1.5 rounded-full bg-muted overflow-hidden"
                          title={`Confiança: ${Math.round(flag.confidence * 100)}%`}
                        >
                          <div
                            className={`h-full rounded-full ${
                              flag.confidence >= 0.9 ? "bg-emerald-500" :
                              flag.confidence >= 0.7 ? "bg-amber-500" : "bg-muted-foreground"
                            }`}
                            style={{ width: `${flag.confidence * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
