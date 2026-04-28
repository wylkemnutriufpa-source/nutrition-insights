import React from 'react';
import { useMealEditorV3Store } from '@/hooks/meal-editor-v3/useMealEditorV3Store';
import { CLINICAL_CONDITIONS } from '@/hooks/meal-editor-v3/clinicalRules';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ShieldCheck, Info, AlertTriangle, ArrowRight } from 'lucide-react';

export const ClinicalRulesPanel: React.FC = () => {
  const { clinicalLog } = useMealEditorV3Store();
  
  if (!clinicalLog) return (
    <div className="h-full flex flex-col items-center justify-center p-6 text-center opacity-50">
      <ShieldCheck className="w-12 h-12 mb-4 text-muted-foreground" />
      <p className="text-sm font-medium">Nenhuma regra clínica ativa</p>
    </div>
  );

  const condition = CLINICAL_CONDITIONS.find(c => c.id === clinicalLog.conditionId);

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex items-center gap-2 px-1">
        <Badge className="bg-primary/10 text-primary border-none text-[10px] font-bold">REGRAS APLICADAS</Badge>
        <div className="h-px flex-1 bg-border" />
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-bold flex items-center gap-2 mb-2">
            <Info className="w-4 h-4 text-primary" />
            Condição: {condition?.condition_name || condition?.name}
          </h3>
          
          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase text-muted-foreground">Restrições</p>
              <div className="flex flex-wrap gap-1">
                {condition?.restrictions.map(r => (
                  <Badge key={r} variant="outline" className="text-[9px] border-red-200 text-red-600 bg-red-50">{r}</Badge>
                ))}
              </div>
            </div>
            
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase text-muted-foreground">Recomendações</p>
              <div className="flex flex-wrap gap-1">
                {condition?.recommendations.map(r => (
                  <Badge key={r} variant="outline" className="text-[9px] border-green-200 text-green-600 bg-green-50">{r}</Badge>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t">
          <h3 className="text-[10px] font-bold uppercase text-muted-foreground mb-3 tracking-widest">Alterações Automáticas</h3>
          <ScrollArea className="h-[200px] pr-4">
            <div className="space-y-2">
              {clinicalLog.changes.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">Nenhuma alteração necessária.</p>
              ) : (
                clinicalLog.changes.map((change, idx) => (
                  <Card key={idx} className="p-3 bg-muted/20 border-none shadow-none">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5" />
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold line-through opacity-50">{change.foodName}</span>
                          <Badge className="bg-amber-500/10 text-amber-600 text-[8px] border-none font-bold">REMOVIDO</Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground">{change.reason}</p>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
};
