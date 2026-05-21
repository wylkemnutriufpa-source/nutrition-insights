import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Calculator, Save, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

/**
 * 🚀 MEAL PLAN BUILDER - MONTAGEM RÁPIDA DE PLANOS
 * 
 * Sistema tipo Excel:
 * - Clica no alimento → adiciona
 * - Muda gramas → recalcula TUDO automaticamente
 * - Interface premium com preview visual
 * 
 * FÓRMULAS:
 * - Proteína: 4 kcal/g
 * - Carboidrato: 4 kcal/g
 * - Lipídeo: 9 kcal/g
 */

interface FoodItem {
  food_name: string;
  mass_g: number;
  units: number;
  unit_name: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  kcal_from_protein: number;
  kcal_from_carbs: number;
  kcal_from_fat: number;
}

interface Meal {
  meal_type: string;
  time: string;
  foods: FoodItem[];
}

interface Day {
  day: string;
  meals: Meal[];
}

interface DraftTotals {
  total_kcal: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fat_g: number;
}

const MEAL_TYPES = [
  { value: 'cafe', label: 'Café da Manhã', time: '08:00' },
  { value: 'lanche_manha', label: 'Lanche da Manhã', time: '10:00' },
  { value: 'almoco', label: 'Almoço', time: '12:30' },
  { value: 'lanche_tarde', label: 'Lanche da Tarde', time: '16:00' },
  { value: 'jantar', label: 'Jantar', time: '19:30' },
];

const DAYS_OF_WEEK = [
  { value: 'monday', label: 'Segunda' },
  { value: 'tuesday', label: 'Terça' },
  { value: 'wednesday', label: 'Quarta' },
  { value: 'thursday', label: 'Quinta' },
  { value: 'friday', label: 'Sexta' },
  { value: 'saturday', label: 'Sábado' },
  { value: 'sunday', label: 'Domingo' },
];

export function MealPlanBuilder() {
  const [draftId, setDraftId] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState('monday');
  const [selectedMeal, setSelectedMeal] = useState('cafe');
  const [days, setDays] = useState<Day[]>([]);
  const [totals, setTotals] = useState<DraftTotals>({
    total_kcal: 0,
    total_protein_g: 0,
    total_carbs_g: 0,
    total_fat_g: 0,
  });
  const [availableFoods, setAvailableFoods] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Carrega alimentos disponíveis
  useEffect(() => {
    loadAvailableFoods();
  }, []);

  // Cria novo rascunho ao montar
  useEffect(() => {
    createNewDraft();
  }, []);

  const loadAvailableFoods = async () => {
    const { data, error } = await supabase
      .from('meal_household_measures')
      .select('*')
      .order('category', { ascending: true })
      .order('food_name', { ascending: true });

    if (error) {
      console.error('Erro ao carregar alimentos:', error);
      return;
    }

    setAvailableFoods(data || []);
  };

  const createNewDraft = async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      toast({
        title: 'Erro',
        description: 'Você precisa estar logado',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('meal_plan_drafts')
      .insert({
        nutritionist_id: user.id,
        plan_name: 'Novo Plano',
        days: [],
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar rascunho:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível criar o rascunho',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    setDraftId(data.id);
    setIsLoading(false);
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ADICIONAR ALIMENTO (com recálculo automático)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const addFood = async (foodName: string, massG: number) => {
    if (!draftId) return;

    setIsLoading(true);

    const { data, error } = await supabase.rpc('add_food_to_meal', {
      p_draft_id: draftId,
      p_day: selectedDay,
      p_meal_type: selectedMeal,
      p_food_name: foodName,
      p_mass_g: massG,
    });

    if (error) {
      console.error('Erro ao adicionar alimento:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível adicionar o alimento',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    // Atualiza totais em tempo real
    setTotals({
      total_kcal: data.total_kcal,
      total_protein_g: data.total_protein_g,
      total_carbs_g: data.total_carbs_g,
      total_fat_g: data.total_fat_g,
    });

    // Recarrega dias
    await loadDraft();

    toast({
      title: '✅ Alimento adicionado!',
      description: `${data.food_added.units} ${data.food_added.unit_name} de ${foodName} (${data.food_added.kcal} kcal)`,
    });

    setIsLoading(false);
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ATUALIZAR MASSA (recalcula tudo tipo Excel)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const updateFoodMass = async (foodIndex: number, newMassG: number) => {
    if (!draftId) return;

    setIsLoading(true);

    const { data, error } = await supabase.rpc('update_food_mass', {
      p_draft_id: draftId,
      p_day: selectedDay,
      p_meal_type: selectedMeal,
      p_food_index: foodIndex,
      p_new_mass_g: newMassG,
    });

    if (error) {
      console.error('Erro ao atualizar massa:', error);
      setIsLoading(false);
      return;
    }

    // Atualiza totais em tempo real
    setTotals({
      total_kcal: data.total_kcal,
      total_protein_g: data.total_protein_g,
      total_carbs_g: data.total_carbs_g,
      total_fat_g: data.total_fat_g,
    });

    // Recarrega dias
    await loadDraft();

    setIsLoading(false);
  };

  const loadDraft = async () => {
    if (!draftId) return;

    const { data, error } = await supabase
      .from('meal_plan_drafts')
      .select('*')
      .eq('id', draftId)
      .single();

    if (error) {
      console.error('Erro ao carregar rascunho:', error);
      return;
    }

    setDays(data.days || []);
    setTotals({
      total_kcal: data.total_kcal_per_day || 0,
      total_protein_g: data.total_protein_g_per_day || 0,
      total_carbs_g: data.total_carbs_g_per_day || 0,
      total_fat_g: data.total_fat_g_per_day || 0,
    });
  };

  const getCurrentDayMeals = (): Meal[] => {
    const day = days.find((d) => d.day === selectedDay);
    return day?.meals || [];
  };

  const getCurrentMealFoods = (): FoodItem[] => {
    const meals = getCurrentDayMeals();
    const meal = meals.find((m) => m.meal_type === selectedMeal);
    return meal?.foods || [];
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* HEADER COM TOTAIS EM TEMPO REAL */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-6 h-6" />
            Montagem Rápida de Plano Alimentar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">
                {totals.total_kcal.toFixed(0)}
              </div>
              <div className="text-sm text-muted-foreground">kcal/dia</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {totals.total_protein_g.toFixed(1)}g
              </div>
              <div className="text-sm text-muted-foreground">Proteína</div>
            </div>
            <div className="text-2xl font-bold text-green-600">
                {totals.total_carbs_g.toFixed(1)}g
              </div>
              <div className="text-sm text-muted-foreground">Carboidrato</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {totals.total_fat_g.toFixed(1)}g
              </div>
              <div className="text-sm text-muted-foreground">Gordura</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SELETOR DE DIA E REFEIÇÃO */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Dia da Semana</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {DAYS_OF_WEEK.map((day) => (
                <Button
                  key={day.value}
                  variant={selectedDay === day.value ? 'default' : 'outline'}
                  onClick={() => setSelectedDay(day.value)}
                >
                  {day.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Refeição</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {MEAL_TYPES.map((meal) => (
                <Button
                  key={meal.value}
                  variant={selectedMeal === meal.value ? 'default' : 'outline'}
                  onClick={() => setSelectedMeal(meal.value)}
                >
                  {meal.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ALIMENTOS DISPONÍVEIS */}
      <Card>
        <CardHeader>
          <CardTitle>Adicionar Alimentos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {availableFoods.map((food) => (
              <Button
                key={food.id}
                variant="outline"
                className="h-auto flex-col items-start p-4"
                onClick={() => addFood(food.food_name, food.standard_mass_g)}
                disabled={isLoading}
              >
                <div className="font-semibold">{food.food_name}</div>
                <div className="text-xs text-muted-foreground">
                  {food.standard_mass_g}g ({food.kcal_per_unit} kcal)
                </div>
                <Badge variant="secondary" className="mt-2">
                  <Plus className="w-3 h-3 mr-1" />
                  Adicionar
                </Badge>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ALIMENTOS ADICIONADOS (com edição em tempo real) */}
      <Card>
        <CardHeader>
          <CardTitle>
            Alimentos na Refeição
            <Badge variant="outline" className="ml-2">
              {getCurrentMealFoods().length} itens
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {getCurrentMealFoods().length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              Nenhum alimento adicionado ainda. Clique em um alimento acima para adicionar.
            </div>
          ) : (
            <div className="space-y-4">
              {getCurrentMealFoods().map((food, index) => (
                <div
                  key={index}
                  className="flex items-center gap-4 p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="font-semibold">{food.food_name}</div>
                    <div className="text-sm text-muted-foreground">
                      {food.units.toFixed(1)} {food.unit_name} • {food.kcal.toFixed(0)} kcal
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={food.mass_g}
                      onChange={(e) => updateFoodMass(index, parseFloat(e.target.value))}
                      className="w-24"
                      disabled={isLoading}
                    />
                    <span className="text-sm">g</span>
                  </div>
                  <div className="text-right text-sm">
                    <div>P: {food.protein_g.toFixed(1)}g</div>
                    <div>C: {food.carbs_g.toFixed(1)}g</div>
                    <div>G: {food.fat_g.toFixed(1)}g</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
