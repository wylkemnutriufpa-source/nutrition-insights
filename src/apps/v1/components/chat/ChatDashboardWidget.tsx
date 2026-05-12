import { useEffect, useState } from "react";
import { supabase } from "@v1/integrations/supabase/client";
import { useAuth } from "@v1/lib/auth";
import { MessageSquare, Clock, Users } from "lucide-react";
import { Link } from "react-router-dom";

interface ChatStats {
  activeConversations: number;
  pendingReplies: number;
  avgResponseMin: number | null;
}

export default function ChatDashboardWidget() {
  const { user } = useAuth();
  const [stats, setStats] = useState<ChatStats>({ activeConversations: 0, pendingReplies: 0, avgResponseMin: null });

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      // Today's conversations (unique senders)
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { data: todayMsgs } = await supabase
        .from("chat_messages")
        .select("sender_id, receiver_id")
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .gte("created_at", todayStart.toISOString());

      const uniqueContacts = new Set<string>();
      todayMsgs?.forEach(m => {
        const otherId = m.sender_id === user.id ? m.receiver_id : m.sender_id;
        uniqueContacts.add(otherId);
      });

      // Pending replies (unread messages to me)
      const { count: pending } = await supabase
        .from("chat_messages")
        .select("id", { count: "exact", head: true })
        .eq("receiver_id", user.id)
        .eq("is_read", false);

      setStats({
        activeConversations: uniqueContacts.size,
        pendingReplies: pending || 0,
        avgResponseMin: null, // Could compute from timestamps if needed
      });
    };

    load();
  }, [user]);

  return (
    <Link to="/v1/chat">
      <div className="glass-premium rounded-xl p-4 hover:scale-[1.02] transition-all cursor-pointer shimmer-sweep">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent/15 to-accent/5 flex items-center justify-center">
            <MessageSquare className="w-4.5 h-4.5 text-accent" />
          </div>
          <h3 className="font-display font-semibold text-sm">Central de Conversas</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-muted-foreground" />
            <div>
              <p className="text-lg font-bold">{stats.activeConversations}</p>
              <p className="text-[10px] text-muted-foreground">Conversas hoje</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            <div>
              <p className="text-lg font-bold text-warning">{stats.pendingReplies}</p>
              <p className="text-[10px] text-muted-foreground">Aguardando</p>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
