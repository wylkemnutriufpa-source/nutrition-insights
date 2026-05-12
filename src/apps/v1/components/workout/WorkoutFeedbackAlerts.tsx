import { useState, useEffect } from "react";
import { supabase } from "@v1/integrations/supabase/client";
import { useAuth } from "@v1/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@v1/components/ui/card";
import { Button } from "@v1/components/ui/button";
import { Badge } from "@v1/components/ui/badge";
import { Textarea } from "@v1/components/ui/textarea";
import { toast } from "sonner";
import {
  AlertTriangle, ArrowRightLeft, CheckCircle2, XCircle,
  Brain, TrendingDown, Zap, MessageSquare, Clock
} from "lucide-react";

const SEVERITY_STYLES: Record<string, string> = {
  mild: "border-l-yellow-500 bg-yellow-500/5",
  moderate: "border-l-orange-500 bg-orange-500/5",
  severe: "border-l-destructive bg-destructive/5",
};

export default function WorkoutFeedbackAlerts() {
  const { user } = useAuth();
  const [substitutions, setSubstitutions] = useState<any[]>([]);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [personalNotes, setPersonalNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [subsRes, fbRes] = await Promise.all([
        (supabase as any).from("workout_exercise_substitutions")
          .select("*")
          .eq("personal_id", user.id)
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(20),
        (supabase as any).from("workout_session_feedback")
          .select("*")
          .eq("processed", false)
          .order("created_at", { ascending: false })
          .limit(20),
      ]);
      setSubstitutions(subsRes.data || []);
      setFeedbacks(fbRes.data || []);
      setLoading(false);
    };
    load();

    // Realtime for new substitutions
    const channel = supabase
      .channel("workout-subs")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "workout_exercise_substitutions",
      }, (payload) => {
        if ((payload.new as any).personal_id === user.id) {
          setSubstitutions(prev => [payload.new as any, ...prev]);
          toast.info("🧠 Nova sugestão de substituição da IFJ!", { duration: 5000 });
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const handleSubstitution = async (subId: string, status: "approved" | "rejected", approvedExercise?: string) => {
    const notes = personalNotes[subId] || null;
    await (supabase as any).from("workout_exercise_substitutions")
      .update({
        status,
        approved_exercise: approvedExercise || null,
        personal_notes: notes,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", subId);

    setSubstitutions(prev => prev.filter(s => s.id !== subId));
    toast.success(status === "approved" ? "Substituição aprovada ✅" : "Substituição rejeitada");
  };

  const markFeedbackProcessed = async (fbId: string) => {
    await (supabase as any).from("workout_session_feedback")
      .update({ processed: true })
      .eq("id", fbId);
    setFeedbacks(prev => prev.filter(f => f.id !== fbId));
  };

  if (loading) return null;
  if (substitutions.length === 0 && feedbacks.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* AI Substitution Suggestions */}
      {substitutions.length > 0 && (
        <Card className="border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" />
              Sugestões da IFJ
              <Badge className="text-xs">{substitutions.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {substitutions.map(sub => {
              const suggestions = Array.isArray(sub.suggested_exercises) ? sub.suggested_exercises : [];
              return (
                <div key={sub.id} className={`rounded-lg border-l-4 p-4 space-y-3 ${SEVERITY_STYLES[sub.severity] || SEVERITY_STYLES.moderate}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle className="w-4 h-4 text-warning" />
                        <span className="font-semibold text-sm">Dor: {sub.pain_area}</span>
                        <Badge variant="outline" className="text-[9px]">{sub.severity}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{sub.reason}</p>
                    </div>
                    <Clock className="w-4 h-4 text-muted-foreground" />
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium line-through text-destructive/70">{sub.original_exercise}</span>
                    <ArrowRightLeft className="w-4 h-4 text-muted-foreground" />
                    <span className="text-primary font-medium">Substituições sugeridas:</span>
                  </div>

                  <div className="grid gap-1.5">
                    {suggestions.map((s: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded-md bg-background/60 border">
                        <div>
                          <span className="text-sm font-medium">{s.name || s}</span>
                          {s.reason && <p className="text-[10px] text-muted-foreground">{s.reason}</p>}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1"
                          onClick={() => handleSubstitution(sub.id, "approved", s.name || s)}
                        >
                          <CheckCircle2 className="w-3 h-3" /> Aprovar
                        </Button>
                      </div>
                    ))}
                  </div>

                  <div>
                    <Textarea
                      placeholder="Observação do Personal (opcional)..."
                      className="text-xs"
                      rows={2}
                      value={personalNotes[sub.id] || ""}
                      onChange={e => setPersonalNotes(prev => ({ ...prev, [sub.id]: e.target.value }))}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      className="flex-1 gap-1"
                      onClick={() => handleSubstitution(sub.id, "rejected")}
                    >
                      <XCircle className="w-3.5 h-3.5" /> Rejeitar Todas
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Student Feedbacks */}
      {feedbacks.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              Feedbacks dos Alunos
              <Badge variant="secondary" className="text-xs">{feedbacks.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {feedbacks.map(fb => {
              const pains = Array.isArray(fb.pain_areas) ? fb.pain_areas : [];
              return (
                <div key={fb.id} className="p-3 rounded-lg bg-muted/30 border space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge>{fb.overall_feeling || "?"}</Badge>
                      <span className="text-xs text-muted-foreground">
                        Fadiga: {fb.fatigue_level}/10
                      </span>
                      {fb.motivation_level <= 2 && (
                        <Badge variant="destructive" className="text-[9px]">
                          <TrendingDown className="w-3 h-3 mr-0.5" /> Desmotivado
                        </Badge>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(fb.created_at).toLocaleDateString("pt-BR")}
                    </span>
                  </div>

                  {pains.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {pains.map((p: any, i: number) => (
                        <Badge key={i} variant="outline" className="text-[10px] gap-0.5">
                          <AlertTriangle className="w-2.5 h-2.5 text-warning" />
                          {p.area} ({p.intensity})
                        </Badge>
                      ))}
                    </div>
                  )}

                  {fb.notes && <p className="text-xs text-muted-foreground">{fb.notes}</p>}

                  <Button size="sm" variant="ghost" className="text-xs" onClick={() => markFeedbackProcessed(fb.id)}>
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Marcar como lido
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
