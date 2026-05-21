import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Calendar, Clock, Edit, Plus, Save, Trash2, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Food {
  name: string;
  qty: string;
  kcal: number;
}

interface Meal {
  type: string;
  time: string;
  name: string;
  image?: string;
  foods: Food[];
}

interface Day {
  day: string;
  meals: Meal[];
}

interface MealPlan {
  id: string;
  name: string;
  description: string;
  meals: Day[];
  start_date: string;
  end_date?: string;
  status: string;
  notes?: string;
}

interface MealPlanEditorProps {
  planId: string;
  onSave?: () => void;
}

export function MealPlanEditor({ planId, onSave }: MealPlanEditorProps) {
  const [plan, setPlan] = useState<MealPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingMeal, setEditingMeal] = useState<{
    dayIndex: number;
    mealIndex: number;
    meal: Meal;
  } | null>(null);
  const [editingFood, setEditingFood] = useState<Food | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadPlan();
  }, [planId]);

  const loadPlan = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('patient_meal_plans')
        .select('*')
        .eq('id', planId)
        .single();

      if (error) throw error;
      setPlan(data);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar plano',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const savePlan = async () => {
    if (!plan) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from('patient_meal_plans')
        .update({
          name: plan.name,
          description: plan.description,
          meals: plan.meals,
          notes: plan.notes,
        })
        .eq('id', planId);

      if (error) throw error;

      toast({
        title: 'Plano salvo com sucesso!',
        description: 'As alterações foram salvas.',
      });

      onSave?.();
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar plano',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const updateMeal = (dayIndex: number, mealIndex: number, updatedMeal: Meal) => {
    if (!plan) return;

    const newMeals = [...plan.meals];
    newMeals[dayIndex].meals[mealIndex] = updatedMeal;
    setPlan({ ...plan, meals: newMeals });
  };

  const addFoodToMeal = (dayIndex: number, mealIndex: number, food: Food) => {
    if (!plan) return;

    const newMeals = [...plan.meals];
    newMeals[dayIndex].meals[mealIndex].foods.push(food);
    setPlan({ ...plan, meals: newMeals });
  };

  const removeFoodFromMeal = (dayIndex: number, mealIndex: number, foodIndex: number) => {
    if (!plan) return;

    const newMeals = [...plan.meals];
    newMeals[dayIndex].meals[mealIndex].foods.splice(foodIndex, 1);
    setPlan({ ...plan, meals: newMeals });
  };

  const updateFood = (dayIndex: number, mealIndex: number, foodIndex: number, updatedFood: Food) => {
    if (!plan) return;

    const newMeals = [...plan.meals];
    newMeals[dayIndex].meals[mealIndex].foods[foodIndex] = updatedFood;
    setPlan({ ...plan, meals: newMeals });
  };

  const calculateMealTotal = (meal: Meal) => {
    return meal.foods.reduce((sum, food) => sum + food.kcal, 0);
  };

  const calculateDayTotal = (day: Day) => {
    return day.meals.reduce((sum, meal) => sum + calculateMealTotal(meal), 0);
  };

  const getMealTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      cafe: 'Café da Manhã',
      almoco: 'Almoço',
      lanche: 'Lanche',
      jantar: 'Jantar',
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground">Plano não encontrado</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho do Plano */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle>{plan.name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
            </div>
            <Button onClick={savePlan} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                Início: {new Date(plan.start_date).toLocaleDateString('pt-BR')}
              </span>
            </div>
            {plan.end_date && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  Fim: {new Date(plan.end_date).toLocaleDateString('pt-BR')}
                </span>
              </div>
            )}
            <Badge variant={plan.status === 'active' ? 'default' : 'secondary'}>
              {plan.status === 'active' ? 'Ativo' : plan.status}
            </Badge>
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              value={plan.notes || ''}
              onChange={(e) => setPlan({ ...plan, notes: e.target.value })}
              placeholder="Adicione observações sobre o plano..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Dias e Refeições */}
      <Tabs defaultValue="0" className="w-full">
        <TabsList className="grid w-full grid-cols-7">
          {plan.meals.map((day, index) => (
            <TabsTrigger key={index} value={index.toString()}>
              {day.day}
            </TabsTrigger>
          ))}
        </TabsList>

        {plan.meals.map((day, dayIndex) => (
          <TabsContent key={dayIndex} value={dayIndex.toString()} className="space-y-4 mt-6">
            {/* Total do Dia */}
            <Card className="bg-primary/5">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold">Total do Dia</span>
                  <Badge variant="default" className="text-lg px-4 py-2">
                    {calculateDayTotal(day)} kcal
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Refeições */}
            <div className="space-y-4">
              {day.meals.map((meal, mealIndex) => (
                <Card key={mealIndex}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">{meal.time}</span>
                        </div>
                        <CardTitle className="text-lg">{meal.name}</CardTitle>
                        <CardDescription>{getMealTypeLabel(meal.type)}</CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-base">
                          {calculateMealTotal(meal)} kcal
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingMeal({ dayIndex, mealIndex, meal })}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Imagem da Refeição */}
                    {meal.image && (
                      <div className="relative w-full h-48 rounded-lg overflow-hidden">
                        <img
                          src={meal.image}
                          alt={meal.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    {/* Lista de Alimentos */}
                    <div className="space-y-2">
                      {meal.foods.map((food, foodIndex) => (
                        <div
                          key={foodIndex}
                          className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                        >
                          <div className="flex-1">
                            <p className="font-medium">{food.name}</p>
                            <p className="text-sm text-muted-foreground">{food.qty}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge variant="outline">{food.kcal} kcal</Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingFood(food)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFoodFromMeal(dayIndex, mealIndex, foodIndex)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Botão Adicionar Alimento */}
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        // Abrir dialog para adicionar alimento
                        const newFood: Food = {
                          name: 'Novo Alimento',
                          qty: '100g',
                          kcal: 0,
                        };
                        addFoodToMeal(dayIndex, mealIndex, newFood);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Alimento
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Dialog para Editar Refeição */}
      {editingMeal && (
        <Dialog open={!!editingMeal} onOpenChange={() => setEditingMeal(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Refeição</DialogTitle>
              <DialogDescription>Altere os dados da refeição</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome da Refeição</Label>
                <Input
                  value={editingMeal.meal.name}
                  onChange={(e) =>
                    setEditingMeal({
                      ...editingMeal,
                      meal: { ...editingMeal.meal, name: e.target.value },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Horário</Label>
                <Input
                  type="time"
                  value={editingMeal.meal.time}
                  onChange={(e) =>
                    setEditingMeal({
                      ...editingMeal,
                      meal: { ...editingMeal.meal, time: e.target.value },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>URL da Imagem</Label>
                <Input
                  value={editingMeal.meal.image || ''}
                  onChange={(e) =>
                    setEditingMeal({
                      ...editingMeal,
                      meal: { ...editingMeal.meal, image: e.target.value },
                    })
                  }
                  placeholder="https://..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingMeal(null)}>
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  updateMeal(editingMeal.dayIndex, editingMeal.mealIndex, editingMeal.meal);
                  setEditingMeal(null);
                }}
              >
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
