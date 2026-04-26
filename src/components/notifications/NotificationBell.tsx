import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Bell, Check, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// Module-level dedup: track notification IDs already toasted in this session
const _toastedIds = new Set<string>();

interface SmartNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
  entity_type: string | null;
  entity_id: string | null;
  target_route: string | null;
  action_url: string | null;
}

export default function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: notifications = [] } = useQuery<SmartNotification[]>({
    queryKey: ["notifications", "bell", user?.id ?? ""],
    enabled: !!user,
    staleTime: 30_000,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("id, title, message, type, is_read, created_at, entity_type, entity_id, target_route, action_url")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(10);
      return (data || []) as SmartNotification[];
    },
  });

  const unread = notifications.filter((n) => !n.is_read).length;

  // Realtime subscription — deduplicate toasts across remounts
  useEffect(() => {
    if (!user) return;
    const channelName = "bell-" + user.id;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const n = payload.new as SmartNotification;
          queryClient.invalidateQueries({ queryKey: ["notifications"] });

          // Skip if already toasted this session
          if (_toastedIds.has(n.id)) return;
          _toastedIds.add(n.id);

          if (n.type === "alert") {
            toast.error(n.title, { description: n.message, duration: 8000 });
          } else if (n.type === "progress") {
            toast.success(n.title, { description: n.message, duration: 5000 });
          } else {
            toast(n.title, { description: n.message, duration: 4000 });
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  const handleNotificationClick = useCallback(
    async (n: SmartNotification) => {
      // Mark as read
      if (!n.is_read) {
        await supabase.from("notifications").update({ is_read: true }).eq("id", n.id);
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
      }

      // Navigate to target
      const route = n.target_route || n.action_url;
      if (route) {
        setOpen(false);
        // Internal route
        if (route.startsWith("/")) {
          navigate(route);
        } else {
          window.open(route, "_blank");
        }
      }
    },
    [navigate, queryClient],
  );

  const markRead = useCallback(
    async (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      await supabase.from("notifications").update({ is_read: true }).eq("id", id);
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    [queryClient],
  );

  const formatTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "agora";
    if (mins < 60) return `${mins}min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    return `${days}d`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
              {unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b border-border flex items-center justify-between">
          <h4 className="font-medium text-sm">Notificações</h4>
          {unread > 0 && (
            <span className="text-[10px] text-primary font-medium">{unread} novas</span>
          )}
        </div>
        <div className="max-h-72 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Sem notificações</p>
          ) : (
            notifications.map((n) => {
              const hasRoute = !!(n.target_route || n.action_url);
              const targetPath = n.target_route || n.action_url || "";
              
              return (
                <div
                  key={n.id}
                  className={`px-3 py-3 border-b border-border/50 transition-all ${
                    !n.is_read ? "bg-primary/5" : ""
                  }`}
                >
                  <div className="flex items-start gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <p className={`font-semibold text-xs truncate ${!n.is_read ? "text-foreground" : "text-muted-foreground"}`}>
                          {n.title}
                        </p>
                      </div>
                      <p className="text-muted-foreground text-[11px] leading-relaxed mt-0.5">{n.message}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] text-muted-foreground/60">
                          {formatTime(n.created_at)}
                          {n.entity_type && ` · ${n.entity_type}`}
                        </span>
                        {hasRoute && (
                          <div className="px-1.5 py-0.5 rounded bg-muted text-[9px] text-muted-foreground font-mono truncate max-w-[120px]" title={targetPath}>
                            {targetPath.split("/").pop() || "abrir"}
                          </div>
                        )}
                      </div>
                    </div>
                    {!n.is_read && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 flex-shrink-0"
                        onClick={(e) => markRead(e, n.id)}
                      >
                        <Check className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                  
                  {hasRoute && (
                    <div className="flex gap-2 mt-2">
                      <Button 
                        size="sm" 
                        variant="default" 
                        className="h-7 text-[10px] flex-1 gap-1.5 gradient-primary"
                        onClick={() => handleNotificationClick(n)}
                      >
                        {n.type === "patient_registered" ? "Ver Paciente" : "Abrir Ação"}
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-7 text-[10px] px-2"
                        onClick={(e) => markRead(e, n.id)}
                        disabled={n.is_read}
                      >
                        Lido
                      </Button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
        <div className="p-2 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs"
            onClick={() => {
              setOpen(false);
              navigate("/notifications");
            }}
          >
            Ver todas
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
