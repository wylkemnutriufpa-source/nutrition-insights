import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@v1/components/ui/dialog";
import { Badge } from "@v1/components/ui/badge";
import { Button } from "@v1/components/ui/button";
import { Separator } from "@v1/components/ui/separator";
import { Crown, Sparkles, Check, ArrowUp, Calendar, Zap } from "lucide-react";
import { motion } from "framer-motion";
import type { PrestigePlan } from "@v1/hooks/usePrestige";

interface PlanDetailModalProps {
  plan: PrestigePlan;
  allPlans?: PrestigePlan[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpgrade?: (planId: string) => void;
}

const DURATION_LABELS: Record<string, string> = {
  basic: "Pagamento único",
  elite: "Trimestral",
  pro: "Semestral",
  premium: "Anual",
};

export default function PlanDetailModal({ plan, allPlans = [], open, onOpenChange, onUpgrade }: PlanDetailModalProps) {
  const upgradePlans = allPlans.filter(p => p.display_order > plan.display_order);

  const effectClass = plan.effect_type === "golden"
    ? "shadow-[0_0_30px_rgba(245,158,11,0.3)]"
    : plan.effect_type === "shimmer"
    ? "shadow-[0_0_25px_rgba(139,92,246,0.25)]"
    : plan.effect_type === "glow"
    ? "shadow-[0_0_20px_rgba(59,130,246,0.25)]"
    : "";

  const priceLabel = plan.price_annual
    ? `R$ ${plan.price_annual}/ano`
    : plan.price_semiannual
    ? `R$ ${plan.price_semiannual}/semestre`
    : plan.price_quarterly
    ? `R$ ${plan.price_quarterly}/trimestre`
    : plan.price_monthly > 0
    ? `R$ ${plan.price_monthly}/mês`
    : "Gratuito";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-w-md ${effectClass}`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {plan.crown_enabled && (
              <Crown className="w-6 h-6" style={{ color: plan.color }} />
            )}
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
              style={{ backgroundColor: plan.color + "20", border: `2px solid ${plan.color}` }}
            >
              {plan.badge_icon}
            </div>
            <div>
              <span className="text-xl font-display" style={{ color: plan.color }}>
                {plan.name}
              </span>
              <p className="text-xs text-muted-foreground font-normal">
                {DURATION_LABELS[plan.slug] || plan.slug}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Price */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
            <span className="text-sm text-muted-foreground">Valor</span>
            <span className="font-bold text-lg" style={{ color: plan.color }}>{priceLabel}</span>
          </div>

          {/* Features */}
          {plan.features.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Recursos incluídos
              </h4>
              <div className="space-y-1.5">
                {plan.features.map((feature, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: plan.color }} />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Limits */}
          <div className="p-3 rounded-lg bg-muted/30">
            <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-1">
              <Zap className="w-4 h-4 text-primary" />
              Limites de IA
            </h4>
            <p className="text-xs text-muted-foreground">
              Multiplicador: <strong>{plan.ai_usage_multiplier}x</strong> do limite base
            </p>
          </div>

          {/* Visual Properties */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="text-xs gap-1" style={{ borderColor: plan.color + "40" }}>
              {plan.badge_icon} {plan.badge_label}
            </Badge>
            {plan.crown_enabled && (
              <Badge variant="secondary" className="text-xs gap-1">
                <Crown className="w-3 h-3" /> Coroa
              </Badge>
            )}
            {plan.ranking_highlight && (
              <Badge variant="secondary" className="text-xs gap-1">
                ✨ Destaque no Ranking
              </Badge>
            )}
            {plan.effect_type !== "none" && (
              <Badge variant="secondary" className="text-xs gap-1">
                🎨 Efeito: {plan.effect_type}
              </Badge>
            )}
          </div>

          {/* Upgrade Options */}
          {upgradePlans.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-3">
                  <ArrowUp className="w-4 h-4 text-primary" />
                  Upgrade disponível
                </h4>
                <div className="space-y-2">
                  {upgradePlans.map(up => (
                    <motion.button
                      key={up.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => onUpgrade?.(up.id)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/30 transition-colors text-left"
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: up.color + "20", border: `2px solid ${up.color}` }}
                      >
                        {up.badge_icon}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold" style={{ color: up.color }}>{up.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {up.features.length} recursos • {up.ai_usage_multiplier}x IA
                        </p>
                      </div>
                      <ArrowUp className="w-4 h-4 text-primary" />
                    </motion.button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
