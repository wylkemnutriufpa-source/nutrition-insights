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

export function usePatientDetail(patientId: string | undefined) {
  const { user, isAdmin } = useAuth();
  const { tenantId } = useTenant();

  return useQuery({
    queryKey: [...queryKeys.patients.detail(patientId ?? ""), tenantId],
    enabled: !!patientId && !!user,
    staleTime: 10 * 1000, // 10s — fast refresh for lifecycle sync
    queryFn: async () => {
      const [profileRes, timelineRes, anamnesisRes, ppRes, protocolsRes, checkRes, subRes, plansRes, mealPlansRes, recipesRes, npRes, adherenceRes] = await Promise.all([
        withTenantFilter(supabase.from("profiles").select("full_name, avatar_url, phone, fit_intelligence_enabled, fit_intelligence_onboarded, fit_intelligence_access_mode, fit_intelligence_expires_at, fit_intelligence_first_experience_seen").eq("user_id", patientId!), tenantId).maybeSingle(),
        supabase.from("patient_timeline").select("*").eq("patient_id", patientId!).order("created_at", { ascending: false }).limit(50),
        supabase.from("patient_anamnesis").select("*").eq("user_id", patientId!).order("created_at", { ascending: false }).limit(1),
        withTenantFilter(supabase.from("patient_protocols").select("*").eq("patient_id", patientId!).eq("nutritionist_id", user!.id), tenantId).order("created_at", { ascending: false }),
        supabase.from("protocols").select("id, title, protocol_key").or(`created_by.eq.${user!.id},is_system.eq.true`),
        withTenantFilter(supabase.from("checklist_tasks").select("id, completed").eq("patient_id", patientId!).eq("date", new Date().toISOString().split("T")[0]), tenantId),
        supabase.from("subscriptions").select("*").eq("user_id", patientId!).order("created_at", { ascending: false }).limit(1),
        supabase.from("pricing_plans").select("*").eq("is_active", true).order("sort_order"),
        withTenantFilter(supabase.from("meal_plans").select("*").eq("patient_id", patientId!), tenantId).order("created_at", { ascending: false }),
        supabase.from("recipes").select("*").eq("nutritionist_id", user!.id).eq("is_shared", true).order("created_at", { ascending: false }),
        withTenantFilter(supabase.from("nutritionist_patients").select("id, status, journey_status").eq("patient_id", patientId!).eq("nutritionist_id", user!.id), tenantId).limit(1).maybeSingle(),
        supabase.from("meal_item_completions").select("adherence_status, date").eq("patient_id", patientId!).gte("date", new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0]).lte("date", new Date().toISOString().split("T")[0]),
      ]);

      // Enrich protocols with title
      const protocols = protocolsRes.data || [];
      const patientProtocols = (ppRes.data || []).map((pp: any) => ({
        ...pp,
        protocol_title: protocols.find((p: any) => p.id === pp.protocol_id)?.title || "Protocolo",
      }));

      // Documents
      const { data: docs } = await supabase.from("patient_documents")
        .select("*")
        .eq("patient_id", patientId!)
        .eq("nutritionist_id", user!.id)
        .order("created_at", { ascending: false });

      // Prestige
      const [prestigePlansRes, patientPrestigeRes] = await Promise.all([
        supabase.from("prestige_plans").select("*").eq("is_active", true).order("display_order"),
        supabase.from("patient_prestige").select("*, prestige_plans(*)").eq("patient_id", patientId!).eq("is_active", true).maybeSingle(),
      ]);

      const mapPlan = (d: any): PrestigePlan => ({
        id: d.id, name: d.name, slug: d.slug, display_order: d.display_order, color: d.color,
        badge_icon: d.badge_icon, badge_label: d.badge_label, crown_enabled: d.crown_enabled,
        effect_type: d.effect_type, ranking_highlight: d.ranking_highlight,
        ai_usage_multiplier: d.ai_usage_multiplier, features: d.features || [],
        price_monthly: d.price_monthly, price_quarterly: d.price_quarterly,
        price_semiannual: d.price_semiannual, price_annual: d.price_annual,
      });

      const prestigePlans = (prestigePlansRes.data || []).map(mapPlan);
      const currentPrestigePlan = patientPrestigeRes.data?.prestige_plans
        ? mapPlan(patientPrestigeRes.data.prestige_plans)
        : null;

      // Patient email for admin
      let patientEmail = "";
      if (isAdmin && patientId) {
        const { data: emailData } = await supabase.rpc("get_user_email_by_id", { _user_id: patientId });
        if (emailData) patientEmail = emailData;
      }

      return {
        profile: profileRes.data,
        timeline: timelineRes.data || [],
        anamnesis: anamnesisRes.data?.[0] || null,
        patientProtocols,
        protocols,
        checklistStats: {
          total: checkRes.data?.length || 0,
          completed: checkRes.data?.filter((t: any) => t.completed).length || 0,
        },
        patientSubscription: subRes.data?.[0] || null,
        pricingPlans: plansRes.data || [],
        mealPlans: getVisibleMealPlans(mealPlansRes.data || []),
        recipes: recipesRes.data || [],
        mealPlanDocs: (docs || []).filter((d: any) => d.document_type === "meal_plan"),
        assessmentDocs: (docs || []).filter((d: any) => d.document_type === "assessment"),
        patientStatus: npRes.data?.status || "active",
        journeyStatus: (npRes.data as any)?.journey_status || "active",
        npId: npRes.data?.id || null,
        prestigePlans,
        currentPrestigePlan,
        currentPrestigePlanId: patientPrestigeRes.data?.prestige_plans?.id || "",
        patientEmail,
        adherence7d: (() => {
          const comps = adherenceRes.data || [];
          const followed = comps.filter((c: any) => c.adherence_status === "followed").length;
          const partial = comps.filter((c: any) => c.adherence_status === "partial").length;
          const total = comps.length;
          if (total === 0) return 0;
          return Math.round(((followed * 100 + partial * 50) / (total * 100)) * 100);
        })(),
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
