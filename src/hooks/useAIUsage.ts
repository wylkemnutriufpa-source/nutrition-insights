import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export interface AIUsageStatus {
  allowed: boolean;
  used: number;
  max_uses: number;
  period_type?: string;
  period_days?: number;
  next_available?: string | null;
  loading: boolean;
}

export function useAIUsage(featureKey: string) {
  const { user, subscription } = useAuth();
  const [status, setStatus] = useState<AIUsageStatus>({
    allowed: true, used: 0, max_uses: 999, loading: true,
  });

  const planTier = subscription?.subscription_tier || "free";

  const checkUsage = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.rpc("check_ai_usage", {
        _user_id: user.id,
        _feature_key: featureKey,
        _plan_tier: planTier,
      });
      if (error) throw error;
      const result = typeof data === "string" ? JSON.parse(data) : data;
      setStatus({
        allowed: result.allowed,
        used: result.used,
        max_uses: result.max_uses,
        period_type: result.period_type,
        period_days: result.period_days,
        next_available: result.next_available,
        loading: false,
      });
    } catch (err) {
      console.error("Check AI usage error:", err);
      setStatus(prev => ({ ...prev, loading: false }));
    }
  }, [user, featureKey]);

  const recordUsage = useCallback(async (): Promise<boolean> => {
    if (!user) return false;
    try {
      const { data, error } = await supabase.rpc("record_ai_usage", {
        _user_id: user.id,
        _feature_key: featureKey,
        _plan_tier: planTier,
      });
      if (error) throw error;
      const result = typeof data === "string" ? JSON.parse(data) : data;
      setStatus({
        allowed: result.allowed,
        used: result.used,
        max_uses: result.max_uses,
        period_type: result.period_type,
        period_days: result.period_days,
        next_available: result.next_available,
        loading: false,
      });
      return true;
    } catch (err) {
      console.error("Record AI usage error:", err);
      return false;
    }
  }, [user, featureKey]);

  useEffect(() => {
    checkUsage();
  }, [checkUsage]);

  const usageLabel = status.period_type === "monthly"
    ? `${status.used}/${status.max_uses} este mês`
    : `${status.used}/${status.max_uses} hoje`;

  const nextAvailableDate = status.next_available
    ? new Date(status.next_available)
    : null;

  const nextAvailableLabel = nextAvailableDate
    ? status.period_type === "monthly"
      ? `Disponível em ${nextAvailableDate.toLocaleDateString("pt-BR")}`
      : `Disponível amanhã`
    : null;

  return {
    ...status,
    usageLabel,
    nextAvailableLabel,
    checkUsage,
    recordUsage,
  };
}
