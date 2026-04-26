import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Smartphone, CheckCircle2, AlertCircle, X, Maximize2, MousePointer2, Camera, Download, FileText } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import StrategyAdvisorPanel from "@/components/strategy-advisor/StrategyAdvisorPanel";
import { useMobileValidation } from "@/hooks/useMobileValidation";
import { toast } from "sonner";

export default function MobileQA() {
  const { hasOverflow, overflowingElements } = useMobileValidation();
  const [checklist, setChecklist] = useState({
    modalClosesWithX: false,
    noContentCutoff: false,
    noHorizontalScroll: false,
    touchTargetSpacing: false,
    viewport390: false,
    viewport360: false,
  });

  const [evidences, setEvidences] = useState<Array<{ id: string, timestamp: string, item: string, viewport: string }>>([]);

  // Automated Horizontal Scroll Check
  useEffect(() => {
    const checkScroll = () => {
      const scrollX = window.scrollX;
      const scrollWidth = document.documentElement.scrollWidth;
      const clientWidth = document.documentElement.clientWidth;
      
      if (scrollX > 0 || scrollWidth > clientWidth) {
        console.error("OVERFLOW-X DETECTED", { scrollX, scrollWidth, clientWidth });
        toast.error("Overflow Horizontal Detectado!", {
          description: `scrollX: ${scrollX}, scrollWidth: ${scrollWidth}, clientWidth: ${clientWidth}`,
          duration: 5000,
        });
      }
    };

    window.addEventListener('scroll', checkScroll);
    const interval = setInterval(checkScroll, 2000); // Periodic check
    return () => {
      window.removeEventListener('scroll', checkScroll);
      clearInterval(interval);
    };
  }, []);

  const toggleCheck = (key: keyof typeof checklist) => {
    setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const registerEvidence = (item: string) => {
    const newEvidence = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      item,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
    };
    setEvidences(prev => [...prev, newEvidence]);
    toast.success("Evidência registrada!", {
      description: `Snapshot capturado para: ${item}`,
    });
  };

  const exportReport = () => {
    const report = {
      title: "Relatório de QA Mobile",
      date: new Date().toLocaleDateString(),
      checklist,
      evidences,
      summary: {
        totalChecks: Object.values(checklist).filter(Boolean).length,
        totalEvidences: evidences.length,
      }
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mobile-qa-report-${new Date().getTime()}.json`;
    a.click();
    toast.success("Relatório exportado com sucesso!");
  };

  return (
    <DashboardLayout>
      <div className="container max-w-4xl py-6 space-y-6">
        <div className="flex items-center justify-between border-b pb-4">
          <div className="flex items-center gap-3">
            <Smartphone className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Mobile QA Dashboard</h1>
              <p className="text-muted-foreground">Checklist de validação visual e testes de responsividade.</p>
            </div>
          </div>
          <Button onClick={exportReport} className="gap-2">
            <Download className="w-4 h-4" />
            Exportar Relatório
          </Button>
        </div>

        {hasOverflow && (
          <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-lg flex items-start gap-3 animate-pulse">
            <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-destructive">Overflow Horizontal Detectado!</p>
              <p className="text-xs text-destructive/80">
                Elementos que ultrapassaram a largura da tela: {overflowingElements.slice(0, 3).join(", ")}
                {overflowingElements.length > 3 && ` e mais ${overflowingElements.length - 3}`}
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                Checklist de Validação
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="modalClosesWithX" 
                  checked={checklist.modalClosesWithX} 
                  onCheckedChange={() => toggleCheck("modalClosesWithX")}
                />
                <Label htmlFor="modalClosesWithX">Modal fecha corretamente com o botão X</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="noContentCutoff" 
                  checked={checklist.noContentCutoff} 
                  onCheckedChange={() => toggleCheck("noContentCutoff")}
                />
                <Label htmlFor="noContentCutoff">Nenhum conteúdo está cortado nas bordas</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="noHorizontalScroll" 
                  checked={checklist.noHorizontalScroll} 
                  onCheckedChange={() => toggleCheck("noHorizontalScroll")}
                />
                <Label htmlFor="noHorizontalScroll">Sem scroll horizontal inesperado</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="touchTargetSpacing" 
                  checked={checklist.touchTargetSpacing} 
                  onCheckedChange={() => toggleCheck("touchTargetSpacing")}
                />
                <Label htmlFor="touchTargetSpacing">Espaçamento e área de toque adequados (44px+)</Label>
              </div>
              <div className="pt-2 border-t">
                <p className="text-xs font-semibold text-muted-foreground mb-2">RESOLUÇÕES TESTADAS:</p>
                <div className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="viewport390" 
                      checked={checklist.viewport390} 
                      onCheckedChange={() => toggleCheck("viewport390")}
                    />
                    <Label htmlFor="viewport390">iPhone 12/13/14 (390px)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="viewport360" 
                      checked={checklist.viewport360} 
                      onCheckedChange={() => toggleCheck("viewport360")}
                    />
                    <Label htmlFor="viewport360">Android Médio (360px)</Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Maximize2 className="w-5 h-5 text-primary" />
                Telas de Teste
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground mb-4">
                Abra as telas abaixo para testar o comportamento do modal e scroll no mobile.
              </p>
              
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full justify-start gap-2 h-12">
                    <MousePointer2 className="w-4 h-4" />
                    Abrir Consultor de Estratégia
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px] h-[90vh] flex flex-col p-0 overflow-hidden">
                  <div className="p-4 overflow-y-auto overflow-x-hidden flex-1">
                    <StrategyAdvisorPanel 
                      patientId="test-id" 
                      onStrategyConfirmed={() => toast.success("Confirmado!")}
                      onCancel={() => {}}
                    />
                  </div>
                </DialogContent>
              </Dialog>

              <Button 
                variant="outline" 
                className="w-full justify-start gap-2 h-12"
                onClick={() => toast.info("Navegando para MealPlans...")}
              >
                <CheckCircle2 className="w-4 h-4" />
                Validar Tela de Planos (MealPlans)
              </Button>

              <div className="p-3 bg-muted rounded-lg border border-dashed text-[10px] text-muted-foreground leading-relaxed">
                <p className="font-bold mb-1 uppercase">Dica para Mobile:</p>
                Ao abrir o Consultor, tente rolar até o final. O botão "X" deve permanecer acessível e o conteúdo não deve vazar para os lados.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
