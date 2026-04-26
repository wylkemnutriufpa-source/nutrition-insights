import { useState, useEffect, useRef } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Smartphone, CheckCircle2, AlertCircle, X, Maximize2, MousePointer2, Camera, Download, FileText, Settings, User } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import StrategyAdvisorPanel from "@/components/strategy-advisor/StrategyAdvisorPanel";
import { useMobileValidation } from "@/hooks/useMobileValidation";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import "jspdf-autotable";

export default function MobileQA() {
  const { hasOverflow, overflowingElements } = useMobileValidation();
  const [checklist, setChecklist] = useState({
    modalClosesWithX: false,
    noContentCutoff: false,
    noHorizontalScroll: false,
    touchTargetSpacing: false,
    viewport390: false,
    viewport360: false,
    focusVisibleX: false,
    noScrollResidualOnKeys: false,
    accessibilityTabOrder: false,
  });

  const [evidences, setEvidences] = useState<Array<{ 
    id: string, 
    timestamp: string, 
    item: string, 
    viewport: string, 
    screenshot: string,
    thumbnail: string,
    context?: string,
    modalId?: string,
    sequence?: number,
    metrics?: { scrollX: number, scrollWidth: number, clientWidth: number }
  }>>([]);
  
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [activeModalId, setActiveModalId] = useState<string | null>(null);
  const [eventLog, setEventLog] = useState<Array<{ timestamp: string, event: string, details?: any }>>([]);
  const [overflowBuffer, setOverflowBuffer] = useState(300); // 300ms buffer
  const lastOverflowTime = useRef<number>(0);
  const overflowTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const testScreens = [
    { id: "strategy", label: "Consultor de Estratégia", icon: MousePointer2, component: "StrategyAdvisor" },
    { id: "settings", label: "Configurações Profissionais", icon: Settings, component: "ProfessionalSettings" },
    { id: "profile", label: "Perfil do Usuário", icon: User, component: "UserProfile" },
    { id: "wizard", label: "InOffice Wizard", icon: Maximize2, component: "InOfficeWizard" },
  ];

  const logEvent = (event: string, details?: any) => {
    const timestamp = new Date().toISOString();
    setEventLog(prev => [...prev, { timestamp, event, details }]);
  };

  // Automated Horizontal Scroll Check & Capture with Debounce
  useEffect(() => {
    const checkScroll = async () => {
      const scrollX = window.scrollX;
      const scrollWidth = document.documentElement.scrollWidth;
      const clientWidth = document.documentElement.clientWidth;
      const isOverflowing = scrollX > 0 || scrollWidth > clientWidth;
      
      if (isOverflowing) {
        logEvent("Overflow detectado (inicial)", { scrollX, scrollWidth, clientWidth });
        
        // Clear previous timeout if exists
        if (overflowTimeoutRef.current) clearTimeout(overflowTimeoutRef.current);
        
        // Wait for buffer/debounce
        overflowTimeoutRef.current = setTimeout(async () => {
          // Re-verify after buffer
          const currentScrollX = window.scrollX;
          const currentScrollWidth = document.documentElement.scrollWidth;
          const currentClientWidth = document.documentElement.clientWidth;
          
          if (currentScrollX > 0 || currentScrollWidth > currentClientWidth) {
            const now = Date.now();
            if (now - lastOverflowTime.current > 5000) {
              lastOverflowTime.current = now;
              logEvent("Overflow persistente capturado", { currentScrollX, currentScrollWidth, currentClientWidth });
              
              toast.error("Overflow Horizontal Persistente!", {
                description: `Buffer de ${overflowBuffer}ms atingido. Capturando evidência...`,
                duration: 5000,
              });
              
              await registerEvidence("Overflow Detectado Automático", { 
                scrollX: currentScrollX, 
                scrollWidth: currentScrollWidth, 
                clientWidth: currentClientWidth 
              });
            }
          }
        }, overflowBuffer);
      }
    };

    const handleResize = () => {
      logEvent("Resize detectado", { width: window.innerWidth, height: window.innerHeight });
      checkScroll();
    };

    const handleScroll = () => {
      logEvent("Scroll detectado", { scrollX: window.scrollX, scrollY: window.scrollY });
      checkScroll();
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleResize);
    const interval = setInterval(checkScroll, 2000);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      clearInterval(interval);
      if (overflowTimeoutRef.current) clearTimeout(overflowTimeoutRef.current);
    };
  }, [evidences, overflowBuffer]);

  const toggleCheck = (key: keyof typeof checklist) => {
    setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const createThumbnail = (canvas: HTMLCanvasElement): string => {
    const thumbCanvas = document.createElement('canvas');
    const ctx = thumbCanvas.getContext('2d');
    const scale = 0.2; // 20% size
    thumbCanvas.width = canvas.width * scale;
    thumbCanvas.height = canvas.height * scale;
    if (ctx) {
      ctx.drawImage(canvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
    }
    return thumbCanvas.toDataURL("image/jpeg", 0.7);
  };

  const registerEvidence = async (item: string, metrics?: { scrollX: number, scrollWidth: number, clientWidth: number }) => {
    try {
      const canvas = await html2canvas(document.body, {
        scale: 1, // Keep scale 1 for main capture
        useCORS: true,
        logging: false
      });
      
      const screenshot = canvas.toDataURL("image/png");
      const thumbnail = createThumbnail(canvas);
      
      const sequence = evidences.filter(e => e.modalId === activeModalId).length + 1;
      const uniqueKey = `${activeModalId || "main"}-${window.innerWidth}-${sequence}-${Date.now()}`;
      
      const newEvidence = {
        id: uniqueKey,
        timestamp: new Date().toLocaleTimeString(),
        item,
        viewport: `${window.innerWidth}px`,
        screenshot,
        thumbnail,
        context: activeModal || "Página Principal",
        modalId: activeModalId || "main",
        sequence,
        metrics
      };
      
      setEvidences(prev => [...prev, newEvidence]);
      logEvent("Evidência registrada", { item, viewport: newEvidence.viewport, uniqueKey });
      
      toast.success("Evidência registrada!", {
        description: `Snapshot e miniatura capturados para: ${item}`,
      });
    } catch (error) {
      console.error("Erro ao capturar snapshot:", error);
      logEvent("Erro ao registrar evidência", { error: String(error) });
      toast.error("Erro ao registrar evidência");
    }
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text("Relatório de QA Mobile - Detalhado", 10, 20);
    doc.setFontSize(10);
    doc.text(`Data: ${new Date().toLocaleDateString()}`, 10, 28);
    doc.text(`Resoluções Alvo: 390px / 360px`, 10, 33);

    let yOffset = 45;
    evidences.forEach((ev, index) => {
      if (yOffset > 240) {
        doc.addPage();
        yOffset = 20;
      }
      
      doc.setDrawColor(200, 200, 200);
      doc.line(10, yOffset, 200, yOffset);
      yOffset += 7;

      doc.setFont("helvetica", "bold");
      doc.text(`${index + 1}. ${ev.item}`, 10, yOffset);
      doc.setFont("helvetica", "normal");
      doc.text(`[${ev.timestamp}] Viewport: ${ev.viewport} | Contexto: ${ev.context || "N/A"}`, 10, yOffset + 5);
      
      if (ev.metrics) {
        doc.setFont("courier", "normal");
        doc.text(`MÉTRICAS: scrollX: ${ev.metrics.scrollX} | scrollWidth: ${ev.metrics.scrollWidth} | clientWidth: ${ev.metrics.clientWidth}`, 10, yOffset + 10);
        yOffset += 15;
      } else {
        yOffset += 10;
      }
      
      // Adicionar miniatura ao PDF
      try {
        doc.addImage(ev.thumbnail, 'JPEG', 160, yOffset - 15, 30, 30);
      } catch (e) {
        console.error("Erro ao adicionar miniatura ao PDF", e);
      }
      
      yOffset += 5;
    });

    doc.save(`mobile-qa-full-report-${new Date().getTime()}.pdf`);
  };

  const exportCSV = () => {
    if (evidences.length === 0) {
      toast.error("Nenhuma evidência para exportar");
      return;
    }

    const headers = ["Timestamp", "Item", "Viewport", "Contexto", "ModalID", "Sequencia", "scrollX", "scrollWidth", "clientWidth", "Thumbnail_B64"];
    const rows = evidences.map(ev => [
      `"${ev.timestamp}"`,
      `"${ev.item}"`,
      `"${ev.viewport}"`,
      `"${ev.context || "N/A"}"`,
      `"${ev.modalId || "main"}"`,
      ev.sequence || 0,
      ev.metrics?.scrollX || 0,
      ev.metrics?.scrollWidth || 0,
      ev.metrics?.clientWidth || 0,
      `"${ev.thumbnail.substring(0, 100)}..."`
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(r => r.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mobile-qa-metrics-${new Date().getTime()}.csv`;
    a.click();
    logEvent("Exportação CSV concluída");
  };

  const exportReport = () => {
    const report = {
      title: "Relatório Consolidado de QA Mobile",
      date: new Date().toISOString(),
      checklist,
      eventTimeline: eventLog,
      evidences: evidences.map(e => ({
        id: e.id,
        timestamp: e.timestamp,
        item: e.item,
        viewport: e.viewport,
        context: e.context,
        modalId: e.modalId,
        sequence: e.sequence,
        metrics: e.metrics,
        thumbnail: e.thumbnail 
      })),
      summary: {
        totalChecks: Object.values(checklist).filter(Boolean).length,
        totalEvidences: evidences.length,
        totalEvents: eventLog.length
      }
    };
    
    const jsonBlob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const jsonUrl = URL.createObjectURL(jsonBlob);
    const jsonLink = document.createElement("a");
    jsonLink.href = jsonUrl;
    jsonLink.download = `mobile-qa-full-data-${new Date().getTime()}.json`;
    jsonLink.click();

    exportCSV();
    exportPDF();
    logEvent("Exportação total (JSON, CSV, PDF) concluída");
    toast.success("Todos os formatos exportados (PDF, JSON, CSV)!");
  };

  return (
    <DashboardLayout>
      <div className="container max-w-4xl py-6 space-y-6">
        <div className="flex items-center justify-between border-b pb-4">
          <div className="flex items-center gap-3">
            <Smartphone className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Mobile QA Dashboard</h1>
              <p className="text-muted-foreground">Validação dinâmica de modais e automação de screenshots.</p>
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
                Elementos: {overflowingElements.slice(0, 3).join(", ")}
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
                { id: "modalClosesWithX", label: "Modal fecha com botão X" },
                { id: "noContentCutoff", label: "Sem conteúdo cortado" },
                { id: "noHorizontalScroll", label: "Sem scroll horizontal" },
                { id: "focusVisibleX", label: "Foco visível no botão X (Acessibilidade)" },
                { id: "accessibilityTabOrder", label: "Botão X navegável por Tab" },
                { id: "noScrollResidualOnKeys", label: "Sem scroll residual (Enter/Espaço/Esc)" }
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
                  >
                    <Camera className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              
              <div className="pt-4 border-t mt-4">
                <Label htmlFor="buffer-range" className="text-xs font-semibold mb-2 block">
                  Buffer de Detecção Overflow: {overflowBuffer}ms
                </Label>
                <input 
                  id="buffer-range"
                  type="range" 
                  min="0" 
                  max="1000" 
                  step="50"
                  value={overflowBuffer}
                  onChange={(e) => setOverflowBuffer(Number(e.target.value))}
                  className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Maximize2 className="w-5 h-5 text-primary" />
                Telas com Modais (Dinâmico)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {testScreens.map((screen) => (
                <Dialog key={screen.id} onOpenChange={(open) => {
                  setActiveModal(open ? screen.label : null);
                  setActiveModalId(open ? screen.id : null);
                  logEvent(open ? "Modal aberto" : "Modal fechado", { screen: screen.label, id: screen.id });
                }}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full justify-start gap-2 h-12" data-testid={`trigger-${screen.id}`}>
                      <screen.icon className="w-4 h-4" />
                      {screen.label}
                    </Button>
                  </DialogTrigger>
                  <DialogContent 
                    className="sm:max-w-[600px] h-[90vh] flex flex-col p-0 overflow-hidden" 
                    data-testid={`modal-${screen.id}`}
                    onEscapeKeyDown={() => logEvent("Esc pressionado no modal", { screen: screen.label })}
                  >
                    <DialogHeader className="p-4 border-b bg-muted/30">
                      <DialogTitle className="flex items-center justify-between pr-8">
                        {screen.label}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="p-4 overflow-y-auto overflow-x-hidden flex-1 bg-background">
                      <div className="space-y-4">
                        <h2 className="text-xl font-bold">Simulação: {screen.label}</h2>
                        {screen.id === "strategy" ? (
                          <StrategyAdvisorPanel 
                            patientId="test-id" 
                            onStrategyConfirmed={() => toast.success("Confirmado!")}
                            onCancel={() => {}}
                          />
                        ) : (
                          <div className="p-20 border-2 border-dashed rounded-lg flex items-center justify-center text-muted-foreground italic">
                            Conteúdo de {screen.label} (Scroll-Test)
                            <div style={{ width: '110%', height: '100px', background: 'linear-gradient(90deg, transparent, red)' }} className="mt-4 opacity-10">
                              Simulador de Overflow
                            </div>
                          </div>
                        )}
                        <div className="h-[1000px] w-full bg-gradient-to-b from-muted/20 to-transparent rounded-lg">
                          Área de Scroll Longo
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              ))}
            </CardContent>
          </Card>
        </div>

        {evidences.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Evidências e Métricas Capturadas
              </CardTitle>
              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">{evidences.length}</span>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {evidences.map((ev) => (
                  <div key={ev.id} className="p-3 bg-muted/50 rounded-lg border flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <p className="font-bold text-xs">{ev.item}</p>
                        <p className="text-[10px] text-muted-foreground">{ev.timestamp} - {ev.viewport}</p>
                      </div>
                      <img src={ev.thumbnail} className="w-12 h-12 rounded object-cover border" alt="Thumb" />
                    </div>
                    {ev.metrics && (
                      <div className="grid grid-cols-3 gap-1 text-[8px] uppercase font-bold text-muted-foreground">
                        <div className="bg-background p-1 rounded">X: {ev.metrics.scrollX}</div>
                        <div className="bg-background p-1 rounded">SW: {ev.metrics.scrollWidth}</div>
                        <div className="bg-background p-1 rounded">CW: {ev.metrics.clientWidth}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

