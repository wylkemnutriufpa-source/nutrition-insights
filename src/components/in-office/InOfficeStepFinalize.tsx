import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowLeft, Loader2, ClipboardList, Activity, Utensils, FileText } from "lucide-react";

interface Props {
  patientId: string;
  onPrev: () => void;
  onComplete: () => void;
  sessionId: string;
}

export default function InOfficeStepFinalize({ patientId, onPrev, onComplete, sessionId }: Props) {
  const [session, setSession] = useState<any>(null);
  const [patientName, setPatientName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [sessRes, profRes] = await Promise.all([
        supabase.from("in_office_sessions" as any).select("*").eq("id", sessionId).maybeSingle(),
        supabase.from("profiles").select("full_name").eq("user_id", patientId).maybeSingle(),
      ]);
      setSession(sessRes.data);
      setPatientName(profRes.data?.full_name || "Paciente");
      setLoading(false);
    })();
  }, [sessionId, patientId]);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  const checks = [
    { label: "Anamnese preenchida", done: session?.anamnesis_completed, icon: ClipboardList },
    { label: "Avaliação física registrada", done: session?.assessment_completed, icon: Activity },
    { label: "Plano alimentar criado", done: session?.meal_plan_completed, icon: Utensils },
  ];

  const allDone = checks.every(c => c.done);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="w-4 h-4 text-primary" />
          Resumo da Sessão — {patientName}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          {checks.map(c => {
            const Icon = c.icon;
            return (
              <div key={c.label} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${c.done ? "border-emerald-500/30 bg-emerald-500/5" : "border-border bg-muted/30"}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${c.done ? "bg-emerald-500/20" : "bg-muted"}`}>
                  {c.done ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Icon className="w-4 h-4 text-muted-foreground" />}
                </div>
                <span className={`text-sm font-medium ${c.done ? "text-foreground" : "text-muted-foreground"}`}>{c.label}</span>
              </div>
            );
          })}
        </div>

        {!allDone && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-sm text-amber-700 dark:text-amber-400">
            ⚠️ Algumas etapas não foram concluídas. Você pode voltar e completá-las ou finalizar parcialmente.
          </div>
        )}

        <div className="flex items-center justify-between pt-4">
          <Button variant="outline" onClick={onPrev} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Button>
          <Button onClick={onComplete} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
            <CheckCircle2 className="w-4 h-4" /> Finalizar Sessão
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
