import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle2, Wheat, Milk, Apple } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

/**
 * 🎯 SELETOR DE RESTRIÇÕES ALIMENTARES
 * 
 * Permite nutricionista selecionar:
 * - Zero Glúten
 * - Zero Lactose
 * - Low FODMAP
 * 
 * Sistema automaticamente substitui alimentos proibidos por alternativas seguras
 */

interface DietaryRestrictions {
  gluten_free: boolean;
  lactose_free: boolean;
  low_fodmap: boolean;
}

interface DietaryRestrictionsSelectorProps {
  onRestrictionsChange: (restrictions: DietaryRestrictions) => void;
  initialRestrictions?: DietaryRestrictions;
}

const RESTRICTION_OPTIONS = [
  {
    id: 'gluten_free',
    label: 'Zero Glúten',
    description: 'Sem trigo, centeio, cevada, aveia (não certificada)',
    icon: Wheat,
    color: 'text-amber-600',
    examples: 'Substitui: Pão → Tapioca, Macarrão → Arroz',
  },
  {
    id: 'lactose_free',
    label: 'Zero Lactose',
    description: 'Sem leite e derivados com lactose',
    icon: Milk,
    color: 'text-blue-600',
    examples: 'Substitui: Leite → Leite sem Lactose, Iogurte → Iogurte de Coco',
  },
  {
    id: 'low_fodmap',
    label: 'Low FODMAP',
    description: 'Baixo em carboidratos fermentáveis (para SII)',
    icon: Apple,
    color: 'text-green-600',
    examples: 'Substitui: Maçã → Banana, Pera → Morango',
  },
];

const TEMPLATE_SUGGESTIONS = [
  {
    restrictions: { gluten_free: false, lactose_free: false, low_fodmap: false },
    label: 'Sem Restrições',
    description: 'Plano completo com todos os alimentos',
    badge: 'Padrão',
  },
  {
    restrictions: { gluten_free: true, lactose_free: false, low_fodmap: false },
    label: 'Zero Glúten',
    description: 'Para celíacos ou sensibilidade ao glúten',
    badge: 'Comum',
  },
  {
    restrictions: { gluten_free: false, lactose_free: true, low_fodmap: false },
    label: 'Zero Lactose',
    description: 'Para intolerância à lactose',
    badge: 'Comum',
  },
  {
    restrictions: { gluten_free: false, lactose_free: false, low_fodmap: true },
    label: 'Low FODMAP',
    description: 'Para síndrome do intestino irritável',
    badge: 'Especializado',
  },
  {
    restrictions: { gluten_free: true, lactose_free: true, low_fodmap: false },
    label: 'Zero Glúten + Lactose',
    description: 'Dupla restrição',
    badge: 'Avançado',
  },
  {
    restrictions: { gluten_free: true, lactose_free: true, low_fodmap: true },
    label: 'Restrição Completa',
    description: 'Todas as restrições aplicadas',
    badge: 'Máximo',
  },
];

export function DietaryRestrictionsSelector({
  onRestrictionsChange,
  initialRestrictions = { gluten_free: false, lactose_free: false, low_fodmap: false },
}: DietaryRestrictionsSelectorProps) {
  const [restrictions, setRestrictions] = useState<DietaryRestrictions>(initialRestrictions);

  const handleRestrictionToggle = (restrictionId: keyof DietaryRestrictions) => {
    const newRestrictions = {
      ...restrictions,
      [restrictionId]: !restrictions[restrictionId],
    };
    setRestrictions(newRestrictions);
    onRestrictionsChange(newRestrictions);
  };

  const applyTemplate = (template: DietaryRestrictions) => {
    setRestrictions(template);
    onRestrictionsChange(template);
  };

  const getActiveRestrictionsCount = () => {
    return Object.values(restrictions).filter(Boolean).length;
  };

  const getActiveRestrictionsList = () => {
    const active = [];
    if (restrictions.gluten_free) active.push('Zero Glúten');
    if (restrictions.lactose_free) active.push('Zero Lactose');
    if (restrictions.low_fodmap) active.push('Low FODMAP');
    return active;
  };

  return (
    <div className="space-y-6">
      {/* RESUMO DAS RESTRIÇÕES ATIVAS */}
      {getActiveRestrictionsCount() > 0 && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            <strong>{getActiveRestrictionsCount()} restrição(ões) ativa(s):</strong>{' '}
            {getActiveRestrictionsList().join(', ')}
          </AlertDescription>
        </Alert>
      )}

      {/* TEMPLATES RÁPIDOS */}
      <Card>
        <CardHeader>
          <CardTitle>Templates Rápidos</CardTitle>
          <CardDescription>
            Clique para aplicar um conjunto de restrições comum
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {TEMPLATE_SUGGESTIONS.map((template, index) => {
              const isActive =
                restrictions.gluten_free === template.restrictions.gluten_free &&
                restrictions.lactose_free === template.restrictions.lactose_free &&
                restrictions.low_fodmap === template.restrictions.low_fodmap;

              return (
                <Button
                  key={index}
                  variant={isActive ? 'default' : 'outline'}
                  className="h-auto flex-col items-start p-4 text-left"
                  onClick={() => applyTemplate(template.restrictions)}
                >
                  <div className="flex items-center gap-2 w-full">
                    <span className="font-semibold">{template.label}</span>
                    <Badge variant="secondary" className="ml-auto">
                      {template.badge}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground mt-1">
                    {template.description}
                  </span>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* SELEÇÃO INDIVIDUAL DE RESTRIÇÕES */}
      <Card>
        <CardHeader>
          <CardTitle>Restrições Alimentares</CardTitle>
          <CardDescription>
            Selecione as restrições do paciente. O sistema substituirá automaticamente os alimentos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {RESTRICTION_OPTIONS.map((option) => {
              const Icon = option.icon;
              const isActive = restrictions[option.id as keyof DietaryRestrictions];

              return (
                <div
                  key={option.id}
                  className={`flex items-start space-x-4 p-4 rounded-lg border-2 transition-all ${
                    isActive
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <Checkbox
                    id={option.id}
                    checked={isActive}
                    onCheckedChange={() =>
                      handleRestrictionToggle(option.id as keyof DietaryRestrictions)
                    }
                    className="mt-1"
                  />
                  <div className="flex-1 space-y-2">
                    <Label
                      htmlFor={option.id}
                      className="flex items-center gap-2 text-base font-semibold cursor-pointer"
                    >
                      <Icon className={`w-5 h-5 ${option.color}`} />
                      {option.label}
                      {isActive && (
                        <Badge variant="default" className="ml-2">
                          Ativo
                        </Badge>
                      )}
                    </Label>
                    <p className="text-sm text-muted-foreground">{option.description}</p>
                    <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                      <strong>Exemplo:</strong> {option.examples}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* AVISO SOBRE SUBSTITUIÇÕES */}
      {getActiveRestrictionsCount() > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Substituições Automáticas:</strong> Ao selecionar um template ou criar um plano,
            o sistema substituirá automaticamente os alimentos proibidos por alternativas seguras e
            nutricionalmente equivalentes.
          </AlertDescription>
        </Alert>
      )}

      {/* INFORMAÇÕES SOBRE VARIAÇÕES CALÓRICAS */}
      <Card>
        <CardHeader>
          <CardTitle>Variações Calóricas Disponíveis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-primary">1400</div>
              <div className="text-sm text-muted-foreground">kcal/dia</div>
              <Badge variant="outline" className="mt-2">
                Emagrecimento
              </Badge>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-primary">1800</div>
              <div className="text-sm text-muted-foreground">kcal/dia</div>
              <Badge variant="outline" className="mt-2">
                Manutenção
              </Badge>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-primary">2200</div>
              <div className="text-sm text-muted-foreground">kcal/dia</div>
              <Badge variant="outline" className="mt-2">
                Hipertrofia
              </Badge>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-4 text-center">
            Cada restrição possui templates em todas as faixas calóricas
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
