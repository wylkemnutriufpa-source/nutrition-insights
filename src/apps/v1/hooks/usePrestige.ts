import { useEffect, useState } from "react";
import { supabase } from "@v1/integrations/supabase/client";
import { useAuth } from "@v1/lib/auth";

export interface PrestigePlan {
  id: string;
  name: string;
  slug: string;
  display_order: number;
  color: string;
  badge_icon: string;
  badge_label: string;
  crown_enabled: boolean;
  effect_type: string;
  ranking_highlight: boolean;
  ai_usage_multiplier: number;
  features: string[];
  price_monthly: number;
  price_quarterly: number | null;
  price_semiannual: number | null;
  price_annual: number | null;
}

export interface PatientPrestigeInfo {
  plan: PrestigePlan | null;
  totalPoints: number;
  rank: number | null;
}

export function usePrestige(patientId?: string) {
  const { user } = useAuth();
  const targetId = patientId || user?.id;
  const [prestige, setPrestige] = useState<PatientPrestigeInfo>({ plan: null, totalPoints: 0, rank: null });
  const [plans, setPlans] = useState<PrestigePlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlans();
    if (targetId) loadPrestige(targetId);
    else setLoading(false);
  }, [targetId]);

  async function loadPlans() {
    const { data } = await supabase
      .from("prestige_plans")
      .select("*")
      .eq("is_active", true)
      .order("display_order");
    if (data) setPlans(data.map(mapPlan));
  }

  async function loadPrestige(uid: string) {
    setLoading(true);
    const [prestigeRes, rankingRes] = await Promise.all([
      supabase.from("patient_prestige").select("*").eq("patient_id", uid).eq("is_active", true).maybeSingle(),
      supabase.from("patient_ranking_cache").select("total_points, rank_position").eq("patient_id", uid).maybeSingle(),
    ]);

    const prestigeData = prestigeRes.data as any;
    const matchedPlan = prestigeData?.plan_id ? plans.find(p => p.id === prestigeData.plan_id) || null : null;
    const plan = matchedPlan;
    setPrestige({
      plan,
      totalPoints: rankingRes.data?.total_points || 0,
      rank: rankingRes.data?.rank_position || null,
    });
    setLoading(false);
  }

  return { prestige, plans, loading, refresh: () => targetId && loadPrestige(targetId) };
}

function mapPlan(d: any): PrestigePlan {
  return {
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
    features: Array.isArray(d.features) ? d.features : [],
    price_monthly: d.price_monthly,
    price_quarterly: d.price_quarterly,
    price_semiannual: d.price_semiannual,
    price_annual: d.price_annual,
  };
}
