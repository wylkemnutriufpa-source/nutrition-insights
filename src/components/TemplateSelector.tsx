import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Filter, Star, Utensils, TrendingDown, Dumbbell, Heart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Template {
  id: string;
  name: string;
  category: string;
  description: string;
  kcal_target: number;
  has_restrictions: boolean;
  dietary_restrictions: string | null;
  is_marmita: boolean;
  total_days: number;
  total_meals: number;
  all_meals_have_images: boolean;
  category_label: string;
}

interface TemplateSelectorProps {
  onSelectTemplate: (template: Template) => void;
  patientId?: string;
}

export function TemplateSelector({ onSelectTemplate, patientId }: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [kcalRange, setKcalRange] = useState<string>('all');
  const { toast } = useToast();

  // Carregar templates
  useEffect(() => {
    loadTemplates();
  }, []);

  // Filtrar templates quando mudar os filtros
  useEffect(() => {
    filterTemplates();
  }, [templates, searchText, selectedCategory, kcalRange]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('templates_enriched')
        .select('*')
        .order('category', { ascending: true })
        .order('kcal_target', { ascending: true });

      if (error) throw error;
      setTemplates((data || []) as any);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar templates',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filterTemplates = () => {
    let filtered = [...templates];

    // Filtro por texto
    if (searchText) {
      filtered = filtered.filter(
        (t) =>
          t.name.toLowerCase().includes(searchText.toLowerCase()) ||
          t.description?.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    // Filtro por categoria
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((t) => t.category === selectedCategory);
    }

    // Filtro por faixa calórica
    if (kcalRange !== 'all') {
      const [min, max] = kcalRange.split('-').map(Number);
      filtered = filtered.filter((t) => {
        if (max) {
          return t.kcal_target >= min && t.kcal_target <= max;
        } else {
          return t.kcal_target >= min;
        }
      });
    }

    setFilteredTemplates(filtered);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'saude':
        return <Heart className="h-4 w-4" />;
      case 'emagrecimento':
        return <TrendingDown className="h-4 w-4" />;
      case 'hipertrofia':
        return <Dumbbell className="h-4 w-4" />;
      case 'clinico':
        return <Star className="h-4 w-4" />;
      default:
        return <Utensils className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'saude':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'emagrecimento':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'hipertrofia':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'clinico':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const groupedTemplates = filteredTemplates.reduce((acc, template) => {
    if (!acc[template.category]) {
      acc[template.category] = [];
    }
    acc[template.category].push(template);
    return acc;
  }, {} as Record<string, Template[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Busca por texto */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar templates..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Filtro por categoria */}
            <div>
              <label className="text-sm font-medium mb-2 block">Categoria</label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as categorias" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as categorias</SelectItem>
                  <SelectItem value="saude">Saúde</SelectItem>
                  <SelectItem value="emagrecimento">Emagrecimento</SelectItem>
                  <SelectItem value="hipertrofia">Hipertrofia</SelectItem>
                  <SelectItem value="low_carb">Low Carb</SelectItem>
                  <SelectItem value="clinico">Clínico</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filtro por faixa calórica */}
            <div>
              <label className="text-sm font-medium mb-2 block">Faixa Calórica</label>
              <Select value={kcalRange} onValueChange={setKcalRange}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as faixas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as faixas</SelectItem>
                  <SelectItem value="1200-1499">1200-1499 kcal</SelectItem>
                  <SelectItem value="1500-1799">1500-1799 kcal</SelectItem>
                  <SelectItem value="1800-2199">1800-2199 kcal</SelectItem>
                  <SelectItem value="2200-9999">2200+ kcal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Contador de resultados */}
          <div className="text-sm text-muted-foreground">
            {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''} encontrado
            {filteredTemplates.length !== 1 ? 's' : ''}
          </div>
        </CardContent>
      </Card>

      {/* Lista de Templates */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="all">Todos ({filteredTemplates.length})</TabsTrigger>
          <TabsTrigger value="saude">Saúde ({groupedTemplates.saude?.length || 0})</TabsTrigger>
          <TabsTrigger value="emagrecimento">
            Emagrecimento ({groupedTemplates.emagrecimento?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="hipertrofia">
            Hipertrofia ({groupedTemplates.hipertrofia?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="low_carb">
            Low Carb ({groupedTemplates.low_carb?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="clinico">Clínico ({groupedTemplates.clinico?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4 mt-6">
          {Object.entries(groupedTemplates).map(([category, categoryTemplates]) => (
            <div key={category} className="space-y-3">
              <h3 className="text-lg font-semibold capitalize flex items-center gap-2">
                {getCategoryIcon(category)}
                {categoryTemplates[0]?.category_label}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categoryTemplates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onSelect={onSelectTemplate}
                    getCategoryColor={getCategoryColor}
                  />
                ))}
              </div>
            </div>
          ))}
        </TabsContent>

        {['saude', 'emagrecimento', 'hipertrofia', 'low_carb', 'clinico'].map((category) => (
          <TabsContent key={category} value={category} className="space-y-4 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groupedTemplates[category]?.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onSelect={onSelectTemplate}
                  getCategoryColor={getCategoryColor}
                />
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

interface TemplateCardProps {
  template: Template;
  onSelect: (template: Template) => void;
  getCategoryColor: (category: string) => string;
}

function TemplateCard({ template, onSelect, getCategoryColor }: TemplateCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => onSelect(template)}>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{template.name}</CardTitle>
          <Badge className={getCategoryColor(template.category)} variant="outline">
            {template.category_label}
          </Badge>
        </div>
        <CardDescription className="line-clamp-2">{template.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="text-xs">
            {template.kcal_target} kcal
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {template.total_days} dias
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {template.total_meals} refeições
          </Badge>
          {template.is_marmita && (
            <Badge variant="default" className="text-xs">
              🍱 Marmita
            </Badge>
          )}
          {template.has_restrictions && (
            <Badge variant="default" className="text-xs">
              🥗 Restrições
            </Badge>
          )}
          {template.all_meals_have_images && (
            <Badge variant="default" className="text-xs">
              📸 Com imagens
            </Badge>
          )}
        </div>
        <Button className="w-full" size="sm">
          Selecionar Template
        </Button>
      </CardContent>
    </Card>
  );
}
