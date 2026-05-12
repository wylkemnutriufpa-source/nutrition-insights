import { toast } from 'sonner';
import { logError } from '@/lib/monitoring';

/**
 * PDF Sandbox: Ambiente isolado para geração de exportações.
 * Garante que falhas no renderizador de PDF não travem o runtime principal do editor.
 */
export async function safeGeneratePDF(pdfData: any) {
  try {
    console.log('[PDF Sandbox] Iniciando geração isolada...');
    
    // Import dinâmico para isolamento de bundle
    const { generatePremiumMealPlanPDF } = await import("@/lib/pdfExportPremium");
    
    // Execução em micro-task para não bloquear frame de UI imediatamente
    await new Promise(resolve => setTimeout(resolve, 0));
    
    generatePremiumMealPlanPDF(pdfData);
    
    console.log('[PDF Sandbox] Geração concluída com sucesso.');
  } catch (error: any) {
    console.error('[PDF Sandbox] FALHA CRÍTICA NO RENDERIZADOR:', error);
    
    logError(
      "pdf_render_failure",
      "PDFSandbox",
      error.message,
      { patientName: pdfData.patientName },
      error.stack
    );
    
    toast.error('Erro ao gerar PDF. O sistema tentará um fallback simplificado.');
    
    // Fallback: Tentar gerar via HTML/Print do navegador se o jspdf falhar
    try {
      const { buildPremiumMealPlanHTML } = await import("@/lib/pdfExportPremium");
      const html = buildPremiumMealPlanHTML(pdfData);
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(html);
        win.document.close();
        win.print();
      }
    } catch (fallbackError) {
      toast.error('Falha no fallback. Por favor, contate o suporte.');
    }
  }
}
