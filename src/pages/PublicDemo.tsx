import { useParams, useNavigate } from "react-router-dom";
import { Rocket } from "lucide-react";
import FullscreenPresentationViewer, { type PresentationSlide } from "@/components/common/FullscreenPresentationViewer";

import slide1 from "@/assets/onboarding/slide-1.png";
import slide2 from "@/assets/onboarding/slide-2.png";
import slide3 from "@/assets/onboarding/slide-3.png";
import slide4 from "@/assets/onboarding/slide-4.png";
import slide5 from "@/assets/onboarding/slide-5.png";
import slide6 from "@/assets/onboarding/slide-6.png";
import slide7 from "@/assets/onboarding/slide-7.png";
import slide8 from "@/assets/onboarding/slide-8.png";
import slide9 from "@/assets/onboarding/slide-9.png";
import slide10 from "@/assets/onboarding/slide-10.png";

import pSlide1 from "@/assets/onboarding-paciente/slide-1.png";
import pSlide2 from "@/assets/onboarding-paciente/slide-2.png";
import pSlide3 from "@/assets/onboarding-paciente/slide-3.png";
import pSlide4 from "@/assets/onboarding-paciente/slide-4.png";
import pSlide5 from "@/assets/onboarding-paciente/slide-5.png";
import pSlide6 from "@/assets/onboarding-paciente/slide-6.png";
import pSlide7 from "@/assets/onboarding-paciente/slide-7.png";
import pSlide8 from "@/assets/onboarding-paciente/slide-8.png";
import pSlide9 from "@/assets/onboarding-paciente/slide-9.png";
import pSlide10 from "@/assets/onboarding-paciente/slide-10.png";

const PRO_SLIDES: PresentationSlide[] = [
  { image_url: slide1, title: "FitJourney", subtitle: "A plataforma clínica inteligente", description: "Transforme seu consultório com IA e Gamificação" },
  { image_url: slide2, title: "Cockpit de Pacientes", subtitle: "Gestão inteligente", description: "Visualize riscos, adesão e prioridades em tempo real" },
  { image_url: slide3, title: "Dashboard Clínico", subtitle: "Decisões baseadas em dados", description: "Scores de adesão, alertas e motor preditivo" },
  { image_url: slide4, title: "Motor de IA Preditiva", subtitle: "Antecipe problemas", description: "Análise de padrões metabólicos e comportamentais" },
  { image_url: slide5, title: "Gamificação & Engajamento", subtitle: "Motivação contínua", description: "Pontos, ranking, conquistas e desafios" },
  { image_url: slide6, title: "Protocolos Clínicos", subtitle: "Metodologia científica", description: "Fases, tarefas e transições automáticas" },
  { image_url: slide7, title: "Relatórios & Analytics", subtitle: "Dados que impressionam", description: "Evolução, comparativos e exportação em PDF" },
  { image_url: slide8, title: "Engajamento Inteligente", subtitle: "Comunicação eficaz", description: "Check-ins automáticos e acompanhamento contínuo" },
  { image_url: slide9, title: "IA Clínica Avançada", subtitle: "Sob sua supervisão", description: "Análise de refeições, receitas e insights clínicos" },
  { image_url: slide10, title: "Escale Seu Consultório", subtitle: "Crescimento digital", description: "Landing pages, afiliados e pagamentos integrados" },
];

const PATIENT_SLIDES: PresentationSlide[] = [
  { image_url: pSlide1, title: "Sua Jornada Começa Aqui", subtitle: "Bem-vindo ao FitJourney", description: "Acompanhamento inteligente todos os dias" },
  { image_url: pSlide2, title: "Plano Alimentar Inteligente", subtitle: "Feito para você", description: "Refeições, ingredientes, macros e modo de preparo" },
  { image_url: pSlide3, title: "Evolução Visual", subtitle: "Veja sua transformação", description: "Peso, medidas e fotos semana a semana" },
  { image_url: pSlide4, title: "Missões & Motivação", subtitle: "Pequenas vitórias", description: "Complete tarefas, ganhe XP e mantenha sua sequência" },
  { image_url: pSlide5, title: "Suporte Sempre Disponível", subtitle: "Chat em tempo real", description: "Fale com seu nutricionista quando precisar" },
  { image_url: pSlide6, title: "Resultados Reais", subtitle: "Evolução guiada por dados", description: "Estratégia ajustada conforme sua resposta metabólica" },
  { image_url: pSlide7, title: "Checklist Diário", subtitle: "Seu dia organizado", description: "Nutrição, hidratação e hábitos saudáveis" },
  { image_url: pSlide8, title: "Gamificação", subtitle: "Conquiste e evolua", description: "Medalhas, níveis e fases da sua jornada" },
  { image_url: pSlide9, title: "Relatórios de Progresso", subtitle: "Cada escolha conta", description: "Relatórios semanais da sua evolução" },
  { image_url: pSlide10, title: "Tudo Pronto", subtitle: "Sua jornada começa agora", description: "Siga o plano e veja a transformação acontecer" },
];

export default function PublicDemo() {
  const { mode } = useParams<{ mode: string }>();
  const navigate = useNavigate();

  const isPro = mode === "profissional";
  const slides = isPro ? PRO_SLIDES : PATIENT_SLIDES;

  return (
    <FullscreenPresentationViewer
      slides={slides}
      mode={isPro ? "professional" : "patient"}
      onFinish={() => navigate("/")}
      onSkip={() => navigate("/")}
      finalCTAs={[
        {
          label: "Criar Conta Grátis",
          icon: <Rocket className="w-4 h-4" />,
          onClick: () => navigate("/auth"),
        },
      ]}
    />
  );
}
