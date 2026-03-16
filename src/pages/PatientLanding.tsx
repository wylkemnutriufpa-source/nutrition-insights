import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import FitJourneyLogo from "@/components/common/FitJourneyLogo";
import {
  CheckCircle2, Trophy, Target, Brain, UtensilsCrossed, TrendingUp,
  MessageSquare, Camera, Star, Sparkles, ArrowRight, Shield, Zap,
  BarChart3, Heart, Flame, Crown
} from "lucide-react";
import { useSiteSettings, getSetting } from "@/hooks/useSiteSettings";

const features = [
  { icon: CheckCircle2, title: "Checklist Diário Inteligente", desc: "Tarefas personalizadas pelo seu nutricionista, com gamificação e pontos.", color: "text-emerald-400", bg: "bg-emerald-500/10" },
  { icon: Shield, title: "Protocolo FitJourney™", desc: "Motor clínico exclusivo que gera seu plano alimentar de forma inteligente e personalizada, baseado nos seus dados reais.", color: "text-teal-400", bg: "bg-teal-500/10" },
  { icon: UtensilsCrossed, title: "Plano Alimentar Digital", desc: "Seu plano completo no celular, com acompanhamento de adesão em tempo real.", color: "text-cyan-400", bg: "bg-cyan-500/10" },
  { icon: Brain, title: "IA para Análise de Refeições", desc: "Tire foto da sua refeição e receba análise nutricional instantânea.", color: "text-violet-400", bg: "bg-violet-500/10" },
  { icon: Trophy, title: "Ranking & Gamificação", desc: "Ganhe pontos, suba no ranking, conquiste medalhas e badges exclusivos.", color: "text-amber-400", bg: "bg-amber-500/10" },
  { icon: TrendingUp, title: "Evolução Corporal", desc: "Acompanhe peso, medidas e composição corporal com gráficos detalhados.", color: "text-blue-400", bg: "bg-blue-500/10" },
  { icon: MessageSquare, title: "Chat Direto com Nutricionista", desc: "Comunicação em tempo real com seu profissional, sem sair do app.", color: "text-sky-400", bg: "bg-sky-500/10" },
  { icon: Target, title: "Metas Semanais", desc: "Objetivos claros e mensuráveis definidos pelo seu nutricionista.", color: "text-rose-400", bg: "bg-rose-500/10" },
  { icon: Camera, title: "Fotos de Progresso", desc: "Registro visual da sua transformação com comparativo antes/depois.", color: "text-pink-400", bg: "bg-pink-500/10" },
  { icon: Flame, title: "Streak & Disciplina", desc: "Mantenha sua sequência diária e veja seu score de disciplina subir.", color: "text-orange-400", bg: "bg-orange-500/10" },
  { icon: Heart, title: "Check-in de Saúde", desc: "Registre como está se sentindo e receba dicas personalizadas.", color: "text-red-400", bg: "bg-red-500/10" },
  { icon: Crown, title: "Programa Prestige", desc: "Acesse benefícios exclusivos com planos premium de acompanhamento.", color: "text-yellow-400", bg: "bg-yellow-500/10" },
];

const defaultTestimonials = [
  { name: "Ana C.", text: "Perdi 12kg em 4 meses! O checklist diário e a gamificação me mantiveram focada.", avatar: "🌟" },
  { name: "Pedro S.", text: "Nunca imaginei que acompanhamento nutricional pudesse ser tão divertido e motivador.", avatar: "💪" },
  { name: "Mariana L.", text: "O ranking me fez competir comigo mesma. Resultado: mais disciplina que nunca.", avatar: "🏆" },
];

export default function PatientLanding() {
  const { data } = useSiteSettings();
  const map = data?.map;

  const heroBadge = getSetting(map, "patient_hero_badge", "Programa de Acompanhamento Online Inteligente");
  const heroTitle = getSetting(map, "patient_hero_title", "Sua transformação começa aqui");
  const heroSubtitle = getSetting(map, "patient_hero_subtitle", "Acompanhamento nutricional inteligente com gamificação, IA e comunicação direta com seu nutricionista. Tudo no seu celular.");
  const sectionTitle = getSetting(map, "patient_section_title", "Tudo que você precisa para resultados reais");
  const ctaTitle = getSetting(map, "patient_cta_final_title", "Pronto para começar sua transformação?");
  const ctaSubtitle = getSetting(map, "patient_cta_final_subtitle", "Converse com seu nutricionista sobre o FitJourney e comece sua jornada hoje.");
  const testimonials = getSetting(map, "patient_testimonials", defaultTestimonials);

  return (
    <div className="min-h-screen bg-[#0a0a14] text-white overflow-hidden">
      <nav className="relative z-50 flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <Link to="/"><FitJourneyLogo collapsed={false} size="md" /></Link>
        <div className="flex gap-3">
          <Link to="/"><Button variant="ghost" size="sm" className="text-white/60 hover:text-white">Voltar</Button></Link>
          <Link to="/auth"><Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white">Entrar</Button></Link>
        </div>
      </nav>

      <section className="relative px-6 pt-16 pb-24 max-w-6xl mx-auto text-center">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-emerald-500/8 blur-[150px] rounded-full" />
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm mb-6">
            <Sparkles className="w-4 h-4" /> {heroBadge}
          </div>
          <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6">
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">{heroTitle}</span>
          </h1>
          <p className="text-white/50 text-lg md:text-xl max-w-2xl mx-auto mb-10">{heroSubtitle}</p>
          <Link to="/cadastro">
            <Button size="lg" className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-8 text-lg hover:opacity-90 shadow-lg shadow-emerald-500/20">
              Começar Agora <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </motion.div>
      </section>

      <section className="px-6 py-20 max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            <span className="text-emerald-400">{sectionTitle}</span>
          </h2>
          <p className="text-white/40 max-w-xl mx-auto">Ferramentas poderosas pensadas para maximizar sua adesão e evolução.</p>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <motion.div key={f.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}
              className="group rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 hover:bg-white/[0.04] hover:border-white/10 transition-all duration-300">
              <div className={`w-10 h-10 rounded-lg ${f.bg} flex items-center justify-center mb-4`}>
                <f.icon className={`w-5 h-5 ${f.color}`} />
              </div>
              <h3 className="font-semibold text-white mb-1">{f.title}</h3>
              <p className="text-white/40 text-sm leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="px-6 py-20 max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-16">Como funciona?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { step: "01", title: "Cadastre-se", desc: "Seu nutricionista cria sua conta e você recebe acesso ao app." },
            { step: "02", title: "Siga o Plano", desc: "Complete seu checklist diário, registre refeições e ganhe pontos." },
            { step: "03", title: "Evolua", desc: "Acompanhe sua transformação com dados, rankings e conquistas." },
          ].map((s, i) => (
            <motion.div key={s.step} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15 }} className="text-center">
              <div className="text-5xl font-black bg-gradient-to-b from-emerald-400 to-emerald-600 bg-clip-text text-transparent mb-4">{s.step}</div>
              <h3 className="text-lg font-bold mb-2">{s.title}</h3>
              <p className="text-white/40 text-sm">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="px-6 py-20 max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12">Quem usa, <span className="text-emerald-400">transforma</span></h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(Array.isArray(testimonials) ? testimonials : defaultTestimonials).map((t: any, i: number) => (
            <motion.div key={t.name} initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
              <p className="text-white/60 text-sm mb-4 italic">"{t.text}"</p>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{t.avatar}</span>
                <span className="font-semibold text-sm">{t.name}</span>
                <div className="flex gap-0.5 ml-auto">
                  {[...Array(5)].map((_, j) => <Star key={j} className="w-3 h-3 text-amber-400 fill-amber-400" />)}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="px-6 py-24 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-4"><span className="text-emerald-400">{ctaTitle}</span></h2>
          <p className="text-white/40 mb-8">{ctaSubtitle}</p>
          <Link to="/cadastro">
            <Button size="lg" className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-10 text-lg">
              Criar Minha Conta <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/[0.06] px-6 py-8 text-center text-white/20 text-sm">
        © {new Date().getFullYear()} FitJourney — Nutrição Inteligente
      </footer>
    </div>
  );
}
