import { useQuery } from "@tanstack/react-query";
import { supabase } from "@v1/integrations/supabase/client";
import {
  LayoutDashboard, Users, Utensils, BarChart3, Sparkles,
  CalendarCheck, Apple, TrendingUp, Target, HeartPulse,
  AlertTriangle, FileText, Zap, MessageCircle, Trophy,
  Flame, Crown, type LucideIcon,
} from "lucide-react";
import type { PresentationSlide } from "@v1/lib/presentationSlides";

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
  emotional_impact: string;
  journey_phase: string;
  category: string;
  is_premium: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface EnrichedSlide extends PresentationSlide {
  isNew: boolean;
  isPremium: boolean;
  emotionalImpact: string;
  ctaText: string | null;
  journeyPhase: string;
  category: string;
  featureKey: string;
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

function toEnrichedSlide(f: FeatureRegistryRow): EnrichedSlide {
  return {
    id: f.feature_key,
    title: f.name,
    subtitle: f.short_description,
    bullets: Array.isArray(f.bullets) ? f.bullets : [],
    icon: resolveIcon(f.icon_name),
    gradient: f.gradient,
    emoji: f.emoji,
    isNew: f.is_highlight || f.status === "beta",
    isPremium: f.is_premium,
    emotionalImpact: f.emotional_impact,
    ctaText: f.cta_text,
    journeyPhase: f.journey_phase,
    category: f.category,
    featureKey: f.feature_key,
  };
}

// Priority sort: transformador > high > medium > low, then by journey_priority
const IMPACT_ORDER: Record<string, number> = { transformador: 0, high: 1, medium: 2, low: 3 };

function sortSlides(slides: EnrichedSlide[], features: FeatureRegistryRow[]): EnrichedSlide[] {
  const featureMap = new Map(features.map(f => [f.feature_key, f]));
  return [...slides].sort((a, b) => {
    const fa = featureMap.get(a.featureKey);
    const fb = featureMap.get(b.featureKey);
    // Premium first
    if (a.isPremium !== b.isPremium) return a.isPremium ? -1 : 1;
    // Then by emotional impact
    const ia = IMPACT_ORDER[a.emotionalImpact] ?? 2;
    const ib = IMPACT_ORDER[b.emotionalImpact] ?? 2;
    if (ia !== ib) return ia - ib;
    // Then by journey_priority
    return (fa?.journey_priority ?? 50) - (fb?.journey_priority ?? 50);
  });
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

  const enrichedSlides: EnrichedSlide[] = filtered.map(toEnrichedSlide);
  
  // Basic PresentationSlide[] for backward compat
  const slides: PresentationSlide[] = enrichedSlides;
  
  // Sorted by strategic priority
  const sortedSlides = sortSlides(enrichedSlides, filtered);

  const newFeatures = features.filter(
    (f) => f.is_highlight || f.status === "beta"
  );

  // Group by category
  const byCategory = enrichedSlides.reduce<Record<string, EnrichedSlide[]>>((acc, s) => {
    const cat = s.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s);
    return acc;
  }, {});

  // Group by journey phase
  const byPhase = enrichedSlides.reduce<Record<string, EnrichedSlide[]>>((acc, s) => {
    const phase = s.journeyPhase;
    if (!acc[phase]) acc[phase] = [];
    acc[phase].push(s);
    return acc;
  }, {});

  return {
    features: filtered,
    slides,
    enrichedSlides,
    sortedSlides,
    byCategory,
    byPhase,
    newFeatures,
    isLoading: query.isLoading,
    allFeatures: features,
  };
}
