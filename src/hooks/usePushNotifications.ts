import { useState, useEffect, useCallback } from "react";
import { supabase } from "@v1/integrations/supabase/client";
import { toast } from "sonner";

// VAPID public key — safe to expose in frontend
// Generated via: npx web-push generate-vapid-keys
const VAPID_PUBLIC_KEY =
  "BEvGFMB5dpy0wBBOKQhwOY_duamSBsGsu0CTVhu9W6IoEzmxI2BFbZR8c0Q6T5wEwiqT7kHdKwXNSiUlYYQ745s";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export type PushPermission = "default" | "granted" | "denied" | "unsupported";

export function usePushNotifications() {
  const [permission, setPermission] = useState<PushPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  const isSupported =
    "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

  useEffect(() => {
    if (!isSupported) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission as PushPermission);
    checkSubscription();
  }, []);

  const checkSubscription = useCallback(async () => {
    if (!isSupported) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setIsSubscribed(!!sub);
    } catch {
      setIsSubscribed(false);
    }
  }, []);

  const subscribe = useCallback(async () => {
    if (!isSupported) {
      toast.error("Seu navegador não suporta notificações push");
      return;
    }
    setLoading(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm as PushPermission);
      if (perm !== "granted") {
        toast.error("Permissão negada. Ative notificações nas configurações do navegador.");
        setLoading(false);
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const subJson = sub.toJSON();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      await supabase.from("push_subscriptions").upsert({
        user_id: user.id,
        endpoint: subJson.endpoint!,
        p256dh: (subJson.keys as any).p256dh,
        auth: (subJson.keys as any).auth,
        user_agent: navigator.userAgent.slice(0, 200),
      }, { onConflict: "user_id,endpoint" });

      setIsSubscribed(true);
      toast.success("Notificações push ativadas! 🔔");
    } catch (err: any) {
      console.error("Push subscribe error:", err);
      toast.error("Erro ao ativar notificações: " + (err.message || "tente novamente"));
    }
    setLoading(false);
  }, []);

  const unsubscribe = useCallback(async () => {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("push_subscriptions").delete().eq("user_id", user.id).eq("endpoint", endpoint);
        }
      }
      setIsSubscribed(false);
      toast.success("Notificações desativadas");
    } catch (err: any) {
      toast.error("Erro ao desativar: " + err.message);
    }
    setLoading(false);
  }, []);

  // Send a local notification (no server needed — for testing & in-app events)
  const sendLocalNotification = useCallback((title: string, body: string, icon = "/pwa-192x192.png") => {
    if (!isSupported || Notification.permission !== "granted") return;
    navigator.serviceWorker.ready.then(reg => {
      reg.showNotification(title, { body, icon, badge: "/pwa-192x192.png" });
    });
  }, []);

  return { permission, isSubscribed, isSupported, loading, subscribe, unsubscribe, sendLocalNotification };
}
