
import React, { useState } from 'react';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  Search, User, Loader2, CheckCircle2, ShieldCheck, 
  AlertTriangle, ArrowRight, UserPlus
} from 'lucide-react';
import { usePatientsList } from '@/hooks/queries/usePatientsList';
import { cn } from '@/lib/utils';
import { Meal } from '../types/types';

interface ControlledDeliveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeliver: (patientId: string) => Promise<void>;
  planPreview: Meal[];
}

export const ControlledDeliveryModal: React.FC<ControlledDeliveryModalProps> = ({
  isOpen, onClose, onDeliver, planPreview
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [delivering, setDelivering] = useState(false);
  const [step, setStep] = useState<'select' | 'confirm'>('select');

  const { data: patientsData, isLoading } = usePatientsList({ 
    search: searchTerm,
    pageSize: 10
  });

  const selectedPatient = patientsData?.patients?.find(p => p.patient_id === selectedPatientId);

  const handleDeliver = async () => {
    if (selectedPatientId) {
      setDelivering(true);
      try {
        await onDeliver(selectedPatientId);
        onClose();
      } finally {
        setDelivering(false);
      }
    }
  };

  const totalKcal = planPreview.reduce((acc, m) => acc + m.items.reduce((sum, i) => sum + (i.kcal || 0), 0), 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-neutral-950 border-white/10 text-white p-0 overflow-hidden rounded-3xl">
        <div className="flex flex-col h-[600px]">
          <DialogHeader className="p-8 border-b border-white/5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-500/20 rounded-xl">
                <ShieldCheck className="w-6 h-6 text-blue-400" />
              </div>
              <DialogTitle className="text-2xl font-black uppercase italic tracking-tighter">
                Controlled Clinical Delivery
              </DialogTitle>
            </div>
            <DialogDescription className="text-white/40 font-bold text-[10px] uppercase tracking-widest">
              Entrega manual e monitorada de Templates V3
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {step === 'select' ? (
              <div className="p-8 flex-1 flex flex-col gap-6 overflow-hidden">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                  <Input 
                    placeholder="Buscar paciente para entrega..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-12 h-14 bg-white/5 border-white/10 rounded-2xl text-lg focus:border-blue-500/50"
                    autoFocus
                  />
                </div>

                <ScrollArea className="flex-1">
                  <div className="space-y-2 pr-4">
                    {isLoading ? (
                      <div className="py-20 flex flex-col items-center gap-4">
                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                        <p className="text-[10px] font-black uppercase text-white/20">Acessando base...</p>
                      </div>
                    ) : patientsData?.patients?.length ? (
                      patientsData.patients.map(p => (
                        <button
                          key={p.patient_id}
                          onClick={() => setSelectedPatientId(p.patient_id)}
                          className={cn(
                            "w-full p-4 flex items-center justify-between rounded-2xl transition-all text-left group",
                            selectedPatientId === p.patient_id 
                              ? "bg-blue-500/10 border border-blue-500/30" 
                              : "bg-white/[0.02] border border-white/5 hover:bg-white/5"
                          )}
                        >
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "h-12 w-12 rounded-xl flex items-center justify-center text-sm font-black transition-colors",
                              selectedPatientId === p.patient_id ? "bg-blue-500 text-black" : "bg-white/5 text-white/40"
                            )}>
                              {p.profile?.full_name ? p.profile.full_name[0] : 'P'}
                            </div>
                            <div>
                              <p className="font-black text-white">{p.profile?.full_name}</p>
                              <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Acessar Prontuário</p>
                            </div>
                          </div>
                          {selectedPatientId === p.patient_id && <CheckCircle2 className="w-5 h-5 text-blue-400" />}
                        </button>
                      ))
                    ) : (
                      <div className="py-20 text-center">
                        <p className="text-[10px] font-black uppercase text-white/20 tracking-widest">Nenhum paciente encontrado</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            ) : (
              <div className="p-8 flex-1 flex flex-col gap-8 overflow-hidden">
                <div className="bg-blue-500/5 border border-blue-500/20 p-6 rounded-3xl">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="h-16 w-16 rounded-2xl bg-blue-500 flex items-center justify-center text-black text-xl font-black">
                      {selectedPatient?.profile?.full_name ? selectedPatient.profile.full_name[0] : 'P'}
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Destinatário</p>
                      <p className="text-2xl font-black italic uppercase tracking-tighter text-white">{selectedPatient?.profile?.full_name}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
                      <p className="text-[9px] font-black text-white/30 uppercase mb-1">Versão do Editor</p>
                      <p className="text-xs font-black text-white">V3 SOBERANO</p>
                    </div>
                    <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
                      <p className="text-[9px] font-black text-white/30 uppercase mb-1">Total Kcal</p>
                      <p className="text-xs font-black text-white">{Math.round(totalKcal)} kcal</p>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/20 p-6 rounded-3xl flex gap-4">
                  <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0" />
                  <div>
                    <h4 className="text-xs font-black uppercase text-amber-500 mb-1">Confirmação de Governança</h4>
                    <p className="text-[10px] text-white/60 leading-relaxed uppercase">
                      Ao confirmar, este plano substituirá o plano atual do paciente. 
                      A entrega será marcada internamente como <span className="text-white font-bold">V3 Sandbox Delivery</span> para fins de auditoria.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="p-8 bg-neutral-900/50 border-t border-white/5 gap-3">
            {step === 'select' ? (
              <>
                <Button variant="ghost" onClick={onClose} className="uppercase text-[10px] font-black tracking-widest text-white/40">Cancelar</Button>
                <Button 
                  disabled={!selectedPatientId}
                  onClick={() => setStep('confirm')}
                  className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-8 uppercase text-[10px] font-black tracking-widest h-11"
                >
                  Revisar Entrega <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" onClick={() => setStep('select')} className="uppercase text-[10px] font-black tracking-widest text-white/40">Voltar</Button>
                <Button 
                  disabled={delivering}
                  onClick={handleDeliver}
                  className="bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl px-12 uppercase text-[10px] font-black tracking-widest h-11 shadow-[0_0_30px_rgba(16,185,129,0.3)]"
                >
                  {delivering ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                  Confirmar Entrega Clínica
                </Button>
              </>
            )}
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};
