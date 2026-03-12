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
    const results = { checked: 0, notified: 0, blocked: 0, advanced: 0, completed: 0 };

    // Fetch all active enrollments (exclude completed and pending_onboarding)
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

      // ─── WEIGHT DEADLINE CHECK (15 days) ─── applies to all active phases
      const activePhaseStatuses = [
        "protocol_1_active",
        "protocol_2_active",
        "protocol_3_active",
        "protocol_4_active",
      ];

      if (enrollment.next_weight_due_at && activePhaseStatuses.includes(enrollment.status)) {
        const weightDue = new Date(enrollment.next_weight_due_at);
        const daysOverdue = Math.floor((now.getTime() - weightDue.getTime()) / 86400000);

        if (daysOverdue >= 0 && daysOverdue < 3) {
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
          await supabase
            .from("program_enrollments")
            .update({ status: "awaiting_weight_update" })
            .eq("id", enrollment.id);
        }
      }

      // ─── FULL REVIEW DEADLINE CHECK (30 days) ─── applies to all phases
      if (enrollment.next_full_review_due_at) {
        const reviewDue = new Date(enrollment.next_full_review_due_at);
        const daysOverdue = Math.floor((now.getTime() - reviewDue.getTime()) / 86400000);

        if (daysOverdue >= 0 && daysOverdue < 5) {
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

          await supabase.from("notifications").insert({
            user_id: enrollment.patient_id,
            title: "🔒 Protocolo bloqueado",
            message: "Seu protocolo foi pausado. Envie seu peso e fotos corporais para desbloquear e continuar sua evolução.",
            type: "alert",
            action_url: "/client/dashboard",
          });

          await supabase.from("notifications").insert({
            user_id: enrollment.professional_id,
            title: "⚠️ Paciente com protocolo bloqueado",
            message: `Protocolo bloqueado por falta de reavaliação. Verifique o status no programa.`,
            type: "alert",
          });

          results.blocked++;
        }
      }

      // ─── PHASE TRANSITION HELPER ───
      async function checkAndAdvancePhase(
        enrollment: any,
        readyStatus: string,
        targetPhase: number,
        targetStatus: string,
        protocolName: string,
        previousPhase: number,
        notificationMessage: string,
        notificationTitle: string
      ) {
        if (enrollment.status !== readyStatus) return false;

        const referenceDate = enrollment.onboarding_completed_at || enrollment.started_at;

        const hasWeight =
          enrollment.last_weight_at &&
          new Date(enrollment.last_weight_at).getTime() > new Date(referenceDate).getTime();
        const hasPhotos =
          enrollment.last_photos_at &&
          new Date(enrollment.last_photos_at).getTime() > new Date(referenceDate).getTime();

        if (!hasWeight || !hasPhotos) return false;

        // Check adherence (minimum 10 completed tasks since last phase)
        const { count: taskCount } = await supabase
          .from("checklist_tasks")
          .select("*", { count: "exact", head: true })
          .eq("patient_id", enrollment.patient_id)
          .eq("completed", true)
          .gte("date", referenceDate);

        if ((taskCount || 0) < 10) return false;

        // Check no blocked status
        if (enrollment.blocked_reason) return false;

        const newWeightDue = new Date(now.getTime() + 15 * 86400000);
        const newReviewDue = new Date(now.getTime() + 30 * 86400000);

        await supabase
          .from("program_enrollments")
          .update({
            status: targetStatus,
            current_phase: targetPhase,
            next_weight_due_at: newWeightDue.toISOString(),
            next_full_review_due_at: newReviewDue.toISOString(),
            blocked_reason: null,
          })
          .eq("id", enrollment.id);

        // Create new protocol cycle
        await supabase.from("protocol_cycles").insert({
          enrollment_id: enrollment.id,
          phase: targetPhase,
          protocol_name: protocolName,
          status: "active",
          started_at: now.toISOString(),
        });

        // End previous cycle
        await supabase
          .from("protocol_cycles")
          .update({ status: "completed", ended_at: now.toISOString() })
          .eq("enrollment_id", enrollment.id)
          .eq("phase", previousPhase)
          .eq("status", "active");

        // Notify patient
        await supabase.from("notifications").insert({
          user_id: enrollment.patient_id,
          title: notificationTitle,
          message: notificationMessage,
          type: "program",
          action_url: "/client/dashboard",
        });

        // Notify professional
        await supabase.from("notifications").insert({
          user_id: enrollment.professional_id,
          title: `📊 Paciente avançou para Fase ${targetPhase}`,
          message: `Paciente avançou automaticamente para ${protocolName}. Revise os ajustes do protocolo.`,
          type: "program",
        });

        return true;
      }

      // ─── PHASE 1 → PHASE 2 (Protocol 2 Ready) ───
      const advancedTo2 = await checkAndAdvancePhase(
        enrollment,
        "protocol_2_ready",
        2,
        "protocol_2_active",
        "Déficit Estratégico",
        1,
        "Parabéns! Você avançou para o Protocolo 2 — Déficit Estratégico. Continue firme!",
        "🎉 Protocolo 2 Ativado!"
      );
      if (advancedTo2) { results.advanced++; continue; }

      // ─── PHASE 2 → PHASE 3 (Protocol 3 Ready) ───
      const advancedTo3 = await checkAndAdvancePhase(
        enrollment,
        "protocol_3_ready",
        3,
        "protocol_3_active",
        "Definição Corporal",
        2,
        "Você entrou na Fase 3 do Projeto Biquíni Branco. Agora vamos intensificar os ajustes para refinar seus resultados com mais estratégia, consistência e definição.",
        "🔥 Fase 3 — Definição Corporal Ativada!"
      );
      if (advancedTo3) { results.advanced++; continue; }

      // ─── PHASE 3 → PHASE 4 (Protocol 4 Ready) ───
      const advancedTo4 = await checkAndAdvancePhase(
        enrollment,
        "protocol_4_ready",
        4,
        "protocol_4_active",
        "Manutenção Inteligente",
        3,
        "Você chegou à Fase 4 do Projeto Biquíni Branco. Agora o foco é consolidar seus resultados e transformar sua evolução em um estilo de vida sustentável.",
        "🏆 Fase 4 — Manutenção Inteligente Ativada!"
      );
      if (advancedTo4) { results.advanced++; continue; }

      // ─── PHASE 4 COMPLETION CHECK ───
      if (enrollment.status === "protocol_4_active" && enrollment.current_phase === 4) {
        // Check if Phase 4 has been active for at least 30 days
        const lastCycle = await supabase
          .from("protocol_cycles")
          .select("started_at")
          .eq("enrollment_id", enrollment.id)
          .eq("phase", 4)
          .eq("status", "active")
          .single();

        if (lastCycle.data) {
          const phase4Start = new Date(lastCycle.data.started_at);
          const daysInPhase4 = Math.floor((now.getTime() - phase4Start.getTime()) / 86400000);

          // Complete after 30 days in Phase 4 with good adherence
          if (daysInPhase4 >= 30) {
            const hasRecentWeight =
              enrollment.last_weight_at &&
              new Date(enrollment.last_weight_at).getTime() > phase4Start.getTime();
            const hasRecentPhotos =
              enrollment.last_photos_at &&
              new Date(enrollment.last_photos_at).getTime() > phase4Start.getTime();

            if (hasRecentWeight && hasRecentPhotos) {
              // Mark enrollment as completed
              await supabase
                .from("program_enrollments")
                .update({
                  status: "completed",
                  completed_at: now.toISOString(),
                })
                .eq("id", enrollment.id);

              // End Phase 4 cycle
              await supabase
                .from("protocol_cycles")
                .update({ status: "completed", ended_at: now.toISOString() })
                .eq("enrollment_id", enrollment.id)
                .eq("phase", 4)
                .eq("status", "active");

              // Notify patient
              await supabase.from("notifications").insert({
                user_id: enrollment.patient_id,
                title: "🎓 Projeto Biquíni Branco Concluído!",
                message:
                  "Parabéns! Você completou todas as fases do Projeto Biquíni Branco. Sua transformação é resultado da sua dedicação. Continue mantendo seus hábitos!",
                type: "program",
                action_url: "/client/dashboard",
              });

              // Notify professional
              await supabase.from("notifications").insert({
                user_id: enrollment.professional_id,
                title: "🎓 Paciente concluiu o Projeto Biquíni Branco",
                message:
                  "Paciente completou todas as 4 fases do programa com sucesso. Revise a evolução final.",
                type: "program",
              });

              results.completed++;
            }
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, ...results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
