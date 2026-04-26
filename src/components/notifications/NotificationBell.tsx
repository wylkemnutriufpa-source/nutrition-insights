import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Bell, Check, ExternalLink, Info } from "lucide-react";
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
        <Button variant="ghost" size="icon" className="relative group">
          <Bell className="w-5 h-5 transition-transform group-hover:rotate-12" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse border-2 border-background">
              {unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 shadow-2xl border-primary/20" align="end">
        <div className="p-3 border-b border-border flex items-center justify-between bg-muted/30">
          <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Bell className="w-3.5 h-3.5 text-primary" /> Central de Alertas
          </h4>
          {unread > 0 && (
            <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">{unread} novas</span>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 opacity-50">
              <Info className="w-8 h-8 mb-2" />
              <p className="text-xs font-medium">Nenhuma notificação encontrada</p>
            </div>
          ) : (
            notifications.map((n) => {
              const targetPath = n.target_route || n.action_url || "";
              const hasRoute = !!targetPath;
              const isExternal = targetPath.startsWith("http");
              
              return (
                <div
                  key={n.id}
                  className={`px-3 py-3 border-b border-border/50 transition-all group relative ${
                    !n.is_read ? "bg-primary/5" : "hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-start gap-2 pr-6">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <p className={`font-semibold text-xs truncate ${!n.is_read ? "text-foreground" : "text-muted-foreground"}`}>
                          {n.title}
                        </p>
                        {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                      </div>
                      <p className="text-muted-foreground text-[11px] leading-relaxed line-clamp-2 mb-2">{n.message}</p>
                      
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-2">
                        <span className="text-[9px] text-muted-foreground/60 flex items-center gap-1">
                          <Check className={`w-2.5 h-2.5 ${n.is_read ? "text-emerald-500" : "text-muted-foreground/30"}`} />
                          {formatTime(n.created_at)}
                        </span>

                        {hasRoute ? (
                          <div 
                            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary/10 text-[9px] text-primary font-medium border border-primary/10 cursor-help"
                            title={`Destino: ${targetPath}`}
                          >
                            <ExternalLink className="w-2 h-2" />
                            <span className="truncate max-w-[100px]">
                              {isExternal ? "Link Externo" : (targetPath.split("/").pop() || "Início")}
                            </span>
                          </div>
                        ) : (
                          <div className="px-1.5 py-0.5 rounded bg-muted text-[9px] text-muted-foreground/50 border border-transparent flex items-center gap-1">
                            <Info className="w-2 h-2 opacity-50" /> Sem rota
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="absolute right-2 top-3 flex flex-col gap-1 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                      {!n.is_read && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 bg-background shadow-sm border border-border/50 hover:bg-primary hover:text-primary-foreground"
                          onClick={(e) => markRead(e, n.id)}
                          title="Marcar como lido"
                        >
                          <Check className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {hasRoute && (
                    <div className="mt-3">
                      <Button 
                        size="sm" 
                        variant="default" 
                        className="w-full h-8 text-[10px] gap-1.5 gradient-primary shadow-sm"
                        onClick={() => handleNotificationClick(n)}
                      >
                        {n.type === "patient_registered" ? "Ver Perfil do Paciente" : "Executar Ação"}
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
        <div className="p-2 border-t border-border bg-muted/20">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary"
            onClick={() => {
              setOpen(false);
              navigate("/notifications");
            }}
          >
            Ver Histórico Completo
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}