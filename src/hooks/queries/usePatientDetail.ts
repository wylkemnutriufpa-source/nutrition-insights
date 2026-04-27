import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useTenant } from "@/lib/tenantContext";
import { withTenantFilter } from "@/lib/tenantQueryHelpers";
import { queryKeys } from "./queryKeys";
import { toast } from "sonner";
import type { PrestigePlan } from "@/hooks/usePrestige";

const HIDDEN_MEAL_PLAN_STATUSES = new Set(["archived", "rejected"]);
const CANONICAL_MEAL_PLAN_STATUSES = new Set(["approved", "published", "published_to_patient"]);
const TRANSIENT_MEAL_PLAN_STATUSES = new Set([
  "draft",
  "draft_auto_generated",
  "draft_auto_corrected",
  "under_professional_review",
]);

function getVisibleMealPlans(plans: any[]) {
  const sortedPlans = [...plans].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const latestAutoCorrectedDraftId = sortedPlans.find((plan) => plan.plan_status === "draft_auto_corrected")?.id;

  const hasCanonicalPlan = sortedPlans.some((plan) => {
    const status = plan.plan_status || "draft";
    return plan.is_active || CANONICAL_MEAL_PLAN_STATUSES.has(status);
  });

  let transientPlanKept = false;

  return sortedPlans.filter((plan) => {
    const status = plan.plan_status || "draft";

    if (HIDDEN_MEAL_PLAN_STATUSES.has(status)) {
      return false;
    }

    if (plan.is_active || CANONICAL_MEAL_PLAN_STATUSES.has(status)) {
      return true;
    }

    // If there is already a canonical/active plan, drafts must stay out of the main patient view.
    // This avoids newer auto-corrected drafts visually overriding the published source of truth.
    if (hasCanonicalPlan && status === "draft_auto_corrected") {
      return false;
    }

    if (plan.id === latestAutoCorrectedDraftId && !hasCanonicalPlan) {
      return true;
    }

    if (!hasCanonicalPlan && TRANSIENT_MEAL_PLAN_STATUSES.has(status)) {
      if (transientPlanKept) {
        return false;
      }

      transientPlanKept = true;
      return true;
    }

    return !TRANSIENT_MEAL_PLAN_STATUSES.has(status);
  });
}

function getUniqueIds(...ids: Array<string | undefined | null>) {
  return Array.from(new Set(ids.filter((value): value is string => Boolean(value))));
}

function dedupeById<T extends { id?: string }>(rows: T[] | null | undefined) {
  const seen = new Set<string>();
  return (rows || []).filter((row) => {
    if (!row?.id) return true;
    if (seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });
}

function dedupeBySignature<T>(rows: T[] | null | undefined, getSignature: (row: T) => string) {
  const seen = new Set<string>();
  return (rows || []).filter((row) => {
    const signature = getSignature(row);
    if (seen.has(signature)) return false;
    seen.add(signature);
    return true;
  });
}

export function usePatientDetail(patientId: string | undefined) {
  const { user, isAdmin } = useAuth();
  const { tenantId } = useTenant();

  return useQuery({
    queryKey: [...queryKeys.patients.detail(patientId ?? ""), tenantId],
    enabled: !!patientId && !!user,
    staleTime: 10 * 1000,
    queryFn: async () => {
      const { data: resolvedProfile, error: resolvedProfileError } = await withTenantFilter(
        supabase
          .from("profiles")
          .select("id, user_id, full_name, avatar_url, phone, fit_intelligence_enabled, fit_intelligence_onboarded, fit_intelligence_access_mode, fit_intelligence_expires_at, fit_intelligence_first_experience_seen, marmita_mode")
          .or(`id.eq.${patientId},user_id.eq.${patientId}`),
        tenantId
      ).maybeSingle();

      if (resolvedProfileError) {
        throw resolvedProfileError;
      }

      const patientUserId = resolvedProfile?.user_id ?? patientId!;
      const patientProfileId = resolvedProfile?.id ?? patientId!;
      const patientIds = getUniqueIds(patientUserId, patientProfileId, patientId);
      const today = new Date().toISOString().split("T")[0];
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];

      const [timelineRes, anamnesisRes, ppRes, protocolsRes, checkRes, subRes, plansRes, mealPlansRes, recipesRes, npRes, adherenceRes, trainerAssessRes] = await Promise.all([
        supabase.from("patient_timeline").select("*").in("patient_id", patientIds).order("created_at", { ascending: false }).limit(50),
        supabase.from("patient_anamnesis").select("*").eq("user_id", patientUserId).order("created_at", { ascending: false }).limit(1),
        withTenantFilter(supabase.from("patient_protocols").select("*").in("patient_id", patientIds).eq("nutritionist_id", user!.id), tenantId).order("created_at", { ascending: false }),
        supabase.from("protocols").select("id, title, protocol_key").or(`created_by.eq.${user!.id},is_system.eq.true`),
        withTenantFilter(supabase.from("checklist_tasks").select("id, completed").in("patient_id", patientIds).eq("date", today), tenantId),
        supabase.from("subscriptions").select("*").eq("user_id", patientUserId).order("created_at", { ascending: false }).limit(1),
        supabase.from("pricing_plans").select("*").eq("is_active", true).order("sort_order"),
        withTenantFilter(supabase.from("meal_plans").select("*").in("patient_id", patientIds), tenantId).order("created_at", { ascending: false }),
        supabase.from("recipes").select("*").eq("nutritionist_id", user!.id).eq("is_shared", true).order("created_at", { ascending: false }),
        withTenantFilter(supabase.from("nutritionist_patients").select("id, status, journey_status").in("patient_id", patientIds).eq("nutritionist_id", user!.id), tenantId).limit(1).maybeSingle(),
        supabase.from("meal_item_completions").select("adherence_status, date").in("patient_id", patientIds).gte("date", sevenDaysAgo).lte("date", today),
        supabase.from("trainer_assessments").select("requires_medical_review").in("patient_id", patientIds).order("created_at", { ascending: false }).limit(1),
      ]);

      const protocols = protocolsRes.data || [];
      const patientProtocols = dedupeById(ppRes.data).map((pp: any) => ({
        ...pp,
        protocol_title: protocols.find((p: any) => p.id === pp.protocol_id)?.title || "Protocolo",
      }));

      const { data: docs } = await supabase
        .from("patient_documents")
        .select("*")
        .in("patient_id", patientIds)
        .eq("nutritionist_id", user!.id)
        .order("created_at", { ascending: false });

      const [prestigePlansRes, patientPrestigeRes] = await Promise.all([
        supabase.from("prestige_plans").select("*").eq("is_active", true).order("display_order"),
        supabase.from("patient_prestige").select("*").in("patient_id", patientIds).eq("is_active", true).order("assigned_at", { ascending: false }).limit(1).maybeSingle(),
      ]);

      const mapPlan = (d: any): PrestigePlan => ({
        id: d.id,
        name: d.name,
        slug: d.slug,
        display_order: d.display_order,
        color: d.color,
        badge_icon: d.badge_icon,
        badge_label: d.badge_label,
        crown_enabled: d.crown_enabled,
        effect_type: d.effect_type,
        ranking_highlight: d.ranking_highlight,
        ai_usage_multiplier: d.ai_usage_multiplier,
        features: d.features || [],
        price_monthly: d.price_monthly,
        price_quarterly: d.price_quarterly,
        price_semiannual: d.price_semiannual,
        price_annual: d.price_annual,
      });

      const prestigePlans = (prestigePlansRes.data || []).map(mapPlan);
      const patientPrestigeData = patientPrestigeRes.data as any;
      const matchedPlan = patientPrestigeData?.plan_id
        ? prestigePlans.find((p: any) => p.id === patientPrestigeData.plan_id)
        : null;
      const currentPrestigePlan = matchedPlan || null;

      let patientEmail = "";
      if (isAdmin) {
        const { data: emailData } = await supabase.rpc("get_user_email_by_id", { _user_id: patientUserId });
        if (emailData) patientEmail = emailData;
      }

      const uniqueDocs = dedupeById(docs);
      const uniqueMealPlans = getVisibleMealPlans(dedupeById(mealPlansRes.data));
      const adherenceRows = dedupeBySignature(adherenceRes.data, (row: any) => `${row.date}-${row.adherence_status}`);

      return {
        /** Canonical user_id — use this for all child component queries */
        resolvedPatientId: patientUserId,
        profile: resolvedProfile,
        timeline: dedupeById(timelineRes.data),
        anamnesis: anamnesisRes.data?.[0] || null,
        patientProtocols,
        protocols,
        checklistStats: {
          total: dedupeById(checkRes.data).length,
          completed: dedupeById(checkRes.data).filter((t: any) => t.completed).length,
        },
        patientSubscription: subRes.data?.[0] || null,
        pricingPlans: plansRes.data || [],
        mealPlans: uniqueMealPlans,
        recipes: recipesRes.data || [],
        mealPlanDocs: uniqueDocs.filter((d: any) => d.document_type === "meal_plan"),
        assessmentDocs: uniqueDocs.filter((d: any) => d.document_type === "assessment"),
        patientStatus: npRes.data?.status || "active",
        journeyStatus: (npRes.data as any)?.journey_status || "active",
        npId: npRes.data?.id || null,
        prestigePlans,
        currentPrestigePlan,
        currentPrestigePlanId: patientPrestigeData?.plan_id || "",
        patientEmail,
        adherence7d: (() => {
          const followed = adherenceRows.filter((c: any) => c.adherence_status === "followed").length;
          const partial = adherenceRows.filter((c: any) => c.adherence_status === "partial").length;
          const total = adherenceRows.length;
          if (total === 0) return 0;
          return Math.round(((followed * 100 + partial * 50) / (total * 100)) * 100);
        })(),
        requiresMedicalReview: trainerAssessRes.data?.[0]?.requires_medical_review || false,
      };
    },
  });
}

export function useTogglePatientDetailStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ npId, currentStatus }: { npId: string; currentStatus: string }) => {
      const newStatus = currentStatus === "active" ? "inactive" : "active";
      const { error } = await supabase.from("nutritionist_patients").update({ status: newStatus }).eq("id", npId);
      if (error) throw error;
      return newStatus;
    },
    onSuccess: (newStatus, { npId }) => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      toast.success(newStatus === "active" ? "Paciente ativado!" : "Paciente desativado!");
    },
    onError: (err: any) => toast.error(err.message),
  });
}

export function useDeletePatientLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (npId: string) => {
      // First get the patient_id from the link
      const { data: linkData, error: linkError } = await supabase
        .from("nutritionist_patients")
        .select("patient_id")
        .eq("id", npId)
        .single();
      if (linkError) throw linkError;

      // Deactivate any active meal plans to avoid trigger guard
      await supabase
        .from("meal_plans")
        .update({ is_active: false })
        .eq("patient_id", linkData.patient_id)
        .eq("is_active", true);

      // Now delete the link
      const { error } = await supabase.from("nutritionist_patients").delete().eq("id", npId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      toast.success("Paciente removido com sucesso!");
    },
    onError: (err: any) => toast.error(err.message),
  });
}
