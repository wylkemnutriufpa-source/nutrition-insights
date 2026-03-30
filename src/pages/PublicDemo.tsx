import { useParams, useNavigate } from "react-router-dom";
import FullscreenPresentationViewer, { type PresentationSlide } from "@/components/common/FullscreenPresentationViewer";
import { Rocket, ArrowRight } from "lucide-react";

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
  { image_url: slide1, title: "A evolução da Nutrição Clínica Inteligente", subtitle: "Tecnologia que transforma consultórios", description: "O FitJourney une dados, metabolismo e estratégia em uma plataforma única — para que você tome decisões clínicas com confiança absoluta." },
  { image_url: slide2, title: "Dashboard Clínico & Cockpit de Decisões", subtitle: "Sua carteira sob controle total", description: "Visualize riscos de abandono, scores de adesão e alertas clínicos em tempo real — tudo num único painel." },
  { image_url: slide3, title: "Editor de Planos Alimentares Premium", subtitle: "Monte planos em minutos, não em horas", description: "Grade semanal visual, biblioteca de refeições, geração automática e controle de macros em tempo real." },
  { image_url: slide4, title: "Inteligência Preditiva & Motor Clínico", subtitle: "Antecipe problemas antes que aconteçam", description: "Análise de padrões metabólicos e comportamentais para prever estagnação — com recomendações proativas." },
  { image_url: slide5, title: "Automação, Gamificação & Crescimento", subtitle: "Escale seu consultório com tecnologia", description: "Sistema de pontos, ranking global, protocolos especiais e ferramentas de crescimento integradas." },
  { image_url: slide6, title: "Protocolos Clínicos Estruturados", subtitle: "Metodologia científica no dia a dia", description: "Fases, tarefas diárias e transições automáticas baseadas na evolução do paciente." },
  { image_url: slide7, title: "Relatórios & Analytics Avançados", subtitle: "Dados que impressionam e convencem", description: "Relatórios automáticos com gráficos de evolução, comparativos e exportação em PDF profissional." },
  { image_url: slide8, title: "Engajamento Inteligente do Paciente", subtitle: "Comunicação que gera resultados", description: "Check-ins automáticos, acompanhamento contínuo e motivação baseada em dados reais de adesão." },
  { image_url: slide9, title: "Inteligência Artificial Clínica", subtitle: "IA sob sua supervisão total", description: "Análise de refeições, geração de receitas, insights de anamnese e suporte à decisão clínica." },
  { image_url: slide10, title: "Escale Seu Consultório", subtitle: "De consultório local a marca digital", description: "Landing pages, afiliados, agendamento online, pagamentos via Stripe e ferramentas de crescimento." },
];

const PATIENT_SLIDES: PresentationSlide[] = [
  { image_url: pSlide1, title: "Bem-vindo à sua nova jornada", subtitle: "Você não está sozinho", description: "O FitJourney acompanha sua evolução todos os dias com inteligência e cuidado." },
  { image_url: pSlide2, title: "Seu plano alimentar inteligente", subtitle: "Tudo pensado para seu objetivo", description: "Toque em qualquer refeição para ver ingredientes, modo de preparo e macros." },
  { image_url: pSlide3, title: "Acompanhe sua evolução", subtitle: "Visualize sua transformação", description: "Registre peso, medidas e fotos. Veja sua evolução semana após semana." },
  { image_url: pSlide4, title: "Missões e motivação diária", subtitle: "Pequenas vitórias, grandes resultados", description: "Complete tarefas, ganhe XP, mantenha sua sequência." },
  { image_url: pSlide5, title: "Suporte sempre disponível", subtitle: "Fale com seu nutricionista", description: "Chat em tempo real. Peça ajuda sempre que precisar." },
  { image_url: pSlide6, title: "Resultados reais", subtitle: "Evolução guiada por dados", description: "O sistema ajusta sua estratégia conforme sua resposta metabólica." },
  { image_url: pSlide7, title: "Checklist diário personalizado", subtitle: "Seu dia organizado", description: "Tarefas de nutrição, hidratação e hábitos saudáveis num só lugar." },
  { image_url: pSlide8, title: "Gamificação que transforma", subtitle: "Conquiste e evolua", description: "Medalhas, níveis e fases da sua jornada. Evolução nunca foi tão motivante." },
  { image_url: pSlide9, title: "Relatórios de progresso", subtitle: "Cada escolha conta", description: "Relatórios semanais mostram como cada decisão contribui para seu resultado." },
  { image_url: pSlide10, title: "Sua jornada começa agora", subtitle: "Tudo está pronto", description: "Siga o plano, confie no processo e veja a transformação acontecer." },
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
          label: "Começar Agora",
          icon: <Rocket className="w-5 h-5" />,
          onClick: () => navigate("/auth"),
        },
      ]}
    />
  );
}
