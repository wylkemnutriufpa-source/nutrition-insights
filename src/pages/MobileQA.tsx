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
import html2canvas from "html2canvas";

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

  const [evidences, setEvidences] = useState<Array<{ 
    id: string, 
    timestamp: string, 
    item: string, 
    viewport: string, 
    screenshot: string,
    context?: string, // e.g., "Modal Consultor"
    metrics?: { scrollX: number, scrollWidth: number, clientWidth: number }
  }>>([]);
  const [activeModal, setActiveModal] = useState<string | null>(null);

  // Automated Horizontal Scroll Check
  useEffect(() => {
    const checkScroll = () => {
      const scrollX = window.scrollX;
      const scrollWidth = document.documentElement.scrollWidth;
      const clientWidth = document.documentElement.clientWidth;
      
      if (scrollX > 0 || scrollWidth > clientWidth) {
        console.error("OVERFLOW-X DETECTED", { scrollX, scrollWidth, clientWidth });
        
        // Auto-register evidence for overflow
        if (!evidences.some(e => e.item === "Overflow Detectado" && e.timestamp.split(':')[1] === new Date().toLocaleTimeString().split(':')[1])) {
          toast.error("Overflow Horizontal Detectado!", {
            description: `scrollX: ${scrollX}, scrollWidth: ${scrollWidth}, clientWidth: ${clientWidth}`,
            duration: 5000,
          });
          registerEvidence("Overflow Detectado", { scrollX, scrollWidth, clientWidth });
        }
      }
    };

    window.addEventListener('scroll', checkScroll);
    window.addEventListener('resize', checkScroll);
    const interval = setInterval(checkScroll, 2000); // Periodic check
    return () => {
      window.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
      clearInterval(interval);
    };
  }, [evidences]);

  const toggleCheck = (key: keyof typeof checklist) => {
    setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const registerEvidence = async (item: string, metrics?: { scrollX: number, scrollWidth: number, clientWidth: number }) => {
    try {
      const canvas = await html2canvas(document.body);
      const screenshot = canvas.toDataURL("image/png");
      
      const newEvidence = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toLocaleTimeString(),
        item,
        viewport: `${window.innerWidth}px`,
        screenshot,
        context: activeModal || "Página Principal",
        metrics
      };
      
      setEvidences(prev => [...prev, newEvidence]);
      toast.success("Evidência registrada!", {
        description: `Snapshot capturado para: ${item}`,
      });
    } catch (error) {
      console.error("Erro ao capturar snapshot:", error);
      toast.error("Erro ao registrar evidência");
    }
  };

  const exportCSV = () => {
    if (evidences.length === 0) {
      toast.error("Nenhuma evidência para exportar");
      return;
    }

    const headers = ["Timestamp", "Item", "Viewport", "Contexto", "scrollX", "scrollWidth", "clientWidth", "Screenshot_Link"];
    const rows = evidences.map(ev => [
      ev.timestamp,
      ev.item,
      ev.viewport,
      ev.context || "N/A",
      ev.metrics?.scrollX || 0,
      ev.metrics?.scrollWidth || 0,
      ev.metrics?.clientWidth || 0,
      `evidence-${ev.id}.png`
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(r => r.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mobile-qa-evidences-${new Date().getTime()}.csv`;
    a.click();
  };

  const exportReport = () => {
    // Organize by viewport and context
    const organizedEvidences = evidences.reduce((acc: any, ev) => {
      const vp = ev.viewport;
      const ctx = ev.context || "Geral";
      if (!acc[vp]) acc[vp] = {};
      if (!acc[vp][ctx]) acc[vp][ctx] = [];
      acc[vp][ctx].push({
        ...ev,
        imageName: `evidence-${ev.id}.png`
      });
      return acc;
    }, {});

    const report = {
      title: "Relatório de QA Mobile",
      date: new Date().toLocaleDateString(),
      checklist,
      organizedEvidences,
      summary: {
        totalChecks: Object.values(checklist).filter(Boolean).length,
        totalEvidences: evidences.length,
      }
    };
    
    // Export JSON
    const jsonBlob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const jsonUrl = URL.createObjectURL(jsonBlob);
    const jsonLink = document.createElement("a");
    jsonLink.href = jsonUrl;
    jsonLink.download = `mobile-qa-report-${new Date().getTime()}.json`;
    jsonLink.click();

    // Export CSV as well
    exportCSV();

    toast.success("Relatórios exportados com sucesso (JSON e CSV)!");
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
              {[
                { id: "modalClosesWithX", label: "Modal fecha corretamente com o botão X" },
                { id: "noContentCutoff", label: "Nenhum conteúdo está cortado nas bordas" },
                { id: "noHorizontalScroll", label: "Sem scroll horizontal inesperado" },
                { id: "touchTargetSpacing", label: "Espaçamento e área de toque adequados (44px+)" }
              ].map((item) => (
                <div key={item.id} className="flex items-center justify-between group">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id={item.id} 
                      checked={checklist[item.id as keyof typeof checklist]} 
                      onCheckedChange={() => toggleCheck(item.id as keyof typeof checklist)}
                    />
                    <Label htmlFor={item.id} className="text-sm">{item.label}</Label>
                  </div>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="opacity-0 group-hover:opacity-100 h-8 w-8"
                    onClick={() => registerEvidence(item.label)}
                    title="Registrar Evidência"
                  >
                    <Camera className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <div className="pt-2 border-t">
                <p className="text-xs font-semibold text-muted-foreground mb-2">RESOLUÇÕES TESTADAS:</p>
                <div className="flex flex-col gap-2">
                  {[
                    { id: "viewport390", label: "iPhone 12/13/14 (390px)" },
                    { id: "viewport360", label: "Android Médio (360px)" }
                  ].map((vp) => (
                    <div key={vp.id} className="flex items-center justify-between group">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id={vp.id} 
                          checked={checklist[vp.id as keyof typeof checklist]} 
                          onCheckedChange={() => toggleCheck(vp.id as keyof typeof checklist)}
                        />
                        <Label htmlFor={vp.id} className="text-sm">{vp.label}</Label>
                      </div>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="opacity-0 group-hover:opacity-100 h-8 w-8"
                        onClick={() => registerEvidence(vp.label)}
                        title="Registrar Evidência"
                      >
                        <Camera className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
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
              
              <Dialog onOpenChange={(open) => setActiveModal(open ? "Consultor de Estratégia" : null)}>
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

        {evidences.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Log de Evidências
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {evidences.map((ev) => (
                  <div key={ev.id} className="text-xs p-2 bg-muted rounded flex justify-between items-center">
                    <span>
                      <span className="font-bold">[{ev.timestamp}]</span> {ev.item} 
                      <span className="text-muted-foreground ml-2">({ev.viewport})</span>
                    </span>
                    <CheckCircle2 className="w-3 h-3 text-green-500" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
