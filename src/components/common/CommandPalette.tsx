import { useEffect, useState, useMemo, useCallback, createContext, useContext, ReactNode, memo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  LayoutDashboard, Users, UtensilsCrossed, Trophy, Target, FileBarChart,
  Leaf, Settings, ClipboardCheck, FileText, Rocket, Activity,
  MessageSquare, Lightbulb, ChefHat, ShoppingCart, Apple, Camera,
  Palette, Bell, BarChart3, Shield, Bot, Scale, Droplets, Heart,
  BookOpen, DollarSign, Pill, Compass, Search, TrendingUp, Zap, Star, Crown,
  User, Dumbbell, CalendarDays, CreditCard, Globe, UserCheck, GraduationCap,
  Share2, Award, Megaphone, Calculator, FileCheck, Sparkles, Brain
} from "lucide-react";

// Each route has keywords (accent-free) for fuzzy matching
const allRoutes = [
  // Professional
  { to: "/", icon: LayoutDashboard, label: "Dashboard", keywords: "dashboard painel inicio home principal resumo overview", roles: ["nutritionist", "admin", "patient", "personal"], desc: "Página principal" },
  { to: "/patients", icon: Users, label: "Pacientes", keywords: "pacientes clientes lista gerenciar patients", roles: ["nutritionist", "admin", "personal"], desc: "Gerenciar pacientes" },
  { to: "/invite-patient", icon: UserPlus, label: "Convidar Paciente", keywords: "convidar paciente novo cadastro convite link magic whatsapp invite", roles: ["nutritionist", "admin", "personal"], desc: "Enviar convite de acesso" },
  { to: "/ranking", icon: Trophy, label: "Ranking Global", keywords: "ranking global classificacao pontos leaderboard competicao trofeu podio posicao", roles: ["nutritionist", "admin", "patient", "personal"], desc: "Classificação de pacientes" },
  { to: "/checkin-panel", icon: ClipboardCheck, label: "Painel Check-ins", keywords: "checkin checkins painel verificacao acompanhamento progresso peso medidas", roles: ["nutritionist", "admin"], desc: "Check-ins dos pacientes" },
  { to: "/appointments", icon: Activity, label: "Agenda", keywords: "agenda consultas appointments calendario marcacao horario atendimento", roles: ["nutritionist", "admin", "patient"], desc: "Agendar consultas" },
  { to: "/chat", icon: MessageSquare, label: "Chat", keywords: "chat mensagem conversa comunicacao mensagens bate-papo contato", roles: ["nutritionist", "admin", "patient"], desc: "Mensagens com pacientes" },
  { to: "/weekly-goals", icon: Target, label: "Metas Semanais", keywords: "metas semanais objetivos semanal goals weekly alvo", roles: ["nutritionist", "admin", "patient"], desc: "Definir metas da semana" },
  { to: "/protocols", icon: FileText, label: "Protocolos", keywords: "protocolos clinicos tratamento protocolo procedimentos regras plano", roles: ["nutritionist", "admin"], desc: "Protocolos clínicos" },
  { to: "/programs", icon: Rocket, label: "Programas", keywords: "programas programa nutricional grupo turma inscricao enrollment biquini", roles: ["nutritionist", "admin"], desc: "Programas nutricionais" },
  { to: "/automation", icon: Bot, label: "Automação", keywords: "automacao automatico regras triggers disparos notificacoes automatizadas bot", roles: ["nutritionist", "admin"], desc: "Regras de automação" },
  { to: "/meal-plans", icon: UtensilsCrossed, label: "Planos Alimentares", keywords: "planos alimentares dieta plano alimentar refeicao calorias macros cardapio", roles: ["nutritionist", "admin"], desc: "Gerenciar dietas" },
  { to: "/diet-templates", icon: BookOpen, label: "Templates de Dieta", keywords: "templates dieta modelo base pre-definido template padrao low carb cetogenica", roles: ["nutritionist", "admin"], desc: "Modelos de dieta" },
  { to: "/recipes", icon: ChefHat, label: "Receitas", keywords: "receitas receita culinaria cozinhar preparar alimento recipe", roles: ["nutritionist", "admin", "patient"], desc: "Receitas saudáveis" },
  { to: "/recipe-builder", icon: ChefHat, label: "Calculadora de Receitas", keywords: "calculadora receita macro calorias montar criar recipe builder", roles: ["nutritionist", "admin", "patient"], desc: "Monte e calcule macros" },
  { to: "/food-database", icon: Apple, label: "Banco de Alimentos", keywords: "banco alimentos database comida ingredientes tabela nutricional taco ibge", roles: ["nutritionist", "admin"], desc: "Base de dados de alimentos" },
  { to: "/reports", icon: BarChart3, label: "Relatórios", keywords: "relatorios relatorio report pdf exportar analise analytics dados evolucao", roles: ["nutritionist", "admin"], desc: "Relatórios e análises" },
  { to: "/clinical-intelligence", icon: Activity, label: "Inteligência Clínica", keywords: "inteligencia clinica ia analise risco alertas churn abandono", roles: ["nutritionist", "admin"], desc: "Motor de inteligência clínica" },
  { to: "/weekly-report", icon: FileBarChart, label: "Relatório Semanal", keywords: "relatorio semanal weekly report resumo semana", roles: ["nutritionist", "admin"], desc: "Resumo semanal" },
  { to: "/financial", icon: DollarSign, label: "Financeiro", keywords: "financeiro financas dinheiro pagamento receita despesa faturamento revenue lucro", roles: ["nutritionist", "admin"], desc: "Gestão financeira" },
  { to: "/supplements", icon: Pill, label: "Suplementação", keywords: "suplementos suplementacao vitamina mineral whey creatina omega capsulas", roles: ["nutritionist", "admin", "patient"], desc: "Suplementos recomendados" },
  { to: "/global-tips", icon: Lightbulb, label: "Dicas Globais", keywords: "dicas tips orientacoes conselhos saude nutricao global", roles: ["nutritionist", "admin", "patient"], desc: "Dicas de saúde" },
  { to: "/professional-guide", icon: Compass, label: "Guia do Profissional", keywords: "guia profissional tutorial ajuda como usar manual instrucoes", roles: ["nutritionist", "admin"], desc: "Manual do profissional" },
  { to: "/user-guide", icon: BookOpen, label: "Guia do Paciente", keywords: "guia paciente tutorial ajuda como usar manual", roles: ["nutritionist", "admin", "patient"], desc: "Manual do paciente" },
  { to: "/branding", icon: Palette, label: "Branding", keywords: "branding marca logo cores personalizar visual identidade", roles: ["nutritionist", "admin"], desc: "Personalizar identidade visual" },
  { to: "/feedbacks", icon: MessageSquare, label: "Feedbacks", keywords: "feedbacks avaliacoes opiniao satisfacao reclamacao elogios", roles: ["nutritionist", "admin", "patient"], desc: "Avaliações e feedbacks" },
  { to: "/settings", icon: Settings, label: "Configurações", keywords: "configuracoes ajustes preferencias perfil conta settings opcoes", roles: ["nutritionist", "admin", "patient", "personal"], desc: "Ajustes do sistema" },
  { to: "/notifications", icon: Bell, label: "Notificações", keywords: "notificacoes alertas avisos push sino notifications", roles: ["nutritionist", "admin", "patient", "personal"], desc: "Centro de notificações" },
  { to: "/body-analysis", icon: Camera, label: "Análise Corporal", keywords: "analise corporal corpo fotos composicao gordura massa muscular bioimpedancia", roles: ["nutritionist", "admin"], desc: "Análise de composição corporal" },
  { to: "/planner", icon: CalendarDays, label: "Planejamento", keywords: "planejamento planner organizacao calendario", roles: ["nutritionist", "admin"], desc: "Planejamento semanal" },
  { to: "/clinical-risk", icon: Shield, label: "Risco Clínico", keywords: "risco clinico dashboard alertas criticos pacientes risco abandono churn", roles: ["nutritionist", "admin"], desc: "Dashboard de risco clínico" },
  { to: "/curiosidades", icon: Sparkles, label: "Curiosidades", keywords: "curiosidades fatos interessantes sabia dica dia funfact", roles: ["nutritionist", "admin", "patient"], desc: "Fatos curiosos sobre saúde" },
  { to: "/library", icon: BookOpen, label: "Biblioteca", keywords: "biblioteca materiais recursos conteudos arquivos documentos library", roles: ["nutritionist", "admin"], desc: "Materiais e recursos" },
  { to: "/therapeutic-intelligence", icon: Brain, label: "Inteligência Terapêutica", keywords: "terapeutica inteligencia intervencao ajuste sugestao estrategia", roles: ["nutritionist", "admin"], desc: "Sugestões terapêuticas" },
  { to: "/clinical-orchestration", icon: Activity, label: "Orquestração Clínica", keywords: "orquestracao clinica pipeline motor processamento", roles: ["nutritionist", "admin"], desc: "Orquestração de motores clínicos" },
  { to: "/weight-trajectory", icon: TrendingUp, label: "Trajetória de Peso", keywords: "trajetoria peso evolucao grafico tendencia projecao", roles: ["nutritionist", "admin"], desc: "Análise de trajetória" },
  { to: "/admin/import-patients", icon: Users, label: "Importar Pacientes", keywords: "importar pacientes csv planilha excel upload massa bulk", roles: ["nutritionist", "admin"], desc: "Importar via CSV" },
  { to: "/integrations", icon: Globe, label: "Integrações", keywords: "integracoes integrar api webhook zapier stripe", roles: ["nutritionist", "admin", "personal"], desc: "Integrações externas" },
  { to: "/team", icon: Users, label: "Equipe Clínica", keywords: "equipe team funcionario colaborador permissoes hierarquia clinical employee", roles: ["nutritionist", "personal", "admin"], desc: "Gerenciar equipe clínica" },
  { to: "/physical-assessment", icon: Calculator, label: "Avaliação Física", keywords: "avaliacao fisica medidas antropometria dobras cutaneas perimetros composicao", roles: ["nutritionist", "admin"], desc: "Avaliação física" },
  // Patient only
  { to: "/meals", icon: Leaf, label: "Refeições", keywords: "refeicoes registrar comida foto meal log cafe almoco jantar lanche", roles: ["patient"], desc: "Registrar refeições" },
  { to: "/checklist", icon: ClipboardCheck, label: "Checklist Diário", keywords: "checklist tarefas diario rotina habitos daily tasks", roles: ["patient"], desc: "Tarefas do dia" },
  { to: "/my-diet", icon: UtensilsCrossed, label: "Minha Dieta", keywords: "minha dieta plano alimentar cardapio refeicoes do dia my diet", roles: ["patient"], desc: "Ver plano alimentar" },
  { to: "/my-workouts", icon: Dumbbell, label: "Meus Treinos", keywords: "meus treinos exercicios academia musculacao workout gym", roles: ["patient"], desc: "Treinos prescritos" },
  { to: "/journey", icon: TrendingUp, label: "Jornada", keywords: "jornada progresso evolucao timeline historico caminho", roles: ["patient"], desc: "Histórico de evolução" },
  { to: "/achievements", icon: Trophy, label: "Conquistas", keywords: "conquistas medalhas trofeus badges premios achievements gamificacao xp", roles: ["patient"], desc: "Medalhas e conquistas" },
  { to: "/challenges", icon: Target, label: "Desafios", keywords: "desafios challenges missoes missao reto competicao", roles: ["patient"], desc: "Desafios e missões" },
  { to: "/anamnesis", icon: ClipboardCheck, label: "Anamnese", keywords: "anamnese questionario formulario historico saude perguntas avaliacao inicial", roles: ["patient"], desc: "Questionário de saúde" },
  { to: "/shopping-list", icon: ShoppingCart, label: "Lista de Compras", keywords: "lista compras mercado supermercado ingredientes shopping", roles: ["patient"], desc: "Lista de compras" },
  { to: "/weight-calculator", icon: Scale, label: "Calculadora de Peso", keywords: "calculadora peso imc massa corporal ideal bmi", roles: ["patient"], desc: "Calculadora de peso ideal" },
  { to: "/water-calculator", icon: Droplets, label: "Calculadora de Água", keywords: "calculadora agua hidratacao litros ml beber water", roles: ["patient"], desc: "Quanto beber de água" },
  { to: "/health-quiz", icon: Heart, label: "Health Check Quiz", keywords: "quiz saude avaliacao teste health check pergunta score", roles: ["patient"], desc: "Teste de saúde" },
  { to: "/checkin", icon: ClipboardCheck, label: "Check-in", keywords: "checkin check-in peso medidas fotos enviar progresso", roles: ["patient"], desc: "Enviar check-in" },
  { to: "/analyze", icon: Camera, label: "Analisar Refeição", keywords: "analisar refeicao ia foto comida analise nutricional ai camera", roles: ["patient"], desc: "IA analisa sua refeição" },
  { to: "/my-referrals", icon: Share2, label: "Minhas Indicações", keywords: "indicacoes indicar amigo referral compartilhar convite", roles: ["patient"], desc: "Indicar amigos" },
  { to: "/body-projection", icon: Camera, label: "Projeção Corporal", keywords: "projecao corporal corpo futuro simulacao transformacao antes depois", roles: ["patient"], desc: "Projeção corporal" },
  // Personal
  { to: "/personal/dashboard", icon: LayoutDashboard, label: "Dashboard Personal", keywords: "dashboard personal trainer painel educador fisico", roles: ["personal"], desc: "Painel do personal" },
  { to: "/personal/students", icon: Users, label: "Alunos", keywords: "alunos estudantes personal lista gerenciar students", roles: ["personal"], desc: "Lista de alunos" },
  { to: "/personal/workouts", icon: Dumbbell, label: "Treinos", keywords: "treinos prescricao exercicios rotina workout abc fichas", roles: ["personal"], desc: "Prescrever treinos" },
  // Admin
  { to: "/admin", icon: Shield, label: "Painel Admin", keywords: "admin administracao painel controle total gerenciamento", roles: ["admin"], desc: "Administração geral" },
  { to: "/admin/features", icon: Zap, label: "Features Profissionais", keywords: "features funcionalidades profissionais flags controle ativar desativar toggle", roles: ["admin"], desc: "Controle de features para profissionais" },
  { to: "/admin/testimonials", icon: Star, label: "Depoimentos", keywords: "depoimentos testimonials avaliacoes clientes cases sucesso", roles: ["admin"], desc: "Gerenciar depoimentos" },
  { to: "/admin/pricing", icon: DollarSign, label: "Planos & Preços", keywords: "planos precos pricing assinatura valor mensal anual cobranca", roles: ["admin"], desc: "Gerenciar planos de preço" },
  { to: "/admin/patient-features", icon: Crown, label: "Features Paciente", keywords: "features paciente funcionalidades plano nivel gamificacao", roles: ["admin"], desc: "Features por nível de paciente" },
  { to: "/admin/profissionais", icon: Users, label: "Profissionais", keywords: "profissionais nutricionistas personal trainers cadastro equipe team", roles: ["admin"], desc: "Gerenciar profissionais" },
  { to: "/admin/growth", icon: TrendingUp, label: "Growth Dashboard", keywords: "growth crescimento metricas analytics kpi conversao funil", roles: ["admin"], desc: "Dashboard de crescimento" },
  { to: "/admin/prestige", icon: Crown, label: "Prestígio & Ranking", keywords: "prestigio prestige ranking planos prestigio pontos regras zerar reset coroa badge niveis tier medalha gamificacao", roles: ["admin"], desc: "Gerenciar sistema de prestígio" },
  { to: "/admin/landing-pages", icon: Globe, label: "Landing Pages", keywords: "landing pages pagina publica site marketing captura leads", roles: ["admin"], desc: "Páginas de captura" },
  { to: "/admin/subscription-monitor", icon: CreditCard, label: "Monitor Assinaturas", keywords: "assinaturas subscriptions monitor stripe pagamento recorrente faturamento", roles: ["admin"], desc: "Monitorar assinaturas" },
  { to: "/admin/booking-settings", icon: CalendarDays, label: "Agenda Pública", keywords: "agenda publica booking agendamento configuracao horarios", roles: ["admin"], desc: "Configurar agenda pública" },
  { to: "/admin/affiliates", icon: Megaphone, label: "Afiliados", keywords: "afiliados affiliates comissao indicacao parceiros revenue share", roles: ["admin"], desc: "Programa de afiliados" },
  { to: "/admin/protocol-fitjourney", icon: FileCheck, label: "Protocolo FitJourney", keywords: "protocolo fitjourney biquini branco programa protocolo clinico", roles: ["admin"], desc: "Protocolo FitJourney" },
  { to: "/admin/resources", icon: BookOpen, label: "Central de Recursos", keywords: "recursos centro materiais uploads documentos arquivos", roles: ["admin"], desc: "Central de materiais" },
  { to: "/admin/site-editor", icon: Palette, label: "Editor do Site", keywords: "editor site personalizar pagina visual layout", roles: ["admin"], desc: "Personalizar site" },
  { to: "/admin/menu-config", icon: Settings, label: "Config Menu", keywords: "configurar menu itens sidebar lateral navegacao ordem", roles: ["admin"], desc: "Configurar menu lateral" },
  { to: "/admin/audit-logs", icon: Shield, label: "Auditoria", keywords: "auditoria logs registro acoes seguranca historico audit trail", roles: ["admin"], desc: "Logs de auditoria" },
];

// Normalize text: remove accents, lowercase
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// ── Stable context: never changes identity after mount ──
const CommandPaletteContext = createContext<{ open: () => void }>({
  open: () => window.dispatchEvent(new CustomEvent("open-command-palette")),
});
export const useCommandPalette = () => useContext(CommandPaletteContext);

// Global event-based open (for components outside the context tree)
export function openCommandPalette() {
  window.dispatchEvent(new CustomEvent("open-command-palette"));
}

interface ProfileResult {
  user_id: string;
  full_name: string;
  email?: string;
  role: string;
}

interface MealPlanResult {
  id: string;
  title: string;
  patient_name: string;
}

interface ProtocolResult {
  id: string;
  name: string;
}

const roleLabels: Record<string, string> = {
  admin: "Admin",
  nutritionist: "Nutricionista",
  personal: "Personal",
  patient: "Paciente",
};


// ── Provider wrapper: renders children without re-mounting on dialog state ──
export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const openPalette = useCallback(() => {
    window.dispatchEvent(new CustomEvent("open-command-palette"));
  }, []);

  const ctxValue = useMemo(() => ({ open: openPalette }), [openPalette]);

  return (
    <CommandPaletteContext.Provider value={ctxValue}>
      {children}
      <CommandPaletteDialog />
    </CommandPaletteContext.Provider>
  );
}

// ── Dialog: isolated state, never causes parent/sibling re-renders ──
const CommandPaletteDialog = memo(function CommandPaletteDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const { user, isNutritionist, isPatient, isAdmin, isPersonal } = useAuth();
  const [patients, setPatients] = useState<ProfileResult[]>([]);
  const [professionals, setProfessionals] = useState<ProfileResult[]>([]);
  const [mealPlans, setMealPlans] = useState<MealPlanResult[]>([]);
  const [protocols, setProtocols] = useState<ProtocolResult[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    const openHandler = () => setIsOpen(true);
    window.addEventListener("open-command-palette", openHandler);
    return () => {
      document.removeEventListener("keydown", down);
      window.removeEventListener("open-command-palette", openHandler);
    };
  }, []);

  // Reset search when closing
  useEffect(() => {
    if (!isOpen) setSearchQuery("");
  }, [isOpen]);

  // Load profiles + extra data when palette opens
  useEffect(() => {
    if (!isOpen || dataLoaded) return;
    if (isPatient && !isAdmin && !isNutritionist && !isPersonal) {
      setDataLoaded(true);
      return;
    }

    (async () => {
      // Load meal plans and protocols in parallel with profiles
      const mealPlansPromise = (isNutritionist || isAdmin)
        ? supabase
            .from("meal_plans")
            .select("id, title, patient_id")
            .order("updated_at", { ascending: false })
            .limit(200)
        : Promise.resolve({ data: [] });

      const protocolsPromise = (isNutritionist || isAdmin)
        ? supabase
            .from("nutrition_protocols")
            .select("id, name")
            .eq("is_active", true)
            .order("name")
            .limit(100)
        : Promise.resolve({ data: [] });

      if (isAdmin) {
        const [profilesRes, rolesRes, mpRes, protoRes] = await Promise.all([
          supabase.from("profiles").select("user_id, full_name").order("full_name").limit(1000),
          supabase.from("user_roles").select("user_id, role").limit(2000),
          mealPlansPromise,
          protocolsPromise,
        ]);
        const profiles = profilesRes.data || [];
        const roles = rolesRes.data || [];

        const allIds = profiles.map((p: any) => p.user_id);
        const { data: emailsData } = await supabase.rpc("get_patient_emails", { _patient_ids: allIds });
        const emailMap = new Map<string, string>();
        ((emailsData as any[]) || []).forEach((e: any) => emailMap.set(e.user_id, e.email));

        const roleMap = new Map<string, string[]>();
        roles.forEach((r: any) => {
          const existing = roleMap.get(r.user_id) || [];
          existing.push(r.role);
          roleMap.set(r.user_id, existing);
        });

        const nameMap = new Map<string, string>();
        profiles.forEach((p: any) => nameMap.set(p.user_id, p.full_name || "Sem nome"));

        const patientList: ProfileResult[] = [];
        const proList: ProfileResult[] = [];

        profiles.forEach((p) => {
          const userRoles = roleMap.get(p.user_id) || ["patient"];
          const name = p.full_name || "Sem nome";
          const email = emailMap.get(p.user_id);
          const isPro = userRoles.some((r: string) => ["nutritionist", "personal", "admin"].includes(r));

          if (isPro) {
            const mainRole = userRoles.includes("admin") ? "admin" : userRoles.includes("nutritionist") ? "nutritionist" : "personal";
            proList.push({ user_id: p.user_id, full_name: name, email, role: mainRole });
          }
          if (userRoles.includes("patient") || !isPro) {
            patientList.push({ user_id: p.user_id, full_name: name, email, role: "patient" });
          }
        });

        setPatients(patientList);
        setProfessionals(proList);

        // Set meal plans with patient names
        setMealPlans(((mpRes as any).data || []).map((mp: any) => ({
          id: mp.id,
          title: mp.title || "Plano sem título",
          patient_name: nameMap.get(mp.patient_id) || "Paciente",
        })));

        setProtocols(((protoRes as any).data || []).map((p: any) => ({ id: p.id, name: p.name })));
      } else {
        const [linksRes, mpRes, protoRes] = await Promise.all([
          supabase
            .from("nutritionist_patients")
            .select("patient_id")
            .eq("nutritionist_id", user?.id || "")
            .eq("status", "active"),
          mealPlansPromise,
          protocolsPromise,
        ]);

        const links = linksRes.data || [];
        if (links.length > 0) {
          const ids = links.map(l => l.patient_id);
          const [profilesRes, emailsRes] = await Promise.all([
            supabase.from("profiles").select("user_id, full_name").in("user_id", ids),
            supabase.rpc("get_patient_emails", { _patient_ids: ids }),
          ]);
          const emailMap = new Map<string, string>();
          ((emailsRes.data as any[]) || []).forEach((e: any) => emailMap.set(e.user_id, e.email));

          const nameMap = new Map<string, string>();
          (profilesRes.data || []).forEach((p: any) => nameMap.set(p.user_id, p.full_name || "Sem nome"));

          setPatients((profilesRes.data || []).map(p => ({
            user_id: p.user_id,
            full_name: p.full_name || "Sem nome",
            email: emailMap.get(p.user_id),
            role: "patient"
          })));

          setMealPlans(((mpRes as any).data || []).map((mp: any) => ({
            id: mp.id,
            title: mp.title || "Plano sem título",
            patient_name: nameMap.get(mp.patient_id) || "Paciente",
          })));
        }

        setProtocols(((protoRes as any).data || []).map((p: any) => ({ id: p.id, name: p.name })));
      }
      setDataLoaded(true);
    })();
  }, [isOpen, dataLoaded, isPatient, isNutritionist, isAdmin, isPersonal, user?.id]);

  const userRoles = useMemo(() => {
    const r: string[] = [];
    if (isNutritionist) r.push("nutritionist");
    if (isPatient) r.push("patient");
    if (isAdmin) r.push("admin");
    if (isPersonal) r.push("personal");
    return r;
  }, [isNutritionist, isPatient, isAdmin, isPersonal]);

  const filteredRoutes = useMemo(
    () => allRoutes.filter((r) => r.roles.some((role) => userRoles.includes(role))),
    [userRoles]
  );

  // Smart filtering: normalize query and match against keywords + label + desc
  const normalizedQuery = useMemo(() => normalize(searchQuery), [searchQuery]);

  const matchedRoutes = useMemo(() => {
    if (!normalizedQuery) return filteredRoutes;
    return filteredRoutes.filter((r) => {
      const haystack = normalize(`${r.label} ${r.keywords} ${r.desc}`);
      const words = normalizedQuery.split(/\s+/).filter(Boolean);
      return words.every(w => haystack.includes(w));
    });
  }, [filteredRoutes, normalizedQuery]);

  const matchedPatients = useMemo(() => {
    if (!normalizedQuery) return patients;
    return patients.filter((p) => {
      const haystack = normalize(`paciente ${p.full_name} ${p.email || ""}`);
      const words = normalizedQuery.split(/\s+/).filter(Boolean);
      return words.every(w => haystack.includes(w));
    });
  }, [patients, normalizedQuery]);

  const matchedProfessionals = useMemo(() => {
    if (!normalizedQuery) return professionals;
    return professionals.filter((p) => {
      const haystack = normalize(`profissional ${p.full_name} ${p.email || ""} ${roleLabels[p.role] || p.role}`);
      const words = normalizedQuery.split(/\s+/).filter(Boolean);
      return words.every(w => haystack.includes(w));
    });
  }, [professionals, normalizedQuery]);

  const matchedMealPlans = useMemo(() => {
    if (!normalizedQuery) return [];
    return mealPlans.filter((mp) => {
      const haystack = normalize(`plano alimentar dieta ${mp.title} ${mp.patient_name}`);
      const words = normalizedQuery.split(/\s+/).filter(Boolean);
      return words.every(w => haystack.includes(w));
    }).slice(0, 8);
  }, [mealPlans, normalizedQuery]);

  const matchedProtocols = useMemo(() => {
    if (!normalizedQuery) return [];
    return protocols.filter((p) => {
      const haystack = normalize(`protocolo ${p.name}`);
      const words = normalizedQuery.split(/\s+/).filter(Boolean);
      return words.every(w => haystack.includes(w));
    }).slice(0, 6);
  }, [protocols, normalizedQuery]);

  const handleSelect = (to: string) => {
    setIsOpen(false);
    navigate(to);
  };

  return (
      <CommandDialog open={isOpen} onOpenChange={setIsOpen} shouldFilter={false}>
        <CommandInput
          placeholder="Buscar qualquer coisa: página, paciente, plano, protocolo..."
          value={searchQuery}
          onValueChange={setSearchQuery}
        />
        <CommandList>
          <CommandEmpty>
            <div className="flex flex-col items-center gap-1 py-4">
              <Search className="h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">Nenhum resultado para "{searchQuery}"</p>
              <p className="text-xs text-muted-foreground/70">Tente buscar por objetivo clínico, alimento ou estratégia nutricional</p>
            </div>
          </CommandEmpty>

          {/* Professionals for admin */}
          {matchedProfessionals.length > 0 && (
            <>
              <CommandGroup heading="👨‍⚕️ Profissionais">
                {matchedProfessionals.slice(0, 8).map((p) => (
                  <CommandItem
                    key={`pro-${p.user_id}`}
                    value={`pro-${p.user_id}`}
                    onSelect={() => handleSelect(`/patients/${p.user_id}`)}
                    className="cursor-pointer"
                    forceMount
                  >
                    <Shield className="mr-2 h-4 w-4 text-muted-foreground" />
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="truncate">{p.full_name}</span>
                      {p.email && <span className="text-xs text-muted-foreground truncate">{p.email}</span>}
                    </div>
                    <span className="ml-auto text-xs text-muted-foreground shrink-0">{roleLabels[p.role]}</span>
                  </CommandItem>
                ))}
                {matchedProfessionals.length > 8 && (
                  <p className="text-xs text-muted-foreground text-center py-1">
                    +{matchedProfessionals.length - 8} profissionais...
                  </p>
                )}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

          {/* Patient results for professionals */}
          {matchedPatients.length > 0 && (
            <>
              <CommandGroup heading="👤 Pacientes">
                {matchedPatients.slice(0, 10).map((p) => (
                  <CommandItem
                    key={`pat-${p.user_id}`}
                    value={`pat-${p.user_id}`}
                    onSelect={() => handleSelect(`/patients/${p.user_id}`)}
                    className="cursor-pointer"
                    forceMount
                  >
                    <User className="mr-2 h-4 w-4 text-muted-foreground" />
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="truncate">{p.full_name}</span>
                      {p.email && <span className="text-xs text-muted-foreground truncate">{p.email}</span>}
                    </div>
                  </CommandItem>
                ))}
                {matchedPatients.length > 10 && (
                  <p className="text-xs text-muted-foreground text-center py-1">
                    +{matchedPatients.length - 10} pacientes...
                  </p>
                )}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

          {/* Meal Plans */}
          {matchedMealPlans.length > 0 && (
            <>
              <CommandGroup heading="🍽️ Planos Alimentares">
                {matchedMealPlans.map((mp) => (
                  <CommandItem
                    key={`mp-${mp.id}`}
                    value={`mp-${mp.id}`}
                    onSelect={() => handleSelect(`/meal-plans/${mp.id}`)}
                    className="cursor-pointer"
                    forceMount
                  >
                    <UtensilsCrossed className="mr-2 h-4 w-4 text-muted-foreground" />
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="truncate">{mp.title}</span>
                      <span className="text-xs text-muted-foreground truncate">{mp.patient_name}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

          {/* Protocols */}
          {matchedProtocols.length > 0 && (
            <>
              <CommandGroup heading="📋 Protocolos">
                {matchedProtocols.map((p) => (
                  <CommandItem
                    key={`proto-${p.id}`}
                    value={`proto-${p.id}`}
                    onSelect={() => handleSelect(`/protocols`)}
                    className="cursor-pointer"
                    forceMount
                  >
                    <FileText className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{p.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

          {matchedRoutes.length > 0 && (
            <CommandGroup heading="🧭 Navegação">
              {matchedRoutes.map((route) => (
                <CommandItem
                  key={route.to}
                  value={`nav-${route.to}`}
                  onSelect={() => handleSelect(route.to)}
                  className="cursor-pointer"
                  forceMount
                >
                  <route.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-col flex-1 min-w-0">
                    <span>{route.label}</span>
                    <span className="text-xs text-muted-foreground">{route.desc}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
  );
});

// Keep default export for backwards compat (renders just the dialog)
export default CommandPaletteDialog;
