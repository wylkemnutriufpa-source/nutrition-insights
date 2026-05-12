import { useEffect, useState } from "react";
import { supabase } from "@v1/integrations/supabase/client";

interface QuickReply {
  id: string;
  message: string;
  icon: string;
  category: string;
}

/**
 * Loads quick reply suggestions based on patient signals (deterministic).
 * For nutritionists: shows context-aware suggestions based on patient data.
 */
export function useQuickReplies(patientId: string | null) {
  const [replies, setReplies] = useState<QuickReply[]>([]);

  useEffect(() => {
    if (!patientId) return;

    const load = async () => {
      // Check active patient signals
      const { data: signals } = await supabase
        .from("patient_signals")
        .select("signal_key, severity")
        .eq("patient_id", patientId)
        .eq("is_active", true);

      const signalKeys = signals?.map(s => s.signal_key) || [];

      // Map signals to trigger_signal values
      const triggers = new Set<string>(["general"]);
      for (const key of signalKeys) {
        if (key.includes("adherence") || key.includes("checklist")) triggers.add("low_adherence");
        if (key.includes("weight") || key.includes("stagnation")) triggers.add("weight_stagnation");
        if (key.includes("hydration") || key.includes("water")) triggers.add("hydration");
        if (key.includes("meal") || key.includes("skip")) triggers.add("meal_skip");
        if (key.includes("checkin")) triggers.add("checkin_pending");
        if (key.includes("progress") || key.includes("streak")) triggers.add("good_progress");
      }

      const { data: templates } = await supabase
        .from("quick_reply_templates" as any)
        .select("id, message, icon, category")
        .in("trigger_signal", Array.from(triggers))
        .eq("is_active", true)
        .order("priority", { ascending: false })
        .limit(6);

      setReplies((templates as any[]) || []);
    };

    load();
  }, [patientId]);

  return replies;
}
