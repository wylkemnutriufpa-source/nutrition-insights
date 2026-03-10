import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Users, Stethoscope, Plus, Loader2, Mail, User, Phone, Trash2, Edit, Check, X, Shield, Crown } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { updateProfessionalPlan } from '@/lib/adminServices';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import ProfessionalRankingBoard from '@/components/dashboard/ProfessionalRankingBoard';
import { DEFAULT_RECIPES, DEFAULT_DIET_TEMPLATES } from '@/utils/seedData';
import { Database, Download, RefreshCw } from 'lucide-react';

const PLAN_CONFIG = {
  basic: { label: 'Basic', color: 'bg-gray-100 text-gray-700', gradient: 'from-gray-400 to-gray-500' },
  pro: { label: 'PRO', color: 'bg-amber-100 text-amber-700', gradient: 'from-amber-400 to-orange-500' },
  trial: { label: 'Trial', color: 'bg-blue-100 text-blue-700', gradient: 'from-blue-400 to-indigo-500' }
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [professionals, setProfessionals] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState({
    totalProfessionals: 0,
    totalPatients: 0
  });

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '123456',
    planType: 'trial' // 🎯 NOVO: plano inicial
  });

  // Modal de plano
  const [planModal, setPlanModal] = useState({ open: false, prof: null });
  const [selectedPlan, setSelectedPlan] = useState('basic');
  const [planExpires, setPlanExpires] = useState('');
  const [savingPlan, setSavingPlan] = useState(false);

  const handleSavePlan = async () => {
    if (!planModal.prof) return;
    setSavingPlan(true);
    try {
      const { error } = await updateProfessionalPlan(
        planModal.prof.id,
        selectedPlan,
        planExpires || null
      );
      if (error) throw error;
      // Atualizar lista local
      setProfessionals(prev => prev.map(p =>
        p.id === planModal.prof.id ? { ...p, plan_type: selectedPlan } : p
      ));
      toast.success(`Plano de ${planModal.prof.name} alterado para ${PLAN_CONFIG[selectedPlan].label}`);
      setPlanModal({ open: false, prof: null });
    } catch (err) {
      toast.error('Erro ao atualizar plano');
    } finally {
      setSavingPlan(false);
    }
  };

  const openPlanModal = (prof) => {
    setSelectedPlan(prof.plan_type || 'basic');
    setPlanExpires('');
    setPlanModal({ open: true, prof });
  };

  useEffect(() => {
    // Verificar se é admin via profile (source of truth)
    if (profile?.role !== 'admin') {
      toast.error('Acesso negado');
      navigate('/');
      return;
    }

    loadData();
  }, [profile]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Buscar todos os profissionais
      const { data: professionalsData, error: profError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'professional')
        .order('created_at', { ascending: false });

      if (profError) {
        console.error('Error loading professionals:', profError);
      } else {
        setProfessionals(professionalsData || []);
      }

      // Contar pacientes
      const { count: patientsCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'patient');

      setStats({
        totalProfessionals: professionalsData?.length || 0,
        totalPatients: patientsCount || 0
      });

    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      password: '123456',
      planType: 'trial' // Reset para trial
    });
  };

  const handleCreateProfessional = async () => {
    if (!formData.name || !formData.email) {
      toast.error('Nome e email são obrigatórios');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setSaving(true);
    try {
      // 1. Criar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name,
            role: 'professional'
          }
        }
      });

      if (authError) {
        console.error('Auth error:', authError);
        if (authError.message.includes('already registered')) {
          toast.error('Este email já está cadastrado');
        } else {
          toast.error(authError.message || 'Erro ao criar usuário');
        }
        return;
      }

      // 2. Se o trigger não criou o profile, criar manualmente com plano selecionado
      if (authData.user) {
        // 🎯 Calcular data de expiração baseado no plano selecionado
        const planExpires = new Date();
        if (formData.planType === 'trial') {
          planExpires.setDate(planExpires.getDate() + 7); // 7 dias
        } else if (formData.planType === 'basic') {
          planExpires.setFullYear(planExpires.getFullYear() + 1); // 1 ano
        } else if (formData.planType === 'pro') {
          planExpires.setFullYear(planExpires.getFullYear() + 1); // 1 ano
        }

        // Verificar se o profile foi criado pelo trigger
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', formData.email)
          .single();

        if (!existingProfile) {
          // Criar profile manualmente
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: authData.user.id,
              auth_user_id: authData.user.id,
              email: formData.email,
              name: formData.name,
              phone: formData.phone || null,
              role: 'professional',
              status: 'active',
              plan_type: formData.planType, // 🎯 Plano selecionado
              plan_started_at: new Date().toISOString(),
              plan_expires_at: planExpires.toISOString()
            });

          if (profileError) {
            console.error('Profile error:', profileError);
          }
        } else {
          // Atualizar o profile existente
          await supabase
            .from('profiles')
            .update({
              auth_user_id: authData.user.id,
              phone: formData.phone || null,
              plan_type: formData.planType, // 🎯 Plano selecionado
              plan_started_at: new Date().toISOString(),
              plan_expires_at: planExpires.toISOString()
            })
            .eq('email', formData.email);
        }
      }

      const planLabel = PLAN_CONFIG[formData.planType]?.label || formData.planType;
      toast.success(`✅ Profissional ${formData.name} criado com sucesso!`);
      toast.info(`Plano: ${planLabel} | Senha: ${formData.password}`, { duration: 7000 });

      // 🎯 AUTO-LOGIN: Fazer login automático com o professional criado
      toast.loading('Fazendo login automático...', { id: 'auto-login' });

      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password
      });

      if (loginError) {
        toast.error('Erro ao fazer login automático. Faça login manualmente.', { id: 'auto-login' });
        console.error('Auto-login error:', loginError);
      } else {
        toast.success('Login automático realizado!', { id: 'auto-login' });
        // Aguardar um momento para o auth processar
        setTimeout(() => {
          navigate('/professional/dashboard');
        }, 1000);
      }

      setIsDialogOpen(false);
      resetForm();
      await loadData();

    } catch (error) {
      console.error('Error creating professional:', error);
      toast.error('Erro ao criar profissional');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProfessional = async (profId, profName) => {
    if (!window.confirm(`Tem certeza que deseja remover ${profName}?`)) {
      return;
    }

    try {
      // Apenas inativar o profissional
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'inactive' })
        .eq('id', profId);

      if (error) throw error;

      toast.success('Profissional removido');
      await loadData();
    } catch (error) {
      console.error('Error deleting professional:', error);
      toast.error('Erro ao remover profissional');
    }
  };

  const handleSeedData = async () => {
    setSaving(true);
    try {
      toast.loading('Semeando dados...', { id: 'seed-data' });

      // Seed Recipes
      const { error: recipesError } = await (supabase.from('recipes' as any) as any).upsert(
        DEFAULT_RECIPES.map(r => ({ ...r, nutritionist_id: user?.id }))
      );
      if (recipesError) {
        console.error('Error seeding recipes:', recipesError);
        await (supabase.from('recipes' as any) as any).insert(
          DEFAULT_RECIPES.map(r => ({ ...r, nutritionist_id: user?.id }))
        );
      }

      // Seed Diet Templates
      const { error: templatesError } = await (supabase.from('diet_templates' as any) as any).upsert(
        DEFAULT_DIET_TEMPLATES.map(t => ({ ...t }))
      );
      if (templatesError) {
        console.error('Error seeding templates:', templatesError);
        await (supabase.from('diet_templates' as any) as any).insert(
          DEFAULT_DIET_TEMPLATES.map(t => ({ ...t }))
        );
      }

      toast.success('Dados sistêmicos (Modelos e Receitas) semeados com sucesso!', { id: 'seed-data' });
      await loadData();
    } catch (err) {
      console.error('Error seeding data:', err);
      toast.error('Erro ao semear dados', { id: 'seed-data' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-purple-700" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div data-testid="admin-dashboard" className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-700 to-purple-600 rounded-lg p-6 text-white">
          <h2 className="text-2xl font-bold">Painel do Administrador</h2>
          <p className="text-purple-100 mt-1">Gerencie profissionais e configurações do sistema</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total de Profissionais</CardTitle>
              <div className="bg-teal-700 p-3 rounded-lg">
                <Stethoscope className="text-white" size={20} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{stats.totalProfessionals}</div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total de Pacientes</CardTitle>
              <div className="bg-green-600 p-3 rounded-lg">
                <Users className="text-white" size={20} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{stats.totalPatients}</div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer group" onClick={() => navigate('/admin/features')}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Controle de Features</CardTitle>
              <div className="bg-gradient-to-br from-violet-600 to-purple-700 p-3 rounded-lg group-hover:scale-110 transition-transform">
                <Shield className="text-white" size={20} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-bold text-violet-700 group-hover:underline">Gerenciar Funcionalidades →</div>
              <p className="text-xs text-gray-400 mt-0.5">Feature flags, PRO, IA, Em breve</p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-shadow cursor-pointer group" onClick={() => navigate('/admin/projetos')}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Editor de Projetos</CardTitle>
              <div className="bg-gradient-to-br from-pink-500 to-rose-600 p-3 rounded-lg group-hover:scale-110 transition-transform">
                <Shield className="text-white" size={20} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-bold text-rose-700 group-hover:underline">Gerenciar Programas →</div>
              <p className="text-xs text-gray-400 mt-0.5">Projeto Biquíni Branco, planos, regras</p>
            </CardContent>
          </Card>

          {/* 🎯 NOVO: Card de Manutenção / Seed de Dados */}
          <Card className="hover:shadow-lg transition-shadow bg-blue-50/50 border-blue-200 border-dashed">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-blue-800">Manutenção de Dados</CardTitle>
              <div className="bg-blue-600 p-3 rounded-lg">
                <Database className="text-white" size={20} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button
                  size="sm"
                  className="w-full bg-blue-700 hover:bg-blue-800 text-xs h-8"
                  onClick={handleSeedData}
                  disabled={saving}
                >
                  <RefreshCw size={14} className={`mr-2 ${saving ? 'animate-spin' : ''}`} />
                  Semear Modelos/Receitas
                </Button>
                <p className="text-[10px] text-blue-600 leading-tight">
                  Restaura o conteúdo padrão (Modelos de Dieta e Receitas) na sua conta de admin para visualização no sistema.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Profissionais */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Profissionais Cadastrados</CardTitle>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-purple-700 hover:bg-purple-800" onClick={resetForm}>
                  <Plus size={18} className="mr-2" />
                  Novo Profissional
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Cadastrar Profissional</DialogTitle>
                  <DialogDescription>
                    Crie uma conta para um novo nutricionista ou profissional de saúde
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="prof_name">Nome Completo *</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 text-gray-400" size={16} />
                      <Input
                        id="prof_name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Dr. João Silva"
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="prof_email">Email *</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 text-gray-400" size={16} />
                      <Input
                        id="prof_email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="profissional@email.com"
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="prof_phone">Telefone</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 text-gray-400" size={16} />
                      <Input
                        id="prof_phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="(11) 99999-9999"
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {/* 🎯 NOVO: Seletor de Plano Inicial */}
                  <div>
                    <Label htmlFor="prof_plan" className="flex items-center gap-2">
                      <Crown size={16} className="text-amber-500" />
                      Plano Inicial
                    </Label>
                    <Select
                      value={formData.planType}
                      onValueChange={(value) => setFormData({ ...formData, planType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="trial">
                          <div className="flex items-center gap-2">
                            <span>🎁 Trial (7 dias grátis)</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="basic">
                          <div className="flex items-center gap-2">
                            <span>📦 Basic (1 ano)</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="pro">
                          <div className="flex items-center gap-2">
                            <span>👑 PRO (1 ano)</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 mt-1">
                      {formData.planType === 'trial' && '✨ 7 dias para testar a plataforma'}
                      {formData.planType === 'basic' && '📦 Funcionalidades essenciais'}
                      {formData.planType === 'pro' && '👑 Todas as funcionalidades'}
                    </p>
                  </div>


                  <div>
                    <Label htmlFor="prof_password">Senha Inicial</Label>
                    <Input
                      id="prof_password"
                      type="text"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Senha inicial"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      O profissional poderá alterar a senha depois
                    </p>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                      className="flex-1"
                      disabled={saving}
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleCreateProfessional}
                      className="flex-1 bg-purple-700 hover:bg-purple-800"
                      disabled={saving}
                    >
                      {saving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Criando...
                        </>
                      ) : (
                        <>
                          <Plus className="mr-2" size={18} />
                          Criar Profissional
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {professionals.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Stethoscope className="mx-auto mb-4 text-gray-400" size={48} />
                <p>Nenhum profissional cadastrado</p>
                <Button
                  className="mt-4 bg-purple-700 hover:bg-purple-800"
                  onClick={() => setIsDialogOpen(true)}
                >
                  <Plus size={18} className="mr-2" />
                  Cadastrar primeiro profissional
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {professionals.map((prof) => {
                  const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(prof.name)}&background=0F766E&color=fff`;
                  const plan = PLAN_CONFIG[prof.plan_type] || PLAN_CONFIG.basic;
                  return (
                    <div
                      key={prof.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        <img src={avatar} alt={prof.name} className="w-12 h-12 rounded-full" />
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-gray-900">{prof.name}</p>
                            <Badge className={`${plan.color} border-0 text-[10px] px-1.5 py-0`}>
                              {prof.plan_type === 'pro' && <Crown className="h-2.5 w-2.5 mr-0.5" />}
                              {plan.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600">{prof.email}</p>
                          {prof.phone && (
                            <p className="text-xs text-gray-500">{prof.phone}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${prof.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                          }`}>
                          {prof.status === 'active' ? 'Ativo' : 'Inativo'}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-amber-700 border-amber-200 hover:bg-amber-50"
                          onClick={() => openPlanModal(prof)}
                          title="Alterar Plano"
                        >
                          <Crown size={14} className="mr-1" /> Plano
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDeleteProfessional(prof.id, prof.name)}
                        >
                          <Trash2 size={18} />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ========== RANKING DE PROFISSIONAIS ========== */}
        <ProfessionalRankingBoard />

        {/* ========== MODAL: ALTERAR PLANO ========== */}
        {planModal.prof && (
          <Dialog open={planModal.open} onOpenChange={(o) => {
            if (!o) {
              setPlanModal({ open: false, prof: null });
              setSelectedPlan('basic');
              setPlanExpires('');
            }
          }}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-amber-500" /> Plano do Profissional
                </DialogTitle>
                <DialogDescription>{planModal.prof.name}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Plano atual:</span>
                  <Badge className={`${PLAN_CONFIG[planModal.prof.plan_type || 'basic'].color} border-0`}>
                    {PLAN_CONFIG[planModal.prof.plan_type || 'basic'].label}
                  </Badge>
                </div>

                <div>
                  <Label>Novo Plano</Label>
                  <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Basic — Funcionalidades básicas</SelectItem>
                      <SelectItem value="pro">PRO — Acesso completo + IA</SelectItem>
                      <SelectItem value="trial">Trial — Teste com limitações</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {selectedPlan === 'trial' && (
                  <div>
                    <Label>Expira em (opcional)</Label>
                    <Input type="date" value={planExpires} onChange={e => setPlanExpires(e.target.value)} />
                    <p className="text-xs text-gray-400 mt-1">Padrão: 14 dias se vazio</p>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <Button variant="outline" className="flex-1" onClick={() => setPlanModal({ open: false, prof: null })}>Cancelar</Button>
                  <Button
                    className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:opacity-90"
                    onClick={handleSavePlan}
                    disabled={savingPlan}
                  >
                    {savingPlan ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                    Salvar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
