import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Bell, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface QuickNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

export default function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<QuickNotification[]>([]);
  const [open, setOpen] = useState(false);

  const unread = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    if (!user) return;
    supabase.from("notifications").select("id, title, message, type, is_read, created_at")
      .eq("user_id", user.id).order("created_at", { ascending: false }).limit(5)
      .then(({ data }) => setNotifications(data || []));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel("bell-" + user.id)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => setNotifications(prev => [payload.new as QuickNotification, ...prev].slice(0, 5)))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
              {unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b border-border flex items-center justify-between">
          <h4 className="font-medium text-sm">Notificações</h4>
          {unread > 0 && <span className="text-[10px] text-primary font-medium">{unread} novas</span>}
        </div>
        <div className="max-h-64 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Sem notificações</p>
          ) : notifications.map(n => (
            <div key={n.id} className={`px-3 py-2.5 border-b border-border/50 flex items-start gap-2 text-xs ${!n.is_read ? "bg-primary/5" : ""}`}>
              <div className="flex-1 min-w-0">
                <p className={`font-medium truncate ${!n.is_read ? "" : "text-muted-foreground"}`}>{n.title}</p>
                <p className="text-muted-foreground line-clamp-1 mt-0.5">{n.message}</p>
              </div>
              {!n.is_read && (
                <Button size="icon" variant="ghost" className="h-6 w-6 flex-shrink-0" onClick={() => markRead(n.id)}>
                  <Check className="w-3 h-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
        <div className="p-2 border-t border-border">
          <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => { setOpen(false); navigate("/notifications"); }}>
            Ver todas
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
