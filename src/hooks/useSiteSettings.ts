import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SiteSetting {
  id: string;
  setting_key: string;
  setting_value: any;
  setting_type: string;
  category: string;
  label: string;
  updated_at: string;
}

export function useSiteSettings() {
  return useQuery({
    queryKey: ["site-settings"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("site_settings")
        .select("*")
        .order("category");
      if (error) throw error;
      const rows = (data || []) as SiteSetting[];
      const map: Record<string, any> = {};
      rows.forEach((s) => {
        map[s.setting_key] = s.setting_value;
      });
      return { raw: rows, map };
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useSiteSettingsRaw() {
  return useQuery({
    queryKey: ["site-settings-raw"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("site_settings")
        .select("*")
        .order("category");
      if (error) throw error;
      return (data || []) as SiteSetting[];
    },
  });
}

export function useUpdateSiteSetting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      const { error } = await (supabase as any)
        .from("site_settings")
        .update({ setting_value: value, updated_at: new Date().toISOString() })
        .eq("setting_key", key);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-settings"] });
      queryClient.invalidateQueries({ queryKey: ["site-settings-raw"] });
    },
  });
}

export function getSetting(map: Record<string, any> | undefined, key: string, fallback: any = "") {
  if (!map) return fallback;
  const val = map[key];
  return val !== undefined && val !== null && val !== "" ? val : fallback;
}
