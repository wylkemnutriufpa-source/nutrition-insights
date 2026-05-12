import { useState } from "react";
import { Button } from "@v1/components/ui/button";
import { supabase } from "@v1/integrations/supabase/client";
import { useAuth } from "@v1/lib/auth";
import { toast } from "sonner";
import { CreditCard } from "lucide-react";
import { usePatientPlanStatus } from "@v1/hooks/usePatientPlanStatus";

export default function PlanRequestButton() {
  const { user } = useAuth();
  const planStatus = usePatientPlanStatus();
  const [sending, setSending] = useState(false);

  // ── SOVEREIGN RULE: Hide if plan exists in any sovereign/pending state ──
  if (
    planStatus.status === "plan_delivered" ||
    planStatus.status === "plan_approved_pending_publish" ||
    planStatus.status === "plan_under_review" ||
    planStatus.status === "plan_pending_approval" ||
    planStatus.status === "plan_draft" ||
    planStatus.status === "plan_pending_production" ||
    planStatus.status === "loading"
  ) {
    return null;
  }

  const handleRequest = async () => {
    if (!user) return;
    setSending(true);

    // Try nutritionist_patients first, fallback to onboarding_pipelines
    let nutriId: string | null = null;

    const { data: rel } = await supabase
      .from("nutritionist_patients")
      .select("nutritionist_id")
      .eq("patient_id", user.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    nutriId = rel?.nutritionist_id || null;

    if (!nutriId) {
      const { data: pipeline } = await supabase
        .from("onboarding_pipelines")
        .select("nutritionist_id")
        .eq("patient_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      nutriId = pipeline?.nutritionist_id || null;
    }

    const { error } = await supabase.from("plan_requests").insert({
      patient_id: user.id,
      nutritionist_id: nutriId,
      message: "Paciente solicita ativação/ajuste de plano.",
    });

    if (error) {
      if (error.code === "23505") {
        toast.info("Você já enviou uma solicitação. Aguarde o retorno do profissional.");
      } else {
        toast.error("Erro ao enviar solicitação");
      }
    } else {
      // Send notification to nutritionist
      if (nutriId) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", user.id)
          .single();
        const patientName = profile?.full_name || "Paciente";

        await supabase.from("notifications").insert({
          user_id: nutriId,
          title: "🍽️ Paciente sem plano alimentar",
          message: `${patientName} está sem plano alimentar e solicitou ativação.`,
          type: "plan_request",
          priority: "high",
          target_route: "/clinical-workspace",
          entity_type: "plan_request",
          entity_id: user.id,
        } as any);
      }
      toast.success("📋 Solicitação enviada! Seu nutricionista será notificado.");
    }
    setSending(false);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleRequest}
      disabled={sending}
      className="gap-2 border-dashed border-warning/50 text-warning hover:bg-warning/10"
    >
      <CreditCard className="w-4 h-4" />
      {sending ? "Enviando..." : "Estou sem Plano"}
    </Button>
  );
}
