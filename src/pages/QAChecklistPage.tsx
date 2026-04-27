import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Circle, XCircle, Loader2, ClipboardCheck, History, Smartphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";

const CHECKLIST_KEY = "ios_safari_invite_to_onboarding";

interface ChecklistStep {
  id: string;
  label: string;
  hint?: string;
}

const STEPS: ChecklistStep[] = [
  { id: "open_invite", label: "Abrir link /~oauth/convite/<code> no Safari", hint: "Use o link copiado da plataforma" },
  { id: "no_404", label: "Página NÃO mostra erro 404" },
  { id: "params_kept", label: "Parâmetros nutri/code permanecem na URL após redirect" },
  { id: "register", label: "Concluir cadastro do paciente" },
  { id: "bind_kept", label: "Vínculo com profissional foi preservado (paciente aparece na lista do nutri)" },
  { id: "onboarding_loads", label: "Onboarding carrega normalmente após login" },
  { id: "no_console_error", label: "Sem erros críticos no console / DevTools" },
];

interface PreviousRun {
  id: string;
  passed: boolean;
  device_label: string | null;
  notes: string | null;
  steps: { id: string; passed: boolean }[];
  created_at: string;
}

export default function QAChecklistPage() {
  const { user } = useAuth();
  const [results, setResults] = useState<Record<string, boolean | null>>(() => {
    return Object.fromEntries(STEPS.map((s) => [s.id, null]));
  });
  const [deviceLabel, setDeviceLabel] = useState("iPhone Safari");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<PreviousRun[]>([]);

  const loadHistory = async () => {
    const { data } = await supabase
      .from("qa_checklist_runs")
      .select("id, passed, device_label, notes, steps, created_at")
      .eq("checklist_key", CHECKLIST_KEY)
      .order("created_at", { ascending: false })
      .limit(10);
    setHistory((data as any[]) || []);
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const totalAnswered = Object.values(results).filter((v) => v !== null).length;
  const totalPassed = Object.values(results).filter((v) => v === true).length;
  const totalFailed = Object.values(results).filter((v) => v === false).length;
  const allPassed = totalAnswered === STEPS.length && totalFailed === 0;

  const setStep = (id: string, value: boolean) => {
    setResults((prev) => ({ ...prev, [id]: prev[id] === value ? null : value }));
  };

  const saveRun = async () => {
    if (totalAnswered < STEPS.length) {
      toast.error("Marque todas as etapas antes de salvar.");
      return;
    }
    if (!user) {
      toast.error("Você precisa estar autenticado.");
      return;
    }
    setSaving(true);
    try {
      // Snapshot the latest audit + recent telemetry so the run is auditable.
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const [auditRes, telemRes] = await Promise.all([
        supabase
          .from("public_route_audits")
          .select("pathname, status_code, ok, notes, checked_at")
          .gte("checked_at", since)
          .order("checked_at", { ascending: false })
          .limit(50),
        supabase
          .from("route_404_telemetry")
          .select("pathname, is_ios, is_safari, has_service_worker, created_at")
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

      const stepsPayload = STEPS.map((s) => ({
        id: s.id,
        label: s.label,
        passed: results[s.id] === true,
      }));

      const { error } = await supabase.from("qa_checklist_runs").insert({
        checklist_key: CHECKLIST_KEY,
        device_label: deviceLabel || null,
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
        steps: stepsPayload,
        passed: allPassed,
        notes: notes || null,
        executed_by: user.id,
        audit_snapshot: { rows: auditRes.data || [] },
        telemetry_snapshot: { rows: telemRes.data || [] },
      });
      if (error) throw error;
      toast.success(allPassed ? "Checklist registrado: PASSOU ✅" : "Checklist registrado com falhas");
      setResults(Object.fromEntries(STEPS.map((s) => [s.id, null])));
      setNotes("");
      await loadHistory();
    } catch (err: any) {
      toast.error(`Erro ao salvar: ${err?.message || err}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <Helmet>
        <title>QA · iPhone Safari · FitJourney</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="max-w-3xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-2">
            <ClipboardCheck className="w-6 h-6 text-primary" />
            <h1 className="font-display text-2xl font-bold">QA · Convite → Cadastro → Onboarding</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Rode este checklist no iPhone Safari sempre que houver mudança nos fluxos de convite ou
            anti-cache. Os resultados ficam salvos com um snapshot do audit e da telemetria de 404.
          </p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-3 text-center">
            <div className="text-2xl font-bold">{totalAnswered}/{STEPS.length}</div>
            <div className="text-xs text-muted-foreground">Respondidas</div>
          </Card>
          <Card className="p-3 text-center">
            <div className="text-2xl font-bold text-success">{totalPassed}</div>
            <div className="text-xs text-muted-foreground">Passou</div>
          </Card>
          <Card className="p-3 text-center">
            <div className="text-2xl font-bold text-destructive">{totalFailed}</div>
            <div className="text-xs text-muted-foreground">Falhou</div>
          </Card>
        </div>

        {/* Form */}
        <Card className="p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Dispositivo / browser</Label>
              <Input
                value={deviceLabel}
                onChange={(e) => setDeviceLabel(e.target.value)}
                placeholder="iPhone 13 · iOS 17 · Safari"
                className="mt-1"
              />
            </div>
            <div className="flex items-end">
              <Badge variant="outline" className="gap-1">
                <Smartphone className="w-3 h-3" />
                {typeof navigator !== "undefined"
                  ? navigator.userAgent.slice(0, 60) + "..."
                  : "n/d"}
              </Badge>
            </div>
          </div>

          <div className="space-y-2">
            {STEPS.map((step, i) => (
              <div
                key={step.id}
                className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/20 p-3"
              >
                <div className="text-xs font-mono text-muted-foreground pt-0.5 w-5">{i + 1}.</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{step.label}</div>
                  {step.hint && <div className="text-[11px] text-muted-foreground">{step.hint}</div>}
                </div>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant={results[step.id] === true ? "default" : "outline"}
                    onClick={() => setStep(step.id, true)}
                    className="h-8 px-2"
                    aria-label={`Etapa ${i + 1} passou`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={results[step.id] === false ? "destructive" : "outline"}
                    onClick={() => setStep(step.id, false)}
                    className="h-8 px-2"
                    aria-label={`Etapa ${i + 1} falhou`}
                  >
                    <XCircle className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div>
            <Label className="text-xs">Notas (opcional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Comportamento observado, erros, screenshots, etc."
              className="mt-1"
              rows={3}
            />
          </div>

          <Button onClick={saveRun} disabled={saving} className="w-full gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardCheck className="w-4 h-4" />}
            Salvar checklist
          </Button>
        </Card>

        {/* History */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <History className="w-4 h-4 text-muted-foreground" />
            <h2 className="font-semibold">Últimas execuções</h2>
          </div>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma execução registrada ainda.</p>
          ) : (
            <div className="space-y-2">
              {history.map((run) => (
                <div
                  key={run.id}
                  className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {run.passed ? (
                      <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="text-xs font-medium truncate">{run.device_label || "—"}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {new Date(run.created_at).toLocaleString("pt-BR")}
                      </div>
                    </div>
                  </div>
                  <Badge variant={run.passed ? "secondary" : "destructive"} className="text-[10px]">
                    {run.steps.filter((s) => s.passed).length}/{run.steps.length}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
