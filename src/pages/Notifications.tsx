import { useCallback, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Check, CheckCheck, Trash2, MessageSquare, Calendar, TrendingUp, AlertCircle, Info, ExternalLink, Users, ClipboardCheck, Target, Utensils, Compass, ArrowRight } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  action_url: string | null;
  target_route: string | null;
  entity_type: string | null;
  entity_id: string | null;
  created_at: string;
}

const typeIcons: Record<string, any> = {
  info: Info,
  message: MessageSquare,
  appointment: Calendar,
  progress: TrendingUp,
  alert: AlertCircle,
  patient_registered: Users,
  onboarding_released: ClipboardCheck,
  plan_published: Utensils,
  push: Bell,
  clinical: AlertCircle,
  challenge: Target,
  guide: Compass,
};

const typeColors: Record<string, string> = {
  info: "text-blue-500",
  message: "text-primary",
  appointment: "text-amber-500",
  progress: "text-emerald-500",
  alert: "text-destructive",
  patient_registered: "text-primary",
  onboarding_released: "text-emerald-500",
  plan_published: "text-accent",
  push: "text-primary",
  clinical: "text-destructive",
  challenge: "text-amber-500",
  guide: "text-blue-500",
};

// Fallback routes for notification types when no target_route is set
const typeFallbackRoutes: Record<string, string> = {
  appointment: "/appointments",
  message: "/chat",
  patient_registered: "/patients",
  onboarding_released: "/anamnesis",
  plan_published: "/my-diet",
  challenge: "/challenges",
  guide: "/user-guide",
  clinical: "/clinical-brain",
  progress: "/journey",
  alert: "/notifications",
};

export default function Notifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["notifications", "full", user?.id ?? ""],
    enabled: !!user,
    staleTime: 30_000,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("id, title, message, type, is_read, action_url, target_route, entity_type, entity_id, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(100);
      return (data || []) as Notification[];
    },
  });

  const handleNotificationClick = useCallback(async (n: Notification) => {
    // Mark as read
    if (!n.is_read) {
      await supabase.from("notifications").update({ is_read: true }).eq("id", n.id);
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
    // Navigate to deep link
    const route = n.target_route || n.action_url || typeFallbackRoutes[n.type];
    if (route) {
      if (route.startsWith("/")) {
        navigate(route);
      } else {
        window.open(route, "_blank");
      }
    }
  }, [navigate, queryClient]);

  const markAllRead = useCallback(async () => {
    if (!user) return;
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
    toast.success("Todas as notificações marcadas como lidas");
  }, [user, queryClient]);

  const deleteNotification = useCallback(async (id: string) => {
    await supabase.from("notifications").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  }, [queryClient]);

  const filtered = filter === "unread" ? notifications.filter(n => !n.is_read) : notifications;
  const unreadCount = notifications.filter(n => !n.is_read).length;

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "agora";
    if (mins < 60) return `${mins}min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold flex items-center gap-2">
              <Bell className="w-6 h-6 text-primary" /> Notificações
            </h1>
            {unreadCount > 0 && <p className="text-sm text-muted-foreground">{unreadCount} não lida{unreadCount > 1 ? "s" : ""}</p>}
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>Todas</Button>
            <Button size="sm" variant={filter === "unread" ? "default" : "outline"} onClick={() => setFilter("unread")}>
              Não lidas {unreadCount > 0 && <Badge className="ml-1 text-[10px]">{unreadCount}</Badge>}
            </Button>
            {unreadCount > 0 && (
              <Button size="sm" variant="ghost" onClick={markAllRead} className="gap-1"><CheckCheck className="w-3.5 h-3.5" /> Ler todas</Button>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <AnimatePresence>
            {filtered.map(n => {
              const Icon = typeIcons[n.type] || Info;
              const hasRoute = !!(n.target_route || n.action_url || typeFallbackRoutes[n.type]);
              return (
                <motion.div key={n.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                  <Card
                    className={`glass border-border transition-colors ${!n.is_read ? "border-l-4 border-l-primary bg-primary/5" : ""} ${hasRoute ? "cursor-pointer hover:bg-muted/50" : ""}`}
                    onClick={() => hasRoute && handleNotificationClick(n)}
                  >
                    <CardContent className="py-3 px-4 flex items-start gap-3">
                      <div className={`mt-0.5 ${typeColors[n.type] || "text-muted-foreground"}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className={`text-sm font-medium truncate ${!n.is_read ? "" : "text-muted-foreground"}`}>{n.title}</h3>
                          {hasRoute && <ExternalLink className="w-3 h-3 text-muted-foreground flex-shrink-0" />}
                          <span className="text-[10px] text-muted-foreground flex-shrink-0">{timeAgo(n.created_at)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                        {n.entity_type && (
                          <span className="text-[10px] text-muted-foreground/60 mt-0.5 block">{n.entity_type}</span>
                        )}
                        {hasRoute && (
                          <div className="mt-3">
                            <Button size="sm" variant="outline" className="h-8 text-[11px] gap-2 border-primary/20 text-primary hover:bg-primary/5">
                              {n.type === 'plan_published' ? 'Ver meu plano' : 
                               n.type === 'message' ? 'Responder agora' :
                               n.type === 'appointment' ? 'Ver agendamento' :
                               'Acessar agora'}
                              <ArrowRight className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                        {!n.is_read && (
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => {
                            supabase.from("notifications").update({ is_read: true }).eq("id", n.id).then(() => {
                              queryClient.invalidateQueries({ queryKey: ["notifications"] });
                            });
                          }}>
                            <Check className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteNotification(n.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {filtered.length === 0 && (
            <Card className="glass"><CardContent className="py-12 text-center">
              <Bell className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">{filter === "unread" ? "Nenhuma notificação não lida." : "Nenhuma notificação."}</p>
            </CardContent></Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
