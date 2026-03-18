import { useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Check, CheckCheck, Trash2, MessageSquare, Calendar, TrendingUp, AlertCircle, Info } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  action_url: string | null;
  created_at: string;
}

const typeIcons: Record<string, any> = {
  info: Info,
  message: MessageSquare,
  appointment: Calendar,
  progress: TrendingUp,
  alert: AlertCircle,
};

const typeColors: Record<string, string> = {
  info: "text-blue-500",
  message: "text-primary",
  appointment: "text-amber-500",
  progress: "text-emerald-500",
  alert: "text-destructive",
};

export default function Notifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = React.useState<"all" | "unread">("all");

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["notifications", "full", user?.id ?? ""],
    enabled: !!user,
    staleTime: 30_000,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(100);
      return (data || []) as Notification[];
    },
  });

  const markRead = useCallback(async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  }, [queryClient]);

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
              return (
                <motion.div key={n.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                  <Card className={`glass border-border transition-colors ${!n.is_read ? "border-l-4 border-l-primary bg-primary/5" : ""}`}>
                    <CardContent className="py-3 px-4 flex items-start gap-3">
                      <div className={`mt-0.5 ${typeColors[n.type] || "text-muted-foreground"}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className={`text-sm font-medium truncate ${!n.is_read ? "" : "text-muted-foreground"}`}>{n.title}</h3>
                          <span className="text-[10px] text-muted-foreground flex-shrink-0">{timeAgo(n.created_at)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        {!n.is_read && (
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => markRead(n.id)}>
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
