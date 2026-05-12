import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Dumbbell } from "lucide-react";

export default function WorkoutRequestButton() {
  const { user } = useAuth();
  const [sending, setSending] = useState(false);
  const [hasPlans, setHasPlans] = useState<boolean | null>(null);
  const [personalId, setPersonalId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    const check = async () => {
      const { data: link } = await (supabase as any)
        .from("patient_professional_links")
        .select("professional_id")
        .eq("patient_id", user.id)
        .eq("professional_role", "trainer")
        .eq("link_status", "active")
        .limit(1)
        .maybeSingle();

      if (!link) {
        setHasPlans(true);
        return;
      }
      setPersonalId(link.professional_id);

      const { data: plans } = await supabase
        .from("workout_plans")
        .select("id")
        .eq("student_id", user.id)
        .eq("status", "active")
        .limit(1);

      setHasPlans((plans || []).length > 0);
    };
    check();
  }, [user?.id]);

  if (hasPlans === null || hasPlans) return null;

  const handleRequest = async () => {
    if (!user || !personalId) return;
    setSending(true);

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", user.id)
      .single();
    const patientName = profile?.full_name || "Aluno";

    const { error } = await supabase.from("notifications").insert({
      user_id: personalId,
      title: "🏋️ Aluno sem treino",
      message: `${patientName} está sem plano de treino e solicitou ativação.`,
      type: "workout_request",
      priority: "high",
      target_route: "/personal-workouts",
      entity_type: "workout_request",
      entity_id: user.id,
    } as any);

    if (error) {
      toast.error("Erro ao enviar solicitação");
    } else {
      toast.success("🏋️ Solicitação enviada! Seu personal será notificado.");
      setHasPlans(true);
    }
    setSending(false);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleRequest}
      disabled={sending}
      className="gap-2 border-dashed border-primary/50 text-primary hover:bg-primary/10"
    >
      <Dumbbell className="w-4 h-4" />
      {sending ? "Enviando..." : "Estou sem Treino"}
    </Button>
  );
}
