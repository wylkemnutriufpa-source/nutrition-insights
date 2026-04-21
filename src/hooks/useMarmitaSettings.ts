import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export interface MarmitaSettings {
  weekly_min_lunch: number;
  weekly_min_dinner: number;
  fixed_min_lunch: number;
  fixed_min_dinner: number;
}

const DEFAULTS: MarmitaSettings = {
  weekly_min_lunch: 7,
  weekly_min_dinner: 7,
  fixed_min_lunch: 7,
  fixed_min_dinner: 7,
};

export function useMarmitaSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<MarmitaSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("marmita_generation_settings")
      .select("weekly_min_lunch, weekly_min_dinner, fixed_min_lunch, fixed_min_dinner")
      .eq("nutritionist_id", user.id)
      .maybeSingle();
    if (data) setSettings(data as MarmitaSettings);
    else setSettings(DEFAULTS);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const save = useCallback(async (next: MarmitaSettings) => {
    if (!user) return { ok: false, error: "Não autenticado" };
    setSaving(true);
    const clamp = (n: number) => Math.max(1, Math.min(7, Math.round(n || 1)));
    const payload = {
      nutritionist_id: user.id,
      weekly_min_lunch: clamp(next.weekly_min_lunch),
      weekly_min_dinner: clamp(next.weekly_min_dinner),
      fixed_min_lunch: clamp(next.fixed_min_lunch),
      fixed_min_dinner: clamp(next.fixed_min_dinner),
    };
    const { error } = await supabase
      .from("marmita_generation_settings")
      .upsert(payload, { onConflict: "nutritionist_id" });
    setSaving(false);
    if (!error) setSettings(payload);
    return { ok: !error, error: error?.message };
  }, [user]);

  return { settings, loading, saving, save, reload: load };
}
