import React, { useEffect, useState } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle, CheckCircle2, Activity, ShieldAlert, BarChart3, Clock } from 'lucide-react';

interface LegacyRule {
  legacy_rule: string;
  impact_count: number;
  readiness_with_rule: number;
  critical_failures: number;
}

interface AuditMetric {
  audit_date: string;
  total_samples: number;
  compatibility_rate: number;
  readiness_score: number;
  avg_divergence_per_plan: number;
  divergence_heatmap: Record<string, number>;
}

export const ClinicalAuditDashboard = () => {
  const [metrics, setMetrics] = useState<AuditMetric[]>([]);
  const [rules, setRules] = useState<LegacyRule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [metricsRes, rulesRes] = await Promise.all([
        supabase.from('clinical_observability_dashboard').select('*').order('audit_date', { ascending: false }),
        supabase.from('legacy_rule_heatmap').select('*').order('impact_count', { ascending: false })
      ]);

      if (metricsRes.error) console.error("Error fetching metrics:", metricsRes.error);
      else setMetrics((metricsRes.data as unknown as AuditMetric[]) || []);

      if (rulesRes.error) console.error("Error fetching rules:", rulesRes.error);
      else setRules((rulesRes.data as unknown as LegacyRule[]) || []);

      setLoading(false);
    };

    fetchData();
  }, []);

  if (loading) return <div className="p-8 text-slate-500 font-mono text-sm animate-pulse">Consultando Shadow Audit...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
          <Activity className="text-green-500" /> Observabilidade Clínica (Shadow)
        </h2>
        <div className="px-3 py-1 bg-yellow-500/10 border border-yellow-500/20 rounded-full">
          <span className="text-[10px] font-bold text-yellow-500 uppercase tracking-widest">Modo Comparativo V1 vs V2</span>
        </div>
      </div>

      {metrics.length === 0 ? (
        <div className="p-12 border border-dashed border-slate-800 rounded-2xl text-center">
          <Clock className="mx-auto text-slate-600 mb-2" size={32} />
          <p className="text-slate-500 text-sm">Nenhum dado de shadow audit coletado ainda.</p>
          <p className="text-slate-600 text-[10px] uppercase mt-1">Aguardando geração de planos em produção</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {metrics.map((day) => (
            <div key={day.audit_date} className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 overflow-hidden relative">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                  <p className="text-xs text-slate-500 font-mono uppercase tracking-tighter">Data da Auditoria</p>
                  <p className="text-lg font-black">{new Date(day.audit_date).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-4">
                  <div className="text-center px-4 py-2 bg-black/40 rounded-xl border border-slate-800">
                    <p className="text-[10px] text-slate-500 uppercase font-bold">Readiness V2</p>
                    <p className={`text-xl font-black ${day.readiness_score > 90 ? 'text-green-500' : 'text-yellow-500'}`}>
                      {day.readiness_score}%
                    </p>
                  </div>
                  <div className="text-center px-4 py-2 bg-black/40 rounded-xl border border-slate-800">
                    <p className="text-[10px] text-slate-500 uppercase font-bold">Compatibilidade</p>
                    <p className="text-xl font-black text-blue-500">{day.compatibility_rate}%</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Heatmap Section */}
                <div>
                  <h4 className="text-xs font-black uppercase text-slate-400 mb-4 flex items-center gap-2">
                    <BarChart3 size={14} /> Heatmap de Divergências
                  </h4>
                  <div className="space-y-3">
                    {Object.entries(day.divergence_heatmap || {}).map(([type, count]) => (
                      <div key={type} className="flex flex-col gap-1">
                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
                          <span className="text-slate-400">{type.replace(/_/g, ' ')}</span>
                          <span className="text-white">{count} ocorrências</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-red-500/60" 
                            style={{ width: `${Math.min(100, (count / day.total_samples) * 100)}%` }} 
                          />
                        </div>
                      </div>
                    ))}
                    {(!day.divergence_heatmap || Object.keys(day.divergence_heatmap).length === 0) && (
                      <p className="text-[10px] text-slate-600 italic">Nenhuma divergência detectada - Perfeita Reconciliação.</p>
                    )}
                  </div>
                </div>

                {/* Legend/Rules Section */}
                <div className="bg-black/20 rounded-xl p-4 border border-slate-800/50">
                   <h4 className="text-[10px] font-black uppercase text-green-500 mb-3 tracking-widest flex items-center gap-1">
                    <ShieldAlert size={12} /> Status de Governança
                   </h4>
                   <ul className="space-y-2">
                      <li className="flex items-center gap-2 text-[11px] text-slate-300">
                        <CheckCircle2 size={12} className="text-green-500" /> 
                        <span>Clamps de Proteína Ativos</span>
                      </li>
                      <li className="flex items-center gap-2 text-[11px] text-slate-300">
                        <AlertCircle size={12} className={day.readiness_score < 90 ? "text-yellow-500" : "text-green-500"} /> 
                        <span>Sincronia com Legado: {day.readiness_score < 90 ? "Ajuste Fino Necessário" : "Ótima"}</span>
                      </li>
                      <li className="flex items-center gap-2 text-[11px] text-slate-300">
                        <div className="h-2 w-2 rounded-full bg-blue-500" />
                        <span>Amostragem: {day.total_samples} planos analisados</span>
                      </li>
                   </ul>
                </div>
              </div>
          {/* Legacy Rule Heatmap Section */}
          <div className="mt-10 bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-lg font-black uppercase tracking-tight mb-6 flex items-center gap-2">
              <ShieldAlert className="text-red-500" /> Heatmap de Regras Legadas (Hacks Históricos)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rules.map((rule) => (
                <div key={rule.legacy_rule} className="p-4 bg-black/40 border border-slate-800 rounded-xl hover:border-red-500/30 transition-all">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-black uppercase text-slate-500 font-mono tracking-widest">{rule.legacy_rule}</span>
                    <span className="px-2 py-0.5 bg-red-500/10 text-red-500 text-[10px] font-bold rounded-full">
                      {rule.impact_count} IMPACTOS
                    </span>
                  </div>
                  <div className="mt-3 space-y-2">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">Readiness Score Médio</span>
                      <span className={rule.readiness_with_rule > 80 ? "text-green-500" : "text-yellow-500"}>{rule.readiness_with_rule}%</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">Falhas Críticas</span>
                      <span className={rule.critical_failures > 0 ? "text-red-500" : "text-slate-500"}>{rule.critical_failures}</span>
                    </div>
                  </div>
                </div>
              ))}
              {rules.length === 0 && (
                <div className="col-span-full text-center py-8 text-slate-600 italic text-sm">
                  Nenhuma regra legada mapeada via shadow audit ainda.
                </div>
              )}
            </div>
          </div>
        </div>
          ))}
        </div>
      )}
    </div>
  );
};
