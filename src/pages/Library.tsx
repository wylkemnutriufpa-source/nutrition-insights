import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Search, Apple, Droplets, Dumbbell, Brain, Heart, Leaf } from "lucide-react";

interface Article {
  id: string;
  title: string;
  summary: string;
  category: string;
  icon: typeof Apple;
  readTime: string;
  content: string;
}

const ARTICLES: Article[] = [
  {
    id: "1",
    title: "A Importância das Proteínas",
    summary: "Entenda por que as proteínas são fundamentais para a saúde e como consumir a quantidade ideal.",
    category: "Macronutrientes",
    icon: Dumbbell,
    readTime: "4 min",
    content: "As proteínas são macronutrientes essenciais formados por aminoácidos. Elas participam da construção e reparação muscular, produção de enzimas e hormônios, e manutenção do sistema imunológico. A recomendação geral é de 0,8 a 1,2g por kg de peso corporal para adultos sedentários, podendo chegar a 1,6-2,2g/kg para praticantes de atividade física. Fontes de qualidade incluem: ovos, peixes, frango, leguminosas, tofu e laticínios.",
  },
  {
    id: "2",
    title: "Hidratação: Mais que Apenas Água",
    summary: "Descubra como manter-se hidratado e os sinais de desidratação.",
    category: "Hidratação",
    icon: Droplets,
    readTime: "3 min",
    content: "A hidratação adequada é vital para todas as funções do corpo. A recomendação geral é de 35ml por kg de peso corporal por dia, ajustada para clima e atividade física. Além da água pura, chás sem açúcar, água de coco e frutas com alto teor de água (melancia, pepino, morango) contribuem para a hidratação. Sinais de desidratação: urina escura, boca seca, dor de cabeça, fadiga e tontura.",
  },
  {
    id: "3",
    title: "Fibras Alimentares e Saúde Intestinal",
    summary: "Como as fibras ajudam na digestão e na prevenção de doenças.",
    category: "Nutrientes",
    icon: Leaf,
    readTime: "5 min",
    content: "As fibras são componentes dos alimentos vegetais que não são digeridos pelo corpo. Existem dois tipos: solúveis (aveia, frutas, leguminosas) que ajudam a controlar colesterol e glicemia, e insolúveis (cereais integrais, vegetais) que melhoram o trânsito intestinal. A recomendação é de 25-35g por dia. Aumente gradualmente e beba bastante água para evitar desconforto.",
  },
  {
    id: "4",
    title: "Alimentação e Saúde Mental",
    summary: "A relação entre o que comemos e como nos sentimos.",
    category: "Bem-estar",
    icon: Brain,
    readTime: "4 min",
    content: "A alimentação tem impacto direto na saúde mental. O intestino produz 95% da serotonina do corpo, por isso é chamado de 'segundo cérebro'. Alimentos ricos em triptofano (banana, aveia, castanhas), ômega-3 (peixes, linhaça), e magnésio (espinafre, abacate) contribuem para o bem-estar mental. Evite ultraprocessados, excesso de açúcar e álcool, que estão associados a maior risco de ansiedade e depressão.",
  },
  {
    id: "5",
    title: "Guia do Prato Saudável",
    summary: "Monte suas refeições de forma equilibrada seguindo o método do prato.",
    category: "Planejamento",
    icon: Apple,
    readTime: "3 min",
    content: "O método do prato saudável é simples: 50% de vegetais e legumes (variedade de cores), 25% de proteína (animal ou vegetal), e 25% de carboidratos complexos (arroz integral, batata-doce, quinoa). Adicione uma porção de gordura boa (azeite, abacate, castanhas) e fruta de sobremesa. Este equilíbrio garante saciedade, energia sustentada e todos os micronutrientes essenciais.",
  },
  {
    id: "6",
    title: "Mitos e Verdades sobre Dietas",
    summary: "Desvende os principais mitos sobre alimentação e emagrecimento.",
    category: "Educação",
    icon: Heart,
    readTime: "5 min",
    content: "MITO: Carboidrato engorda. VERDADE: O excesso calórico de qualquer macronutriente causa ganho de peso. MITO: Comer à noite engorda mais. VERDADE: O total calórico diário é o que importa, não o horário. MITO: Glúten faz mal para todos. VERDADE: Apenas celíacos e sensíveis ao glúten precisam evitá-lo. MITO: Detox líquido funciona. VERDADE: Seu fígado e rins já fazem desintoxicação naturalmente. Foque em uma alimentação variada e equilibrada.",
  },
];

const CATEGORIES = ["Todos", ...new Set(ARTICLES.map((a) => a.category))];

export default function Library() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todos");
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  const filtered = ARTICLES.filter((a) => {
    const matchSearch = a.title.toLowerCase().includes(search.toLowerCase()) || a.summary.toLowerCase().includes(search.toLowerCase());
    const matchCategory = category === "Todos" || a.category === category;
    return matchSearch && matchCategory;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
            <BookOpen className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold">Biblioteca</h1>
            <p className="text-sm text-muted-foreground">Recursos educacionais sobre nutrição</p>
          </div>
        </div>

        {selectedArticle ? (
          <Card className="glass shadow-card">
            <CardHeader>
              <button onClick={() => setSelectedArticle(null)} className="text-sm text-primary hover:underline mb-2 text-left">
                ← Voltar
              </button>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary">{selectedArticle.category}</Badge>
                <span className="text-xs text-muted-foreground">{selectedArticle.readTime} de leitura</span>
              </div>
              <CardTitle className="font-display text-xl">{selectedArticle.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-line">{selectedArticle.content}</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar artigos..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex gap-2 flex-wrap">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                    category === c
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filtered.map((article) => (
                <Card
                  key={article.id}
                  className="glass shadow-card cursor-pointer hover:shadow-glow transition-shadow"
                  onClick={() => setSelectedArticle(article)}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <article.icon className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">{article.category}</Badge>
                          <span className="text-xs text-muted-foreground">{article.readTime}</span>
                        </div>
                        <h3 className="font-display font-semibold text-sm mb-1">{article.title}</h3>
                        <p className="text-xs text-muted-foreground line-clamp-2">{article.summary}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filtered.length === 0 && (
              <div className="text-center py-12">
                <BookOpen className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Nenhum artigo encontrado</p>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
