import { motion } from "framer-motion";
import { Shield, Lock, Eye, FileText, Brain, CheckCircle2 } from "lucide-react";
import { TERMS_VERSION } from "@/hooks/useConsentGuard";

const CONSENT_SECTIONS = [
  {
    icon: Brain,
    title: "Análise Clínica Inteligente",
    description: "Os dados de saúde são processados por nosso motor clínico determinístico para gerar insights personalizados, alertas de risco e recomendações baseadas em evidências.",
  },
  {
    icon: Lock,
    title: "Criptografia e Segurança",
    description: "Todos os dados são armazenados com criptografia em repouso e em trânsito. Acesso restrito apenas ao profissional de saúde vinculado.",
  },
  {
    icon: Eye,
    title: "Transparência Total",
    description: "O paciente pode visualizar, exportar ou solicitar a exclusão dos dados a qualquer momento, conforme garantido pela LGPD (Lei nº 13.709/2018).",
  },
  {
    icon: FileText,
    title: "Dados Coletados",
    description: "Medidas corporais, fotos de acompanhamento, registros alimentares, check-ins diários, respostas de anamnese e dados de adesão ao plano nutricional.",
  },
];

export function ClinicalConsentViewer({ patientId }: { patientId?: string }) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-4">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/10 mb-2">
          <Shield className="h-6 w-6 text-emerald-500" />
        </div>
        <h3 className="text-lg font-bold text-white">Termo de Consentimento Clínico</h3>
        <p className="text-zinc-500 text-xs">Versão: {TERMS_VERSION} · Em conformidade com a LGPD</p>
      </div>

      <div className="grid gap-4">
        {CONSENT_SECTIONS.map((section, i) => (
          <motion.div
            key={section.title}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="flex gap-3 p-3 rounded-xl bg-black/40 border border-white/5"
          >
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <section.icon className="h-4 w-4 text-emerald-500" />
            </div>
            <div>
              <h4 className="font-bold text-white text-xs">{section.title}</h4>
              <p className="text-zinc-400 text-[11px] mt-1 leading-relaxed">
                {section.description}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-4">
        <p className="text-[10px] text-zinc-500 leading-relaxed italic">
          <strong>Base Legal:</strong> Art. 7º, I e Art. 11, I da Lei Geral de Proteção de Dados (LGPD). 
          O tratamento de dados pessoais sensíveis relativos à saúde é realizado exclusivamente para fins de 
          acompanhamento nutricional, mediante consentimento específico e destacado do titular.
        </p>
      </div>
    </div>
  );
}
