import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@v1/integrations/supabase/client";
import { useAuth } from "@v1/lib/auth";
import { motion } from "framer-motion";
import { Card, CardContent } from "@v1/components/ui/card";
import { Button } from "@v1/components/ui/button";
import { Badge } from "@v1/components/ui/badge";
import {
  Users, FileText, UtensilsCrossed, MessageSquare,
  CheckCircle2, ArrowRight, Rocket, X, Sparkles
} from "lucide-react";
import { cn } from "@v1/lib/utils";

const DISMISSED_KEY = "fitjourney_setup_wizard_dismissed";

export default function SetupWizard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [steps, setSteps] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const checkSteps = useCallback(async () => {
    if (!user) return;
    const dismissed = localStorage.getItem(DISMISSED_KEY);
    if (dismissed === "true") { setLoading(false); return; }

    setLoading(true);
    const countQuery = (table: string, filters: Record<string, any>) => {
      let q = (supabase as any).from(table).select("id", { count: "exact", head: true });
      for (const [k, v] of Object.entries(filters)) q = q.eq(k, v);
      return q as Promise<{ count: number | null }>;
    };
    const [patientsRes, protocolsRes, plansRes] = await Promise.all([
      countQuery("nutritionist_patients", { nutritionist_id: user.id }),
      countQuery("nutrition_protocols", { created_by: user.id }),
      countQuery("meal_plans", { nutritionist_id: user.id, plan_status: "published" }),
    ]);

    const results: Record<string, boolean> = {
      first_patient: (patientsRes.count || 0) > 0,
      first_protocol: (protocolsRes.count || 0) > 0,
      first_plan: (plansRes.count || 0) > 0,
    };

    setSteps(results);
    const allDone = Object.values(results).every(Boolean);
    if (allDone) {
      localStorage.setItem(DISMISSED_KEY, "true");
    } else {
      setVisible(true);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { checkSteps(); }, [checkSteps]);

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "true");
    setVisible(false);
  };

  const stepDefs = [
    { key: "first_patient", label: "Cadastrar 1º Paciente", description: "Adicione seu primeiro paciente", icon: Users, route: "/patients" },
    { key: "first_protocol", label: "Criar 1º Protocolo", description: "Monte um protocolo nutricional", icon: FileText, route: "/protocols" },
    { key: "first_plan", label: "Publicar 1º Plano", description: "Crie e publique um plano alimentar", icon: UtensilsCrossed, route: "/meal-plans" },
  ];

  const completedCount = Object.values(steps).filter(Boolean).length;
  const progress = (completedCount / stepDefs.length) * 100;

  if (!visible || loading) return null;

  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="glass border-primary/20 overflow-hidden">
        <div className="h-1 bg-muted">
          <motion.div className="h-full bg-primary" initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.8 }} />
        </div>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Rocket className="w-5 h-5 text-primary" />
              <h3 className="font-display font-bold text-sm">Setup do Consultório</h3>
              <Badge variant="outline" className="text-[10px]">{completedCount}/{stepDefs.length}</Badge>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={dismiss}>
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {stepDefs.map((step) => {
              const done = steps[step.key];
              const Icon = step.icon;
              return (
                <motion.button
                  key={step.key}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => !done && navigate(step.route)}
                  className={cn(
                    "relative p-3 rounded-lg text-left transition-all",
                    done
                      ? "bg-primary/10 border border-primary/20"
                      : "bg-muted/50 border border-border hover:border-primary/30 hover:bg-primary/5 cursor-pointer"
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {done ? (
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                    ) : (
                      <Icon className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span className={cn("text-xs font-medium", done && "text-primary line-through")}>{step.label}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-tight">{step.description}</p>
                  {!done && <ArrowRight className="absolute top-3 right-3 w-3 h-3 text-muted-foreground" />}
                </motion.button>
              );
            })}
          </div>
          {completedCount === stepDefs.length - 1 && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-center text-primary mt-2 flex items-center justify-center gap-1">
              <Sparkles className="w-3 h-3" /> Falta só mais um passo!
            </motion.p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
