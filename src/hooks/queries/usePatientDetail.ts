import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { queryKeys } from "./queryKeys";
import { toast } from "sonner";
import type { PrestigePlan } from "@/hooks/usePrestige";

export function usePatientDetail(patientId: string | undefined) {
  const { user, isAdmin } = useAuth();

  return useQuery({
    queryKey: queryKeys.patients.detail(patientId ?? ""),
    enabled: !!patientId && !!user,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const [profileRes, timelineRes, anamnesisRes, ppRes, protocolsRes, checkRes, subRes, plansRes, mealPlansRes, recipesRes, npRes] = await Promise.all([
        supabase.from("profiles").select("full_name, avatar_url, phone").eq("user_id", patientId!).single(),
        supabase.from("patient_timeline").select("*").eq("patient_id", patientId!).order("created_at", { ascending: false }).limit(50),
        supabase.from("patient_anamnesis").select("*").eq("user_id", patientId!).order("created_at", { ascending: false }).limit(1),
        supabase.from("patient_protocols").select("*").eq("patient_id", patientId!).eq("nutritionist_id", user!.id).order("created_at", { ascending: false }),
        supabase.from("protocols").select("id, title").eq("created_by", user!.id),
        supabase.from("checklist_tasks").select("id, completed").eq("patient_id", patientId!).eq("date", new Date().toISOString().split("T")[0]),
        supabase.from("subscriptions").select("*").eq("user_id", patientId!).order("created_at", { ascending: false }).limit(1),
        supabase.from("pricing_plans").select("*").eq("is_active", true).order("sort_order"),
        supabase.from("meal_plans").select("*").eq("patient_id", patientId!).eq("nutritionist_id", user!.id).order("created_at", { ascending: false }),
        supabase.from("recipes").select("*").eq("nutritionist_id", user!.id).eq("is_shared", true).order("created_at", { ascending: false }),
        supabase.from("nutritionist_patients").select("id, status").eq("patient_id", patientId!).eq("nutritionist_id", user!.id).limit(1).single(),
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
        mealPlans: mealPlansRes.data || [],
        recipes: recipesRes.data || [],
        mealPlanDocs: (docs || []).filter((d: any) => d.document_type === "meal_plan"),
        assessmentDocs: (docs || []).filter((d: any) => d.document_type === "assessment"),
        patientStatus: npRes.data?.status || "active",
        npId: npRes.data?.id || null,
        prestigePlans,
        currentPrestigePlan,
        currentPrestigePlanId: patientPrestigeRes.data?.prestige_plans?.id || "",
        patientEmail,
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
