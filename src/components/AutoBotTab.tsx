import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Activity, PlayCircle, Loader2, CheckCircle2, AlertTriangle, XCircle,
  Download, Eye, FileJson, FileSpreadsheet, RefreshCw, Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { getAllFeaturesAdmin } from '@/lib/adminServices';
import { supabase } from '@/integrations/supabase/client';
import { runAllChecks, exportChecksJSON, exportChecksCSV } from '@/utils/healthChecks';

const STATUS_ICONS = {
  ok: { Icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  warn: { Icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  critical: { Icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' }
};

const AutoBotTab = () => {
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState(null);
  const [errorLogs, setErrorLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const handleRunDiagnostics = async () => {
    setRunning(true);
    try {
      // Buscar features do banco
      const { data: dbFeatures } = await getAllFeaturesAdmin();
      
      // Rodar todos os checks
      const result = await runAllChecks(dbFeatures);
      setReport(result);
      toast.success(`Diagnóstico concluído! Score: ${result.score}/100`);
    } catch (err) {
      toast.error('Erro ao executar diagnóstico');
      console.error(err);
    } finally {
      setRunning(false);
    }
  };

  const loadErrorLogs = async () => {
    setLoadingLogs(true);
    try {
      const { data, error } = await supabase
        .from('app_error_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      setErrorLogs(data || []);
      toast.success(`${data?.length || 0} erros carregados`);
    } catch (err) {
      toast.error('Erro ao carregar logs');
    } finally {
      setLoadingLogs(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'from-emerald-500 to-teal-600';
    if (score >= 50) return 'from-amber-500 to-orange-600';
    return 'from-red-500 to-pink-600';
  };

  const getScoreLabel = (score) => {
    if (score >= 80) return { text: 'Saudável', emoji: '✅', color: 'text-emerald-700' };
    if (score >= 50) return { text: 'Atenção', emoji: '⚠️', color: 'text-amber-700' };
    return { text: 'Crítico', emoji: '🚨', color: 'text-red-700' };
  };

  return (
    <div className="space-y-6">
      {/* ========== HEADER ========== */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Activity className="h-6 w-6 text-violet-600" />
            AutoDiagnóstico
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Health check automático da aplicação — integridade, latência, RLS, erros
          </p>
        </div>
        <Button
          onClick={handleRunDiagnostics}
          disabled={running}
          className="bg-gradient-to-r from-violet-600 to-purple-600 hover:opacity-90 shadow-lg"
        >
          {running ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Analisando...
            </>
          ) : (
            <>
              <PlayCircle className="h-4 w-4 mr-2" />
              Rodar Diagnóstico
            </>
          )}
        </Button>
      </div>

      {/* ========== SCORE (se tiver report) ========== */}
      {report && (
        <Card className="border-2 border-violet-200 bg-gradient-to-br from-white to-violet-50/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                {/* Score circular */}
                <div className={`relative w-32 h-32 rounded-full bg-gradient-to-br ${getScoreColor(report.score)} flex items-center justify-center shadow-2xl`}>
                  <div className="w-28 h-28 rounded-full bg-white flex flex-col items-center justify-center">
                    <span className="text-4xl font-black text-gray-900">{report.score}</span>
                    <span className="text-xs text-gray-500 font-bold">/ 100</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-3xl">{getScoreLabel(report.score).emoji}</span>
                    <h3 className={`text-2xl font-black ${getScoreLabel(report.score).color}`}>
                      {getScoreLabel(report.score).text}
                    </h3>
                  </div>
                  <p className="text-sm text-gray-600">
                    {report.results.length} checks executados • {report.duration}ms
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(report.timestamp).toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => exportChecksJSON(report)}
                  className="text-xs"
                >
                  <FileJson className="h-3 w-3 mr-1" /> JSON
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => exportChecksCSV(report)}
                  className="text-xs"
                >
                  <FileSpreadsheet className="h-3 w-3 mr-1" /> CSV
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ========== RESULTADOS DOS CHECKS ========== */}
      {report && (
        <div className="space-y-3">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-violet-600" />
            Resultados dos Checks
          </h3>
          {report.results.map((check, idx) => {
            const cfg = STATUS_ICONS[check.status];
            const Icon = cfg.Icon;
            return (
              <Card key={idx} className={`border ${cfg.border} ${cfg.bg}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`w-10 h-10 ${cfg.bg} border ${cfg.border} rounded-xl flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`h-5 w-5 ${cfg.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-bold text-gray-900 text-sm">{check.name}</h4>
                          <Badge className={`${cfg.color} ${cfg.bg} border-0 text-[10px] px-1.5 py-0`}>
                            {check.status.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-700">{check.summary}</p>
                        {check.details && (
                          <div className="mt-2 text-xs text-gray-500 bg-white/50 rounded px-2 py-1">
                            {JSON.stringify(check.details, null, 2).substring(0, 200)}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right text-xs text-gray-400 ml-3">
                      Impacto: {check.scoreImpact > 0 ? '+' : ''}{check.scoreImpact}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ========== LOGS DE ERRO ========== */}
      <Card className="border-2 border-gray-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <Eye className="h-5 w-5 text-gray-600" />
              Logs de Erro (últimas 50)
            </h3>
            <Button
              size="sm"
              variant="outline"
              onClick={loadErrorLogs}
              disabled={loadingLogs}
            >
              {loadingLogs ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
              Carregar
            </Button>
          </div>

          {errorLogs.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Eye className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">Nenhum log carregado. Clique em "Carregar"</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {errorLogs.map((log, i) => (
                <div key={i} className="bg-gray-50 rounded-lg p-3 border border-gray-200 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <Badge className={`text-[10px] ${
                      log.severity === 'critical' ? 'bg-red-100 text-red-700' :
                      log.severity === 'error' ? 'bg-orange-100 text-orange-700' :
                      log.severity === 'warn' ? 'bg-amber-100 text-amber-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {log.severity}
                    </Badge>
                    <span className="text-gray-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(log.created_at).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <p className="font-mono text-gray-800 mb-1">{log.message}</p>
                  <div className="flex items-center gap-3 text-gray-500">
                    {log.route && <span>📍 {log.route}</span>}
                    {log.role && <span>👤 {log.role}</span>}
                  </div>
                  {log.stack && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-gray-500 hover:text-gray-700">Stack trace</summary>
                      <pre className="mt-1 text-[10px] bg-white p-2 rounded border overflow-x-auto">{log.stack}</pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Empty state */}
      {!report && !running && (
        <Card className="border-dashed border-2 border-gray-200">
          <CardContent className="py-16 text-center">
            <Activity className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-700 mb-2">Pronto para diagnóstico</h3>
            <p className="text-sm text-gray-500 mb-6">
              Clique em "Rodar Diagnóstico" para verificar a saúde da aplicação
            </p>
            <Button
              onClick={handleRunDiagnostics}
              className="bg-gradient-to-r from-violet-600 to-purple-600 hover:opacity-90"
            >
              <PlayCircle className="h-4 w-4 mr-2" />
              Iniciar Diagnóstico
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AutoBotTab;
