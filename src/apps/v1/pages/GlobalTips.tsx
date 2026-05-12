import { useEffect, useState } from "react";
import { useAuth } from "@v1/lib/auth";
import { supabase } from "@v1/integrations/supabase/client";
import DashboardLayout from "@v1/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@v1/components/ui/card";
import { Button } from "@v1/components/ui/button";
import { Input } from "@v1/components/ui/input";
import { Textarea } from "@v1/components/ui/textarea";
import { Label } from "@v1/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@v1/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@v1/components/ui/dialog";
import { Badge } from "@v1/components/ui/badge";
import { Switch } from "@v1/components/ui/switch";
import { ScrollArea } from "@v1/components/ui/scroll-area";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Lightbulb, Plus, Pencil, Trash2, Search, Filter, Sparkles, ChevronRight } from "lucide-react";

interface Tip {
  id: string;
  title: string;
  content: string;
  category: string;
  icon: string;
  is_published: boolean;
  created_at: string;
}

const categories = [
  { value: "crossfit", label: "CrossFit", icon: "🏋️", color: "from-red-500/20 to-orange-500/10", border: "border-red-500/30", text: "text-red-400" },
  { value: "musculacao", label: "Musculação", icon: "💪", color: "from-blue-500/20 to-cyan-500/10", border: "border-blue-500/30", text: "text-blue-400" },
  { value: "corrida", label: "Corrida", icon: "🏃", color: "from-green-500/20 to-emerald-500/10", border: "border-green-500/30", text: "text-green-400" },
  { value: "natacao", label: "Natação", icon: "🏊", color: "from-cyan-500/20 to-blue-500/10", border: "border-cyan-500/30", text: "text-cyan-400" },
  { value: "gestante", label: "Gestantes", icon: "🤰", color: "from-pink-500/20 to-rose-500/10", border: "border-pink-500/30", text: "text-pink-400" },
  { value: "lactante", label: "Lactantes", icon: "🤱", color: "from-purple-500/20 to-pink-500/10", border: "border-purple-500/30", text: "text-purple-400" },
  { value: "bariatrico", label: "Bariátricos", icon: "⚕️", color: "from-teal-500/20 to-green-500/10", border: "border-teal-500/30", text: "text-teal-400" },
  { value: "diabetes", label: "Diabetes", icon: "🩺", color: "from-amber-500/20 to-yellow-500/10", border: "border-amber-500/30", text: "text-amber-400" },
  { value: "vegetariano", label: "Vegetariano/Vegano", icon: "🌱", color: "from-lime-500/20 to-green-500/10", border: "border-lime-500/30", text: "text-lime-400" },
  { value: "idoso", label: "Idosos", icon: "👴", color: "from-slate-500/20 to-gray-500/10", border: "border-slate-500/30", text: "text-slate-400" },
  { value: "pediatrico", label: "Pediátrico", icon: "👶", color: "from-yellow-500/20 to-amber-500/10", border: "border-yellow-500/30", text: "text-yellow-400" },
  { value: "emagrecimento", label: "Emagrecimento", icon: "🔥", color: "from-orange-500/20 to-red-500/10", border: "border-orange-500/30", text: "text-orange-400" },
  { value: "hipertrofia", label: "Hipertrofia", icon: "🎯", color: "from-indigo-500/20 to-blue-500/10", border: "border-indigo-500/30", text: "text-indigo-400" },
  { value: "sono", label: "Sono & Recuperação", icon: "😴", color: "from-violet-500/20 to-purple-500/10", border: "border-violet-500/30", text: "text-violet-400" },
  { value: "hidratacao", label: "Hidratação", icon: "💧", color: "from-sky-500/20 to-blue-500/10", border: "border-sky-500/30", text: "text-sky-400" },
  { value: "intestinal", label: "Saúde Intestinal", icon: "🦠", color: "from-emerald-500/20 to-teal-500/10", border: "border-emerald-500/30", text: "text-emerald-400" },
  { value: "imunidade", label: "Imunidade", icon: "🛡️", color: "from-yellow-600/20 to-amber-500/10", border: "border-yellow-600/30", text: "text-yellow-500" },
  { value: "mindset", label: "Mindset & Bem-estar", icon: "🧠", color: "from-fuchsia-500/20 to-pink-500/10", border: "border-fuchsia-500/30", text: "text-fuchsia-400" },
  { value: "general", label: "Dicas Gerais", icon: "💡", color: "from-primary/20 to-primary/5", border: "border-primary/30", text: "text-primary" },
];

// Backward compat for old categories
const oldCategoryMap: Record<string, string> = {
  nutrition: "general",
  hydration: "hidratacao",
  exercise: "musculacao",
  sleep: "sono",
};

const getCategoryMeta = (cat: string) => {
  const mapped = oldCategoryMap[cat] || cat;
  return categories.find(c => c.value === mapped) || categories[categories.length - 1];
};

const emptyForm = { title: "", content: "", category: "crossfit", icon: "💡" };

// ──── Built-in Tips Library ────
const builtInTips: Record<string, { title: string; content: string }[]> = {
  crossfit: [
    { title: "Pré-treino de alta intensidade", content: "Consuma carboidratos de rápida absorção 30-60min antes do WOD. Banana com mel ou batata doce são ótimas opções para garantir energia nos metcons." },
    { title: "Recuperação pós-WOD", content: "Após treinos intensos, priorize proteína de rápida absorção (whey) com carboidrato para repor glicogênio. A janela de 30min pós-treino é crucial." },
    { title: "Hidratação no box", content: "Beba 500ml de água 2h antes e mantenha hidratação durante o treino. Em WODs longos, considere isotônico para repor eletrólitos." },
    { title: "Mobilidade e nutrição", content: "Alimentos anti-inflamatórios como açafrão, gengibre e ômega-3 ajudam na recuperação articular, essencial para movimentos olímpicos." },
  ],
  musculacao: [
    { title: "Timing de proteína", content: "Distribua 1.6-2.2g/kg de proteína ao longo do dia em 4-6 refeições para maximizar a síntese proteica muscular." },
    { title: "Carboidratos periféricos ao treino", content: "Concentre 40-60% dos carboidratos do dia nas refeições pré e pós-treino para melhor performance e recuperação." },
    { title: "Creatina: o suplemento essencial", content: "5g de creatina monohidratada por dia é o suplemento com mais evidência científica para ganho de força e massa muscular." },
    { title: "Sono e hipertrofia", content: "Durma 7-9h por noite. O GH (hormônio do crescimento) é liberado principalmente durante o sono profundo, fundamental para recuperação muscular." },
  ],
  corrida: [
    { title: "Carb loading para longas distâncias", content: "Para corridas acima de 90min, aumente carboidratos para 8-10g/kg nos 2-3 dias antes da prova para maximizar estoques de glicogênio." },
    { title: "Reposição durante corrida", content: "Em corridas acima de 60min, consuma 30-60g de carboidrato por hora através de géis, gomas ou bebidas esportivas." },
    { title: "Ferro para corredores", content: "Corredores têm maior risco de deficiência de ferro (hemólise do impacto). Monitore ferritina e inclua fontes como carnes vermelhas e leguminosas." },
    { title: "Recuperação pós-corrida", content: "Após treinos longos, consuma 1.2g/kg de carboidrato + 0.3g/kg de proteína na primeira hora para otimizar recuperação." },
  ],
  natacao: [
    { title: "Alimentação antes de nadar", content: "Faça uma refeição leve 2-3h antes do treino. Evite fibras e gorduras em excesso que podem causar desconforto na água." },
    { title: "Hidratação na piscina", content: "Mesmo na água você desidrata! Beba 200-300ml a cada 20min de treino. A desidratação reduz performance mesmo em 2%." },
    { title: "Ômega-3 para nadadores", content: "O ômega-3 reduz inflamação articular dos ombros, área muito exigida na natação. Consuma peixes gordos 2-3x/semana ou suplemente." },
    { title: "Cálcio e vitamina D", content: "Nadadores recebem menos sol. Suplemente vitamina D e garanta cálcio adequado para saúde óssea e performance muscular." },
  ],
  gestante: [
    { title: "Ácido fólico é prioridade", content: "Consuma 400-600mcg de ácido fólico diariamente, idealmente desde antes da concepção. Encontrado em folhas verdes escuras, feijão e suplementos." },
    { title: "Ferro na gestação", content: "A necessidade de ferro dobra na gravidez. Combine fontes de ferro com vitamina C para melhor absorção. Suplemente conforme orientação." },
    { title: "Cuidado com alimentos crus", content: "Evite peixes crus, ovos mal cozidos, queijos não pasteurizados e carnes mal passadas para prevenir toxoplasmose e listeriose." },
    { title: "DHA para o bebê", content: "O ômega-3 DHA é essencial para desenvolvimento cerebral do feto. Consuma peixes de água fria cozidos ou suplemente 200-300mg/dia." },
    { title: "Fracionamento das refeições", content: "Coma porções menores a cada 2-3h para reduzir náuseas, azia e manter glicemia estável. Evite longos períodos em jejum." },
  ],
  lactante: [
    { title: "Hidratação é fundamental", content: "Beba pelo menos 3L de água por dia durante a amamentação. A produção de leite depende diretamente da hidratação adequada." },
    { title: "Calorias extras necessárias", content: "Lactantes precisam de 300-500 calorias extras por dia. Priorize alimentos nutritivos e evite restrição calórica severa." },
    { title: "Alimentos galactagogos", content: "Aveia, feno-grego, funcho e gengibre podem ajudar a estimular a produção de leite. Inclua na alimentação diária." },
    { title: "Cálcio para a mãe", content: "O cálcio do leite materno vem das reservas da mãe. Garanta 1000mg/dia através de laticínios, vegetais verde-escuros e suplementação." },
  ],
  bariatrico: [
    { title: "Proteína em primeiro lugar", content: "Comece todas as refeições pela proteína. Objetivo mínimo de 60-80g/dia para prevenir perda de massa muscular pós-cirurgia." },
    { title: "Suplementação vitalícia", content: "Após bariátrica, a suplementação de vitaminas (B12, D, ferro, cálcio) é para a vida toda. Nunca pare sem orientação médica." },
    { title: "Mastigação consciente", content: "Mastigue cada garfada 20-30 vezes. Coma devagar em refeições de 20-30min. Isso previne dumping e desconforto gástrico." },
    { title: "Evite líquidos nas refeições", content: "Não beba 30min antes, durante e 30min após as refeições. Líquidos diluem o suco gástrico e causam desconforto no estômago reduzido." },
  ],
  diabetes: [
    { title: "Índice glicêmico importa", content: "Prefira alimentos de baixo IG: aveia, batata doce, leguminosas. Combine carboidratos com proteínas e fibras para reduzir picos glicêmicos." },
    { title: "Fibras são aliadas", content: "Consuma 25-30g de fibras por dia. As fibras solúveis (aveia, psyllium) retardam absorção de glicose e melhoram controle glicêmico." },
    { title: "Fracionamento é chave", content: "Faça 5-6 refeições menores ao longo do dia para manter glicemia estável. Evite grandes volumes em uma única refeição." },
    { title: "Canela e controle glicêmico", content: "Estudos mostram que 1-3g de canela por dia pode ajudar a melhorar sensibilidade à insulina. Adicione em frutas, iogurtes e vitaminas." },
  ],
  vegetariano: [
    { title: "Combine proteínas vegetais", content: "Arroz + feijão = proteína completa. Combine cereais com leguminosas ao longo do dia para obter todos os aminoácidos essenciais." },
    { title: "B12 é obrigatória", content: "Veganos DEVEM suplementar vitamina B12. Não há fonte vegetal confiável. Deficiência causa anemia e danos neurológicos irreversíveis." },
    { title: "Ferro vegetal e vitamina C", content: "O ferro de fontes vegetais é menos absorvido. Sempre combine com vitamina C (limão, laranja) e evite café/chá nas refeições." },
    { title: "Ômega-3 de fonte vegetal", content: "Linhaça, chia e nozes fornecem ALA, mas a conversão em DHA é baixa. Considere suplemento de DHA de algas marinhas." },
  ],
  idoso: [
    { title: "Proteína para prevenir sarcopenia", content: "Idosos precisam de 1.2-1.5g/kg de proteína por dia para prevenir perda muscular. Distribua em todas as refeições, especialmente no café da manhã." },
    { title: "Vitamina D e cálcio", content: "Suplemente vitamina D (800-1000 UI/dia) e garanta 1200mg de cálcio para prevenir osteoporose e quedas." },
    { title: "Hidratação no idoso", content: "Idosos têm menor sensação de sede. Estabeleça horários fixos para beber água: ao acordar, antes de cada refeição e ao dormir." },
    { title: "Fibras e saúde intestinal", content: "O trânsito intestinal lento é comum na terceira idade. Aumente fibras gradualmente e mantenha boa hidratação para regularizar." },
  ],
  pediatrico: [
    { title: "Introdução alimentar", content: "A partir dos 6 meses, introduza alimentos variados respeitando sinais de prontidão. Ofereça texturas e sabores diversos sem forçar." },
    { title: "Lancheira saudável", content: "Monte lancheiras com 1 fruta + 1 carboidrato integral + 1 proteína. Evite industrializados, sucos de caixa e biscoitos recheados." },
    { title: "Hidratação infantil", content: "Crianças de 1-3 anos: ~1L/dia. De 4-8 anos: ~1.2L/dia. Prefira sempre água; sucos naturais limitados a 150ml/dia." },
    { title: "Evite restrição precoce", content: "Nunca coloque crianças em dietas restritivas sem acompanhamento. Foque em qualidade alimentar e atividade física, não em calorias." },
  ],
  emagrecimento: [
    { title: "Déficit calórico moderado", content: "Para emagrecer de forma sustentável, mantenha déficit de 300-500 kcal/dia. Déficits maiores causam perda muscular e efeito rebote." },
    { title: "Proteína preserva músculo", content: "Em fase de emagrecimento, aumente proteína para 1.6-2.0g/kg. Isso preserva massa magra e aumenta saciedade." },
    { title: "Sono e emagrecimento", content: "Dormir menos de 6h aumenta grelina (fome) e cortisol (armazena gordura). Priorize 7-8h de sono de qualidade." },
    { title: "Não pule refeições", content: "Pular refeições reduz metabolismo e aumenta compulsão na refeição seguinte. Mantenha regularidade alimentar." },
  ],
  hipertrofia: [
    { title: "Superávit calórico controlado", content: "Para ganhar massa, consuma 300-500 kcal acima do TDEE. Superávits maiores geram ganho de gordura desnecessário." },
    { title: "Leucina: gatilho anabólico", content: "Cada refeição deve ter 2.5-3g de leucina para ativar mTOR. Fontes: whey, ovos, frango, carne bovina." },
    { title: "Carboidrato é combustível", content: "Em fase de hipertrofia, consuma 4-7g/kg de carboidrato. Glicogênio muscular adequado permite treinos mais intensos e volumosos." },
    { title: "Consistência supera perfeição", content: "80% de adesão ao plano consistentemente é melhor que 100% por uma semana e depois abandonar. Foque em hábitos sustentáveis." },
  ],
  sono: [
    { title: "Melatonina natural", content: "Consuma alimentos ricos em triptofano à noite: banana, leite morno, aveia, castanhas. O triptofano é precursor de serotonina e melatonina." },
    { title: "Evite estimulantes à noite", content: "Pare a cafeína 6-8h antes de dormir. Café, chá verde, chocolate e pré-treinos afetam a qualidade do sono mesmo sem impedir de dormir." },
    { title: "Magnésio para relaxar", content: "O magnésio quelato (200-400mg à noite) melhora qualidade do sono e reduz cãibras. Encontrado em castanhas, sementes e folhas verdes." },
    { title: "Jantar leve", content: "Refeições pesadas antes de dormir prejudicam o sono. Jante pelo menos 2h antes e prefira alimentos leves e de fácil digestão." },
  ],
  hidratacao: [
    { title: "Fórmula da hidratação", content: "Calcule: peso (kg) × 35ml = quantidade mínima de água/dia. Em dias quentes ou de treino, aumente 500-1000ml." },
    { title: "Água com sabor natural", content: "Adicione rodelas de limão, pepino, hortelã ou frutas para dar sabor e facilitar o consumo. Zero calorias e muito refrescante!" },
    { title: "Sinais de desidratação", content: "Urina escura, dor de cabeça, fadiga e tonturas são sinais. Monitore a cor da urina: deve ser amarelo claro transparente." },
    { title: "Eletrólitos no calor", content: "Em dias muito quentes ou treinos longos, adicione uma pitada de sal e limão na água para repor eletrólitos perdidos no suor." },
  ],
  intestinal: [
    { title: "Probióticos diários", content: "Consuma alimentos fermentados: iogurte natural, kefir, kombucha, chucrute. Eles mantêm a flora intestinal saudável e melhoram imunidade." },
    { title: "Prebióticos alimentam as bactérias boas", content: "Alho, cebola, banana verde, aveia e aspargos são ricos em fibras prebióticas que nutrem as bactérias benéficas do intestino." },
    { title: "Fibras e água juntos", content: "Aumentar fibras sem aumentar água causa constipação. Para cada 5g de fibra extra, adicione 250ml de água ao dia." },
    { title: "Mastigar bem", content: "A digestão começa na boca. Mastigar 20-30 vezes por garfada melhora a digestão, absorção de nutrientes e reduz gases e inchaço." },
  ],
  imunidade: [
    { title: "Vitamina C diária", content: "Consuma 75-90mg de vitamina C por dia. Acerola, goiaba, kiwi, morango e brócolis são fontes excelentes e superiores à laranja." },
    { title: "Zinco para defesa", content: "O zinco é essencial para o sistema imune. Fontes: ostras, carne bovina, sementes de abóbora, castanha de caju. 8-11mg/dia." },
    { title: "Glutamina e imunidade", content: "A glutamina é combustível para células de defesa. Em períodos de treino intenso, suplementar 5-10g/dia pode prevenir infecções." },
    { title: "Sono e sistema imune", content: "Dormir menos de 7h reduz eficácia de vacinas em até 50% e aumenta susceptibilidade a resfriados. Priorize o descanso!" },
  ],
  mindset: [
    { title: "Comer com atenção plena", content: "Desligue telas durante refeições. Preste atenção nos sabores, texturas e sinais de saciedade. Mindful eating reduz compulsão alimentar." },
    { title: "Progresso, não perfeição", content: "Não existe dieta perfeita. Uma alimentação 80% boa de forma consistente supera qualquer dieta 100% seguida por poucos dias." },
    { title: "Relação com a balança", content: "O peso flutua 1-2kg por dia naturalmente (água, sódio, hormônios). Avalie tendências semanais, não variações diárias." },
    { title: "Autocompaixão nutricional", content: "Saiu do plano? Não se culpe. A próxima refeição é uma nova oportunidade. Culpa gera ciclo de restrição e compulsão." },
  ],
  general: [
    { title: "Leia rótulos de alimentos", content: "Verifique lista de ingredientes (ordem = quantidade). Evite ultra-processados com mais de 5 ingredientes ou nomes que você não reconhece." },
    { title: "Planejamento semanal", content: "Separe 1h no domingo para planejar refeições da semana. Isso economiza dinheiro, tempo e melhora qualidade alimentar drasticamente." },
    { title: "Regra do prato saudável", content: "Monte seu prato: 50% vegetais, 25% proteína, 25% carboidrato. Adicione uma porção de gordura boa. Simples e eficaz!" },
    { title: "Variedade é nutrição", content: "Coma pelo menos 30 alimentos diferentes por semana. Variedade garante micronutrientes diversos e flora intestinal saudável." },
  ],
};

// ──── NUTRITIONIST: Create/manage tips ────
function NutritionistTips() {
  const { user } = useAuth();
  const [tips, setTips] = useState<Tip[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Tip | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const fetchTips = async () => {
    if (!user) return;
    const { data } = await supabase.from("global_tips").select("*").eq("nutritionist_id", user.id).order("created_at", { ascending: false });
    setTips(data || []);
  };

  useEffect(() => { fetchTips(); }, [user]);

  const openNew = (cat?: string) => {
    setEditing(null);
    setForm({ ...emptyForm, category: cat || "crossfit" });
    setDialogOpen(true);
  };
  const openEdit = (t: Tip) => { setEditing(t); setForm({ title: t.title, content: t.content, category: t.category, icon: t.icon }); setDialogOpen(true); };

  const handleSave = async () => {
    if (!user || !form.title.trim()) return;
    const icon = getCategoryMeta(form.category).icon;
    const payload = { ...form, icon, nutritionist_id: user.id };

    if (editing) {
      const { error } = await supabase.from("global_tips").update(payload).eq("id", editing.id);
      if (error) toast.error(error.message); else toast.success("Dica atualizada!");
    } else {
      const { error } = await supabase.from("global_tips").insert(payload);
      if (error) toast.error(error.message); else toast.success("Dica publicada!");
    }
    setDialogOpen(false); fetchTips();
  };

  const togglePublish = async (id: string, current: boolean) => {
    await supabase.from("global_tips").update({ is_published: !current }).eq("id", id);
    fetchTips();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remover esta dica?")) return;
    await supabase.from("global_tips").delete().eq("id", id);
    toast.success("Dica removida!"); fetchTips();
  };

  const filteredTips = tips.filter(t => {
    if (selectedCategory && t.category !== selectedCategory) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase()) && !t.content.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <Lightbulb className="w-6 h-6 text-warning" /> Biblioteca de Dicas
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie dicas por categoria para seus pacientes</p>
        </div>
        <Button onClick={() => openNew(selectedCategory || undefined)} className="gradient-primary gap-2 shadow-glow">
          <Plus className="w-4 h-4" /> Nova Dica
        </Button>
      </div>

      {/* Category Carousel */}
      <ScrollArea className="w-full">
        <div className="flex gap-2 pb-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-medium transition-all border ${
              !selectedCategory ? "bg-primary text-primary-foreground border-primary shadow-glow" : "bg-card border-border hover:border-primary/30"
            }`}
          >
            Todas ({tips.length})
          </button>
          {categories.map(cat => {
            const count = tips.filter(t => t.category === cat.value).length;
            return (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(selectedCategory === cat.value ? null : cat.value)}
                className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-medium transition-all border flex items-center gap-1.5 ${
                  selectedCategory === cat.value
                    ? `bg-gradient-to-r ${cat.color} ${cat.border} ${cat.text} shadow-sm`
                    : "bg-card border-border hover:border-primary/30"
                }`}
              >
                <span>{cat.icon}</span> {cat.label} {count > 0 && <Badge variant="secondary" className="text-[9px] px-1.5 py-0">{count}</Badge>}
              </button>
            );
          })}
        </div>
      </ScrollArea>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar dicas..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>

      {/* Built-in suggestions when a category is selected and has few custom tips */}
      {selectedCategory && tips.filter(t => t.category === selectedCategory).length === 0 && builtInTips[selectedCategory] && (
        <Card className="glass border-dashed border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" /> Sugestões Pré-prontas — {getCategoryMeta(selectedCategory).label}
            </CardTitle>
            <p className="text-xs text-muted-foreground">Clique para adicionar estas dicas à sua biblioteca</p>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {builtInTips[selectedCategory].map((tip, i) => (
              <button
                key={i}
                onClick={async () => {
                  if (!user) return;
                  const meta = getCategoryMeta(selectedCategory);
                  await supabase.from("global_tips").insert({
                    title: tip.title, content: tip.content, category: selectedCategory,
                    icon: meta.icon, nutritionist_id: user.id, is_published: true,
                  });
                  toast.success(`"${tip.title}" adicionada!`);
                  fetchTips();
                }}
                className="text-left glass rounded-lg p-3 hover:border-primary/30 border border-transparent transition-all group"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{getCategoryMeta(selectedCategory).icon}</span>
                  <span className="text-xs font-medium group-hover:text-primary transition-colors">{tip.title}</span>
                  <Plus className="w-3 h-3 ml-auto text-muted-foreground group-hover:text-primary" />
                </div>
                <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{tip.content}</p>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Tips Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AnimatePresence mode="popLayout">
          {filteredTips.map(tip => {
            const meta = getCategoryMeta(tip.category);
            return (
              <motion.div key={tip.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}>
                <Card className={`glass border ${meta.border} h-full hover:shadow-md transition-all`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-2xl flex-shrink-0">{meta.icon}</span>
                        <div className="min-w-0">
                          <h3 className="font-medium text-sm truncate">{tip.title}</h3>
                          <Badge variant="outline" className={`text-[10px] mt-0.5 ${meta.text}`}>{meta.label}</Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Switch checked={tip.is_published} onCheckedChange={() => togglePublish(tip.id, tip.is_published)} />
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(tip)}><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(tip.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{tip.content}</p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {filteredTips.length === 0 && !selectedCategory && (
        <Card className="glass"><CardContent className="py-12 text-center">
          <Lightbulb className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Nenhuma dica criada ainda.</p>
          <p className="text-xs text-muted-foreground mt-1">Selecione uma categoria acima para ver sugestões pré-prontas!</p>
        </CardContent></Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">{editing ? "Editar Dica" : "Nova Dica"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Título</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Ex: Beba água ao acordar" /></div>
            <div><Label>Categoria</Label>
              <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <ScrollArea className="h-60">
                    {categories.map(c => <SelectItem key={c.value} value={c.value}>{c.icon} {c.label}</SelectItem>)}
                  </ScrollArea>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Conteúdo</Label><Textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} rows={4} placeholder="Escreva a dica completa..." /></div>
            <Button onClick={handleSave} className="w-full gradient-primary" disabled={!form.title.trim() || !form.content.trim()}>
              {editing ? "Atualizar" : "Publicar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ──── PATIENT: View tips by category ────
function PatientTips() {
  const [tips, setTips] = useState<Tip[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    supabase.from("global_tips").select("*").eq("is_published", true).order("created_at", { ascending: false })
      .then(({ data }) => setTips(data || []));
  }, []);

  const tipCategories = [...new Set(tips.map(t => t.category))];
  const filteredTips = tips.filter(t => {
    if (selectedCategory && t.category !== selectedCategory) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase()) && !t.content.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold flex items-center gap-2">
          <Lightbulb className="w-6 h-6 text-warning" /> Dicas do Nutricionista
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Dicas personalizadas para o seu perfil e objetivos</p>
      </div>

      {/* Category filter */}
      {tipCategories.length > 1 && (
        <ScrollArea className="w-full">
          <div className="flex gap-2 pb-2">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-xs font-medium transition-all border ${
                !selectedCategory ? "bg-primary text-primary-foreground border-primary shadow-glow" : "bg-card border-border hover:border-primary/30"
              }`}
            >
              Todas
            </button>
            {tipCategories.map(cat => {
              const meta = getCategoryMeta(cat);
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                  className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-xs font-medium transition-all border flex items-center gap-1.5 ${
                    selectedCategory === cat
                      ? `bg-gradient-to-r ${meta.color} ${meta.border} ${meta.text}`
                      : "bg-card border-border hover:border-primary/30"
                  }`}
                >
                  <span>{meta.icon}</span> {meta.label}
                </button>
              );
            })}
          </div>
        </ScrollArea>
      )}

      {/* Search */}
      {tips.length > 4 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar dicas..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
      )}

      {filteredTips.length === 0 ? (
        <Card className="glass"><CardContent className="py-12 text-center">
          <Lightbulb className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Nenhuma dica publicada ainda.</p>
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTips.map((tip, i) => {
            const meta = getCategoryMeta(tip.category);
            return (
              <motion.div key={tip.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <Card className={`glass border ${meta.border} h-full hover:shadow-md hover:scale-[1.01] transition-all`}>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${meta.color} flex items-center justify-center`}>
                        <span className="text-xl">{meta.icon}</span>
                      </div>
                      <div>
                        <h3 className="font-display font-semibold text-sm">{tip.title}</h3>
                        <Badge variant="outline" className={`text-[10px] ${meta.text}`}>{meta.label}</Badge>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{tip.content}</p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function GlobalTips() {
  const { isNutritionist } = useAuth();
  return <DashboardLayout>{isNutritionist ? <NutritionistTips /> : <PatientTips />}</DashboardLayout>;
}
