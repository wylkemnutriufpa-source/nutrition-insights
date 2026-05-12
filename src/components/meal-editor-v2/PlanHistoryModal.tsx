import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { History, RotateCcw, Clock, ArrowRight, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface HistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  currentPlanId: string;
  onRestore: (planId: string) => void;
}

export function PlanHistoryModal({ open, onOpenChange, patientId, currentPlanId, onRestore }: HistoryModalProps) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && patientId) {
      loadHistory();
    }
  }, [open, patientId]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("meal_plans")
        .select("id, title, plan_status, created_at, total_calories")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setHistory(data || []);
    } catch (err) {
      console.error("Error loading history:", err);
      toast.error("Erro ao carregar histórico");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            Histórico de Versões
          </DialogTitle>
          <DialogDescription>
            Visualize e restaure versões anteriores deste plano alimentar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              Nenhuma versão anterior encontrada.
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((version) => (
                <div 
                  key={version.id} 
                  className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
                    version.id === currentPlanId 
                      ? "bg-primary/5 border-primary/30 ring-1 ring-primary/20" 
                      : "bg-background border-border hover:border-primary/30"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      {version.id === currentPlanId ? (
                        <CheckCircle2 className="w-4 h-4 text-primary" />
                      ) : (
                        <Clock className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm">{version.title}</span>
                        {version.id === currentPlanId && (
                          <span className="text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full font-bold uppercase tracking-tighter">Atual</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        <span>{format(new Date(version.created_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}</span>
                        <span>•</span>
                        <span>{version.total_calories || 0} kcal</span>
                      </div>
                    </div>
                  </div>

                  {version.id !== currentPlanId && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="gap-1.5 h-8 text-xs font-bold"
                      onClick={() => onRestore(version.id)}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Restaurar
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}