import { useEffect, useState } from "react";
import { useAuth } from "@v1/lib/auth";
import { supabase } from "@v1/integrations/supabase/client";
import { Card, CardContent } from "@v1/components/ui/card";
import { Badge } from "@v1/components/ui/badge";
import { CreditCard, Calendar, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import PrestigeBadge from "@v1/components/prestige/PrestigeBadge";
import PrestigeName from "@v1/components/prestige/PrestigeName";
import { usePrestige } from "@v1/hooks/usePrestige";

interface Subscription {
  id: string;
  plan_name: string;
  status: string;
  started_at: string;
  expires_at: string | null;
  features: unknown;
}

export default function SubscriptionCard() {
  const { user } = useAuth();
  const { prestige, loading: prestigeLoading } = usePrestige();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        setSubscription(data?.[0] || null);
        setLoading(false);
      });
  }, [user]);

  if (loading) {
    return (
      <Card className="glass shadow-card">
        <CardContent className="py-6">
          <div className="flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!subscription) {
    return (
      <Card className="glass shadow-card border-dashed">
        <CardContent className="flex items-center gap-4 py-5">
          <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
            <CreditCard className="w-6 h-6 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <p className="font-display font-semibold text-sm">Sem plano ativo</p>
            <p className="text-xs text-muted-foreground">Converse com seu nutricionista sobre os planos disponíveis</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const statusConfig: Record<string, { color: string; icon: typeof CheckCircle2; label: string }> = {
    active: { color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20", icon: CheckCircle2, label: "Ativo" },
    trial: { color: "bg-blue-500/10 text-blue-500 border-blue-500/20", icon: Clock, label: "Trial" },
    expired: { color: "bg-red-500/10 text-red-500 border-red-500/20", icon: AlertCircle, label: "Expirado" },
    cancelled: { color: "bg-muted text-muted-foreground border-muted", icon: AlertCircle, label: "Cancelado" },
  };

  const config = statusConfig[subscription.status] || statusConfig.active;
  const StatusIcon = config.icon;

  const daysRemaining = subscription.expires_at
    ? Math.ceil((new Date(subscription.expires_at).getTime() - Date.now()) / 86400000)
    : null;

  return (
    <Card className="glass shadow-card overflow-hidden">
      <div
        className="h-1"
        style={prestige.plan ? { background: `linear-gradient(90deg, ${prestige.plan.color}, ${prestige.plan.color}80)` } : undefined}
      >
        {!prestige.plan && <div className="h-full gradient-primary" />}
      </div>
      <CardContent className="py-5">
        <div className="flex items-start gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center shadow-glow shrink-0"
            style={prestige.plan ? { background: `${prestige.plan.color}20`, border: `2px solid ${prestige.plan.color}` } : undefined}
          >
            {prestige.plan ? (
              <span className="text-xl">{prestige.plan.badge_icon}</span>
            ) : (
              <CreditCard className="w-6 h-6 text-primary-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="font-display font-semibold">{subscription.plan_name}</h3>
              <Badge variant="outline" className={`text-[10px] ${config.color}`}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {config.label}
              </Badge>
              {prestige.plan && <PrestigeBadge plan={prestige.plan} size="sm" />}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Início: {new Date(subscription.started_at).toLocaleDateString("pt-BR")}
              </span>
              {subscription.expires_at && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {daysRemaining && daysRemaining > 0 ? `${daysRemaining} dias restantes` : "Expirado"}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
