import { supabase } from "@/integrations/supabase/client";

/**
 * Detecta se o erro é uma falha transitória de rede (típica do preview iframe
 * ou quedas momentâneas de conexão), digna de retry silencioso.
 */
function isTransientNetworkError(err: unknown): boolean {
  if (!err) return false;
  const anyErr = err as any;
  const name = String(anyErr?.name ?? "");
  const message = String(anyErr?.message ?? anyErr ?? "");

  // TypeError: Failed to fetch / NetworkError / AbortError transitório
  if (name === "TypeError" && /failed to fetch/i.test(message)) return true;
  if (/networkerror/i.test(name) || /networkerror/i.test(message)) return true;
  if (/failed to fetch/i.test(message)) return true;
  if (/load failed/i.test(message)) return true; // Safari
  if (/network request failed/i.test(message)) return true;

  // Mensagem genérica do supabase-js quando o fetch quebra antes de receber resposta
  if (/Failed to send a request to the Edge Function/i.test(message)) return true;

  return false;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface InvokeOptions {
  body?: any;
  headers?: Record<string, string>;
  /** Sobrescreve os delays de retry. Default: [200, 500] (ms). */
  retryDelays?: number[];
}

/**
 * Invoca uma edge function com retry automático e silencioso em erros de rede
 * transitórios (TypeError: Failed to fetch / NetworkError).
 *
 * - Faz até 2 retentativas (200ms e 500ms por padrão).
 * - NÃO faz retry em erros HTTP 4xx/5xx reais — esses são propagados imediatamente.
 * - Loga cada tentativa com tempo de resposta para diagnóstico.
 */
export async function invokeWithRetry(
  functionName: string,
  options: InvokeOptions = {}
) {
  const { body, headers, retryDelays = [200, 500] } = options;
  const maxAttempts = retryDelays.length + 1;

  let lastError: any = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const startedAt = performance.now();
    try {
      const { data, error } = await supabase.functions.invoke(functionName, {
        body,
        headers,
      });
      const elapsed = Math.round(performance.now() - startedAt);

      if (error) {
        // Erros HTTP reais (4xx/5xx) — não fazemos retry, propagamos.
        // O supabase-js entrega esses erros como FunctionsHttpError com status.
        const status = (error as any)?.context?.status ?? (error as any)?.status;
        const isHttpError = typeof status === "number" && status >= 400;

        if (isHttpError) {
          console.error(
            `[EdgeFunction] ${functionName} attempt ${attempt}/${maxAttempts} HTTP ${status} (${elapsed}ms)`,
            error
          );
          return { data, error };
        }

        // Erro sem status → tratamos como possível falha de rede transitória.
        if (isTransientNetworkError(error) && attempt < maxAttempts) {
          console.warn(
            `[EdgeFunction] ${functionName} transient network error on attempt ${attempt}/${maxAttempts} (${elapsed}ms). Retrying in ${retryDelays[attempt - 1]}ms...`,
            error
          );
          lastError = error;
          await sleep(retryDelays[attempt - 1]);
          continue;
        }

        console.error(
          `[EdgeFunction] ${functionName} failed on attempt ${attempt}/${maxAttempts} (${elapsed}ms)`,
          error
        );
        return { data, error };
      }

      if (attempt > 1) {
        console.info(
          `[EdgeFunction] ${functionName} succeeded on attempt ${attempt}/${maxAttempts} (${elapsed}ms)`
        );
      }
      return { data, error: null };
    } catch (err: any) {
      const elapsed = Math.round(performance.now() - startedAt);
      lastError = err;

      if (isTransientNetworkError(err) && attempt < maxAttempts) {
        console.warn(
          `[EdgeFunction] ${functionName} threw transient network error on attempt ${attempt}/${maxAttempts} (${elapsed}ms). Retrying in ${retryDelays[attempt - 1]}ms...`,
          err
        );
        await sleep(retryDelays[attempt - 1]);
        continue;
      }

      console.error(
        `[EdgeFunction] ${functionName} threw on attempt ${attempt}/${maxAttempts} (${elapsed}ms)`,
        err
      );
      return { data: null, error: err };
    }
  }

  return { data: null, error: lastError };
}

/** Exposto para que chamadores possam decidir se silenciam o toast. */
export { isTransientNetworkError };
