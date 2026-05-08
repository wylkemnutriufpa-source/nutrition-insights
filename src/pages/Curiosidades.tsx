import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Sparkles, ChevronLeft, Sun, Bug, Droplets, Brain, Heart, Apple, Dumbbell, Leaf, Moon, Eye, Bone, Shield, Baby, Flame, Clock, Pill, Wind } from "lucide-react";

interface Curiosidade {
  id: string;
  title: string;
  question: string;
  answer: string;
  category: string;
  icon: typeof Sun;
  emoji: string;
}

const CURIOSIDADES: Curiosidade[] = [
  {
    id: "1", title: "Tomar Sol Todo Dia", question: "Por que devo tomar sol todos os dias?",
    answer: "A exposição solar de 15-20 minutos por dia estimula a produção de vitamina D, essencial para absorção de cálcio, saúde óssea, imunidade e regulação do humor. A falta de vitamina D está associada a osteoporose, depressão, fadiga crônica e maior risco de infecções. Prefira o sol da manhã (antes das 10h) ou final da tarde (após 16h).",
    category: "Saúde Geral", icon: Sun, emoji: "☀️"
  },
  {
    id: "2", title: "Desparasitar Regularmente", question: "Por que devo desparasitar?",
    answer: "Vermes intestinais são mais comuns do que se imagina e podem causar anemia, desnutrição, inchaço abdominal, fadiga e até comprometer a absorção de nutrientes. A OMS recomenda desparasitação periódica (a cada 6-12 meses) especialmente em regiões tropicais. Consulte seu médico para o vermífugo adequado.",
    category: "Prevenção", icon: Bug, emoji: "🪱"
  },
  {
    id: "3", title: "Beber Água ao Acordar", question: "Por que devo beber água logo ao acordar?",
    answer: "Durante o sono, ficamos 6-8 horas sem hidratação. Beber água ao acordar reidrata o corpo, ativa o metabolismo em até 24%, ajuda a eliminar toxinas acumuladas e melhora a função cerebral. Comece com 1-2 copos de água em temperatura ambiente para melhores resultados.",
    category: "Hidratação", icon: Droplets, emoji: "💧"
  },
  {
    id: "4", title: "Dormir 7-9 Horas", question: "Por que o sono é tão importante?",
    answer: "Durante o sono profundo, o corpo libera hormônio do crescimento (GH), repara tecidos musculares, consolida memórias e regula hormônios da fome (leptina e grelina). Dormir menos de 6 horas aumenta em 48% o risco de doenças cardíacas, favorece ganho de peso e prejudica a imunidade.",
    category: "Sono", icon: Moon, emoji: "🌙"
  },
  {
    id: "5", title: "Mastigar Devagar", question: "Por que devo mastigar mais devagar?",
    answer: "A mastigação lenta melhora a digestão, pois as enzimas da saliva começam a quebrar os alimentos na boca. Estudos mostram que mastigar cada garfada 20-30 vezes reduz a ingestão calórica em até 15%, aumenta a saciedade e diminui inchaço e gases após as refeições.",
    category: "Digestão", icon: Apple, emoji: "🍎"
  },
  {
    id: "6", title: "Vitamina D e Imunidade", question: "Como a vitamina D afeta minha imunidade?",
    answer: "A vitamina D ativa células T do sistema imunológico que combatem infecções. Níveis abaixo de 30 ng/mL estão associados a maior frequência de gripes, resfriados e infecções. Além do sol, fontes alimentares incluem peixes gordurosos (salmão, sardinha), gema de ovo e cogumelos expostos ao sol.",
    category: "Imunidade", icon: Shield, emoji: "🛡️"
  },
  {
    id: "7", title: "Estresse e Cortisol", question: "O que o estresse faz com meu corpo?",
    answer: "O estresse crônico eleva o cortisol, que aumenta o armazenamento de gordura abdominal, prejudica o sono, enfraquece a imunidade, causa compulsão alimentar e acelera o envelhecimento celular. Técnicas como respiração profunda (4-7-8), meditação e exercício físico regular ajudam a reduzir o cortisol.",
    category: "Bem-estar", icon: Brain, emoji: "🧠"
  },
  {
    id: "8", title: "Exercício e Humor", question: "Por que me sinto bem após exercícios?",
    answer: "O exercício físico libera endorfinas (analgésicos naturais), serotonina (hormônio da felicidade) e BDNF (fator de crescimento neural). Apenas 30 minutos de caminhada já são suficientes para reduzir ansiedade em 20% e melhorar o humor por até 12 horas. O efeito é comparável a antidepressivos leves.",
    category: "Exercício", icon: Dumbbell, emoji: "💪"
  },
  {
    id: "9", title: "Açúcar Escondido", question: "Onde está o açúcar que não vejo?",
    answer: "Um copo de suco de caixa pode ter até 25g de açúcar (6 colheres de chá!). Molhos prontos, pães industrializados, iogurtes 'light', barras de cereal e até ketchup são fontes ocultas. Leia os rótulos: açúcar aparece como sacarose, xarope de glicose, maltodextrina, dextrose e frutose.",
    category: "Alimentação", icon: Eye, emoji: "👁️"
  },
  {
    id: "10", title: "Fibras e Saciedade", question: "Como as fibras me ajudam a comer menos?",
    answer: "As fibras solúveis formam um gel no estômago que retarda a digestão e prolonga a saciedade. Consumir 25-35g de fibras por dia reduz a ingestão calórica em até 10%. Fontes ricas: aveia, chia, linhaça, feijão, lentilha, maçã com casca, brócolis e batata-doce.",
    category: "Nutrição", icon: Leaf, emoji: "🥬"
  },
  {
    id: "11", title: "Intestino: Segundo Cérebro", question: "Por que chamam o intestino de segundo cérebro?",
    answer: "O intestino possui mais de 100 milhões de neurônios e produz 95% da serotonina do corpo. A microbiota intestinal influencia diretamente humor, ansiedade, imunidade e até preferências alimentares. Alimentos fermentados (iogurte natural, kefir, kombucha) e fibras prebióticas alimentam as bactérias benéficas.",
    category: "Digestão", icon: Brain, emoji: "🦠"
  },
  {
    id: "12", title: "Proteína no Café da Manhã", question: "Por que devo comer proteína de manhã?",
    answer: "Consumir 20-30g de proteína no café da manhã estabiliza a glicemia, reduz picos de fome ao longo do dia e aumenta a termogênese (queima calórica da digestão) em até 30%. Opções práticas: ovos, iogurte grego, ricota, whey ou pasta de amendoim com pão integral.",
    category: "Nutrição", icon: Flame, emoji: "🔥"
  },
  {
    id: "13", title: "Cálcio Além do Leite", question: "Onde encontro cálcio se não bebo leite?",
    answer: "Alternativas ricas em cálcio: brócolis (47mg/100g), couve (150mg/100g), sardinha em lata (382mg/100g), tofu firme (350mg/100g), amêndoas (264mg/100g), sementes de gergelim (975mg/100g) e bebidas vegetais fortificadas. A vitamina D e o magnésio são essenciais para a absorção do cálcio.",
    category: "Nutrição", icon: Bone, emoji: "🦴"
  },
  {
    id: "14", title: "Jejum Intermitente", question: "O jejum intermitente funciona para todos?",
    answer: "O jejum intermitente pode melhorar sensibilidade à insulina, autofagia celular e controle de peso, mas NÃO é indicado para gestantes, lactantes, diabéticos tipo 1, pessoas com histórico de transtornos alimentares ou menores de 18 anos. Sempre inicie com acompanhamento profissional.",
    category: "Alimentação", icon: Clock, emoji: "⏰"
  },
  {
    id: "15", title: "Magnésio: Mineral Esquecido", question: "Por que o magnésio é tão importante?",
    answer: "O magnésio participa de mais de 300 reações enzimáticas: relaxamento muscular, produção de energia, regulação do sono e controle do estresse. A deficiência causa câimbras, insônia, ansiedade e fadiga. Fontes: chocolate amargo 70%+, castanhas, espinafre, banana e sementes de abóbora.",
    category: "Suplementação", icon: Pill, emoji: "💊"
  },
  {
    id: "16", title: "Respiração e Ansiedade", question: "Como a respiração pode reduzir minha ansiedade?",
    answer: "A técnica 4-7-8 (inspire por 4s, segure por 7s, expire por 8s) ativa o sistema nervoso parassimpático, reduzindo batimentos cardíacos e cortisol em minutos. Praticar 3-4 ciclos antes de dormir melhora a qualidade do sono. A respiração diafragmática também reduz a pressão arterial.",
    category: "Bem-estar", icon: Wind, emoji: "🌬️"
  },
  {
    id: "17", title: "Ômega-3 e Inflamação", question: "Por que ômega-3 é anti-inflamatório?",
    answer: "EPA e DHA (ômega-3) reduzem a produção de citocinas inflamatórias e prostaglandinas. Consumir 2-3 porções de peixes gordurosos por semana (salmão, sardinha, atum) reduz inflamação sistêmica em até 30%. Alternativas veganas: chia, linhaça e nozes (fornecem ALA, precursor do EPA/DHA).",
    category: "Nutrição", icon: Heart, emoji: "❤️"
  },
  {
    id: "18", title: "Álcool e Metabolismo", question: "Como o álcool afeta meu metabolismo?",
    answer: "O álcool é metabolizado como prioridade pelo fígado, pausando a queima de gordura. Uma taça de vinho (130 cal) ou uma cerveja (150 cal) pode interromper a lipólise por até 12 horas. Além disso, o álcool desidrata, prejudica o sono REM, aumenta o cortisol e estimula o apetite.",
    category: "Saúde Geral", icon: Flame, emoji: "🍷"
  },
  {
    id: "19", title: "Probióticos vs Prebióticos", question: "Qual a diferença entre probióticos e prebióticos?",
    answer: "Probióticos são bactérias benéficas vivas (iogurte, kefir, kombucha, chucrute). Prebióticos são fibras que ALIMENTAM essas bactérias (alho, cebola, banana verde, aveia, aspargos). Para uma microbiota saudável, você precisa dos dois! O ideal é consumir ambos diariamente.",
    category: "Digestão", icon: Leaf, emoji: "🧬"
  },
  {
    id: "20", title: "Telas Antes de Dormir", question: "Por que devo evitar telas antes de dormir?",
    answer: "A luz azul de celulares e computadores suprime a produção de melatonina em até 50%, atrasando o início do sono em 30-60 minutos. Isso prejudica a qualidade do sono profundo e a recuperação muscular. Desligue telas 1-2 horas antes de dormir ou use filtro de luz azul após as 20h.",
    category: "Sono", icon: Moon, emoji: "📱"
  },
  {
    id: "21", title: "Vitamina C e Colágeno", question: "A vitamina C realmente ajuda na pele?",
    answer: "A vitamina C é cofator essencial na síntese de colágeno. Sem ela, o corpo não consegue produzir colágeno adequadamente, resultando em pele flácida, cicatrização lenta e fragilidade capilar. Fontes potentes: acerola (1677mg/100g), goiaba, kiwi, pimentão e morango.",
    category: "Beleza", icon: Sparkles, emoji: "✨"
  },
  {
    id: "22", title: "Café: Amigo ou Vilão?", question: "O café faz bem ou mal à saúde?",
    answer: "Com moderação (3-4 xícaras/dia), o café é rico em antioxidantes, melhora foco, performance no treino e reduz risco de Alzheimer e Parkinson. Porém, excesso causa ansiedade, insônia e dependência. Evite após as 14h para não prejudicar o sono. Gestantes devem limitar a 200mg/dia de cafeína.",
    category: "Alimentação", icon: Flame, emoji: "☕"
  },
  {
    id: "23", title: "Postura e Dor Crônica", question: "Minha postura pode causar dor crônica?",
    answer: "Ficar sentado por mais de 6 horas/dia com má postura encurta músculos do quadril, sobrecarrega a coluna lombar e pode causar dores crônicas, hérnias e compressão de nervos. Levante-se a cada 30-45 minutos, faça alongamentos e fortaleça o core com exercícios específicos.",
    category: "Exercício", icon: Dumbbell, emoji: "🪑"
  },
  {
    id: "24", title: "Ferro e Energia", question: "Por que me sinto tão cansado(a)?",
    answer: "A deficiência de ferro é a carência nutricional mais comum no mundo, afetando especialmente mulheres em idade fértil. Sintomas: fadiga extrema, palidez, queda de cabelo, unhas quebradiças e dificuldade de concentração. Fontes: carne vermelha, fígado, feijão, lentilha e espinafre (combine com vitamina C para melhor absorção).",
    category: "Nutrição", icon: Flame, emoji: "⚡"
  },
  {
    id: "25", title: "Gestantes e Ácido Fólico", question: "Por que gestantes precisam de ácido fólico?",
    answer: "O ácido fólico (vitamina B9) é crucial para o fechamento do tubo neural do bebê nas primeiras 4 semanas de gestação — muitas vezes antes da mulher saber que está grávida. A suplementação de 400-800mcg/dia deve começar idealmente 3 meses antes da concepção.",
    category: "Gestação", icon: Baby, emoji: "🤰"
  },
  {
    id: "26", title: "Sal: Quanto é Demais?", question: "Quanto sal posso consumir por dia?",
    answer: "A OMS recomenda no máximo 5g de sal/dia (2g de sódio), mas o brasileiro consome em média 12g. O excesso está diretamente ligado a hipertensão, AVC e doenças renais. Os maiores vilões são alimentos processados: embutidos, macarrão instantâneo, salgadinhos e molhos prontos.",
    category: "Prevenção", icon: Heart, emoji: "🧂"
  },
  {
    id: "27", title: "Microbiota e Peso", question: "Meu intestino influencia meu peso?",
    answer: "Sim! Estudos mostram que pessoas obesas e magras têm composições bacterianas intestinais diferentes. Uma microbiota desequilibrada pode extrair até 150 calorias extras dos mesmos alimentos. Diversifique sua alimentação com 30+ tipos de vegetais por semana para uma microbiota saudável.",
    category: "Digestão", icon: Leaf, emoji: "⚖️"
  },
  {
    id: "28", title: "Vitamina B12 Veganos", question: "Veganos precisam suplementar B12?",
    answer: "SIM, obrigatoriamente. A vitamina B12 é encontrada naturalmente apenas em alimentos de origem animal. A deficiência causa anemia megaloblástica, danos neurológicos irreversíveis, fadiga e problemas cognitivos. Veganos devem suplementar no mínimo 2500mcg/semana de cianocobalamina.",
    category: "Suplementação", icon: Pill, emoji: "🌱"
  },
  {
    id: "29", title: "Treino em Jejum", question: "Treinar em jejum queima mais gordura?",
    answer: "Treinar em jejum pode aumentar a oxidação de gordura durante o exercício, MAS não necessariamente leva a maior perda de gordura total. O corpo compensa nas horas seguintes. Além disso, pode reduzir performance, causar hipoglicemia e perda muscular. Para a maioria, treinar alimentado gera melhores resultados a longo prazo.",
    category: "Exercício", icon: Dumbbell, emoji: "🏃"
  },
  {
    id: "30", title: "Inflamação Silenciosa", question: "O que é inflamação crônica de baixo grau?",
    answer: "É uma inflamação sistêmica sutil que não causa sintomas óbvios, mas está por trás de obesidade, diabetes, doenças cardíacas, depressão e até câncer. Causas: dieta rica em ultraprocessados, sedentarismo, estresse crônico e privação de sono. Combata com alimentação anti-inflamatória, exercício regular e sono adequado.",
    category: "Prevenção", icon: Shield, emoji: "🔬"
  },
];

const CATEGORIES = ["Todas", ...Array.from(new Set(CURIOSIDADES.map((c) => c.category)))];

export default function Curiosidades({ embedded = false }: { embedded?: boolean }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todas");
  const [selected, setSelected] = useState<Curiosidade | null>(null);

  const filtered = CURIOSIDADES.filter((c) => {
    const matchSearch = c.title.toLowerCase().includes(search.toLowerCase()) || c.question.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === "Todas" || c.category === category;
    return matchSearch && matchCat;
  });

  const content = (
    <div className="space-y-6">

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold">Curiosidades</h1>
            <p className="text-sm text-muted-foreground">Descubra fatos incríveis sobre saúde e bem-estar</p>
          </div>
          <Badge variant="secondary" className="ml-auto">{CURIOSIDADES.length} curiosidades</Badge>
        </div>

        {selected ? (
          <Card className="glass shadow-card overflow-hidden">
            <div className="bg-gradient-to-r from-primary/10 to-accent/10 px-6 py-4 border-b border-border/50">
              <button onClick={() => setSelected(null)} className="text-sm text-primary hover:underline mb-3 flex items-center gap-1">
                <ChevronLeft className="w-4 h-4" /> Voltar
              </button>
              <div className="flex items-center gap-3">
                <span className="text-3xl">{selected.emoji}</span>
                <div>
                  <Badge variant="outline" className="mb-1">{selected.category}</Badge>
                  <h2 className="font-display text-xl font-bold">{selected.question}</h2>
                </div>
              </div>
            </div>
            <CardContent className="p-6">
              <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-line">{selected.answer}</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Buscar curiosidades..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
            </div>

            <div className="flex gap-2 flex-wrap">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                    category === c ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.map((item) => (
                <Card
                  key={item.id}
                  className="glass shadow-card cursor-pointer hover:shadow-glow hover:-translate-y-0.5 transition-all duration-200 group"
                  onClick={() => setSelected(item)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 text-xl group-hover:scale-110 transition-transform">
                        {item.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <Badge variant="outline" className="text-[10px] mb-1">{item.category}</Badge>
                        <h3 className="font-display font-semibold text-sm mb-0.5">{item.title}</h3>
                        <p className="text-xs text-muted-foreground line-clamp-2">{item.question}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filtered.length === 0 && (
              <div className="text-center py-12">
                <Sparkles className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Nenhuma curiosidade encontrada</p>
              </div>
            )}
          </>
        )}
    </div>
  );

  if (embedded) return content;

  return (
    <DashboardLayout>
      {content}
    </DashboardLayout>
  );
}

