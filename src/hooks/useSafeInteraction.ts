import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";

/**
 * Helper to standardise UI interactions with logs and safety checks.
 * Ensures consistent behavior across modals and dropdowns.
 */
export function useSafeInteraction(componentName: string) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const log = useCallback((action: string, data?: any) => {
    console.log(`[UI:${componentName}] ${action}`, data || "");
  }, [componentName]);

  const toggle = useCallback((open: boolean) => {
    log("toggle", { open });
    setIsOpen(open);
  }, [log]);

  const withLoading = useCallback(async (fn: () => Promise<any>) => {
    setLoading(true);
    log("action_start");
    try {
      const result = await fn();
      log("action_success");
      return result;
    } catch (error: any) {
      log("action_error", error);
      toast.error("Erro na interação: " + (error.message || "Tente novamente"));
      throw error;
    } finally {
      setLoading(false);
    }
  }, [log]);

  // Handle ESC key globally when open
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        log("esc_close");
        setIsOpen(false);
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, log]);

  return {
    isOpen,
    setIsOpen: toggle,
    loading,
    setLoading,
    withLoading,
    log
  };
}
