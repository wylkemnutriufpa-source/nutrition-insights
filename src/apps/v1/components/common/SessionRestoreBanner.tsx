import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, X, RotateCcw } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { checkShouldRestore, clearSessionContext, saveSessionContext, SessionContext } from "@/lib/sessionContext";

export default function SessionRestoreBanner() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [restoreCtx, setRestoreCtx] = useState<SessionContext | null>(null);
  const [dismissed, setDismissed] = useState(false);

  // Check on mount if user should be offered to restore
  useEffect(() => {
    if (!user) return;
    const ctx = checkShouldRestore(location.pathname, user.id);
    if (ctx) {
      setRestoreCtx(ctx);
    }
  }, [user]); // Only on mount / user change

  // Save current route on every navigation
  useEffect(() => {
    if (!user) return;
    saveSessionContext(location.pathname, user.id);
  }, [location.pathname, user]);

  // Save on visibility change (user leaving the app)
  useEffect(() => {
    if (!user) return;
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        saveSessionContext(location.pathname, user.id);
      } else if (document.visibilityState === "visible") {
        // User came back — check if should restore
        const ctx = checkShouldRestore(location.pathname, user.id);
        if (ctx && !dismissed) {
          setRestoreCtx(ctx);
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [user, location.pathname, dismissed]);

  const handleRestore = () => {
    if (!restoreCtx) return;
    clearSessionContext();
    setRestoreCtx(null);
    navigate(restoreCtx.route);
  };

  const handleDismiss = () => {
    setDismissed(true);
    setRestoreCtx(null);
    clearSessionContext();
  };

  return (
    <AnimatePresence>
      {restoreCtx && !dismissed && (
        <motion.div
          initial={{ opacity: 0, y: -40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="fixed top-3 left-1/2 -translate-x-1/2 z-[100] w-[95vw] max-w-md"
        >
          <div className="rounded-2xl border border-primary/30 bg-card shadow-2xl shadow-primary/10 p-4 backdrop-blur-xl">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <RotateCcw className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">Bem-vindo(a) de volta! 👋</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Você estava em <span className="font-semibold text-foreground">{restoreCtx.routeLabel}</span>. Deseja continuar?
                </p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={handleRestore}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-all shadow-sm"
                  >
                    Continuar de onde parei
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={handleDismiss}
                    className="px-3 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                  >
                    Ficar aqui
                  </button>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="w-6 h-6 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
