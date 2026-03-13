import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Crown, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ReactNode } from "react";

interface SubscriptionGuardProps {
  children: ReactNode;
  /** Feature name shown when blocked */
  featureName?: string;
  /** Required tier slug - if set, checks against current tier */
  requiredTier?: "basic" | "profissional" | "premium";
  /** If true, shows inline block instead of replacing entire content */
  inline?: boolean;
}

const TIER_ORDER = { basic: 1, profissional: 2, premium: 3 };

export default function SubscriptionGuard({
  children,
  featureName = "esta funcionalidade",
  requiredTier,
  inline = false,
}: SubscriptionGuardProps) {
  const { subscription, isNutritionist, isPersonal, isAdmin } = useAuth();
  const navigate = useNavigate();

  // Admins always have access
  if (isAdmin) return <>{children}</>;

  // Only block nutritionists (patients don't have subscriptions)
  if (!isNutritionist && !isPersonal) return <>{children}</>;

  // Check subscription status
  const isBlocked = !subscription.subscribed && !subscription.is_trial;

  // Check tier if required
  const tierBlocked = requiredTier && subscription.subscribed && subscription.subscription_tier
    ? (TIER_ORDER[subscription.subscription_tier as keyof typeof TIER_ORDER] || 0) < (TIER_ORDER[requiredTier] || 0)
    : false;

  if (!isBlocked && !tierBlocked) return <>{children}</>;

  const BlockContent = (
    <Card className={`border-2 border-dashed border-warning/40 bg-warning/5 ${inline ? "" : "max-w-lg mx-auto mt-8"}`}>
      <CardContent className="flex flex-col items-center text-center py-8 gap-4">
        <div className="w-16 h-16 rounded-full bg-warning/20 flex items-center justify-center">
          <Lock className="w-8 h-8 text-warning" />
        </div>
        <div>
          <h3 className="font-display text-lg font-bold mb-1">
            {tierBlocked ? "Upgrade Necessário" : "Assinatura Inativa"}
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            {tierBlocked
              ? `O acesso a ${featureName} requer o plano ${requiredTier?.charAt(0).toUpperCase()}${requiredTier?.slice(1)} ou superior.`
              : `Para acessar ${featureName}, você precisa ter uma assinatura ativa. Escolha um plano para continuar.`}
          </p>
        </div>
        <Button onClick={() => navigate("/pricing")} className="gap-2 gradient-primary shadow-glow">
          <Crown className="w-4 h-4" /> Ver Planos <ArrowRight className="w-4 h-4" />
        </Button>
      </CardContent>
    </Card>
  );

  return BlockContent;
}
