import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date();
    const results = { checked: 0, notified: 0, blocked: 0, advanced: 0 };

    // Fetch all active enrollments
    const { data: enrollments, error } = await supabase
      .from("program_enrollments")
      .select("*")
      .not("status", "in", '("completed","pending_onboarding")');

    if (error) throw error;
    if (!enrollments || enrollments.length === 0) {
      return new Response(JSON.stringify({ message: "No active enrollments", ...results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    for (const enrollment of enrollments) {
      results.checked++;

      // Check weight deadline (15 days)
      if (enrollment.next_weight_due_at && enrollment.status === "protocol_1_active") {
        const weightDue = new Date(enrollment.next_weight_due_at);
        const daysOverdue = Math.floor((now.getTime() - weightDue.getTime()) / 86400000);

        if (daysOverdue >= 0 && daysOverdue < 3) {
          // Send reminder
          await supabase.from("notifications").insert({
            user_id: enrollment.patient_id,
            title: "⏰ Atualização de peso pendente",
            message: "Seu prazo para enviar o peso chegou! Envie agora para manter seu protocolo ativo.",
            type: "program",
            action_url: "/client/dashboard",
          });

          await supabase
            .from("program_enrollments")
            .update({ status: "awaiting_weight_update" })
            .eq("id", enrollment.id);

          results.notified++;
        } else if (daysOverdue >= 3) {
          // Past grace period, just keep reminding
          // Don't block for weight alone, but mark as awaiting
          await supabase
            .from("program_enrollments")
            .update({ status: "awaiting_weight_update" })
            .eq("id", enrollment.id);
        }
      }

      // Check full review deadline (30 days)
      if (enrollment.next_full_review_due_at) {
        const reviewDue = new Date(enrollment.next_full_review_due_at);
        const daysOverdue = Math.floor((now.getTime() - reviewDue.getTime()) / 86400000);

        if (daysOverdue >= 0 && daysOverdue < 5) {
          // Send reminder for full assessment
          await supabase.from("notifications").insert({
            user_id: enrollment.patient_id,
            title: "📸 Reavaliação completa pendente",
            message: "Envie seu peso atualizado e novas fotos corporais para continuar sua evolução no programa.",
            type: "program",
            action_url: "/client/dashboard",
          });

          if (enrollment.status !== "protocol_locked") {
            await supabase
              .from("program_enrollments")
              .update({ status: "awaiting_full_reassessment" })
              .eq("id", enrollment.id);
          }

          results.notified++;
        } else if (daysOverdue >= 5) {
          // Block protocol progression
          await supabase
            .from("program_enrollments")
            .update({
              status: "protocol_locked",
              blocked_reason: "Reavaliação completa vencida. Envie peso e fotos para continuar.",
            })
            .eq("id", enrollment.id);

          // Notify patient
          await supabase.from("notifications").insert({
            user_id: enrollment.patient_id,
            title: "🔒 Protocolo bloqueado",
            message: "Seu protocolo foi pausado. Envie seu peso e fotos corporais para desbloquear e continuar sua evolução.",
            type: "alert",
            action_url: "/client/dashboard",
          });

          // Notify professional
          await supabase.from("notifications").insert({
            user_id: enrollment.professional_id,
            title: "⚠️ Paciente com protocolo bloqueado",
            message: `Protocolo bloqueado por falta de reavaliação. Verifique o status no programa.`,
            type: "alert",
          });

          results.blocked++;
        }
      }

      // Check if protocol 2 can be activated
      if (enrollment.status === "protocol_2_ready") {
        // Verify requirements
        const hasWeight = enrollment.last_weight_at && 
          new Date(enrollment.last_weight_at).getTime() > new Date(enrollment.onboarding_completed_at || 0).getTime();
        const hasPhotos = enrollment.last_photos_at &&
          new Date(enrollment.last_photos_at).getTime() > new Date(enrollment.onboarding_completed_at || 0).getTime();

        if (hasWeight && hasPhotos) {
          // Check adherence
          const { count: taskCount } = await supabase
            .from("checklist_tasks")
            .select("*", { count: "exact", head: true })
            .eq("patient_id", enrollment.patient_id)
            .eq("completed", true)
            .gte("date", enrollment.onboarding_completed_at || enrollment.started_at);

          if ((taskCount || 0) >= 10) {
            // Auto-advance to protocol 2
            const newWeightDue = new Date(now.getTime() + 15 * 86400000);
            const newReviewDue = new Date(now.getTime() + 30 * 86400000);

            await supabase
              .from("program_enrollments")
              .update({
                status: "protocol_2_active",
                current_phase: 2,
                next_weight_due_at: newWeightDue.toISOString(),
                next_full_review_due_at: newReviewDue.toISOString(),
              })
              .eq("id", enrollment.id);

            await supabase.from("protocol_cycles").insert({
              enrollment_id: enrollment.id,
              phase: 2,
              protocol_name: "Déficit Estratégico",
              status: "active",
              started_at: now.toISOString(),
            });

            // End previous cycle
            await supabase
              .from("protocol_cycles")
              .update({ status: "completed", ended_at: now.toISOString() })
              .eq("enrollment_id", enrollment.id)
              .eq("phase", 1)
              .eq("status", "active");

            await supabase.from("notifications").insert({
              user_id: enrollment.patient_id,
              title: "🎉 Protocolo 2 Ativado!",
              message: "Parabéns! Você avançou para o Protocolo 2 — Déficit Estratégico. Continue firme!",
              type: "program",
              action_url: "/client/dashboard",
            });

            results.advanced++;
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true, ...results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
