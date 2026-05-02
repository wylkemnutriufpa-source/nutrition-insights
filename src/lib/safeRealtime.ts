/**
 * 🛡️ Safe Realtime Wrapper
 *
 * Em alguns ambientes (Safari iOS modo privado, navegadores com cookies de terceiros
 * bloqueados, redes corporativas, PWA com sessão expirada) a criação de WebSocket
 * lança "WebSocket not available: The operation is insecure." de forma SÍNCRONA,
 * derrubando a árvore React.
 *
 * Este helper garante que QUALQUER falha de Realtime nunca propague como crash —
 * em vez disso, o app continua funcionando sem realtime (degradação graciosa).
 */
import { supabase } from "@/integrations/supabase/client";

let realtimeAvailable: boolean | null = null;

export function isRealtimeAvailable(): boolean {
  if (realtimeAvailable !== null) return realtimeAvailable;
  try {
    if (typeof WebSocket === "undefined") {
      realtimeAvailable = false;
      return false;
    }
    realtimeAvailable = true;
    return true;
  } catch {
    realtimeAvailable = false;
    return false;
  }
}

/**
 * Cria um canal Supabase de forma segura. Se o navegador bloquear WebSocket,
 * retorna um objeto stub para que o código consumidor não quebre.
 */
export function safeChannel(name: string): ReturnType<typeof supabase.channel> | null {
  if (!isRealtimeAvailable()) {
    console.warn(`[SafeRealtime] WebSocket indisponível — canal "${name}" ignorado.`);
    return null;
  }
  try {
    return supabase.channel(name);
  } catch (err: any) {
    console.warn(`[SafeRealtime] Falha ao criar canal "${name}":`, err?.message);
    realtimeAvailable = false;
    return null;
  }
}

/**
 * Remove canal com proteção. Nunca lança.
 */
export function safeRemoveChannel(channel: any) {
  if (!channel) return;
  try {
    supabase.removeChannel(channel);
  } catch (err: any) {
    console.warn("[SafeRealtime] Falha ao remover canal:", err?.message);
  }
}

/**
 * Wrapper para .subscribe() que captura exceções síncronas.
 */
export function safeSubscribe(channel: any) {
  if (!channel) return null;
  try {
    return channel.subscribe();
  } catch (err: any) {
    console.warn("[SafeRealtime] Falha em subscribe:", err?.message);
    return null;
  }
}
