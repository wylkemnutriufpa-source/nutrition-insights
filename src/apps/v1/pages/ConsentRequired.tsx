/**
 * FitJourney — Clinical Data Consent Page (LGPD)
 * Full-page trust-building experience for clinical consent.
 */
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Lock, Eye, FileText, Brain, CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { logAudit } from "@/lib/auditLog";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { TERMS_VERSION } from "@/hooks/useConsentGuard";

const CONSENT_SECTIONS = [
  {
    icon: Brain,
    title: "Análise Clínica Inteligente",
    description: "Seus dados de saúde serão processados por nosso motor clínico determinístico para gerar insights personalizados, alertas de risco e recomendações baseadas em evidências.",
  },
  {
    icon: Lock,
    title: "Criptografia e Segurança",
    description: "Todos os dados são armazenados com criptografia em repouso e em trânsito. Acesso restrito apenas ao seu profissional de saúde vinculado.",
  },
  {
    icon: Eye,
    title: "Transparência Total",
    description: "Você pode visualizar, exportar ou solicitar a exclusão dos seus dados a qualquer momento, conforme garantido pela LGPD (Lei nº 13.709/2018).",
  },
  {
    icon: FileText,
    title: "Dados Coletados",
    description: "Medidas corporais, fotos de acompanhamento, registros alimentares, check-ins diários, respostas de anamnese e dados de adesão ao plano nutricional.",
  },
];

export default function ConsentRequired() {
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleAccept = async () => {
    if (!accepted || !user) return;
    setSubmitting(true);
    try {
      const deviceInfo = `${navigator.userAgent.slice(0, 200)}`;

      const { error } = await (supabase as any)
        .from("clinical_consents")
        .insert({
          patient_id: user.id,
          accepted_terms_version: TERMS_VERSION,
          device_info: deviceInfo,
        });

      if (error) throw error;

      // Advance lifecycle: consent accepted → onboarding_active
      await supabase.rpc("accept_patient_consent" as any, { _patient_id: user.id });

      logAudit("consent_accepted", "clinical_consents", user.id, {
        version: TERMS_VERSION,
      });

      await queryClient.invalidateQueries({ queryKey: ["clinical-consent"] });
      await queryClient.invalidateQueries({ queryKey: ["payment-guard"] });
      toast.success("Consentimento registrado com sucesso!");
      // Não chamamos navigate(): SystemStateGuard observa hasConsent + journey_status
      // e move o paciente para a próxima etapa automaticamente.

    } catch (err) {
      console.error("Consent error:", err);
      toast.error("Erro ao registrar consentimento. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-2xl w-full"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6"
          >
            <Shield className="h-10 w-10 text-primary" />
          </motion.div>
          <h1 className="text-3xl font-bold text-foreground mb-3">
            Proteção dos Seus Dados Clínicos
          </h1>
          <p className="text-muted-foreground text-lg max-w-md mx-auto">
            Antes de iniciar sua jornada, precisamos do seu consentimento para o tratamento seguro dos seus dados de saúde.
          </p>
        </div>

        {/* Consent Sections */}
        <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-6 mb-6 space-y-5">
          {CONSENT_SECTIONS.map((section, i) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              className="flex gap-4"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <section.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm">{section.title}</h3>
                <p className="text-muted-foreground text-sm mt-1 leading-relaxed">
                  {section.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Legal Reference */}
        <div className="bg-muted/30 border border-border/30 rounded-xl p-4 mb-6">
          <p className="text-xs text-muted-foreground leading-relaxed">
            <strong>Base Legal:</strong> Art. 7º, I e Art. 11, I da Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018). 
            O tratamento de dados pessoais sensíveis relativos à saúde será realizado exclusivamente para fins de 
            acompanhamento nutricional, mediante consentimento específico e destacado do titular. 
            Versão dos termos: <strong>{TERMS_VERSION}</strong>
          </p>
        </div>

        {/* Accept Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-6"
        >
          <label className="flex items-start gap-3 cursor-pointer group">
            <Checkbox
              checked={accepted}
              onCheckedChange={(v) => setAccepted(v === true)}
              className="mt-0.5"
            />
            <span className="text-sm text-foreground leading-relaxed">
              Li e compreendi as informações acima. <strong>Autorizo o tratamento dos meus dados clínicos</strong> conforme
              descrito, para fins de acompanhamento nutricional personalizado, ciente de que posso revogar
              este consentimento a qualquer momento.
            </span>
          </label>

          <Button
            onClick={handleAccept}
            disabled={!accepted || submitting}
            className="w-full mt-6 h-12 text-base gap-2"
            size="lg"
          >
            {submitting ? (
              "Registrando..."
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5" />
                Aceitar e Continuar
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </motion.div>

        {/* Footer Links */}
        <div className="text-center mt-6 space-x-4">
          <Link to="/privacy" className="text-xs text-muted-foreground hover:text-primary transition-colors">
            Política de Privacidade
          </Link>
          <Link to="/terms" className="text-xs text-muted-foreground hover:text-primary transition-colors">
            Termos de Uso
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
