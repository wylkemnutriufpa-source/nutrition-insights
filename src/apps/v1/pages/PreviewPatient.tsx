/**
 * PreviewPatient — Internal route for professionals to inspect the patient
 * lifecycle envelope as the patient sees it.
 *
 * It does NOT impersonate the patient (no auth swap). Instead it uses
 * `usePatientLifecycleStateFor(patientId)` — the same data source that powers
 * the patient dashboard — to show what the patient would currently see:
 * onboarding state, plan visibility, blocking flags, and the active override.
 *
 * Linked-professional check: an effect verifies the link via
 * `nutritionist_patients` and redirects with a toast if the professional is
 * not linked to the patient (defensive — RLS already enforces it).
 */
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Eye,
  RefreshCw,
  ShieldOff,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { usePatientLifecycleStateFor } from "@/hooks/usePatientLifecycleState";
import { invalidateLifecycleQueries } from "@/lib/lifecycleCache";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function PreviewPatient() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [profile, setProfile] = useState<{ full_name: string | null } | null>(null);
  const [activeOverride, setActiveOverride] = useState<{
    expires_at: string;
    reason: string | null;
  } | null>(null);

  const lifecycle = usePatientLifecycleStateFor(patientId ?? null);

  // Linked check + load patient profile + load active override
  useEffect(() => {
    if (!patientId || !user) return;
    let cancelled = false;
    (async () => {
      const { data: link } = await supabase
        .from("nutritionist_patients")
        .select("id")
        .eq("nutritionist_id", user.id)
        .eq("patient_id", patientId)
        .maybeSingle();
      if (cancelled) return;
      if (!link) {
        toast.error("Você não está vinculado a este paciente");
        navigate("/v1/patients", { replace: true });
        return;
      }

      const [{ data: prof }, { data: ovr }] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", patientId).maybeSingle(),
        supabase
          .from("professional_unblock_overrides" as any)
          .select("expires_at, reason")
          .eq("patient_id", patientId)
          .eq("professional_id", user.id)
          .is("revoked_at", null)
          .gt("expires_at", new Date().toISOString())
          .order("expires_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      if (cancelled) return;
      setProfile(prof as any);
      setActiveOverride((ovr as any) ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [patientId, user, navigate]);

  function refresh() {
    invalidateLifecycleQueries(queryClient, patientId ?? undefined);
    lifecycle.refetch();
    toast.success("Estado atualizado");
  }

  if (!patientId) {
    return (
      <DashboardLayout>
        <p className="text-muted-foreground">ID do paciente não informado.</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <Eye className="w-6 h-6 text-primary" />
          <div className="flex-1">
            <h1 className="font-display text-2xl font-bold">
              Preview do paciente
            </h1>
            <p className="text-sm text-muted-foreground">
              Snapshot do estado que <strong>{profile?.full_name ?? "este paciente"}</strong> vê agora
            </p>
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={refresh}>
            <RefreshCw className="w-4 h-4" /> Atualizar
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => navigate(`/patients/${patientId}`)}
          >
            <ExternalLink className="w-4 h-4" /> Ficha completa
          </Button>
        </div>

        {activeOverride && (
          <Card className="border-warning/40 bg-warning/5">
            <CardContent className="py-4 flex items-start gap-3">
              <ShieldOff className="w-5 h-5 text-warning shrink-0 mt-0.5" />
              <div className="flex-1 text-sm">
                <p className="font-medium">
                  Override de destravamento ativo —{" "}
                  expira em{" "}
                  {formatDistanceToNow(new Date(activeOverride.expires_at), {
                    locale: ptBR,
                    addSuffix: true,
                  })}
                </p>
                {activeOverride.reason && (
                  <p className="text-muted-foreground mt-1">
                    Motivo: {activeOverride.reason}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Estado do ciclo de vida</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {lifecycle.isLoading ? (
              <Skeleton className="h-6 w-40" />
            ) : (
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="text-xs">
                  state: <span className="font-mono ml-1">{lifecycle.state}</span>
                </Badge>
                <Badge
                  variant={lifecycle.hasActivePlan ? "default" : "outline"}
                  className="text-xs"
                >
                  {lifecycle.hasActivePlan ? (
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                  ) : (
                    <AlertTriangle className="w-3 h-3 mr-1" />
                  )}
                  has_active_plan
                </Badge>
                <Badge
                  variant={lifecycle.isBlocked ? "destructive" : "outline"}
                  className="text-xs"
                >
                  is_blocked: {String(lifecycle.isBlocked)}
                </Badge>
                <Badge
                  variant={lifecycle.showOnboarding ? "destructive" : "outline"}
                  className="text-xs"
                >
                  show_onboarding: {String(lifecycle.showOnboarding)}
                </Badge>
                <Badge
                  variant={lifecycle.showPlan ? "default" : "outline"}
                  className="text-xs"
                >
                  show_plan: {String(lifecycle.showPlan)}
                </Badge>
              </div>
            )}

            <dl className="grid sm:grid-cols-2 gap-3 text-sm pt-2">
              <Field label="Plano ativo" value={lifecycle.planTitle ?? "—"} />
              <Field label="Plano ID" value={lifecycle.planId ?? "—"} mono />
              <Field
                label="Onboarding status"
                value={lifecycle.onboardingStatus ?? "—"}
              />
              <Field
                label="Bloqueio"
                value={lifecycle.blockReason ?? (lifecycle.isBlocked ? "(sem motivo)" : "—")}
              />
              <Field
                label="Adesão"
                value={lifecycle.adherenceScore ? `${lifecycle.adherenceScore}%` : "—"}
              />
              <Field
                label="Risco"
                value={lifecycle.riskScore ? `${lifecycle.riskScore}` : "—"}
              />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">O que o paciente vê agora</CardTitle>
          </CardHeader>
          <CardContent>
            {lifecycle.showPlan ? (
              <div className="flex items-center gap-2 text-success">
                <CheckCircle2 className="w-5 h-5" />
                <span>
                  Card do plano <strong>visível</strong> no dashboard do paciente.
                </span>
              </div>
            ) : lifecycle.showOnboarding ? (
              <div className="flex items-center gap-2 text-warning">
                <AlertTriangle className="w-5 h-5" />
                <span>
                  Paciente vê a tela de <strong>onboarding</strong> (
                  {lifecycle.blockReason ?? "anamnese pendente"}).
                </span>
              </div>
            ) : lifecycle.showWaitingApproval ? (
              <p className="text-sm text-muted-foreground">
                Paciente vê “aguardando aprovação do plano”.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Estado: {lifecycle.state}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className={mono ? "font-mono text-xs break-all" : ""}>{value}</dd>
    </div>
  );
}
