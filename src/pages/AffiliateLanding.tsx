import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import FitJourneyLogo from "@/components/common/FitJourneyLogo";
import {
  Award, DollarSign, TrendingUp, Users, Share2, ArrowRight,
  Sparkles, CheckCircle2, BarChart3, Crown, Zap, Star, Shield, Percent
} from "lucide-react";
import { useSiteSettings, getSetting } from "@/hooks/useSiteSettings";

const benefits = [
  { icon: DollarSign, title: "30% na 1ª Venda", desc: "Ganhe 30% de comissão no primeiro pagamento de cada indicação.", color: "text-amber-400", bg: "bg-amber-500/10" },
  { icon: TrendingUp, title: "5% Recorrente", desc: "Receba 5% de comissão todo mês enquanto seu indicado for ativo.", color: "text-emerald-400", bg: "bg-emerald-500/10" },
  { icon: Share2, title: "Link Personalizado", desc: "Seu código único para compartilhar e rastrear todas as indicações.", color: "text-cyan-400", bg: "bg-cyan-500/10" },
  { icon: BarChart3, title: "Dashboard Completo", desc: "Acompanhe indicações, conversões e comissões em tempo real.", color: "text-violet-400", bg: "bg-violet-500/10" },
  { icon: Crown, title: "Tiers Premium", desc: "Embaixadores premium ganham comissões maiores e benefícios exclusivos.", color: "text-yellow-400", bg: "bg-yellow-500/10" },
  { icon: Shield, title: "Pagamento Garantido", desc: "Comissões rastreadas e pagas de forma transparente e confiável.", color: "text-blue-400", bg: "bg-blue-500/10" },
];

const steps = [
  { step: "01", title: "Cadastre-se", desc: "Crie sua conta de embaixador e receba seu link único de indicação." },
  { step: "02", title: "Compartilhe", desc: "Envie seu link para amigos, seguidores e parceiros interessados em nutrição." },
  { step: "03", title: "Ganhe", desc: "Receba comissões automáticas sempre que seus indicados assinarem." },
];

const defaultTiers = [
  { name: "Afiliado", first: "30%", recurring: "5%", badge: "⚡", color: "border-blue-500/30" },
  { name: "Nutricionista", first: "35%", recurring: "8%", badge: "🩺", color: "border-emerald-500/30" },
  { name: "Embaixador Premium", first: "40%", recurring: "10%", badge: "🏆", color: "border-amber-500/30" },
];

export default function AffiliateLanding() {
  const { data } = useSiteSettings();
  const map = data?.map;

  const heroTitle = getSetting(map, "affiliate_hero_title", "Ganhe dinheiro indicando saúde e resultados");
  const heroSubtitle = getSetting(map, "affiliate_hero_subtitle", "Indique profissionais e pacientes para o FitJourney e receba comissões recorrentes. Quanto mais você indica, mais você ganha.");
  const ctaTitle = getSetting(map, "affiliate_cta_final_title", "Pronto para ganhar?");
  const ctaSubtitle = getSetting(map, "affiliate_cta_final_subtitle", "Junte-se ao programa de embaixadores e comece a ganhar comissões hoje.");
  const tiersData = getSetting(map, "affiliate_tiers", defaultTiers);
  const tiers = Array.isArray(tiersData) ? tiersData : defaultTiers;

  return (
    <div className="min-h-screen bg-[#0a0a14] text-white overflow-hidden">
      <nav className="relative z-50 flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <Link to="/"><FitJourneyLogo collapsed={false} size="md" /></Link>
        <div className="flex gap-3">
          <Link to="/"><Button variant="ghost" size="sm" className="text-white/60 hover:text-white">Voltar</Button></Link>
          <Link to="/auth"><Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-black font-bold">Quero Ser Embaixador</Button></Link>
        </div>
      </nav>

      <section className="relative px-6 pt-16 pb-24 max-w-6xl mx-auto text-center">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-amber-500/8 blur-[150px] rounded-full" />
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm mb-6">
            <Award className="w-4 h-4" /> Programa de Embaixadores FitJourney
          </div>
          <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6">
            <span className="bg-gradient-to-r from-amber-400 via-yellow-300 to-orange-400 bg-clip-text text-transparent">{heroTitle}</span>
          </h1>
          <p className="text-white/50 text-lg md:text-xl max-w-2xl mx-auto mb-6">{heroSubtitle}</p>

          <div className="flex flex-wrap justify-center gap-8 mb-10">
            <div className="text-center">
              <p className="text-4xl font-black bg-gradient-to-b from-amber-400 to-amber-600 bg-clip-text text-transparent">30%</p>
              <p className="text-white/40 text-sm">1ª Venda</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-black bg-gradient-to-b from-emerald-400 to-emerald-600 bg-clip-text text-transparent">5%</p>
              <p className="text-white/40 text-sm">Recorrente</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-black bg-gradient-to-b from-violet-400 to-violet-600 bg-clip-text text-transparent">∞</p>
              <p className="text-white/40 text-sm">Sem Limite</p>
            </div>
          </div>

          <Link to="/auth">
            <Button size="lg" className="bg-gradient-to-r from-amber-500 to-orange-600 text-black font-bold px-10 text-lg hover:opacity-90 shadow-lg shadow-amber-500/20">
              Começar Agora <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </motion.div>
      </section>

      <section className="px-6 py-20 max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Por que ser um <span className="text-amber-400">Embaixador</span>?</h2>
          <p className="text-white/40 max-w-xl mx-auto">Comissões generosas, ferramentas profissionais e suporte dedicado.</p>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {benefits.map((b, i) => (
            <motion.div key={b.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}
              className="group rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 hover:bg-white/[0.04] hover:border-white/10 transition-all duration-300">
              <div className={`w-10 h-10 rounded-lg ${b.bg} flex items-center justify-center mb-4`}>
                <b.icon className={`w-5 h-5 ${b.color}`} />
              </div>
              <h3 className="font-semibold text-white mb-1">{b.title}</h3>
              <p className="text-white/40 text-sm leading-relaxed">{b.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="px-6 py-20 max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-16">Como funciona?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((s, i) => (
            <motion.div key={s.step} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15 }} className="text-center">
              <div className="text-5xl font-black bg-gradient-to-b from-amber-400 to-amber-600 bg-clip-text text-transparent mb-4">{s.step}</div>
              <h3 className="text-lg font-bold mb-2">{s.title}</h3>
              <p className="text-white/40 text-sm">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="px-6 py-20 max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-4">Tipos de <span className="text-amber-400">Embaixador</span></h2>
        <p className="text-white/40 text-center mb-12 max-w-lg mx-auto">Comissões maiores para quem mais contribui com o crescimento do FitJourney.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {tiers.map((t: any, i: number) => (
            <motion.div key={t.name} initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              className={`rounded-xl border ${t.color || "border-white/10"} bg-white/[0.02] p-6 text-center`}>
              <span className="text-3xl mb-3 block">{t.badge}</span>
              <h3 className="font-bold text-lg mb-4">{t.name}</h3>
              <div className="space-y-2 text-sm">
                <p className="text-white/60">1ª Venda: <span className="text-amber-400 font-bold">{t.first}</span></p>
                <p className="text-white/60">Recorrente: <span className="text-emerald-400 font-bold">{t.recurring}</span></p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="px-6 py-24 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">{ctaTitle}</span>
          </h2>
          <p className="text-white/40 mb-8">{ctaSubtitle}</p>
          <Link to="/auth">
            <Button size="lg" className="bg-gradient-to-r from-amber-500 to-orange-600 text-black font-bold px-10 text-lg">
              Quero Ser Embaixador <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/[0.06] px-6 py-8 text-center text-white/20 text-sm">
        © {new Date().getFullYear()} FitJourney — Programa de Embaixadores
      </footer>
    </div>
  );
}
