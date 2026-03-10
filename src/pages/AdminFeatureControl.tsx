import React, { useState, useEffect, useCallback, useMemo } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Shield, Search, Zap, Bot, Lock, Eye, EyeOff, Users, Stethoscope,
  Loader2, CheckCircle2, XCircle, Clock, Sparkles, Filter,
  AlertTriangle, ToggleLeft, ChevronDown, ChevronUp, RefreshCw,
  Activity, Crown, Star, Layers
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth';
import {
  getAllFeaturesAdmin,
  updateFeatureFlag,
  invalidateFeatureFlagsCache,
} from '@/lib/adminServices';
import { supabase } from '@/integrations/supabase/client';
import {
  PLATFORM_FEATURES as LOCAL_FEATURES,
  FEATURE_CATEGORIES,
  CATEGORY_EMOJIS,
  CATEGORY_GRADIENTS
} from '@/constants/platformFeatureInventory';
import AutoBotTab from '@/components/AutoBotTab';

// ==================== CONSTANTES ====================

const STATUS_CONFIG = {
  active: { label: 'Ativo', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  disabled: { label: 'Desativado', color: 'bg-red-100 text-red-700', icon: XCircle },
  coming_soon: { label: 'Em breve', color: 'bg-amber-100 text-amber-700', icon: Clock }
};

const FILTER_OPTIONS = [
  { key: 'all', label: 'Todas', icon: Layers },
  { key: 'ai', label: 'IA', icon: Bot },
  { key: 'pro', label: 'PRO', icon: Crown },
  { key: 'coming_soon', label: 'Em breve', icon: Clock },
  { key: 'disabled', label: 'Desativadas', icon: XCircle }
];

// ==================== FEATURE CARD ====================

const FeatureCard = ({ feature, onUpdate, updating }) => {
  const [expanded, setExpanded] = useState(false);
  const isUpdating = updating === feature.id;

  // Determinar estado global baseado nas novas colunas
  const getStatus = () => {
    if (!feature.is_active) return 'disabled';
    if (feature.coming_soon) return 'coming_soon';
    return 'active';
  };

  const status = getStatus();
  const statusCfg = STATUS_CONFIG[status];
  const StatusIcon = statusCfg.icon;

  // Estados por perfil
  const profState = feature.professional_state || 'active';
  const patState = feature.patient_state || 'active';

  const handleToggle = async (field, value) => {
    await onUpdate(feature.id, { [field]: value });
  };

  // Atualizar estado por perfil (3 estados)
  const handleProfileState = async (profile, newState) => {
    const field = profile === 'professional' ? 'professional_state' : 'patient_state';
    // Também manter compatibilidade com boolean legado
    const legacyField = profile === 'professional' ? 'enabled_for_professional' : 'enabled_for_patient';
    const legacyValue = newState !== 'disabled';
    
    await onUpdate(feature.id, { 
      [field]: newState,
      [legacyField]: legacyValue
    });
  };

  const STATE_OPTIONS = [
    { value: 'active', label: 'Ativo', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', ringColor: 'ring-emerald-400' },
    { value: 'disabled', label: 'Desativado', icon: XCircle, color: 'text-red-600', bg: 'bg-red-50 border-red-200', ringColor: 'ring-red-400' },
    { value: 'coming_soon', label: 'Em breve', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', ringColor: 'ring-amber-400' }
  ];

  const getStateConfig = (state) => STATE_OPTIONS.find(o => o.value === state) || STATE_OPTIONS[0];

  return (
    <div className={`relative overflow-hidden rounded-2xl border transition-all duration-300 ${
      !feature.is_active
        ? 'border-red-200 bg-red-50/30 opacity-80'
        : feature.coming_soon
          ? 'border-amber-200 bg-amber-50/30'
          : 'border-gray-100 bg-white hover:shadow-lg hover:border-violet-200'
    }`}>
      {feature.is_active && !feature.coming_soon && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-400 to-teal-400" />
      )}
      {feature.coming_soon && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-400 to-orange-400" />
      )}

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Icon */}
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
              !feature.is_active
                ? 'bg-gray-200 text-gray-500'
                : 'bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-md'
            }`}>
              {feature.is_ai ? <Bot className="h-5 w-5" /> : <Zap className="h-5 w-5" />}
            </div>

            <div className="flex-1 min-w-0">
              {/* Name + Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-gray-900 text-sm truncate">{feature.name}</h3>
                <Badge className={`${statusCfg.color} border-0 text-[10px] px-1.5 py-0`}>
                  <StatusIcon className="h-3 w-3 mr-0.5" />{statusCfg.label}
                </Badge>
                {feature.is_ai && <Badge className="bg-purple-100 text-purple-700 border-0 text-[10px] px-1.5 py-0">IA</Badge>}
                {feature.is_pro && <Badge className="bg-gradient-to-r from-amber-400 to-orange-500 text-white border-0 text-[10px] px-1.5 py-0"><Crown className="h-2.5 w-2.5 mr-0.5" />PRO</Badge>}
              </div>
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{feature.description}</p>
              <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-400">
                <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">{feature.slug}</span>
                <span>{feature.category}</span>
              </div>
            </div>
          </div>

          {/* Main toggle + expand */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="flex flex-col items-center gap-0.5" title="Ativo/Inativo global">
              <Switch
                checked={feature.is_active}
                onCheckedChange={(v) => handleToggle('is_active', v)}
                disabled={isUpdating}
                className="data-[state=checked]:bg-emerald-500"
              />
              <span className="text-[9px] text-gray-400">Global</span>
            </div>
            <button onClick={() => setExpanded(!expanded)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
              {expanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
            </button>
          </div>
        </div>

        {/* Expanded controls — 3 ESTADOS POR PERFIL */}
        {expanded && (
          <div className="mt-4 pt-3 border-t border-gray-100 space-y-4">
            {/* Toggle global + Coming soon + PRO */}
            <div className="grid grid-cols-3 gap-3">
              <div className="flex items-center justify-between bg-gray-50 rounded-xl p-2.5">
                <div className="flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-gray-600" />
                  <span className="text-xs font-medium text-gray-800">Global</span>
                </div>
                <Switch
                  checked={feature.is_active}
                  onCheckedChange={(v) => handleToggle('is_active', v)}
                  disabled={isUpdating}
                  className="scale-90 data-[state=checked]:bg-emerald-500"
                />
              </div>
              <div className="flex items-center justify-between bg-amber-50 rounded-xl p-2.5">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-amber-600" />
                  <span className="text-xs font-medium text-amber-800">Em breve</span>
                </div>
                <Switch
                  checked={feature.coming_soon || false}
                  onCheckedChange={(v) => handleToggle('coming_soon', v)}
                  disabled={isUpdating}
                  className="scale-90 data-[state=checked]:bg-amber-500"
                />
              </div>
              <div className="flex items-center justify-between bg-orange-50 rounded-xl p-2.5">
                <div className="flex items-center gap-1.5">
                  <Crown className="h-3.5 w-3.5 text-orange-600" />
                  <span className="text-xs font-medium text-orange-800">PRO</span>
                </div>
                <Switch
                  checked={feature.is_pro || false}
                  onCheckedChange={(v) => handleToggle('is_pro', v)}
                  disabled={isUpdating}
                  className="scale-90 data-[state=checked]:bg-orange-500"
                />
              </div>
            </div>

            {/* ===== CONTROLE POR PERFIL (3 ESTADOS) ===== */}
            <div className="bg-gradient-to-r from-slate-50 to-gray-50 rounded-xl p-4 border border-gray-200">
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Users className="h-3.5 w-3.5" />
                Controle por Perfil
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* PROFESSIONAL */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Stethoscope className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-semibold text-blue-800">Profissional</span>
                  </div>
                  <div className="flex gap-1.5">
                    {STATE_OPTIONS.map(opt => {
                      const OptIcon = opt.icon;
                      const isSelected = profState === opt.value;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => handleProfileState('professional', opt.value)}
                          disabled={isUpdating}
                          className={`flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded-lg text-xs font-semibold transition-all border ${
                            isSelected 
                              ? `${opt.bg} ${opt.color} ring-2 ${opt.ringColor} shadow-sm` 
                              : 'border-gray-200 bg-white text-gray-400 hover:bg-gray-50'
                          } ${isUpdating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          <OptIcon className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* PATIENT */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4 text-teal-600" />
                    <span className="text-sm font-semibold text-teal-800">Paciente</span>
                  </div>
                  <div className="flex gap-1.5">
                    {STATE_OPTIONS.map(opt => {
                      const OptIcon = opt.icon;
                      const isSelected = patState === opt.value;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => handleProfileState('patient', opt.value)}
                          disabled={isUpdating}
                          className={`flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded-lg text-xs font-semibold transition-all border ${
                            isSelected 
                              ? `${opt.bg} ${opt.color} ring-2 ${opt.ringColor} shadow-sm` 
                              : 'border-gray-200 bg-white text-gray-400 hover:bg-gray-50'
                          } ${isUpdating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          <OptIcon className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ==================== INTEGRITY CHECKER (MELHORADO) ====================

const IntegrityPanel = ({ dbFeatures, onReload }) => {
  const [open, setOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const dbSlugs = new Set((dbFeatures || []).map(f => f.slug));
  const localSlugs = new Set(LOCAL_FEATURES.map(f => f.key));

  const missingInDB = LOCAL_FEATURES.filter(f => !dbSlugs.has(f.key));
  const extraInDB = (dbFeatures || []).filter(f => !localSlugs.has(f.slug));
  const totalDivergence = missingInDB.length + extraInDB.length;
  const isOk = totalDivergence === 0;

  const handleSyncCodeToDB = async () => {
    setSyncing(true);
    try {
      // Upsert: inserir no banco os slugs que existem no código mas não no banco
      for (const feat of missingInDB) {
        await supabase.from('platform_features').upsert({
          slug: feat.key,
          name: feat.label,
          description: feat.description || '',
          category: feat.category || 'Outros',
          is_ai: feat.is_ai || false,
          is_active: true,
          impact_level: feat.impactLevel || 'basic',
          route: feat.route || ''
        }, { onConflict: 'slug' });
      }
      toast.success(`${missingInDB.length} feature(s) sincronizada(s) com o banco`);
      if (onReload) onReload();
    } catch (err) {
      toast.error('Erro ao sincronizar');
    } finally {
      setSyncing(false);
    }
  };

  const handleHideExtra = async () => {
    setSyncing(true);
    try {
      const extraSlugs = extraInDB.map(f => f.slug);
      if (extraSlugs.length > 0) {
        await supabase.from('platform_features')
          .update({ is_visible: false })
          .in('slug', extraSlugs);
      }
      toast.success(`${extraSlugs.length} feature(s) marcada(s) como invisíveis`);
      if (onReload) onReload();
    } catch (err) {
      toast.error('Erro ao atualizar');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className={`rounded-2xl border p-4 ${isOk ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
      <button onClick={() => setOpen(!open)} className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          {isOk ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <AlertTriangle className="h-5 w-5 text-amber-600" />}
          <div className="text-left">
            <span className="font-bold text-sm block">
              {isOk ? 'Integridade OK' : `Divergência detectada (${totalDivergence} itens)`}
            </span>
            <span className="text-[11px] text-gray-500">
              {isOk
                ? `Banco e código sincronizados (${dbSlugs.size} features)`
                : 'Diferença entre features do código (inventário) e do banco (platform_features)'}
            </span>
          </div>
        </div>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {open && (
        <div className="mt-4 space-y-4">
          {/* Ações */}
          {!isOk && (
            <div className="flex gap-2 flex-wrap">
              {missingInDB.length > 0 && (
                <Button size="sm" onClick={handleSyncCodeToDB} disabled={syncing}
                  className="bg-blue-600 text-white hover:bg-blue-700 text-xs">
                  {syncing ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                  Sincronizar código → banco ({missingInDB.length})
                </Button>
              )}
              {extraInDB.length > 0 && (
                <Button size="sm" variant="outline" onClick={handleHideExtra} disabled={syncing}
                  className="border-amber-300 text-amber-700 text-xs">
                  Marcar extras como invisíveis ({extraInDB.length})
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={onReload} className="text-xs">
                <RefreshCw className="h-3 w-3 mr-1" /> Recarregar
              </Button>
            </div>
          )}

          {/* Apenas no código (faltando no banco) */}
          {missingInDB.length > 0 && (
            <div>
              <p className="font-semibold text-blue-700 mb-2 text-xs flex items-center gap-1">
                <Eye className="h-3.5 w-3.5" /> Apenas no código — faltam no banco ({missingInDB.length})
              </p>
              <div className="space-y-1">
                {missingInDB.map(f => (
                  <div key={f.key} className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-blue-100">
                    <span className="text-sm font-medium text-gray-800">{f.label}</span>
                    <span className="text-[10px] text-gray-400 font-mono">{f.key}</span>
                    <span className="text-[10px] text-gray-400 ml-auto">{f.category}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Apenas no banco (não no código) */}
          {extraInDB.length > 0 && (
            <div>
              <p className="font-semibold text-amber-700 mb-2 text-xs flex items-center gap-1">
                <EyeOff className="h-3.5 w-3.5" /> Apenas no banco — não estão no código ({extraInDB.length})
              </p>
              <div className="space-y-1">
                {extraInDB.map(f => (
                  <div key={f.slug} className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-amber-100">
                    <span className="text-sm font-medium text-gray-800">{f.name}</span>
                    <span className="text-[10px] text-gray-400 font-mono">{f.slug}</span>
                    <span className="text-[10px] text-gray-400 ml-auto">{f.category}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isOk && <p className="text-emerald-700 text-xs">Todos os {dbSlugs.size} slugs do banco correspondem ao código.</p>}
        </div>
      )}
    </div>
  );
};

// ==================== PÁGINA PRINCIPAL ====================

const AdminFeatureControl = () => {
  const { profile } = useAuth();
  const [features, setFeatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [expandedCats, setExpandedCats] = useState({});
  const [activeTab, setActiveTab] = useState('features'); // 'features' | 'autobot'

  const loadFeatures = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await getAllFeaturesAdmin();
      if (error) throw error;
      setFeatures(data);
    } catch (err) {
      toast.error('Erro ao carregar funcionalidades');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFeatures();
  }, [loadFeatures]);

  const handleUpdate = async (featureId, updates) => {
    setUpdating(featureId);
    try {
      const { error } = await updateFeatureFlag(featureId, updates);
      if (error) throw error;
      setFeatures(prev => prev.map(f => f.id === featureId ? { ...f, ...updates } : f));
      toast.success('Atualizado!');
    } catch (err) {
      toast.error('Erro ao atualizar');
    } finally {
      setUpdating(null);
    }
  };

  // Filtros e busca
  const filtered = useMemo(() => {
    let result = features;

    // Busca
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(f =>
        f.name.toLowerCase().includes(q) ||
        f.slug.toLowerCase().includes(q) ||
        f.description?.toLowerCase().includes(q) ||
        f.category?.toLowerCase().includes(q)
      );
    }

    // Filtro
    switch (activeFilter) {
      case 'ai': result = result.filter(f => f.is_ai); break;
      case 'pro': result = result.filter(f => f.is_pro); break;
      case 'coming_soon': result = result.filter(f => f.coming_soon); break;
      case 'disabled': result = result.filter(f => !f.is_active); break;
      default: break;
    }

    return result;
  }, [features, searchQuery, activeFilter]);

  // Agrupar por categoria
  const grouped = useMemo(() => {
    const groups = {};
    filtered.forEach(f => {
      const cat = f.category || 'Outros';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(f);
    });
    return groups;
  }, [filtered]);

  // Stats
  const stats = useMemo(() => ({
    total: features.length,
    active: features.filter(f => f.is_active).length,
    pro: features.filter(f => f.is_pro).length,
    ai: features.filter(f => f.is_ai).length,
    comingSoon: features.filter(f => f.coming_soon).length,
    disabled: features.filter(f => !f.is_active).length
  }), [features]);

  const toggleCategory = (cat) => {
    setExpandedCats(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6 pb-8">

        {/* ========== PREMIUM HEADER ========== */}
        <div className="relative overflow-hidden rounded-3xl shadow-2xl">
          <div className="bg-gradient-to-br from-slate-800 via-gray-900 to-slate-900 p-6 md:p-8 text-white relative">
            <div className="absolute top-0 right-0 w-72 h-72 bg-violet-500/10 rounded-full -translate-y-40 translate-x-40" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/10 rounded-full translate-y-24 -translate-x-24" />

            <div className="relative z-10">
              <span className="inline-block px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full text-xs font-bold mb-3">
                🔒 Painel Administrativo
              </span>
              <div className="flex items-center gap-4 mb-5">
                <div className="w-14 h-14 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl">
                  <Shield className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-black tracking-tight">Controle Global de Funcionalidades</h1>
                  <p className="text-white/60 text-sm">Ative, desative e controle todas as features da plataforma</p>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                {[
                  { icon: Layers, value: stats.total, label: 'Total', color: 'bg-white/10' },
                  { icon: CheckCircle2, value: stats.active, label: 'Ativas', color: 'bg-emerald-500/20' },
                  { icon: Crown, value: stats.pro, label: 'PRO', color: 'bg-amber-500/20' },
                  { icon: Bot, value: stats.ai, label: 'IA', color: 'bg-purple-500/20' },
                  { icon: Clock, value: stats.comingSoon, label: 'Em breve', color: 'bg-amber-500/20' },
                  { icon: XCircle, value: stats.disabled, label: 'Desativadas', color: 'bg-red-500/20' }
                ].map((s, i) => {
                  const SIcon = s.icon;
                  return (
                    <div key={i} className={`text-center ${s.color} backdrop-blur-sm rounded-xl p-2.5`}>
                      <SIcon className="h-4 w-4 mx-auto mb-1 text-white/80" />
                      <p className="text-lg font-black">{s.value}</p>
                      <p className="text-[10px] text-white/50">{s.label}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ========== TABS ========== */}
        <div className="flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('features')}
            className={`px-6 py-3 font-semibold text-sm transition-all relative ${
              activeTab === 'features'
                ? 'text-violet-700 bg-violet-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Funcionalidades
            </div>
            {activeTab === 'features' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-600" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('autobot')}
            className={`px-6 py-3 font-semibold text-sm transition-all relative ${
              activeTab === 'autobot'
                ? 'text-violet-700 bg-violet-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              AutoDiagnóstico
            </div>
            {activeTab === 'autobot' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-600" />
            )}
          </button>
        </div>

        {/* ========== CONTEÚDO DAS TABS ========== */}
        {activeTab === 'autobot' ? (
          <AutoBotTab />
        ) : (
          <>
            {/* ========== INTEGRITY CHECKER ========== */}
            <IntegrityPanel dbFeatures={features} onReload={loadFeatures} />

        {/* ========== SEARCH + FILTERS ========== */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por nome, slug, descrição..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10 rounded-xl"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {FILTER_OPTIONS.map(opt => {
              const FIcon = opt.icon;
              const isActive = activeFilter === opt.key;
              return (
                <button
                  key={opt.key}
                  onClick={() => setActiveFilter(isActive ? 'all' : opt.key)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all
                    ${isActive ? 'bg-violet-600 text-white shadow-lg' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  <FIcon className="h-3.5 w-3.5" />
                  {opt.label}
                </button>
              );
            })}
            <Button variant="outline" size="sm" onClick={() => { invalidateFeatureFlagsCache(); loadFeatures(); }} className="rounded-xl">
              <RefreshCw className="h-3.5 w-3.5 mr-1" /> Recarregar
            </Button>
          </div>
        </div>

        {/* ========== FEATURES POR CATEGORIA ========== */}
        {Object.entries(grouped).map(([category, items]) => {
          const emoji = CATEGORY_EMOJIS[category] || '📦';
          const gradient = CATEGORY_GRADIENTS[category] || 'from-gray-500 to-gray-600';
          const isExpanded = expandedCats[category] !== false; // default open

          return (
            <div key={category} className="space-y-2">
              <button
                onClick={() => toggleCategory(category)}
                className="flex items-center justify-between w-full group"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{emoji}</span>
                  <h3 className="font-bold text-gray-900">{category}</h3>
                  <Badge className="bg-gray-100 text-gray-600 border-0 text-[10px]">{items.length}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-400">
                    {items.filter(f => f.is_active).length} ativas / {items.filter(f => f.is_pro).length} PRO
                  </span>
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                </div>
              </button>

              {isExpanded && (
                <div className="space-y-2">
                  {items.map(feature => (
                    <FeatureCard
                      key={feature.id}
                      feature={feature}
                      onUpdate={handleUpdate}
                      updating={updating}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Empty state */}
        {filtered.length === 0 && (
          <Card className="border-dashed border-2 border-gray-200">
            <CardContent className="py-12 text-center">
              <Search className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Nenhuma funcionalidade encontrada</p>
              <p className="text-sm text-gray-400">Tente outro filtro ou busca</p>
            </CardContent>
          </Card>
        )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminFeatureControl;
