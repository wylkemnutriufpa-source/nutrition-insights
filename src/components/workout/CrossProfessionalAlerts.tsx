import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Bell, AlertTriangle, Info, CheckCircle2, ArrowRightLeft,
  UtensilsCrossed, Dumbbell, TrendingDown
} from "lucide-react";

const ALERT_ICONS: Record<string, any> = {
  caloric_deficit: UtensilsCrossed,
  hypertrophy_goal: Dumbbell,
  weight_change: TrendingDown,
  pain_report: AlertTriangle,
  inactivity: Info,
};

const SEVERITY_COLORS: Record<string, string> = {
  info: "border-blue-500/30 bg-blue-500/5",
  warning: "border-amber-500/30 bg-amber-500/5",
  critical: "border-destructive/30 bg-destructive/5",
};

export default function CrossProfessionalAlerts() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await (supabase as any).from("cross_professional_alerts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      setAlerts(data || []);
      setLoading(false);
    };
    load();
  }, [user]);

  const markRead = async (id: string) => {
    await (supabase as any).from("cross_professional_alerts")
      .update({ is_read: true }).eq("id", id);
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_read: true } : a));
  };

  const unreadCount = alerts.filter(a => !a.is_read).length;

  if (loading) return null;
  if (alerts.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <ArrowRightLeft className="w-4 h-4 text-primary" />
          Alertas Multidisciplinares
          {unreadCount > 0 && (
            <Badge variant="destructive" className="text-xs">{unreadCount}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {alerts.slice(0, 8).map(a => {
          const Icon = ALERT_ICONS[a.alert_type] || Info;
          const colorClass = SEVERITY_COLORS[a.severity] || "";
          return (
            <div key={a.id} className={`flex items-start gap-3 p-2.5 rounded-lg border ${colorClass} ${a.is_read ? "opacity-60" : ""}`}>
              <Icon className="w-4 h-4 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold">{a.title}</p>
                {a.description && <p className="text-xs text-muted-foreground mt-0.5">{a.description}</p>}
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-[10px]">
                    {a.source_role === "nutritionist" ? "Nutricionista" : "Personal"}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(a.created_at).toLocaleDateString("pt-BR")}
                  </span>
                </div>
              </div>
              {!a.is_read && (
                <Button variant="ghost" size="sm" className="h-6 text-xs shrink-0" onClick={() => markRead(a.id)}>
                  <CheckCircle2 className="w-3 h-3" />
                </Button>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
