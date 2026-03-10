import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Save, Plus, Trash2, Loader2, Eye, Sparkles,
    MessageCircle, DollarSign, Users, HelpCircle,
    X, Crown, Flame,
    CheckCircle, Zap, Target, Gift, Star,
    Settings, RefreshCw, Activity,
    PlayCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';

// ============ TYPES ============

type Plan = {
    name: string;
    price: string;
    priceNote: string;
    tagline: string;
    features: string[];
    highlight: boolean;
    active: boolean;
};

type Testimonial = {
    name: string;
    text: string;
    result: string;
    image: string;
};

type FaqItem = {
    question: string;
    answer: string;
};

type ProjectData = {
    projectName: string;
    heroSubtitle: string;
    heroTagline: string;
    myths: string[];
    benefits: { icon: string; text: string }[];
    biweeklyTasks: string[];
    supportGroups: { icon: string; text: string }[];
    plans: Plan[];
    testimonials: Testimonial[];
    faq: FaqItem[];
    ctaMain: string;
    ctaUrgency: string;
    ctaEmotional: string;
    ctaFinal: string;
    whatsappNumber: string;
    instagramUrl: string;
};

type Protocol = {
    id: string;
    name: string;
};

type ProgramRule = {
    id: string;
    protocol_id: string;
    protocol_name?: string;
    trigger_month: number;
    auto_activate: boolean;
    notes?: string;
};

type GestaoOverview = {
    patients?: { id: string; name: string; current_phase: number; status?: string }[];
    rules?: ProgramRule[];
    summary?: {
        total: number;
        needs_attention: number;
        on_track: number;
        rules_total: number;
    };
};

// ============ DEFAULT DATA ============

const DEFAULT_DATA: ProjectData = {
    projectName: 'Projeto Biquíni Branco',
    heroSubtitle: 'EMAGRECIMENTO INTELIGENTE',
    heroTagline: 'Um processo completo para emagrecer com saúde, sem efeito sanfona e sem sofrimento.',
    myths: [
        'Emagrecer em 1 mês é furada',
        'Remédio não resolve',
        'O resultado só permanece quando você aprende a comer',
        'A mudança começa na mente e reflete no corpo'
    ],
    benefits: [
        { icon: 'Calendar', text: '3 meses de acompanhamento' },
        { icon: 'Utensils', text: '3 ajustes estratégicos na dieta' },
        { icon: 'Clock', text: 'Mudança de protocolo a cada 30 dias' }
    ],
    biweeklyTasks: ['Envio de peso', 'Fotos de acompanhamento'],
    supportGroups: [
        { icon: 'Users', text: 'Grupo de bate-papo' },
        { icon: 'Camera', text: 'Fotos das refeições' },
        { icon: 'Dumbbell', text: 'Treinos e academia' }
    ],
    plans: [
        {
            name: 'MENSAL', price: 'R$ 80', priceNote: 'Experimente primeiro',
            tagline: '1 MÊS PARA COMEÇAR',
            features: ['Plano alimentar personalizado', 'Checklist diário', 'Suporte WhatsApp'],
            highlight: false, active: true
        },
        {
            name: 'TRIMESTRAL', price: 'R$ 200', priceNote: 'Plano mais popular',
            tagline: '3 MESES DE FOCO TOTAL',
            features: ['Tudo do plano mensal', 'Ajustes a cada 30 dias', 'Acesso aos 2 grupos', '3 ajustes estratégicos'],
            highlight: true, active: true
        },
        {
            name: 'SEMESTRAL', price: 'R$ 360', priceNote: 'Economia de R$40',
            tagline: '6 MESES PARA TRANSFORMAR',
            features: ['Tudo do plano trimestral', 'Receitas exclusivas', 'Prioridade no atendimento', 'Suplementação básica'],
            highlight: false, active: true
        }
    ],
    testimonials: [
        { name: 'Ana Paula', text: 'Perdi 12kg em 3 meses! Finalmente entendi como comer direito.', result: '-12kg', image: '' },
        { name: 'Carla Santos', text: 'O suporte no grupo faz toda diferença. Não me sinto sozinha!', result: '-8kg', image: '' },
        { name: 'Mariana Costa', text: 'Sem passar fome e sem efeito sanfona. Recomendo muito!', result: '-10kg', image: '' }
    ],
    faq: [
        { question: 'Como funciona o acompanhamento?', answer: 'Você terá acesso à plataforma FitJourney com seu plano personalizado, tarefas diárias, e suporte direto comigo via WhatsApp.' },
        { question: 'Preciso malhar?', answer: 'Não é obrigatório, mas atividade física potencializa os resultados.' },
        { question: 'Vou passar fome?', answer: 'De jeito nenhum! O diferencial do programa é ensinar você a comer de forma inteligente.' },
        { question: 'E se eu não conseguir seguir?', answer: 'Por isso temos os grupos de suporte! Você não está sozinha.' }
    ],
    ctaMain: 'QUERO TRANSFORMAR MEU CORPO',
    ctaUrgency: '🔥 VAGAS LIMITADAS',
    ctaEmotional: 'Seu biquíni branco não vai se conquistar sozinho. Garanta sua vaga agora e comece a mudança hoje!',
    ctaFinal: 'Centenas de mulheres já transformaram suas vidas. Agora é sua vez!',
    whatsappNumber: '5591980124814',
    instagramUrl: 'https://www.instagram.com'
};

// ============ MAIN COMPONENT ============

const AdminProjetoEditor = () => {
    const { profile } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('gestao');
    const [projectData, setProjectData] = useState<ProjectData>(DEFAULT_DATA);

    // Gestão do Programa
    const [gestaoLoading, setGestaoLoading] = useState(false);
    const [gestaoOverview, setGestaoOverview] = useState<GestaoOverview | null>(null);
    const [applyingRules, setApplyingRules] = useState(false);
    const [applyResult, setApplyResult] = useState<{ dry_run: boolean; activated_count: number; manual_pending_count?: number; manual_pending?: { patient_name: string; protocol_name: string; trigger_month: number }[]; error_count?: number } | null>(null);
    const [showRuleForm, setShowRuleForm] = useState(false);
    const [ruleForm, setRuleForm] = useState({ protocol_id: '', protocol_name: '', trigger_month: 1, auto_activate: false, notes: '' });
    const [savingRule, setSavingRule] = useState(false);
    const [deletingRule, setDeletingRule] = useState<string | null>(null);
    const [protocols, setProtocols] = useState<Protocol[]>([]);

    useEffect(() => {
        if (profile?.role !== 'admin') {
            toast.error('Acesso negado');
            navigate('/');
            return;
        }
        loadProjectData();
    }, [profile]);

    const loadProjectData = async () => {
        try {
            // Use any to bypass TypeScript strict table checking
            const { data } = await (supabase as any)
                .from('project_showcase')
                .select('*')
                .eq('project_name', 'biquini_branco')
                .maybeSingle();
            if (data?.content) {
                setProjectData((prev) => ({ ...prev, ...data.content }));
            }
        } catch (err) {
            console.error('Erro ao carregar:', err);
        } finally {
            setLoading(false);
        }
    };

    const loadProtocols = async () => {
        try {
            const { data } = await supabase.from('protocols' as any).select('id, name').order('name');
            if (data) setProtocols(data as Protocol[]);
        } catch (err) {
            console.error('Protocols load error:', err);
        }
    };

    const loadGestao = async (silent = false) => {
        if (!silent) setGestaoLoading(true);
        try {
            if (protocols.length === 0) await loadProtocols();

            const [patientsResult, rulesResult] = await Promise.all([
                (supabase as any).from('program_enrollments').select('id, patient_id, current_phase, profiles(name)').eq('program_id', 'biquini_branco'),
                (supabase as any).from('program_protocol_rules').select('*').eq('program_id', 'biquini_branco').order('trigger_month')
            ]);

            const patients = (patientsResult.data || []).map((p: any) => ({
                id: p.id,
                patient_id: p.patient_id,
                current_phase: p.current_phase,
                name: p.profiles?.name || 'Paciente'
            }));
            const rules = rulesResult.data || [];

            setGestaoOverview({
                patients,
                rules,
                summary: {
                    total: patients.length,
                    needs_attention: patients.filter((p: any) => p.current_phase > 2).length,
                    on_track: patients.filter((p: any) => p.current_phase <= 2).length,
                    rules_total: rules.length
                }
            });
        } catch (err) {
            console.error('Gestão load error:', err);
            if (!silent) toast.error('Erro ao carregar visão do programa');
        } finally {
            setGestaoLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'gestao') loadGestao();
    }, [activeTab]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const { data: existing } = await (supabase as any)
                .from('project_showcase')
                .select('id')
                .eq('project_name', 'biquini_branco')
                .maybeSingle();

            if (existing) {
                await (supabase as any)
                    .from('project_showcase')
                    .update({ content: projectData, updated_at: new Date().toISOString() })
                    .eq('project_name', 'biquini_branco');
            } else {
                await (supabase as any)
                    .from('project_showcase')
                    .insert({ project_name: 'biquini_branco', content: projectData });
            }
            toast.success('Projeto salvo com sucesso! 🎉');
        } catch (err: any) {
            toast.error('Erro ao salvar: ' + (err?.message || 'Verifique se a tabela existe no Supabase'));
        } finally {
            setSaving(false);
        }
    };

    const handleCreateRule = async () => {
        if (!ruleForm.protocol_id || !ruleForm.trigger_month) {
            toast.error('Selecione o protocolo e o mês de ativação');
            return;
        }
        setSavingRule(true);
        try {
            await (supabase as any).from('program_protocol_rules').insert({
                ...ruleForm,
                trigger_month: parseInt(String(ruleForm.trigger_month)),
                program_id: 'biquini_branco',
            });
            toast.success('Regra criada!');
            setShowRuleForm(false);
            setRuleForm({ protocol_id: '', protocol_name: '', trigger_month: 1, auto_activate: false, notes: '' });
            await loadGestao(true);
        } catch {
            toast.error('Erro ao criar regra');
        } finally {
            setSavingRule(false);
        }
    };

    const handleDeleteRule = async (ruleId: string) => {
        setDeletingRule(ruleId);
        try {
            await (supabase as any).from('program_protocol_rules').delete().eq('id', ruleId);
            toast.success('Regra removida');
            await loadGestao(true);
        } catch {
            toast.error('Erro ao remover regra');
        } finally {
            setDeletingRule(null);
        }
    };

    // Helpers para edição de projectData
    const updateField = <K extends keyof ProjectData>(field: K, value: ProjectData[K]) =>
        setProjectData((prev) => ({ ...prev, [field]: value }));

    const updateArrayItem = (arrayName: 'myths' | 'biweeklyTasks' | 'testimonials' | 'faq' | 'plans' | 'benefits' | 'supportGroups', index: number, value: any) =>
        setProjectData((prev) => ({ ...prev, [arrayName]: (prev[arrayName] as any[]).map((item: any, i: number) => i === index ? value : item) }));

    const addArrayItem = (arrayName: 'myths' | 'biweeklyTasks' | 'testimonials' | 'faq' | 'plans' | 'benefits' | 'supportGroups', newItem: any) =>
        setProjectData((prev) => ({ ...prev, [arrayName]: [...(prev[arrayName] as any[]), newItem] }));

    const removeArrayItem = (arrayName: 'myths' | 'biweeklyTasks' | 'testimonials' | 'faq' | 'plans' | 'benefits' | 'supportGroups', index: number) =>
        setProjectData((prev) => ({ ...prev, [arrayName]: (prev[arrayName] as any[]).filter((_: any, i: number) => i !== index) }));

    const TABS = [
        { id: 'gestao', label: '🎯 Gestão', icon: Target },
        { id: 'hero', label: 'Hero', icon: Sparkles },
        { id: 'planos', label: 'Planos', icon: DollarSign },
        { id: 'depoimentos', label: 'Depoimentos', icon: MessageCircle },
        { id: 'faq', label: 'FAQ', icon: HelpCircle },
        { id: 'cta', label: 'CTA', icon: Star },
    ];

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-64">
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-pink-200 rounded-full animate-spin border-t-pink-600" />
                        <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-pink-600" />
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="max-w-6xl mx-auto space-y-6 pb-8">

                {/* HEADER */}
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-pink-600 via-rose-500 to-orange-500 p-8 text-white shadow-2xl">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32 blur-2xl" />
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                        <div className="flex items-center gap-3">
                            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
                                <Crown className="w-7 h-7" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h1 className="text-3xl font-black tracking-tight">Editor do Projeto</h1>
                                    <Badge className="bg-white/20 text-white border-0 text-[10px] font-bold">ADMIN</Badge>
                                </div>
                                <p className="text-white/80">Personalize a página do Projeto Biquíni Branco</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                onClick={() => window.open('/programs/biquini-branco', '_blank')}
                                className="bg-white/10 border-white/30 text-white hover:bg-white/20 backdrop-blur-sm"
                            >
                                <Eye className="h-4 w-4 mr-2" />
                                Visualizar
                            </Button>
                            <Button
                                onClick={handleSave}
                                disabled={saving}
                                className="bg-white text-pink-600 hover:bg-white/90 shadow-lg font-bold"
                            >
                                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                                {saving ? 'Salvando...' : 'Salvar Alterações'}
                            </Button>
                        </div>
                    </div>
                    <div className="grid grid-cols-4 gap-4 mt-6">
                        {[
                            { label: 'Planos', value: projectData.plans.filter(p => p.active !== false).length, icon: DollarSign },
                            { label: 'Depoimentos', value: projectData.testimonials.length, icon: MessageCircle },
                            { label: 'FAQs', value: projectData.faq.length, icon: HelpCircle },
                            { label: 'Benefícios', value: projectData.benefits.length, icon: Gift }
                        ].map((stat, i) => {
                            const Icon = stat.icon;
                            return (
                                <div key={i} className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
                                    <Icon className="w-5 h-5 mx-auto mb-1 opacity-80" />
                                    <p className="text-2xl font-bold">{stat.value}</p>
                                    <p className="text-xs text-white/70">{stat.label}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* TABS */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <TabsList className="flex gap-2 p-2 bg-white rounded-2xl shadow-lg border border-gray-100 overflow-x-auto h-auto flex-wrap">
                        {TABS.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <TabsTrigger
                                    key={tab.id}
                                    value={tab.id}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap
                    ${isActive ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                                >
                                    <Icon className="h-4 w-4" />
                                    {tab.label}
                                </TabsTrigger>
                            );
                        })}
                    </TabsList>

                    {/* ===== TAB GESTÃO ===== */}
                    <TabsContent value="gestao" className="space-y-5 mt-4">
                        {gestaoLoading ? (
                            <div className="flex items-center justify-center py-20 gap-3 text-purple-600">
                                <Loader2 className="w-6 h-6 animate-spin" />
                                <span className="font-medium">Carregando visão global do programa...</span>
                            </div>
                        ) : (
                            <>
                                {/* KPIs header */}
                                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-6 text-white shadow-xl">
                                    <div className="flex items-center justify-between gap-4 mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-3 bg-white/15 rounded-xl">
                                                <Target className="w-7 h-7" />
                                            </div>
                                            <div>
                                                <h2 className="text-xl font-bold">Central de Gestão do Programa</h2>
                                                <p className="text-white/70 text-sm">Regras globais · Visão de todos os pacientes</p>
                                            </div>
                                        </div>
                                        <Button size="sm" variant="ghost"
                                            className="text-white/80 hover:text-white hover:bg-white/10 border border-white/20"
                                            onClick={() => loadGestao()}>
                                            <RefreshCw className="w-4 h-4 mr-1" />Atualizar
                                        </Button>
                                    </div>
                                    {gestaoOverview?.summary && (
                                        <div className="grid grid-cols-4 gap-3">
                                            {[
                                                { label: 'Pacientes', value: gestaoOverview.summary.total, icon: Users },
                                                { label: 'Precisam atenção', value: gestaoOverview.summary.needs_attention, icon: Flame },
                                                { label: 'No caminho certo', value: gestaoOverview.summary.on_track, icon: CheckCircle },
                                                { label: 'Regras ativas', value: gestaoOverview.summary.rules_total, icon: Zap },
                                            ].map((k, i) => (
                                                <div key={i} className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20 text-center">
                                                    <k.icon className="w-4 h-4 mx-auto mb-1 opacity-80" />
                                                    <p className="text-2xl font-black">{k.value}</p>
                                                    <p className="text-[11px] text-white/70 leading-tight">{k.label}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Regras */}
                                <Card className="border-purple-200 shadow-sm overflow-hidden">
                                    <div className="h-1 bg-gradient-to-r from-violet-500 to-purple-600" />
                                    <CardHeader className="bg-purple-50/50 border-b border-purple-100 pb-3 pt-4">
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="flex items-center gap-2 text-purple-900 text-base">
                                                <Zap className="w-4 h-4 text-purple-600" />
                                                Regras de Ativação do Programa
                                            </CardTitle>
                                            <div className="flex gap-2">
                                                <Button size="sm" variant="outline"
                                                    className="border-purple-300 text-purple-700 hover:bg-purple-50 text-xs h-8"
                                                    onClick={() => setShowRuleForm(p => !p)}>
                                                    <Plus className="w-3 h-3 mr-1" />Nova regra
                                                </Button>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-4 space-y-3">
                                        {/* Formulário nova regra */}
                                        {showRuleForm && (
                                            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 space-y-3">
                                                <p className="text-sm font-bold text-purple-900">Nova Regra de Protocolo</p>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="text-xs text-gray-500 font-medium">Protocolo</label>
                                                        <select
                                                            className="mt-1 w-full h-9 px-3 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:border-purple-400"
                                                            value={ruleForm.protocol_id}
                                                            onChange={e => {
                                                                const p = protocols.find(p => p.id === e.target.value);
                                                                setRuleForm(f => ({ ...f, protocol_id: e.target.value, protocol_name: p?.name || '' }));
                                                            }}>
                                                            <option value="">Selecione...</option>
                                                            {protocols.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-gray-500 font-medium">Ativar no Mês</label>
                                                        <input type="number" min="1" max="24"
                                                            className="mt-1 w-full h-9 px-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-purple-400"
                                                            value={ruleForm.trigger_month}
                                                            onChange={e => setRuleForm(f => ({ ...f, trigger_month: parseInt(e.target.value) }))} />
                                                    </div>
                                                    <div className="col-span-2">
                                                        <label className="text-xs text-gray-500 font-medium">Observações (opcional)</label>
                                                        <input type="text"
                                                            className="mt-1 w-full h-9 px-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-purple-400"
                                                            placeholder="Ex: Protocolo de retenção hídrica"
                                                            value={ruleForm.notes}
                                                            onChange={e => setRuleForm(f => ({ ...f, notes: e.target.value }))} />
                                                    </div>
                                                    <div className="col-span-2 flex items-center gap-3">
                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                            <input type="checkbox"
                                                                className="w-4 h-4 rounded accent-purple-600"
                                                                checked={ruleForm.auto_activate}
                                                                onChange={e => setRuleForm(f => ({ ...f, auto_activate: e.target.checked }))} />
                                                            <span className="text-xs font-medium text-gray-700">Ativar automaticamente</span>
                                                        </label>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2 pt-1">
                                                    <Button size="sm" variant="ghost" className="text-gray-500 text-xs h-8"
                                                        onClick={() => setShowRuleForm(false)}>
                                                        <X className="w-3 h-3 mr-1" />Cancelar
                                                    </Button>
                                                    <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white text-xs h-8"
                                                        disabled={savingRule} onClick={handleCreateRule}>
                                                        {savingRule ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />}
                                                        Salvar regra
                                                    </Button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Lista de regras */}
                                        {(!gestaoOverview?.rules || gestaoOverview.rules.length === 0) && !showRuleForm ? (
                                            <div className="text-center py-8 border border-dashed border-purple-200 rounded-xl">
                                                <Zap className="w-8 h-8 text-purple-300 mx-auto mb-2" />
                                                <p className="text-sm font-medium text-purple-700">Nenhuma regra configurada</p>
                                                <p className="text-xs text-purple-400 mt-1">Crie regras para automatizar a ativação de protocolos por mês</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {(gestaoOverview?.rules || []).map(rule => (
                                                    <div key={rule.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-xl hover:border-purple-200 transition-colors">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white flex-shrink-0">
                                                                <span className="font-black text-sm">M{rule.trigger_month}</span>
                                                            </div>
                                                            <div>
                                                                <p className="font-semibold text-gray-900 text-sm">{rule.protocol_name || rule.protocol_id}</p>
                                                                <div className="flex items-center gap-2 mt-0.5">
                                                                    <span className="text-xs text-gray-500">Mês {rule.trigger_month}</span>
                                                                    {rule.auto_activate ? (
                                                                        <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-bold">AUTO</span>
                                                                    ) : (
                                                                        <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-bold">MANUAL</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <button className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                                                            disabled={deletingRule === rule.id}
                                                            onClick={() => handleDeleteRule(rule.id)}>
                                                            {deletingRule === rule.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Pacientes do programa */}
                                {gestaoOverview?.patients && gestaoOverview.patients.length > 0 && (
                                    <Card className="shadow-sm overflow-hidden">
                                        <div className="h-1 bg-gradient-to-r from-violet-500 to-purple-600" />
                                        <CardHeader className="pb-3 pt-4 border-b">
                                            <CardTitle className="flex items-center gap-2 text-gray-800 text-base">
                                                <Users className="w-4 h-4 text-gray-500" />
                                                Pacientes do Programa ({gestaoOverview.patients.length})
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-4">
                                            <div className="space-y-2">
                                                {gestaoOverview.patients.map((p) => (
                                                    <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 hover:bg-gray-100 transition-colors">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                                                                {p.name.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <p className="font-semibold text-gray-900 text-sm">{p.name}</p>
                                                                <p className="text-xs text-gray-500">Fase {p.current_phase}</p>
                                                            </div>
                                                        </div>
                                                        <Badge className={p.current_phase <= 2 ? 'bg-emerald-100 text-emerald-700 border-0' : 'bg-amber-100 text-amber-700 border-0'}>
                                                            {p.current_phase <= 2 ? '✓ No caminho' : '⚠️ Atenção'}
                                                        </Badge>
                                                    </div>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}
                            </>
                        )}
                    </TabsContent>

                    {/* ===== TAB HERO ===== */}
                    <TabsContent value="hero" className="space-y-4 mt-4">
                        <Card>
                            <CardHeader><CardTitle>Hero da Landing Page</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <Label>Nome do Projeto</Label>
                                    <Input value={projectData.projectName} onChange={e => updateField('projectName', e.target.value)} />
                                </div>
                                <div>
                                    <Label>Subtítulo (tagline curta)</Label>
                                    <Input value={projectData.heroSubtitle} onChange={e => updateField('heroSubtitle', e.target.value)} />
                                </div>
                                <div>
                                    <Label>Tagline principal</Label>
                                    <Textarea value={projectData.heroTagline} onChange={e => updateField('heroTagline', e.target.value)} />
                                </div>
                                <div>
                                    <Label>WhatsApp</Label>
                                    <Input value={projectData.whatsappNumber} onChange={e => updateField('whatsappNumber', e.target.value)} />
                                </div>
                                <div>
                                    <Label>Instagram URL</Label>
                                    <Input value={projectData.instagramUrl} onChange={e => updateField('instagramUrl', e.target.value)} />
                                </div>
                                <div>
                                    <Label className="mb-2 block">Mitos / Verdades</Label>
                                    {projectData.myths.map((m, i) => (
                                        <div key={i} className="flex gap-2 mb-2">
                                            <Input value={m} onChange={e => updateArrayItem('myths', i, e.target.value)} />
                                            <Button size="icon" variant="ghost" onClick={() => removeArrayItem('myths', i)}>
                                                <Trash2 className="w-4 h-4 text-red-500" />
                                            </Button>
                                        </div>
                                    ))}
                                    <Button size="sm" variant="outline" onClick={() => addArrayItem('myths', 'Novo item')}>
                                        <Plus className="w-3 h-3 mr-1" /> Adicionar
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* ===== TAB PLANOS ===== */}
                    <TabsContent value="planos" className="space-y-4 mt-4">
                        {projectData.plans.map((plan, pi) => (
                            <Card key={pi} className={plan.highlight ? 'border-amber-400 shadow-md' : ''}>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-base">{plan.name}</CardTitle>
                                        <div className="flex gap-2 items-center">
                                            {plan.highlight && <Badge className="bg-amber-100 text-amber-700 border-0">⭐ Destaque</Badge>}
                                            <Button size="icon" variant="ghost" onClick={() => removeArrayItem('plans', pi)}>
                                                <Trash2 className="w-4 h-4 text-red-500" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <Label>Nome</Label>
                                            <Input value={plan.name} onChange={e => updateArrayItem('plans', pi, { ...plan, name: e.target.value })} />
                                        </div>
                                        <div>
                                            <Label>Preço</Label>
                                            <Input value={plan.price} onChange={e => updateArrayItem('plans', pi, { ...plan, price: e.target.value })} />
                                        </div>
                                        <div>
                                            <Label>Nota do preço</Label>
                                            <Input value={plan.priceNote} onChange={e => updateArrayItem('plans', pi, { ...plan, priceNote: e.target.value })} />
                                        </div>
                                        <div>
                                            <Label>Tagline</Label>
                                            <Input value={plan.tagline} onChange={e => updateArrayItem('plans', pi, { ...plan, tagline: e.target.value })} />
                                        </div>
                                    </div>
                                    <div>
                                        <Label className="mb-2 block">Funcionalidades</Label>
                                        {plan.features.map((f, fi) => (
                                            <div key={fi} className="flex gap-2 mb-2">
                                                <Input value={f} onChange={e => {
                                                    const newFeatures = [...plan.features];
                                                    newFeatures[fi] = e.target.value;
                                                    updateArrayItem('plans', pi, { ...plan, features: newFeatures });
                                                }} />
                                                <Button size="icon" variant="ghost" onClick={() => {
                                                    const newFeatures = plan.features.filter((_, i) => i !== fi);
                                                    updateArrayItem('plans', pi, { ...plan, features: newFeatures });
                                                }}>
                                                    <X className="w-4 h-4 text-red-400" />
                                                </Button>
                                            </div>
                                        ))}
                                        <Button size="sm" variant="outline" onClick={() => {
                                            updateArrayItem('plans', pi, { ...plan, features: [...plan.features, 'Nova feature'] });
                                        }}>
                                            <Plus className="w-3 h-3 mr-1" /> Adicionar feature
                                        </Button>
                                    </div>
                                    <div className="flex gap-4 pt-1">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" checked={plan.highlight} onChange={e => updateArrayItem('plans', pi, { ...plan, highlight: e.target.checked })} />
                                            <span className="text-sm">Plano destaque</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" checked={plan.active} onChange={e => updateArrayItem('plans', pi, { ...plan, active: e.target.checked })} />
                                            <span className="text-sm">Ativo</span>
                                        </label>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                        <Button variant="outline" className="w-full" onClick={() => addArrayItem('plans', {
                            name: 'NOVO PLANO', price: 'R$ 0', priceNote: '', tagline: '', features: ['Feature 1'], highlight: false, active: true
                        })}>
                            <Plus className="w-4 h-4 mr-2" /> Adicionar Plano
                        </Button>
                    </TabsContent>

                    {/* ===== TAB DEPOIMENTOS ===== */}
                    <TabsContent value="depoimentos" className="space-y-4 mt-4">
                        {projectData.testimonials.map((t, ti) => (
                            <Card key={ti}>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-base">{t.name || 'Depoimento'}</CardTitle>
                                        <Button size="icon" variant="ghost" onClick={() => removeArrayItem('testimonials', ti)}>
                                            <Trash2 className="w-4 h-4 text-red-500" />
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <Label>Nome</Label>
                                            <Input value={t.name} onChange={e => updateArrayItem('testimonials', ti, { ...t, name: e.target.value })} />
                                        </div>
                                        <div>
                                            <Label>Resultado</Label>
                                            <Input value={t.result} onChange={e => updateArrayItem('testimonials', ti, { ...t, result: e.target.value })} />
                                        </div>
                                    </div>
                                    <div>
                                        <Label>Texto do depoimento</Label>
                                        <Textarea value={t.text} onChange={e => updateArrayItem('testimonials', ti, { ...t, text: e.target.value })} />
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                        <Button variant="outline" className="w-full" onClick={() => addArrayItem('testimonials', { name: 'Nome', text: 'Depoimento...', result: '-Xkg', image: '' })}>
                            <Plus className="w-4 h-4 mr-2" /> Adicionar Depoimento
                        </Button>
                    </TabsContent>

                    {/* ===== TAB FAQ ===== */}
                    <TabsContent value="faq" className="space-y-4 mt-4">
                        {projectData.faq.map((item, fi) => (
                            <Card key={fi}>
                                <CardContent className="pt-4 space-y-3">
                                    <div className="flex items-start gap-2">
                                        <div className="flex-1 space-y-2">
                                            <div>
                                                <Label>Pergunta</Label>
                                                <Input value={item.question} onChange={e => updateArrayItem('faq', fi, { ...item, question: e.target.value })} />
                                            </div>
                                            <div>
                                                <Label>Resposta</Label>
                                                <Textarea value={item.answer} onChange={e => updateArrayItem('faq', fi, { ...item, answer: e.target.value })} />
                                            </div>
                                        </div>
                                        <Button size="icon" variant="ghost" onClick={() => removeArrayItem('faq', fi)} className="mt-5">
                                            <Trash2 className="w-4 h-4 text-red-500" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                        <Button variant="outline" className="w-full" onClick={() => addArrayItem('faq', { question: 'Nova pergunta?', answer: 'Resposta...' })}>
                            <Plus className="w-4 h-4 mr-2" /> Adicionar FAQ
                        </Button>
                    </TabsContent>

                    {/* ===== TAB CTA ===== */}
                    <TabsContent value="cta" className="space-y-4 mt-4">
                        <Card>
                            <CardHeader><CardTitle>Textos de CTA</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <Label>CTA Principal</Label>
                                    <Input value={projectData.ctaMain} onChange={e => updateField('ctaMain', e.target.value)} />
                                </div>
                                <div>
                                    <Label>CTA Urgência</Label>
                                    <Input value={projectData.ctaUrgency} onChange={e => updateField('ctaUrgency', e.target.value)} />
                                </div>
                                <div>
                                    <Label>CTA Emocional</Label>
                                    <Textarea value={projectData.ctaEmotional} onChange={e => updateField('ctaEmotional', e.target.value)} />
                                </div>
                                <div>
                                    <Label>CTA Final</Label>
                                    <Textarea value={projectData.ctaFinal} onChange={e => updateField('ctaFinal', e.target.value)} />
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                {/* SAVE BOTTOM */}
                <div className="flex justify-end pt-4">
                    <Button onClick={handleSave} disabled={saving} className="bg-gradient-to-r from-pink-600 to-rose-500 text-white font-bold shadow-lg px-8">
                        {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                        {saving ? 'Salvando...' : 'Salvar Todas as Alterações'}
                    </Button>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default AdminProjetoEditor;
