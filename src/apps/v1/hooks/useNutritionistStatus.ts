import { useEffect, useState } from "react";
import { supabase } from "@v1/integrations/supabase/client";

interface NutritionistStatus {
  isOnline: boolean;
  lastSeen: string | null;
  label: string;
  color: "green" | "yellow" | "gray";
}

/**
 * For a patient, checks the online status of their linked nutritionist.
 */
export function useNutritionistStatus(patientId: string | undefined) {
  const [status, setStatus] = useState<NutritionistStatus>({
    isOnline: false, lastSeen: null, label: "Offline", color: "gray",
  });
  const [nutritionistId, setNutritionistId] = useState<string | null>(null);

  // 1. Find the nutritionist
  useEffect(() => {
    if (!patientId) return;
    supabase
      .from("nutritionist_patients")
      .select("nutritionist_id")
      .eq("patient_id", patientId)
      .eq("status", "active")
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setNutritionistId(data.nutritionist_id);
      });
  }, [patientId]);

  // 2. Check presence
  useEffect(() => {
    if (!nutritionistId) return;

    const check = async () => {
      const { data } = await (supabase as any)
        .from("user_presence")
        .select("is_online, last_seen_at")
        .eq("user_id", nutritionistId)
        .maybeSingle();

      if (!data) {
        setStatus({ isOnline: false, lastSeen: null, label: "Offline — responderá em breve", color: "gray" });
        return;
      }

      const row = data as { is_online: boolean; last_seen_at: string };
      const lastSeen = new Date(row.last_seen_at);
      const diffMin = (Date.now() - lastSeen.getTime()) / 60000;

      if (row.is_online && diffMin < 2) {
        setStatus({ isOnline: true, lastSeen: row.last_seen_at, label: "Seu nutricionista está online agora", color: "green" });
      } else if (diffMin < 30) {
        setStatus({ isOnline: false, lastSeen: row.last_seen_at, label: "Seu nutricionista respondeu recentemente", color: "yellow" });
      } else {
        setStatus({ isOnline: false, lastSeen: row.last_seen_at, label: "Offline — responderá em breve", color: "gray" });
      }
    };

    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, [nutritionistId]);

  return { ...status, nutritionistId };
}
