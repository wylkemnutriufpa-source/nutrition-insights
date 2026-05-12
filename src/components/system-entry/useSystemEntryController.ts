import { useState, useEffect, useRef, useCallback } from "react";

export type AppEntryState = "loading" | "awareness" | "reveal" | "ready";

interface UseSystemEntryControllerOptions {
  dataReady: boolean;
  userRole?: "patient" | "professional" | "admin";
}

const PATIENT_MESSAGES = [
  "Sua transformação continua agora.",
  "Foco cria evolução.",
  "Consistência é o seu superpoder.",
  "Hoje faz parte do seu corpo futuro.",
  "Sua jornada está sendo monitorada.",
  "Cada passo conta na sua evolução.",
];

const PROFESSIONAL_MESSAGES = [
  "Inteligência clínica sincronizada.",
  "Centro de controle estratégico pronto.",
  "Ecossistema de pacientes atualizado.",
  "Monitoramento de precisão ativado.",
  "Motores clínicos operacionais.",
  "Dados prontos para análise.",
];

function pickRandom(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

const SESSION_KEY = "fj_entry_count";

export function useSystemEntryController({ dataReady, userRole = "patient" }: UseSystemEntryControllerOptions) {
  const [state, setState] = useState<AppEntryState>("loading");
  const awarenessTimer = useRef<NodeJS.Timeout | null>(null);
  const revealTimer = useRef<NodeJS.Timeout | null>(null);
  const dataReadyRef = useRef(false);
  const stateRef = useRef<AppEntryState>("loading");

  // Adaptive duration: reduce by 40% on repeat visits in same session
  const sessionCount = useRef(1);
  useEffect(() => {
    const stored = sessionStorage.getItem(SESSION_KEY);
    const count = stored ? parseInt(stored, 10) + 1 : 1;
    sessionCount.current = count;
    sessionStorage.setItem(SESSION_KEY, String(count));
  }, []);

  const durationMultiplier = sessionCount.current > 1 ? 0.6 : 1;

  const awarenessMessage = useRef(
    pickRandom(userRole === "patient" ? PATIENT_MESSAGES : PROFESSIONAL_MESSAGES)
  );

  stateRef.current = state;

  useEffect(() => {
    if (dataReady && !dataReadyRef.current) {
      dataReadyRef.current = true;

      if (stateRef.current === "loading") {
        // Data loaded — move to awareness
        setState("awareness");
        const dur = Math.round(1100 * durationMultiplier);
        awarenessTimer.current = setTimeout(() => {
          setState("reveal");
          revealTimer.current = setTimeout(() => {
            setState("ready");
          }, Math.round(600 * durationMultiplier));
        }, dur);
      }
    }
  }, [dataReady, durationMultiplier]);

  useEffect(() => {
    return () => {
      if (awarenessTimer.current) clearTimeout(awarenessTimer.current);
      if (revealTimer.current) clearTimeout(revealTimer.current);
    };
  }, []);

  const skipToReady = useCallback(() => {
    setState("ready");
  }, []);

  return {
    state,
    awarenessMessage: awarenessMessage.current,
    durationMultiplier,
    skipToReady,
    isRepeatVisit: sessionCount.current > 1,
  };
}
