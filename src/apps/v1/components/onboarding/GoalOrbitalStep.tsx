import { Flame, Dumbbell, Scale, Heart } from "lucide-react";
import {
  RadialOrbitalSelector,
  type OrbitalOption,
} from "@/components/ui/radial-orbital-selector";

const GOAL_OPTIONS: OrbitalOption[] = [
  {
    id: "lose_weight",
    label: "Emagrecer",
    description:
      "Foco em redução de gordura corporal com preservação de massa magra e saúde metabólica.",
    helperText:
      "Indicado para pessoas acima do peso ou com percentual de gordura elevado que desejam melhorar estética, saúde metabólica e qualidade de vida.",
    icon: Flame,
  },
  {
    id: "gain_muscle",
    label: "Ganhar massa",
    description:
      "Foco em hipertrofia muscular com aporte calórico e proteico estratégico.",
    helperText:
      "Indicado para pacientes abaixo do peso, muito magros ou que já passaram por fase de emagrecimento e agora desejam desenvolver massa muscular.",
    icon: Dumbbell,
  },
  {
    id: "maintain",
    label: "Manter peso",
    description:
      "Foco em equilíbrio e manutenção da composição corporal atual.",
    helperText:
      "Indicado para pessoas satisfeitas com o peso atual, mas que querem melhorar composição corporal e manter bons hábitos.",
    icon: Scale,
  },
  {
    id: "health",
    label: "Saúde geral",
    description:
      "Foco em bem-estar, energia e prevenção de problemas clínicos.",
    helperText:
      "Indicado para pacientes com peso adequado, mas que desejam melhorar saúde, energia, exames ou tratar/prevenir problemas clínicos.",
    icon: Heart,
  },
];

interface GoalOrbitalStepProps {
  value?: string;
  onChange: (value: string) => void;
}

export default function GoalOrbitalStep({ value, onChange }: GoalOrbitalStepProps) {
  return (
    <RadialOrbitalSelector
      title="Qual é o seu objetivo principal?"
      subtitle="Escolha o que mais importa pra você agora"
      options={GOAL_OPTIONS}
      value={value}
      onChange={onChange}
      showConfirmButton={false}
    />
  );
}
