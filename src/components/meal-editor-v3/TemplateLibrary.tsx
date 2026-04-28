import React from 'react';
import { useMealEditorV3Store } from '@/hooks/meal-editor-v3/useMealEditorV3Store';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sparkles, Star, Package, Flame, Dumbbell, Salad, HeartPulse, ChevronRight, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

export const TemplateLibrary: React.FC = () => {
  const { templates, applyTemplate, fetchTemplates } = useMealEditorV3Store();

  React.useEffect(() => {
    fetchTemplates();
  }, []);

  const categories = ['Emagrecimento', 'Hipertrofia', 'Low Carb', 'Clínico', 'Marmitas'];

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          Biblioteca Premium
        </h2>
        <Badge variant="outline" className="text-[9px] font-black bg-primary/5 text-primary border-primary/20">FITJOURNEY ENGINE</Badge>
      </div>

      <Tabs defaultValue="Emagrecimento" className="flex-1 flex flex-col">
        <TabsList className="bg-muted/30 p-1 h-auto grid grid-cols-3 gap-1">
          {categories.slice(0, 3).map(cat => (
            <TabsTrigger key={cat} value={cat} className="text-[9px] font-bold py-1.5">{cat}</TabsTrigger>
          ))}
        </TabsList>
        <div className="grid grid-cols-2 gap-1 mt-1">
            {categories.slice(3).map(cat => (
              <TabsTrigger key={cat} value={cat} className="text-[9px] font-bold py-1.5 bg-muted/30 data-[state=active]:bg-background">{cat}</TabsTrigger>
            ))}
        </div>

        <ScrollArea className="flex-1 mt-4">
          <div className="space-y-3 pr-4">
            {categories.map(cat => (
              <TabsContent key={cat} value={cat} className="m-0 space-y-3">
                {templates.filter(t => t.category === cat).map(template => (
                  <Card key={template.id} className="p-4 group hover:border-primary/50 transition-all cursor-pointer relative overflow-hidden bg-card/50">
                    {template.is_premium && (
                      <div className="absolute top-0 right-0 p-1 bg-amber-500 text-white rounded-bl-lg">
                        <Lock className="w-2.5 h-2.5" />
                      </div>
                    )}
                    <div className="flex flex-col gap-2">
                      <div className="flex items-start justify-between">
                        <h3 className="font-bold text-xs">{template.name}</h3>
                      </div>
                      <p className="text-[10px] text-muted-foreground leading-tight">{template.description}</p>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => applyTemplate(template)}
                        className="w-full h-8 text-[10px] font-bold mt-2 group-hover:bg-primary group-hover:text-white transition-all"
                      >
                        APLICAR TEMPLATE <ChevronRight className="w-3 h-3 ml-1" />
                      </Button>
                    </div>
                  </Card>
                ))}
                {templates.filter(t => t.category === cat).length === 0 && (
                  <div className="py-10 text-center opacity-30">
                    <Package className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-[10px] font-medium">Em breve nesta categoria</p>
                  </div>
                )}
              </TabsContent>
            ))}
          </div>
        </ScrollArea>
      </Tabs>
    </div>
  );
};
