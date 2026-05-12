import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PATIENT_FEATURE_REGISTRY } from "@/lib/patientFeatureRegistry";

export interface FeatureExplorationState {
  exploredKeys: string[];
  totalFeatures: number;
  exploredCount: number;
  progress: number;
  level: string;
  loading: boolean;
  markExplored: (featureKey: string) => Promise<void>;
  unexploredFeatures: typeof PATIENT_FEATURE_REGISTRY;
}

const EXPLORER_LEVELS = [
  { min: 0, label: "Iniciante" },
  { min: 20, label: "Curioso" },
  { min: 40, label: "Explorador" },
  { min: 60, label: "Aventureiro" },
  { min: 80, label: "Mestre" },
  { min: 100, label: "Lendário" },
];

function getExplorerLevel(progress: number): string {
  let level = EXPLORER_LEVELS[0].label;
  for (const l of EXPLORER_LEVELS) {
    if (progress >= l.min) level = l.label;
  }
  return level;
}

export function useFeatureExplorer(): FeatureExplorationState {
  const { user } = useAuth();
  const [exploredKeys, setExploredKeys] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const totalFeatures = PATIENT_FEATURE_REGISTRY.length;

  useEffect(() => {
    if (!user) return;
    // Load explored features from patient_points with action_key = 'explore_feature'
    supabase
      .from("patient_points")
      .select("metadata")
      .eq("patient_id", user.id)
      .eq("action_key", "explore_feature")
      .then(({ data }) => {
        if (data) {
          const keys = data
            .map((d: any) => (d.metadata as any)?.feature_key)
            .filter(Boolean);
          setExploredKeys([...new Set(keys)]);
        }
        setLoading(false);
      });
  }, [user]);

  const markExplored = useCallback(async (featureKey: string) => {
    if (!user || exploredKeys.includes(featureKey)) return;
    
    const { data, error } = await supabase.rpc("award_points", {
      _patient_id: user.id,
      _action_key: "explore_feature",
      _metadata: { feature_key: featureKey },
      _source_type: "explorer",
      _source_id: `explore_${featureKey}`,
    });

    if (!error && (data as any)?.awarded) {
      setExploredKeys(prev => [...prev, featureKey]);
    }
  }, [user, exploredKeys]);

  const exploredCount = exploredKeys.length;
  const progress = totalFeatures > 0 ? Math.round((exploredCount / totalFeatures) * 100) : 0;
  const level = getExplorerLevel(progress);

  const unexploredFeatures = PATIENT_FEATURE_REGISTRY.filter(
    f => !exploredKeys.includes(f.key)
  );

  return {
    exploredKeys,
    totalFeatures,
    exploredCount,
    progress,
    level,
    loading,
    markExplored,
    unexploredFeatures,
  };
}
