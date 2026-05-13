import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireCronOrAdmin } from "../_shared/cron-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Resolve tenant_id for a given user */
async function resolveTenant(supabase: any, userId: string): Promise<string | null> {
  const { data } = await supabase.rpc("get_user_tenant", { _user_id: userId });
  return data || null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  
  try { await requireCronOrAdmin(req); } catch (r) { if (r instanceof Response) return r; throw r; }
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

      // Resolve tenant_id for this enrollment's patient
      const tenantId = await resolveTenant(supabase, enrollment.patient_id);
      const tenantSpread = tenantId ? { tenant_id: tenantId } : {};

      // ─── WEIGHT DEADLINE CHECK (15 days) ───
      // Day 14: warning → Day 16+: block
      const activePhaseStatuses = [
        "protocol_1_active",
        "protocol_2_active",
        "protocol_3_active",
        "protocol_4_active",
      ];

      if (enrollment.next_weight_due_at && activePhaseStatuses.includes(enrollment.status)) {
        const weightDue = new Date(enrollment.next_weight_due_at);
        const msUntilDue = weightDue.getTime() - now.getTime();
        const daysUntilDue = Math.floor(msUntilDue / 86400000);
        const daysOverdue = Math.floor(-msUntilDue / 86400000);

        // 1 day BEFORE deadline: send warning
        if (daysUntilDue >= 0 && daysUntilDue <= 1) {
          await supabase.from("notifications").insert({
            ...tenantSpread,
            user_id: enrollment.patient_id,
            title: "⚠️ Prazo de peso amanhã!",
            message: "Você tem até amanhã para enviar seu peso atualizado. Caso contrário, seu protocolo será bloqueado.",
            type: "alert",
            action_url: "/client/dashboard",
          });
          results.notified++;
        }

        // 1+ day AFTER deadline: block
        if (daysOverdue >= 1) {
          await supabase
            .from("program_enrollments")
            .update({
              status: "awaiting_weight_update",
              blocked_reason: "Prazo de envio de peso expirado. Envie agora para desbloquear.",
            })
            .eq("id", enrollment.id);

          await supabase.from("notifications").insert({
            ...tenantSpread,
            user_id: enrollment.patient_id,
            title: "🔒 Protocolo bloqueado — peso não enviado",
            message: "Seu protocolo foi bloqueado por falta de atualização de peso. Envie agora para continuar.",
            type: "alert",
            action_url: "/client/dashboard",
          });

          results.blocked++;
        }
      }

      // ─── FULL REVIEW DEADLINE CHECK (30 days) ───
      // Day 29: warning → Day 31+: block → Day 35+: protocol_locked
      if (enrollment.next_full_review_due_at && activePhaseStatuses.includes(enrollment.status)) {
        const reviewDue = new Date(enrollment.next_full_review_due_at);
        const msUntilReview = reviewDue.getTime() - now.getTime();
        const daysUntilReview = Math.floor(msUntilReview / 86400000);
        const daysOverdueReview = Math.floor(-msUntilReview / 86400000);

        // 1 day BEFORE deadline: send warning
        if (daysUntilReview >= 0 && daysUntilReview <= 1) {
          await supabase.from("notifications").insert({
            ...tenantSpread,
            user_id: enrollment.patient_id,
            title: "⚠️ Reavaliação completa amanhã!",
            message: "Amanhã é o último dia para enviar peso e fotos corporais. Se não enviar, seu protocolo será bloqueado.",
            type: "alert",
            action_url: "/client/dashboard",
          });
          results.notified++;
        }

        // 1+ day AFTER deadline: awaiting_full_reassessment
        if (daysOverdueReview >= 1 && daysOverdueReview < 5) {
          if (enrollment.status !== "awaiting_full_reassessment" && enrollment.status !== "protocol_locked") {
            await supabase
              .from("program_enrollments")
              .update({
                status: "awaiting_full_reassessment",
                blocked_reason: "Prazo de reavaliação completa expirado. Envie peso e fotos para desbloquear.",
              })
              .eq("id", enrollment.id);

            await supabase.from("notifications").insert({
            ...tenantSpread,
              user_id: enrollment.patient_id,
              title: "🔒 Protocolo bloqueado — reavaliação pendente",
              message: "Envie seu peso e fotos corporais para desbloquear o protocolo.",
              type: "alert",
              action_url: "/client/dashboard",
            });

            results.blocked++;
          }
        }

        // 5+ days overdue: hard lock
        if (daysOverdueReview >= 5) {
          if (enrollment.status !== "protocol_locked") {
            await supabase
              .from("program_enrollments")
              .update({
                status: "protocol_locked",
                blocked_reason: "Reavaliação completa vencida há mais de 5 dias. Envie peso e fotos para continuar.",
              })
              .eq("id", enrollment.id);

            await supabase.from("notifications").insert({
            ...tenantSpread,
              user_id: enrollment.patient_id,
              title: "🔒 Protocolo totalmente bloqueado",
              message: "Seu protocolo foi pausado por falta de reavaliação. Envie seus dados agora.",
              type: "alert",
              action_url: "/client/dashboard",
            });

            await supabase.from("notifications").insert({
            ...tenantSpread,
              user_id: enrollment.professional_id,
              title: "⚠️ Paciente com protocolo bloqueado",
              message: "Protocolo bloqueado por falta de reavaliação. Verifique o status no programa.",
              type: "alert",
            });

            results.blocked++;
          }
        }
      }

      // Also check already-blocked statuses for full review deadline
      if (enrollment.next_full_review_due_at && enrollment.status === "awaiting_weight_update") {
        const reviewDue = new Date(enrollment.next_full_review_due_at);
        const daysOverdueReview = Math.floor((now.getTime() - reviewDue.getTime()) / 86400000);

        if (daysOverdueReview >= 1 && enrollment.status !== "protocol_locked") {
          await supabase
            .from("program_enrollments")
            .update({
              status: "awaiting_full_reassessment",
              blocked_reason: "Peso e reavaliação completa pendentes. Envie ambos para desbloquear.",
            })
            .eq("id", enrollment.id);
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
            ...tenantSpread,
          user_id: enrollment.patient_id,
          title: notificationTitle,
          message: notificationMessage,
          type: "program",
          action_url: "/client/dashboard",
        });

        // Notify professional
        await supabase.from("notifications").insert({
            ...tenantSpread,
          user_id: enrollment.professional_id,
          title: `📊 Paciente avançou para Fase ${targetPhase}`,
          message: `Paciente avançou automaticamente para ${protocolName}. Revise os ajustes do protocolo.`,
          type: "program",
        });

        return true;
      }

      // ─── PHASE READINESS CHECK ───
      // When a patient in an active phase has submitted weight + photos + enough tasks,
      // mark them as ready for the next phase
      async function checkPhaseReadiness(
        currentStatus: string,
        currentPhaseNum: number,
        nextReadyStatus: string
      ) {
        if (enrollment.status !== currentStatus) return false;

        const referenceDate = enrollment.onboarding_completed_at || enrollment.started_at;

        // Need recent weight AND photos (after phase started)
        const { data: currentCycle } = await supabase
          .from("protocol_cycles")
          .select("started_at")
          .eq("enrollment_id", enrollment.id)
          .eq("phase", currentPhaseNum)
          .eq("status", "active")
          .single();

        const phaseStart = currentCycle?.started_at || referenceDate;

        const hasRecentWeight =
          enrollment.last_weight_at &&
          new Date(enrollment.last_weight_at).getTime() > new Date(phaseStart).getTime();
        const hasRecentPhotos =
          enrollment.last_photos_at &&
          new Date(enrollment.last_photos_at).getTime() > new Date(phaseStart).getTime();

        if (!hasRecentWeight || !hasRecentPhotos) return false;

        // Check adherence (minimum 10 completed tasks since phase started)
        const { count: taskCount } = await supabase
          .from("checklist_tasks")
          .select("*", { count: "exact", head: true })
          .eq("patient_id", enrollment.patient_id)
          .eq("completed", true)
          .gte("date", phaseStart);

        if ((taskCount || 0) < 10) return false;

        // Check minimum 30 days in current phase (phases transition every 30-35 days)
        const daysInPhase = Math.floor((now.getTime() - new Date(phaseStart).getTime()) / 86400000);
        if (daysInPhase < 30) return false;

        // Mark as ready for next phase
        await supabase
          .from("program_enrollments")
          .update({ status: nextReadyStatus })
          .eq("id", enrollment.id);

        return true;
      }

      // Phase 1 → ready for Phase 2
      const readyFor2 = await checkPhaseReadiness("protocol_1_active", 1, "protocol_2_ready");
      if (readyFor2) { results.advanced++; continue; }

      // Phase 2 → ready for Phase 3
      const readyFor3 = await checkPhaseReadiness("protocol_2_active", 2, "protocol_3_ready");
      if (readyFor3) { results.advanced++; continue; }

      // Phase 3 → ready for Phase 4
      const readyFor4 = await checkPhaseReadiness("protocol_3_active", 3, "protocol_4_ready");
      if (readyFor4) { results.advanced++; continue; }

      // ─── PHASE 1 → PHASE 2 (Protocol 2 Ready → Active) ───
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

      // ─── PHASE 3 → PHASE 4 (Requires plan renewal or semester package) ───
      // Phase 4 is NOT auto-advanced. It requires plan renewal verification.
      // When Phase 3 completes, status goes to "protocol_4_ready" and waits.
      if (enrollment.status === "protocol_4_ready") {
        // Check if patient has an active subscription with remaining time (renewal or semester+)
        const { data: prestige } = await supabase
          .from("patient_prestige")
          .select("plan_id, prestige_plans(slug, duration_months)")
          .eq("patient_id", enrollment.patient_id)
          .eq("is_active", true)
          .single();

        // Check subscription expiry
        const { data: npRelation } = await supabase
          .from("nutritionist_patients")
          .select("expires_at")
          .eq("patient_id", enrollment.patient_id)
          .eq("status", "active")
          .single();

        const hasValidPlan = npRelation?.expires_at && 
          new Date(npRelation.expires_at).getTime() > now.getTime();
        
        // Check if plan is semester (6+ months) or if it was renewed after Phase 3 started
        const planDuration = (prestige?.prestige_plans as any)?.duration_months || 0;
        const isSemesterOrAbove = planDuration >= 6;

        if (hasValidPlan && isSemesterOrAbove) {
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
        }
        // If no valid plan, it stays as protocol_4_ready (awaiting renewal)
      }

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
            ...tenantSpread,
                user_id: enrollment.patient_id,
                title: "🎓 Projeto Biquíni Branco Concluído!",
                message:
                  "Parabéns! Você completou todas as fases do Projeto Biquíni Branco. Sua transformação é resultado da sua dedicação. Continue mantendo seus hábitos!",
                type: "program",
                action_url: "/client/dashboard",
              });

              // Notify professional
              await supabase.from("notifications").insert({
            ...tenantSpread,
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
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
