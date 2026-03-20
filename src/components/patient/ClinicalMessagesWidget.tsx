import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { X, MessageCircle, Lightbulb, Bell, BookOpen } from "lucide-react";
import { DOMAIN_CONFIG } from "@/lib/clinicalFlags";

interface ClinicalMessage {
  id: string;
  title: string;
  body: string;
  channel: string;
  priority: number;
  status: string;
  source_flag: string | null;
  message_code: string | null;
  generated_by: string;
}

interface Props {
  patientId?: string;
  channel?: string; // filter by channel
  dismissable?: boolean;
  compact?: boolean;
  limit?: number;
}

const channelIcons: Record<string, any> = {
  dashboard_highlight: Lightbulb,
  notification: Bell,
  modal: BookOpen,
  checklist_hint: MessageCircle,
};

export default function ClinicalMessagesWidget({
  patientId,
  channel,
  dismissable = true,
  compact = false,
  limit = 5,
}: Props) {
  const { user } = useAuth();
  const targetId = patientId || user?.id;
  const [messages, setMessages] = useState<ClinicalMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!targetId) return;
    let query = supabase
      .from("patient_clinical_messages")
      .select("*")
      .eq("patient_id", targetId)
      .eq("status", "active")
      .order("priority", { ascending: false })
      .limit(limit);

    if (channel) query = query.eq("channel", channel);

    query.then(({ data }) => {
      setMessages((data as ClinicalMessage[]) || []);
      setLoading(false);
    });
  }, [targetId, channel]);

  const dismiss = async (msgId: string) => {
    await supabase
      .from("patient_clinical_messages")
      .update({ status: "dismissed", updated_at: new Date().toISOString() })
      .eq("id", msgId);
    setMessages(prev => prev.filter(m => m.id !== msgId));
  };

  if (loading) {
    return <Skeleton className="h-20 rounded-xl" />;
  }

  if (messages.length === 0) return null;

  const flagCategory = (flag: string | null) => {
    if (!flag) return "geral";
    if (flag.includes("water") || flag.includes("hydra")) return "hidratacao";
    if (flag.includes("gastri") || flag.includes("constip") || flag.includes("reflux") || flag.includes("lactose")) return "digestivo";
    if (flag.includes("sleep") || flag.includes("caffein")) return "sono";
    if (flag.includes("sun") || flag.includes("vitamin") || flag.includes("ferrit")) return "micronutrientes";
    if (flag.includes("training") || flag.includes("strength")) return "performance";
    if (flag.includes("emotional") || flag.includes("anxiety") || flag.includes("binge")) return "comportamental";
    if (flag.includes("insulin") || flag.includes("weight") || flag.includes("muscle")) return "metabolico";
    return "geral";
  };

  return (
    <div className="space-y-2">
      <AnimatePresence mode="popLayout">
        {messages.map((msg, idx) => {
          const cat = flagCategory(msg.source_flag);
          const config = DOMAIN_CONFIG[cat] || DOMAIN_CONFIG.geral;
          const Icon = channelIcons[msg.channel] || Lightbulb;

          return (
            <motion.div
              key={msg.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: idx * 0.05, duration: 0.4 }}
              className="relative p-4 rounded-xl border border-primary/15 bg-primary/5 space-y-1.5"
            >
              {dismissable && (
                <button
                  onClick={() => dismiss(msg.id)}
                  className="absolute top-3 right-3 p-1 rounded-md hover:bg-muted transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              )}

              <div className="flex items-center gap-2 pr-6">
                <span className="text-base">{config.icon}</span>
                <Icon className="w-4 h-4 text-primary" />
                <p className="text-sm font-semibold text-foreground">{msg.title}</p>
              </div>

              {!compact && (
                <p className="text-sm text-muted-foreground leading-relaxed pl-1">
                  {msg.body}
                </p>
              )}

              <div className="flex items-center gap-2 pl-1">
                <Badge variant="outline" className="text-[10px] py-0">
                  {msg.channel === "dashboard_highlight" ? "Destaque" :
                   msg.channel === "checklist_hint" ? "Dica" :
                   msg.channel === "notification" ? "Notificação" :
                   msg.channel === "modal" ? "Educativo" : msg.channel}
                </Badge>
                {msg.generated_by === "rule_engine" && (
                  <Badge variant="secondary" className="text-[10px] py-0 gap-0.5">
                    ✨ Automática
                  </Badge>
                )}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
