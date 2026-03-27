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
      // Check if patient has a personal trainer
      const { data: link } = await supabase
        .from("professional_patient_links")
        .select("professional_id")
        .eq("patient_id", user.id)
        .eq("professional_role", "trainer")
        .eq("link_status", "active")
        .limit(1)
        .maybeSingle();

      if (!link) {
        setHasPlans(true); // hide button if no trainer
        return;
      }
      setPersonalId(link.professional_id);

      // Check if has active workout plans
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

  // Hide if loading, has plans, or no trainer
  if (hasPlans === null || hasPlans) return null;

  const handleRequest = async () => {
    if (!user || !personalId) return;
    setSending(true);

    // Get patient name
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", user.id)
      .single();
    const patientName = profile?.full_name || "Aluno";

    // Send notification to personal trainer
    const { error } = await supabase.from("notifications").insert({
      user_id: personalId,
      title: "🏋️ Aluno sem treino",
      message: `${patientName} está sem plano de treino e solicitou ativação.`,
      type: "workout_request",
      priority: "high",
      target_route: "/personal-workouts",
      entity_type: "workout_request",
      entity_id: user.id,
    });

    if (error) {
      toast.error("Erro ao enviar solicitação");
    } else {
      toast.success("🏋️ Solicitação enviada! Seu personal será notificado.");
      setHasPlans(true); // hide button after sending
    }
    setSending(false);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleRequest}
      disabled={sending}
      className="gap-2 border-dashed border-orange-500/50 text-orange-500 hover:bg-orange-500/10"
    >
      <Dumbbell className="w-4 h-4" />
      {sending ? "Enviando..." : "Estou sem Treino"}
    </Button>
  );
}
