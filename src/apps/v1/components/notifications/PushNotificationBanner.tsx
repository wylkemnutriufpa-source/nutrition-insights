import { Bell, BellOff, X } from "lucide-react";
import { Button } from "@v1/components/ui/button";
import { usePushNotifications } from "@v1/hooks/usePushNotifications";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function PushNotificationBanner() {
  const { permission, isSubscribed, isSupported, loading, subscribe, unsubscribe } = usePushNotifications();
  const [dismissed, setDismissed] = useState(false);

  if (!isSupported || dismissed || isSubscribed || permission === "denied") return null;
  if (permission === "granted" && isSubscribed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        className="glass border border-primary/30 rounded-xl p-4 flex items-center gap-3 shadow-card"
      >
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Bell className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-sm">Ativar notificações push</p>
          <p className="text-xs text-muted-foreground">Receba alertas de metas, checklist e mensagens do nutricionista.</p>
        </div>
        <Button size="sm" className="gradient-primary shadow-glow" onClick={subscribe} disabled={loading}>
          {loading ? "Ativando..." : "Ativar"}
        </Button>
        <button onClick={() => setDismissed(true)} className="text-muted-foreground hover:text-foreground p-1">
          <X className="w-4 h-4" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
