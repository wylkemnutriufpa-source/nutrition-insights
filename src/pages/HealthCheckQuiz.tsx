import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Heart, ArrowRight, ArrowLeft, CheckCircle2, AlertTriangle, Star } from "lucide-react";

const QUESTIONS = [
  {
    question: "Quantas refeições completas você faz por dia?",
    options: [
      { label: "1-2 refeições", score: 1 },
      { label: "3 refeições", score: 3 },
      { label: "4-5 refeições", score: 5 },
      { label: "6+ refeições balanceadas", score: 5 },
    ],
  },
  {
    question: "Quantos litros de água você bebe por dia?",
    options: [
      { label: "Menos de 1L", score: 1 },
      { label: "1-2L", score: 3 },
      { label: "2-3L", score: 5 },
      { label: "Mais de 3L", score: 4 },
    ],
  },
  {
    question: "Com que frequência você pratica exercícios?",
    options: [
      { label: "Nunca/Raramente", score: 1 },
      { label: "1-2x por semana", score: 3 },
      { label: "3-5x por semana", score: 5 },
      { label: "Diariamente", score: 5 },
    ],
  },
  {
    question: "Quantas horas de sono você dorme por noite?",
    options: [
      { label: "Menos de 5h", score: 1 },
      { label: "5-6h", score: 2 },
      { label: "7-8h", score: 5 },
      { label: "Mais de 9h", score: 3 },
    ],
  },
  {
    question: "Como você classificaria seu nível de estresse?",
    options: [
      { label: "Muito alto", score: 1 },
      { label: "Alto", score: 2 },
      { label: "Moderado", score: 3 },
      { label: "Baixo/Controlado", score: 5 },
    ],
  },
  {
    question: "Com que frequência você consome frutas e vegetais?",
    options: [
      { label: "Raramente", score: 1 },
      { label: "Algumas vezes na semana", score: 2 },
      { label: "Diariamente", score: 4 },
      { label: "5+ porções por dia", score: 5 },
    ],
  },
  {
    question: "Você consome alimentos ultraprocessados?",
    options: [
      { label: "Diariamente", score: 1 },
      { label: "Frequentemente", score: 2 },
      { label: "Às vezes", score: 4 },
      { label: "Raramente/Nunca", score: 5 },
    ],
  },
  {
    question: "Você faz acompanhamento nutricional?",
    options: [
      { label: "Nunca fiz", score: 1 },
      { label: "Já fiz mas parei", score: 2 },
      { label: "Estou iniciando", score: 4 },
      { label: "Sim, regularmente", score: 5 },
    ],
  },
];

export default function HealthCheckQuiz() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);

  const currentQ = QUESTIONS[step];
  const progress = ((step + 1) / QUESTIONS.length) * 100;

  const next = () => {
    if (selectedOption === null) return;
    const newAnswers = [...answers, currentQ.options[selectedOption].score];
    setAnswers(newAnswers);
    setSelectedOption(null);

    if (step + 1 >= QUESTIONS.length) {
      setFinished(true);
    } else {
      setStep(step + 1);
    }
  };

  const prev = () => {
    if (step <= 0) return;
    setStep(step - 1);
    setAnswers(answers.slice(0, -1));
    setSelectedOption(null);
  };

  const totalScore = answers.reduce((a, b) => a + b, 0);
  const maxScore = QUESTIONS.length * 5;
  const percentage = Math.round((totalScore / maxScore) * 100);

  const getLevel = () => {
    if (percentage >= 80) return { label: "Excelente", color: "text-success", icon: Star, description: "Seus hábitos de saúde estão ótimos! Continue assim." };
    if (percentage >= 60) return { label: "Bom", color: "text-primary", icon: CheckCircle2, description: "Você está no caminho certo. Algumas melhorias podem potencializar sua saúde." };
    if (percentage >= 40) return { label: "Regular", color: "text-warning", icon: AlertTriangle, description: "Há espaço para melhorar seus hábitos. Um nutricionista pode te ajudar muito!" };
    return { label: "Atenção", color: "text-destructive", icon: AlertTriangle, description: "Seus hábitos precisam de atenção. Procure acompanhamento profissional." };
  };

  if (finished) {
    const level = getLevel();
    return (
      <DashboardLayout>
        <div className="max-w-lg mx-auto space-y-6">
          <Card className="glass shadow-card">
            <CardContent className="py-8 text-center space-y-4">
              <level.icon className={`w-16 h-16 mx-auto ${level.color}`} />
              <h2 className="font-display text-2xl font-bold">{level.label}</h2>
              <div className="relative w-32 h-32 mx-auto">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <path className="text-muted" strokeDasharray="100, 100" d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831 15.9155 15.9155 0 0 1 0-31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                  <path className={level.color} strokeDasharray={`${percentage}, 100`} d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831 15.9155 15.9155 0 0 1 0-31.831" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center font-display font-bold text-2xl">{percentage}%</span>
              </div>
              <p className="text-muted-foreground text-sm">{level.description}</p>
              <p className="text-xs text-muted-foreground">Pontuação: {totalScore}/{maxScore}</p>
              <Button onClick={() => { setStep(0); setAnswers([]); setFinished(false); setSelectedOption(null); }} variant="outline">
                Refazer Quiz
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-lg mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Heart className="w-8 h-8 text-destructive" />
          <div>
            <h1 className="font-display text-2xl font-bold">Health Check</h1>
            <p className="text-muted-foreground text-sm">Avaliação rápida dos seus hábitos</p>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span>Pergunta {step + 1} de {QUESTIONS.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <Card className="glass shadow-card">
          <CardContent className="py-6 space-y-4">
            <h2 className="font-display font-semibold text-lg">{currentQ.question}</h2>
            <div className="space-y-2">
              {currentQ.options.map((opt, i) => (
                <button key={i} onClick={() => setSelectedOption(i)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                    selectedOption === i ? "border-primary bg-primary/5" : "border-border hover:border-primary/30 hover:bg-muted/50"
                  }`}>
                  <span className="text-sm font-medium">{opt.label}</span>
                </button>
              ))}
            </div>
            <div className="flex justify-between pt-2">
              <Button variant="ghost" onClick={prev} disabled={step === 0}><ArrowLeft className="w-4 h-4 mr-1" /> Voltar</Button>
              <Button onClick={next} disabled={selectedOption === null} className="gradient-primary">
                {step + 1 >= QUESTIONS.length ? "Ver Resultado" : "Próxima"} <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
