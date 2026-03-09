import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BMI_LOW = 18.5;
const BMI_HIGH = 30;
const STAGNATION_WEEKS = 3;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Optional: scope to a single nutritionist
    const body = await req.json().catch(() => ({}));
    const nutritionistId = body.nutritionist_id;

    // Get all active nutritionist-patient relationships
    let npQuery = supabase
      .from("nutritionist_patients")
      .select("nutritionist_id, patient_id")
      .eq("status", "active");
    if (nutritionistId) npQuery = npQuery.eq("nutritionist_id", nutritionistId);
    const { data: relationships } = await npQuery;

    if (!relationships || relationships.length === 0) {
      return new Response(JSON.stringify({ alerts: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const patientIds = [...new Set(relationships.map((r) => r.patient_id))];
    const alertsCreated: any[] = [];

    // Fetch latest 2 assessments per patient
    for (const patientId of patientIds) {
      const { data: assessments } = await supabase
        .from("physical_assessments")
        .select("bmi, weight, body_fat_percentage, assessment_date, patient_id")
        .eq("patient_id", patientId)
        .order("assessment_date", { ascending: false })
        .limit(2);

      if (!assessments || assessments.length === 0) continue;

      const latest = assessments[0];
      const nutritionistIds = relationships
        .filter((r) => r.patient_id === patientId)
        .map((r) => r.nutritionist_id);

      // --- BMI Alert ---
      if (latest.bmi !== null) {
        let bmiAlert: string | null = null;
        if (latest.bmi < BMI_LOW) {
          bmiAlert = `IMC ${latest.bmi.toFixed(1)} está abaixo do ideal (< ${BMI_LOW}). Atenção ao estado nutricional.`;
        } else if (latest.bmi >= BMI_HIGH) {
          bmiAlert = `IMC ${latest.bmi.toFixed(1)} está acima da faixa saudável (≥ ${BMI_HIGH}). Revisar plano alimentar.`;
        }

        if (bmiAlert) {
          // Notify nutritionist(s)
          for (const nId of nutritionistIds) {
            // Check if similar alert already exists in the last 7 days
            const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
            const { count } = await supabase
              .from("notifications")
              .select("id", { count: "exact", head: true })
              .eq("user_id", nId)
              .eq("type", "bmi_alert")
              .gte("created_at", weekAgo);

            if ((count || 0) === 0) {
              const { data: profile } = await supabase
                .from("profiles")
                .select("full_name")
                .eq("user_id", patientId)
                .single();

              await supabase.from("notifications").insert({
                user_id: nId,
                title: "⚠️ Alerta de IMC",
                message: `${profile?.full_name || "Paciente"}: ${bmiAlert}`,
                type: "bmi_alert",
                action_url: `/patients/${patientId}`,
                metadata: { patient_id: patientId, bmi: latest.bmi },
              });
              alertsCreated.push({ type: "bmi", patient_id: patientId, target: nId });
            }
          }

          // Notify patient
          const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
          const { count: patientCount } = await supabase
            .from("notifications")
            .select("id", { count: "exact", head: true })
            .eq("user_id", patientId)
            .eq("type", "bmi_alert")
            .gte("created_at", weekAgo);

          if ((patientCount || 0) === 0) {
            const tip =
              latest.bmi < BMI_LOW
                ? "Seu IMC está abaixo do ideal. Converse com seu nutricionista sobre como melhorar sua alimentação. 💪"
                : "Seu IMC está acima da faixa saudável. Seu nutricionista pode ajustar seu plano. Não desanime! 🌟";

            await supabase.from("notifications").insert({
              user_id: patientId,
              title: "📊 Alerta sobre seu IMC",
              message: tip,
              type: "bmi_alert",
              action_url: "/journey",
              metadata: { bmi: latest.bmi },
            });
            alertsCreated.push({ type: "bmi_patient", patient_id: patientId });
          }
        }
      }

      // --- Stagnation Alert ---
      if (assessments.length >= 2) {
        const prev = assessments[1];
        const daysBetween =
          (new Date(latest.assessment_date).getTime() -
            new Date(prev.assessment_date).getTime()) /
          86400000;

        // Check if weight hasn't changed significantly in STAGNATION_WEEKS
        if (daysBetween >= STAGNATION_WEEKS * 7) {
          const weightDiff = Math.abs((latest.weight || 0) - (prev.weight || 0));
          const bfDiff = Math.abs(
            (latest.body_fat_percentage || 0) - (prev.body_fat_percentage || 0)
          );

          // Less than 0.5kg weight change AND less than 0.5% BF change = stagnation
          if (weightDiff < 0.5 && bfDiff < 0.5) {
            const weeksStagnant = Math.floor(daysBetween / 7);

            for (const nId of nutritionistIds) {
              const weekAgo = new Date(Date.now() - 14 * 86400000).toISOString();
              const { count } = await supabase
                .from("notifications")
                .select("id", { count: "exact", head: true })
                .eq("user_id", nId)
                .eq("type", "stagnation_alert")
                .gte("created_at", weekAgo);

              if ((count || 0) === 0) {
                const { data: profile } = await supabase
                  .from("profiles")
                  .select("full_name")
                  .eq("user_id", patientId)
                  .single();

                await supabase.from("notifications").insert({
                  user_id: nId,
                  title: "📉 Estagnação Detectada",
                  message: `${profile?.full_name || "Paciente"} sem progresso há ${weeksStagnant} semanas. Considere ajustar o protocolo.`,
                  type: "stagnation_alert",
                  action_url: `/patients/${patientId}`,
                  metadata: { patient_id: patientId, weeks: weeksStagnant },
                });
                alertsCreated.push({ type: "stagnation", patient_id: patientId, target: nId });
              }
            }

            // Patient notification
            const weekAgo = new Date(Date.now() - 14 * 86400000).toISOString();
            const { count: pc } = await supabase
              .from("notifications")
              .select("id", { count: "exact", head: true })
              .eq("user_id", patientId)
              .eq("type", "stagnation_alert")
              .gte("created_at", weekAgo);

            if ((pc || 0) === 0) {
              await supabase.from("notifications").insert({
                user_id: patientId,
                title: "🔄 Hora de ajustar!",
                message: `Seu progresso desacelerou nas últimas ${weeksStagnant} semanas. Fale com seu nutricionista para novos ajustes!`,
                type: "stagnation_alert",
                action_url: "/journey",
                metadata: { weeks: weeksStagnant },
              });
              alertsCreated.push({ type: "stagnation_patient", patient_id: patientId });
            }
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ alerts: alertsCreated.length, details: alertsCreated }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
