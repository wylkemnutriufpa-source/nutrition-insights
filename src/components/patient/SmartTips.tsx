import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Lightbulb, Check } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Tip {
  id: string;
  tip: string;
  category: string;
  icon: string;
  is_read: boolean;
}

export default function SmartTips() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [tips, setTips] = useState<Tip[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("patient_tips")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at")
      .then(({ data }) => {
        if (data) setTips(data as Tip[]);
      });
  }, [user]);

  const markRead = async (id: string) => {
    await supabase.from("patient_tips").update({ is_read: true }).eq("id", id);
    setTips((prev) => prev.map((t) => (t.id === id ? { ...t, is_read: true } : t)));
  };

  if (tips.length === 0) return null;

  const unread = tips.filter((t) => !t.is_read).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Lightbulb className="w-5 h-5 text-accent" />
        <h3 className="font-display font-semibold">{t("smartTips.title")}</h3>
        {unread > 0 && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium">
            {unread} {t("smartTips.newCount")}
          </span>
        )}
      </div>

      <div className="grid gap-2">
        {tips.map((tip, i) => (
          <motion.div
            key={tip.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`glass rounded-xl p-4 flex items-start gap-3 transition-all ${
              tip.is_read ? "opacity-60" : ""
            }`}
          >
            <span className="text-2xl flex-shrink-0">{tip.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground">{tip.tip}</p>
              <span className="text-xs text-muted-foreground capitalize mt-1 inline-block">
                {tip.category}
              </span>
            </div>
            {!tip.is_read && (
              <button
                onClick={() => markRead(tip.id)}
                className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors"
              >
                <Check className="w-4 h-4 text-primary" />
              </button>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}