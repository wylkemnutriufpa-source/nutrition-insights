import React, { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { RefreshCw, X, Zap } from "lucide-react";
import { forceUpdate } from "@/lib/versionCheck";
import { motion, AnimatePresence } from "framer-motion";

export const UpdateBanner = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    const handleUpdate = () => setUpdateAvailable(true);
    window.addEventListener("fj-update-available", handleUpdate);
    return () => window.removeEventListener("fj-update-available", handleUpdate);
  }, []);

  if (!updateAvailable) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        className="fixed top-4 left-1/2 -translate-x-1/2 z-[300] w-[90%] max-w-sm"
      >
        <Alert className="bg-primary/95 text-primary-foreground border-none shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between gap-4 w-full">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 animate-pulse" />
              <AlertDescription className="text-xs font-bold whitespace-nowrap">
                Nova versão disponível
              </AlertDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                className="h-7 text-[10px] font-bold px-3"
                onClick={() => forceUpdate()}
              >
                <RefreshCw className="mr-1 h-3 w-3" />
                Atualizar
              </Button>
              <button
                onClick={() => setUpdateAvailable(false)}
                className="hover:bg-white/10 p-1 rounded-full transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </Alert>
      </motion.div>
    </AnimatePresence>
  );
};
