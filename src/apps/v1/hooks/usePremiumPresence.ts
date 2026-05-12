import { useMemo } from "react";
import { useAuth } from "@v1/lib/auth";

export type PremiumLevel = "standard" | "premium" | "premium_evolving" | "premium_elite";

interface PremiumPresence {
  level: PremiumLevel;
  isPremium: boolean;
  isElite: boolean;
  isEvolving: boolean;
  /** CSS class string to apply premium visual layer */
  cardClass: string;
  /** Ring class for avatars */
  ringClass: string;
  /** Shimmer class for special cards */
  shimmerClass: string;
  /** Badge label to display */
  badgeLabel: string | null;
  /** Contextual premium message */
  message: string | null;
}

const PREMIUM_MESSAGES: Record<PremiumLevel, string[]> = {
  standard: [],
  premium: [
    "Modo premium ativo",
    "Sua experiência premium está pronta",
    "Inteligência exclusiva desbloqueada",
  ],
  premium_evolving: [
    "Você está em fluxo de evolução premium",
    "Progredindo com orientação avançada",
    "Sua consistência está sendo reconhecida",
  ],
  premium_elite: [
    "Consistência elite detectada",
    "O sistema reconhece seu compromisso",
    "Você está entrando em território de maestria",
    "Sua evolução atingiu um nível superior",
  ],
};

function resolveLevel(subscription: { subscribed: boolean; subscription_tier: string | null }): PremiumLevel {
  if (!subscription.subscribed) return "standard";

  // For now, tier-based. Later can incorporate streak/adherence/achievements.
  const tier = subscription.subscription_tier?.toLowerCase() || "";
  if (tier.includes("elite") || tier.includes("annual") || tier.includes("anual")) {
    return "premium_elite";
  }
  if (tier.includes("pro") || tier.includes("semestral")) {
    return "premium_evolving";
  }
  return "premium";
}

function pickRandom(arr: string[]): string | null {
  if (!arr.length) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

export function usePremiumPresence(): PremiumPresence {
  const { subscription } = useAuth();

  return useMemo(() => {
    const level = resolveLevel(subscription);
    const isPremium = level !== "standard";
    const isElite = level === "premium_elite";
    const isEvolving = level === "premium_evolving" || isElite;

    return {
      level,
      isPremium,
      isElite,
      isEvolving,
      cardClass: isPremium ? "premium-card-edge" : "",
      ringClass: isPremium ? "premium-ring" : "",
      shimmerClass: isEvolving ? "premium-shimmer" : "",
      badgeLabel: isElite ? "Elite" : isEvolving ? "Pro" : isPremium ? "Premium" : null,
      message: pickRandom(PREMIUM_MESSAGES[level]),
    };
  }, [subscription]);
}
