import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard, Users, Utensils, BarChart3, Sparkles,
  CalendarCheck, Apple, TrendingUp, Target, HeartPulse,
  AlertTriangle, FileText, Zap, MessageCircle, Trophy,
  Flame, Crown, type LucideIcon,
} from "lucide-react";
import type { PresentationSlide } from "@/lib/presentationSlides";

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard, Users, Utensils, BarChart3, Sparkles,
  CalendarCheck, Apple, TrendingUp, Target, HeartPulse,
  AlertTriangle, FileText, Zap, MessageCircle, Trophy,
  Flame, Crown,
};

function resolveIcon(name: string): LucideIcon {
  return ICON_MAP[name] || Sparkles;
}

export interface FeatureRegistryRow {
  id: string;
  feature_key: string;
  name: string;
  short_description: string;
  clinical_impact: string | null;
  target_audience: string;
  journey_priority: number;
  icon_name: string;
  gradient: string;
  emoji: string;
  experience_type: string;
  status: string;
  bullets: string[];
  is_highlight: boolean;
  display_order: number | null;
  cta_text: string | null;
  created_at: string;
  updated_at: string;
}

async function fetchFeatures(): Promise<FeatureRegistryRow[]> {
  const { data, error } = await supabase
    .from("feature_registry")
    .select("*")
    .in("status", ["active", "beta"])
    .order("journey_priority", { ascending: true })
    .order("display_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as FeatureRegistryRow[];
}

function toSlide(f: FeatureRegistryRow): PresentationSlide {
  return {
    id: f.feature_key,
    title: f.name,
    subtitle: f.short_description,
    bullets: Array.isArray(f.bullets) ? f.bullets : [],
    icon: resolveIcon(f.icon_name),
    gradient: f.gradient,
    emoji: f.emoji,
  };
}

export function useFeatureGuide(audience: "professional" | "patient" | "both" = "both") {
  const query = useQuery({
    queryKey: ["feature-registry", audience],
    queryFn: fetchFeatures,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const features = query.data ?? [];

  const filtered = features.filter((f) => {
    if (audience === "both") return true;
    return f.target_audience === audience || f.target_audience === "both";
  });

  const slides: PresentationSlide[] = filtered.map(toSlide);

  const newFeatures = features.filter(
    (f) => f.is_highlight || f.status === "beta"
  );

  return {
    features: filtered,
    slides,
    newFeatures,
    isLoading: query.isLoading,
    allFeatures: features,
  };
}
