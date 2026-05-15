
import React, { useState, useEffect } from 'react';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  CheckCircle2, Clock, Zap, Target, Flame, 
  ChevronRight, ArrowRight, Layers, Image as ImageIcon,
  Calendar, Info
} from 'lucide-react';
import { V3DietTemplate, KcalProfile } from '../types/types';
import { cn } from '@/lib/utils';

interface TemplateV3ModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: V3DietTemplate | null;
  onSelectProfile: (profileKcal: number, isWeekly: boolean) => void;
}

export const TemplateV3Modal: React.FC<TemplateV3ModalProps> = ({
  isOpen, onClose, template, onSelectProfile
}) => {
  const [selectedKcal, setSelectedKcal] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'daily' | 'weekly'>('daily');

  if (!template) return null;

  const profiles = (template.kcal_profiles || []) as (number | KcalProfile)[];
  
  const getKcalValue = (p: number | KcalProfile) => typeof p === 'number' ? p : p.kcal;

  const handleSelect = () => {
    if (selectedKcal) {
      onSelectProfile(selectedKcal, viewMode === 'weekly');
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl bg-neutral-950 border-white/10 text-white p-0 overflow-hidden rounded-2xl">
        <div className="flex flex-col md:flex-row h-[85vh] max-h-[800px]">
          {/* Lateral Info */}
          <div className="w-full md:w-80 bg-neutral-900/50 p-6 border-r border-white/10 flex flex-col">
            <div className="flex-1">
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 mb-4 uppercase text-[10px] font-black tracking-widest">
                Template Profissional
              </Badge>

              <h2 className="text-2xl font-black italic uppercase tracking-tighter mb-2">
                {template.title}
              </h2>
              <p className="text-white/40 text-xs uppercase font-medium leading-relaxed mb-6">
                {template.description}
              </p>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/5 rounded-lg">
                    <Target className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-[10px] text-white/30 uppercase font-black">Objetivo</p>
                    <p className="text-xs uppercase font-bold">{template.objective}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/5 rounded-lg">
                    <Layers className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-[10px] text-white/30 uppercase font-black">Família</p>
                    <p className="text-xs uppercase font-bold">{template.family || 'Geral'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/5 rounded-lg">
                    <Zap className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-[10px] text-white/30 uppercase font-black">Intensidade</p>
                    <p className="text-xs uppercase font-bold">Alta Saciedade</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-white/5">
              <div className="bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Validado Clínicamente</span>
                </div>
                <p className="text-[9px] text-white/50 uppercase leading-tight">
                  Este template utiliza o Resolver Soberano V3 para garantir integridade em qualquer perfil calórico.
                </p>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <Tabs value={viewMode} onValueChange={(v: any) => setViewMode(v)} className="w-auto">
                <TabsList className="bg-white/5 border border-white/10 p-1">
                  <TabsTrigger value="daily" className="data-[state=active]:bg-white/10 text-[10px] uppercase font-black px-4">Diário</TabsTrigger>
                  <TabsTrigger value="weekly" className="data-[state=active]:bg-white/10 text-[10px] uppercase font-black px-4">Semanal</TabsTrigger>
                </TabsList>
              </Tabs>
              
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-white/30">
                  <Clock className="w-3 h-3" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Preview V3</span>
                </div>
              </div>
            </div>

            <ScrollArea className="flex-1 p-6">
              <div className="space-y-8">
                {/* Profiles Selection */}
                <section>
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-4 flex items-center gap-2">
                    <Flame className="w-3 h-3" /> Selecione o Perfil Calórico
                  </h3>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                    {profiles.map((p, idx) => {
                      const kcal = getKcalValue(p);
                      const isSelected = selectedKcal === kcal;
                      return (
                        <button
                          key={idx}
                          onClick={() => setSelectedKcal(kcal)}
                          className={cn(
                            "flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-300",
                            isSelected 
                              ? "bg-emerald-500 border-emerald-400 text-white scale-105 shadow-lg shadow-emerald-500/20" 
                              : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:border-white/20"
                          )}
                        >
                          <span className="text-xs font-black italic">{kcal}</span>
                          <span className="text-[8px] uppercase font-black tracking-tighter opacity-50">kcal</span>
                        </button>
                      );
                    })}
                  </div>
                </section>

                {/* Structure Preview */}
                <section>
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-4 flex items-center gap-2">
                    <Calendar className="w-3 h-3" /> Estrutura Alimentar
                  </h3>
                  <div className="space-y-3">
                    {template.meal_distribution.map((meal, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl group hover:bg-white/10 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
                            <span className="text-[10px] font-black">{meal.time}</span>
                          </div>
                          <div>
                            <p className="text-xs font-black uppercase italic tracking-tight text-white/90">
                              {meal.slot.replace(/_/g, ' ')}
                            </p>
                            <p className="text-[9px] uppercase font-black tracking-widest text-white/30">
                              {template.cluster_map?.[meal.slot] || 'Cluster Dinâmico'}
                            </p>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-white/10 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
                      </div>
                    ))}
                  </div>
                </section>

                {/* Substitutions & Variety */}
                <section className="bg-white/5 rounded-2xl p-6 border border-white/10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-emerald-500/20 rounded-lg">
                      <Zap className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase italic">Variedade Determinística</h4>
                      <p className="text-[10px] text-white/40 uppercase font-medium">Algoritmo de rotação ativa</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p className="text-[9px] font-black uppercase text-white/30">Substituições Soberanas</p>
                      <div className="flex flex-wrap gap-2">
                        {['Frango', 'Carne', 'Ovos', 'Peixe'].map(tag => (
                          <Badge key={tag} className="bg-white/5 text-white/60 border-white/10 text-[8px] uppercase font-black">{tag}</Badge>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-[9px] font-black uppercase text-white/30">Rotação Visual</p>
                      <div className="flex -space-x-2 overflow-hidden">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="inline-block h-6 w-6 rounded-full ring-2 ring-neutral-900 bg-neutral-800 flex items-center justify-center">
                            <ImageIcon className="w-3 h-3 text-white/20" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </ScrollArea>

            <div className="p-6 border-t border-white/5 flex items-center justify-end gap-3 bg-neutral-900/30">
              <Button 
                variant="ghost" 
                onClick={onClose}
                className="text-white/40 hover:text-white hover:bg-white/5 uppercase text-[10px] font-black tracking-widest"
              >
                Cancelar
              </Button>
              <Button 
                disabled={!selectedKcal}
                onClick={handleSelect}
                className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl px-8 uppercase text-[10px] font-black tracking-widest h-11"
              >
                Gerar Plano V3 <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
