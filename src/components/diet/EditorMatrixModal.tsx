import { motion, AnimatePresence } from "framer-motion";
import { X, UtensilsCrossed, Zap, ArrowLeft, MousePointer2, Rocket, AlertCircle, Loader2 } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";


interface EditorMatrixModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (version: "v2" | "v3") => void;
  patientId: string;
}

export function EditorMatrixModal({ isOpen, onClose, onSelect, patientId }: EditorMatrixModalProps) {
  const [lastChoice, setLastChoice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    if (isOpen && patientId) {
      loadPreference();
    }
  }, [isOpen, patientId]);

  const loadPreference = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("preferred_editor_version, last_editor_version_used")
        .eq("user_id", patientId)
        .maybeSingle();

      if (error) throw error;
      
      // Prioridade: Preferência do paciente > Último usado > LocalStorage
      const choice = data?.last_editor_version_used || data?.preferred_editor_version || localStorage.getItem("preferred_editor_version");
      if (choice) setLastChoice(choice);
    } catch (err) {
      console.error("Erro ao carregar preferência:", err);
      const saved = localStorage.getItem("preferred_editor_version");
      if (saved) setLastChoice(saved);
    }
  };

  const handleSelect = async (version: "v2" | "v3") => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // 1. Persistir no Backend (Harden Entry Point)
      await supabase
        .from("profiles")
        .update({ 
          last_editor_version_used: version,
          preferred_editor_version: version,
          current_editor_mode: version.toUpperCase()
        } as any)
        .eq("user_id", patientId);

      // 2. Log de Auditoria
      console.log(`[EditorMatrix] Versão selecionada: ${version}`);

      // 3. Persistir no LocalStorage (Backup)
      localStorage.setItem("preferred_editor_version", version);

      // 4. Concluído
      onSelect(version);

      onSelect(version);
    } catch (err) {
      console.error("Erro ao salvar preferência:", err);
      onSelect(version); // Prossegue mesmo com erro no save
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseAttempt = () => {
    // Se ainda não escolheu nada e não está carregando, permite fechar direto sem confirmação
    // para evitar a frustração de "não conseguir fechar" reportada pelo usuário.
    if (!lastChoice && !isLoading) {
      onClose();
      return;
    }
    setShowExitConfirm(true);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(v) => !v && handleCloseAttempt()}>
        <DialogContent className="sm:max-w-[900px] p-0 overflow-hidden bg-black/95 border-none shadow-2xl">
          <div className="relative w-full min-h-[500px] flex flex-col md:flex-row">
            {/* Loading Overlay */}
            <AnimatePresence>
              {(isLoading || isValidating) && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-[100] bg-black/80 flex flex-col items-center justify-center space-y-4"
                >
                  <Loader2 className="w-12 h-12 text-red-500 animate-spin" />
                  <p className="text-white font-medium tracking-widest uppercase text-xs">
                    {isValidating ? "Validando Protocolos..." : "Configurando Ambiente..."}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Close Button */}
            <button 
              onClick={handleCloseAttempt}
              className="absolute top-4 right-4 z-50 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
            >
              <X className="w-5 h-5" />
            </button>

            {/* V2 - Classic Editor (Blue) */}
            <div 
              onClick={() => !isLoading && handleSelect("v2")}
              className="group relative flex-1 flex flex-col items-center justify-center p-12 cursor-pointer transition-all duration-500 overflow-hidden"
            >
              <div className="absolute inset-0 bg-blue-600/10 group-hover:bg-blue-600/20 transition-colors duration-500" />
              <div className="absolute -inset-[100px] bg-blue-500/10 blur-[100px] group-hover:bg-blue-500/20 transition-all duration-700 opacity-50" />
              
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative z-10 flex flex-col items-center text-center space-y-6"
              >
                <div className="w-20 h-20 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-500 group-hover:shadow-blue-500/20">
                  <UtensilsCrossed className="w-10 h-10 text-blue-400" />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-3xl font-display font-bold text-white tracking-tight">Editor Clássico (V2)</h3>
                  <p className="text-blue-200/60 max-w-[280px]">Fluxo manual tradicional para nutricionistas que buscam controle total em cada detalhe.</p>
                </div>

                <ul className="text-left space-y-2 text-sm text-blue-200/40">
                  <li className="flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-blue-400" />
                    Controle detalhado
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-blue-400" />
                    Ajustes finos manuais
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-blue-400" />
                    Interface familiar
                  </li>
                </ul>

                <div className="pt-4">
                  <Button 
                    variant="outline" 
                    disabled={isLoading}
                    className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300 px-8 rounded-full group-hover:translate-y-[-2px] transition-transform"
                  >
                    Entrar no Modo Manual
                  </Button>
                </div>
              </motion.div>
            </div>

            {/* V3 - Smart Editor (Red) */}
            <div 
              onClick={() => !isLoading && handleSelect("v3")}
              className="group relative flex-1 flex flex-col items-center justify-center p-12 cursor-pointer transition-all duration-500 overflow-hidden border-t md:border-t-0 md:border-l border-white/10"
            >
              <div className="absolute inset-0 bg-red-600/10 group-hover:bg-red-600/20 transition-colors duration-500" />
              <div className="absolute -inset-[100px] bg-red-500/10 blur-[100px] group-hover:bg-red-500/20 transition-all duration-700 opacity-50" />
              
              {/* Pulsing Glow for V3 */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-red-500/5 via-transparent to-transparent animate-pulse" />

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative z-10 flex flex-col items-center text-center space-y-6"
              >
                <div className="w-20 h-20 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-500 group-hover:shadow-red-500/20">
                  <Rocket className="w-10 h-10 text-red-500" />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    <h3 className="text-3xl font-display font-bold text-white tracking-tight">Editor Inteligente V3</h3>
                    <div className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-bounce">NOVO</div>
                  </div>
                  <p className="text-red-200/60 max-w-[280px]">O motor determinístico gera planos perfeitos em segundos com 1 clique.</p>
                </div>

                <ul className="text-left space-y-2 text-sm text-red-200/40">
                  <li className="flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-red-500" />
                    Ultra velocidade (V3)
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-red-500" />
                    Geração determinística
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-red-500" />
                    Templates inteligentes
                  </li>
                </ul>

                <div className="pt-4">
                  <Button 
                    disabled={isLoading}
                    className="bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-900/20 px-8 rounded-full group-hover:scale-105 group-hover:shadow-red-600/30 transition-all"
                  >
                    Ativar Inteligência V3
                  </Button>
                </div>
              </motion.div>
            </div>

            {/* Footer Controls */}
            <div className="absolute bottom-6 left-0 right-0 flex justify-center items-center gap-8 pointer-events-none">
              <button 
                onClick={(e) => { e.stopPropagation(); handleCloseAttempt(); }}
                className="pointer-events-auto flex items-center gap-2 text-white/40 hover:text-white transition-colors text-xs font-medium uppercase tracking-widest"
              >
                <ArrowLeft className="w-3 h-3" />
                Voltar ao Dashboard
              </button>
              
              {lastChoice && (
                <div className="text-[10px] text-white/20 uppercase tracking-[0.2em]">
                  Preferência: {lastChoice === "v2" ? "Clássico" : "Inteligente"}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              Sair sem escolher?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Você ainda não selecionou a experiência de trabalho. Tem certeza que deseja voltar ao dashboard sem definir o editor?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white">Continuar Escolhendo</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                setShowExitConfirm(false);
                onClose();
              }}
              className="bg-red-600 hover:bg-red-700 text-white border-none"
            >
              Sim, Sair agora
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
