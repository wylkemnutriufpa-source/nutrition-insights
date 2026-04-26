import { useState, useEffect } from "react";
import { useExperienceMode } from "@/hooks/useExperienceMode";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { User, Lock, Save, Bell, BellOff, Trophy, Eye, Camera, Database, Download, Loader2, CreditCard, Crown, ExternalLink, Settings as SettingsIcon, UtensilsCrossed, Globe, Calendar, Copy, Link2, CheckCircle2, AlertTriangle, ShieldCheck, RefreshCw } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import AvatarPicker from "@/components/profile/AvatarPicker";
import ProtocolFitJourneyToggle from "@/components/admin/ProtocolFitJourneyToggle";
import PixConfigManager from "@/components/admin/PixConfigManager";
import { useTranslation } from "react-i18next";
import ExperienceModeSwitcher from "@/components/settings/ExperienceModeSwitcher";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { clearRuntimeCaches, forceHardReload } from "@/lib/pwaUpdate";

function MarmitaSettingsCard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    default_practical_instructions: "",
    default_fast_instructions: "",
  });

  useEffect(() => {
    if (!user) return;
    supabase.from("marmita_generation_settings").select("*").eq("nutritionist_id", user.id).maybeSingle()
      .then(({ data }) => {
        if (data) {
          setSettings({
            default_practical_instructions: data.default_practical_instructions || "",
            default_fast_instructions: data.default_fast_instructions || "",
          });
        }
        setLoading(false);
      });
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("marmita_generation_settings")
      .upsert({ 
        nutritionist_id: user.id,
        ...settings,
        updated_at: new Date().toISOString()
      }, { onConflict: 'nutritionist_id' });
    
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar configurações: " + error.message);
    } else {
      toast.success("Configurações de marmitas atualizadas!");
    }
  };

  if (loading) return null;

  return (
    <Card className="shadow-card border-primary/20">
      <CardHeader>
        <CardTitle className="font-display flex items-center gap-2 text-base">
          <UtensilsCrossed className="w-5 h-5 text-primary" /> Configurações de Marmitas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs">Instruções Práticas Padrão</Label>
          <Input 
            value={settings.default_practical_instructions} 
            onChange={e => setSettings({ ...settings, default_practical_instructions: e.target.value })}
            placeholder="Ex: ⏱️ Prática: Aqueça por 3-5 min no micro-ondas."
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Instruções Modo Rápido</Label>
          <Input 
            value={settings.default_fast_instructions} 
            onChange={e => setSettings({ ...settings, default_fast_instructions: e.target.value })}
            placeholder="Ex: ⚡ MODO RÁPIDO: Aqueça por apenas 2-3 min."
          />
        </div>
        <Button onClick={handleSave} disabled={saving} className="w-full gap-2 gradient-primary">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Salvar Configurações
        </Button>
      </CardContent>
    </Card>
  );
}

export default function Settings() {
  const { t } = useTranslation();
  const { minMode } = useExperienceMode();
  const { user, profile, refreshProfile, isNutritionist, isPersonal, isAdmin, subscription, checkSubscription } = useAuth();
  const navigate = useNavigate();
  const { permission, isSubscribed, isSupported, loading: pushLoading, subscribe, unsubscribe } = usePushNotifications();
  const [portalLoading, setPortalLoading] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [whatsapp, setWhatsapp] = useState(profile?.whatsapp || "");
  const [whatsappError, setWhatsappError] = useState("");

  const formatInternationalWhatsApp = (val: string) => {
    const digits = val.replace(/\D/g, "");
    if (!digits) return "";
    if (val.startsWith("+")) return val.replace(/\s/g, "");
    if (digits.length >= 10 && digits.length <= 11) return `+55${digits}`;
    return `+${digits}`;
  };

  const validateWhatsApp = (val: string) => {
    if (!val) {
      setWhatsappError(""); // Optional in settings
      return true;
    }
    const digits = val.replace(/\D/g, "");
    if (digits.length < 7 || digits.length > 15) {
      setWhatsappError("Número inválido");
      return false;
    }
    const isBrazil = !val.startsWith("+") || val.startsWith("+55") || digits.startsWith("55");
    if (isBrazil) {
      const brDigits = digits.startsWith("55") ? digits.slice(2) : digits;
      if (brDigits.length < 10 || brDigits.length > 11) {
        setWhatsappError("Número brasileiro deve ter 10 ou 11 dígitos");
        return false;
      }
    }
    setWhatsappError("");
    return true;
  };
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile?.avatar_url || null);
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const [showInRanking, setShowInRanking] = useState(false);
  const [rankingNickname, setRankingNickname] = useState("");
  const [hasOwnMealPlan, setHasOwnMealPlan] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("show_in_ranking, ranking_nickname").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => {
        if (data) {
          setShowInRanking(data.show_in_ranking || false);
          setRankingNickname(data.ranking_nickname || "");
        }
      });
    // Check if professional also has a meal plan as patient
    if (isNutritionist || isPersonal) {
      supabase.from("meal_plans").select("id").eq("patient_id", user.id).eq("is_active", true).limit(1)
        .then(({ data }) => { setHasOwnMealPlan(!!data?.length); });
    }
  }, [user, isNutritionist, isPersonal]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    if (!validateWhatsApp(whatsapp)) {
      toast.error("Por favor, corrija o número de WhatsApp");
      return;
    }

    setSavingProfile(true);
    const formattedWhatsapp = whatsapp ? formatInternationalWhatsApp(whatsapp) : null;
    
    const { error } = await supabase
      .from("profiles")
      .update({ 
        full_name: fullName, 
        phone: phone || null, 
        whatsapp: formattedWhatsapp 
      })
      .eq("user_id", user.id);
    setSavingProfile(false);
    if (error) {
      toast.error(t("settings.saveError") + error.message);
    } else {
      toast.success(t("settings.profileUpdated"));
      refreshProfile();
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error(t("settings.passwordsMismatch"));
      return;
    }
    if (newPassword.length < 6) {
      toast.error(t("settings.passwordTooShort"));
      return;
    }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);
    if (error) {
      toast.error(t("common.error") + ": " + error.message);
    } else {
      toast.success(t("settings.passwordChanged"));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto space-y-6"
      >
        <div>
          <h1 className="font-display text-2xl font-bold">{t("settings.title")}</h1>
          <p className="text-muted-foreground text-sm">{t("settings.subtitle")}</p>
        </div>

        {/* Marmita Mode — only for patients or professionals editing their profile as patient */}
        {(!isNutritionist && !isPersonal) && (
          <Card className="shadow-card border-primary/20">
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <UtensilsCrossed className="w-5 h-5 text-primary" /> Modo Paciente Marmita
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
                <div className="flex-1 mr-4">
                  <p className="font-medium text-sm">Preferência por Marmitas</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Receba planos alimentares baseados em receitas de marmitas cadastradas para facilitar sua rotina.
                  </p>
                </div>
                <Switch
                  checked={profile?.marmita_mode || false}
                  onCheckedChange={async (v) => {
                    const { error } = await supabase.from("profiles").update({ marmita_mode: v } as any).eq("user_id", user!.id);
                    if (error) {
                      toast.error("Erro ao atualizar preferência");
                    } else {
                      toast.success("Preferência de marmitas atualizada!");
                      refreshProfile();
                    }
                  }}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Experience Mode */}
        <ExperienceModeSwitcher />

        {/* Minha Assinatura — only for professionals */}
        {(isNutritionist || isPersonal) && (
          <Card className="shadow-card border-primary/20">
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" /> Minha Assinatura
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    subscription.subscribed ? "bg-green-500/15" : subscription.is_trial ? "bg-amber-500/15" : "bg-red-500/15"
                  }`}>
                    <Crown className={`w-5 h-5 ${
                      subscription.subscribed ? "text-green-500" : subscription.is_trial ? "text-amber-500" : "text-red-500"
                    }`} />
                  </div>
                  <div>
                    <p className="font-medium text-sm">
                      {subscription.subscribed
                        ? `Plano ${subscription.subscription_tier || "Ativo"}`
                        : subscription.is_trial ? "Período de Teste" : "Sem assinatura ativa"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {subscription.is_trial && subscription.trial_end
                        ? `Trial termina em ${new Date(subscription.trial_end).toLocaleDateString("pt-BR")}`
                        : subscription.subscription_end
                          ? `Próxima cobrança: ${new Date(subscription.subscription_end).toLocaleDateString("pt-BR")}`
                          : "Assine para desbloquear todas as funcionalidades"}
                    </p>
                  </div>
                </div>
                <Badge variant={subscription.subscribed ? "default" : subscription.is_trial ? "secondary" : "destructive"}>
                  {subscription.subscribed ? "Ativo" : subscription.is_trial ? "Trial" : "Inativo"}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-3">
                {subscription.subscribed ? (
                  <Button variant="outline" className="gap-2" disabled={portalLoading}
                    onClick={async () => {
                      setPortalLoading(true);
                      try {
                        const { data, error } = await supabase.functions.invoke("customer-portal");
                        if (error) throw error;
                        if (data?.url) window.open(data.url, "_blank");
                      } catch (err: any) {
                        toast.error("Erro ao abrir portal: " + (err?.message || "Tente novamente"));
                      } finally { setPortalLoading(false); }
                    }}>
                    {portalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <SettingsIcon className="w-4 h-4" />}
                    Gerenciar Assinatura <ExternalLink className="w-3 h-3" />
                  </Button>
                ) : (
                  <Button className="gap-2 gradient-primary shadow-glow" onClick={() => navigate("/pricing")}>
                    <Crown className="w-4 h-4" /> Ver Planos e Assinar
                  </Button>
                )}
                <Button variant="ghost" size="sm" className="gap-1 text-xs"
                  onClick={() => { checkSubscription(); toast.success("Status atualizado!"); }}>
                  Atualizar status
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Minha Dieta — for professionals who also have a meal plan */}
        {(isNutritionist || isPersonal) && hasOwnMealPlan && (
          <Card className="shadow-card border-violet-500/20">
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <UtensilsCrossed className="w-5 h-5 text-violet-500" /> Minha Dieta
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                Você possui um plano alimentar ativo como paciente. Acesse para visualizar suas refeições.
              </p>
              <Button variant="outline" className="gap-2 border-violet-500/30 hover:bg-violet-500/10" onClick={() => navigate("/my-diet")}>
                <UtensilsCrossed className="w-4 h-4" /> Ver Minha Dieta
              </Button>
            </CardContent>
          </Card>
        )}

        {/* PIX Config Manager — only for professionals */}
        {(isNutritionist || isPersonal) && <PixConfigManager />}

        {/* Marmita Settings — only for professionals */}
        {(isNutritionist || isPersonal) && <MarmitaSettingsCard />}

        {/* Agenda Pública */}
        {(isNutritionist || isPersonal) && <PublicAgendaCard />}

        {/* Profile */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <User className="w-5 h-5 text-primary" /> {t("settings.profile")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AvatarPicker
              currentUrl={avatarUrl}
              onUpdate={(url) => {
                setAvatarUrl(url);
                refreshProfile();
              }}
            />
            <Separator className="my-4" />
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <Label>{t("common.email")}</Label>
                <Input value={user?.email || ""} disabled className="bg-muted" />
              </div>
              <div>
                <Label>{t("settings.fullName")}</Label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={t("settings.yourName")}
                  required
                />
              </div>
              <div>
                <Label>{t("common.phone")}</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                />
              </div>
              <div>
                <Label className="flex justify-between items-center">
                  <span>WhatsApp</span>
                  {whatsappError && <span className="text-[10px] text-destructive animate-pulse">{whatsappError}</span>}
                </Label>
                <Input
                  value={whatsapp}
                  onChange={(e) => {
                    setWhatsapp(e.target.value);
                    validateWhatsApp(e.target.value);
                  }}
                  onBlur={() => validateWhatsApp(whatsapp)}
                  placeholder="(11) 99999-9999 ou +55..."
                  className={whatsappError ? "border-destructive focus-visible:ring-destructive" : ""}
                />
              </div>
              <Button type="submit" className="gradient-primary gap-2" disabled={savingProfile}>
                <Save className="w-4 h-4" />
                {savingProfile ? t("common.saving") : t("settings.saveProfile")}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Cache Management */}
        <Card className="shadow-card border-amber-500/20 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2 text-amber-600">
              <RefreshCw className="w-5 h-5" /> Suporte e Cache
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Se você notar que as informações do seu plano demoram a atualizar, você pode limpar o cache do aplicativo para forçar a sincronização imediata.
            </p>
            <Button 
              variant="outline" 
              className="w-full gap-2 border-amber-500/30 text-amber-700 hover:bg-amber-500/10"
              onClick={async () => {
                await clearRuntimeCaches();
                toast.success("Cache limpo! Recarregando...");
                setTimeout(() => forceHardReload(), 1000);
              }}
            >
              <RefreshCw className="w-4 h-4" /> Limpar Cache e Atualizar
            </Button>
            <p className="text-[10px] text-muted-foreground text-center">
              Recomendado se o seu profissional fez alterações recentes e elas ainda não apareceram.
            </p>
          </CardContent>
        </Card>

        {/* Ranking Privacy — PRO+ */}
        {minMode("pro") && (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" /> {t("settings.rankingPrivacy")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
              <div>
                <p className="font-medium text-sm">{t("settings.showInRanking")}</p>
                <p className="text-xs text-muted-foreground">{t("settings.showInRankingDesc")}</p>
              </div>
              <Switch
                checked={showInRanking}
                onCheckedChange={async (v) => {
                  setShowInRanking(v);
                  await supabase.from("profiles").update({ show_in_ranking: v }).eq("user_id", user!.id);
                  toast.success(v ? t("settings.visibleInRanking") : t("settings.hiddenFromRanking"));
                }}
              />
            </div>
            <div>
              <Label>{t("settings.rankingNickname")}</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={rankingNickname}
                  onChange={(e) => setRankingNickname(e.target.value)}
                  placeholder={t("settings.nicknamePlaceholder")}
                  maxLength={20}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    await supabase.from("profiles").update({ ranking_nickname: rankingNickname }).eq("user_id", user!.id);
                    toast.success(t("settings.nicknameUpdated"));
                  }}
                >
                  <Save className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {t("settings.nicknameHint", { initial: fullName ? fullName[0] : 'P' })}
              </p>
            </div>
          </CardContent>
        </Card>
        )}

        {/* Change Password */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" /> {t("settings.changePassword")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <Label>{t("settings.newPassword")}</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={t("settings.minChars")}
                  minLength={6}
                  required
                />
              </div>
              <div>
                <Label>{t("settings.confirmPassword")}</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t("settings.repeatPassword")}
                  required
                />
              </div>
              <Button type="submit" variant="outline" className="gap-2" disabled={changingPassword}>
                <Lock className="w-4 h-4" />
                {changingPassword ? t("settings.changingPassword") : t("settings.changePassword")}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Push Notifications */}
        {isSupported && (
          <Card className="glass border-border">
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" /> {t("settings.pushNotifications")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/30">
                <div>
                  <p className="font-medium text-sm">{t("settings.pushNotifications")}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {permission === "denied"
                      ? t("settings.pushBlocked")
                      : isSubscribed
                      ? t("settings.pushEnabled")
                      : t("settings.pushDescription")}
                  </p>
                </div>
                {permission !== "denied" ? (
                  <Button
                    variant={isSubscribed ? "outline" : "default"}
                    className={isSubscribed ? "" : "gradient-primary shadow-glow"}
                    onClick={isSubscribed ? unsubscribe : subscribe}
                    disabled={pushLoading}
                    size="sm"
                  >
                    {isSubscribed ? <BellOff className="w-4 h-4 mr-1" /> : <Bell className="w-4 h-4 mr-1" />}
                    {pushLoading ? "..." : isSubscribed ? t("settings.deactivate") : t("settings.activate")}
                  </Button>
                ) : (
                  <span className="text-xs text-destructive font-medium">{t("settings.blocked")}</span>
                )}
              </div>
              {permission === "denied" && (
                <p className="text-xs text-muted-foreground">
                  {t("settings.pushBlockedHint")}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Protocol FitJourney - PRO+ */}
        {minMode("pro") && <ProtocolFitJourneyToggle />}

        {/* Database Backup - ADMIN only */}
        {isAdmin && minMode("advanced") && <DatabaseBackupCard />}
      </motion.div>
    </DashboardLayout>
  );
}

function PublicAgendaCard() {
  const { user } = useAuth();
  const [slug, setSlug] = useState<string | null>(null);
  const [bookingEnabled, setBookingEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("public_profile_settings").select("slug, booking_enabled, is_public").eq("nutritionist_id", user.id).maybeSingle()
      .then(({ data }) => {
        if (data) {
          setSlug(data.slug);
          setBookingEnabled(data.booking_enabled ?? false);
        }
        setLoading(false);
      });
  }, [user]);

  const copyLink = (url: string, label: string) => {
    navigator.clipboard.writeText(url);
    setCopied(label);
    toast.success(`Link "${label}" copiado!`);
    setTimeout(() => setCopied(null), 3000);
  };

  const origin = window.location.origin;
  const profileUrl = slug ? `${origin}/p/${slug}` : null;
  const agendaUrl = slug ? `${origin}/p/${slug}/agendar` : null;
  const patientPlansUrl = slug ? `${origin}/p/${slug}/paciente` : null;
  const proPlansUrl = slug ? `${origin}/p/${slug}/profissional` : null;

  if (loading) return null;

  if (!slug) {
    return (
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" /> Links Públicos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">Configure seu perfil público primeiro para gerar seus links.</p>
          <Button variant="outline" className="gap-2" onClick={() => window.location.href = "/my-public-profile"}>
            <Globe className="w-4 h-4" /> Configurar Perfil Público
          </Button>
        </CardContent>
      </Card>
    );
  }

  const links = [
    { label: "Perfil Público", url: profileUrl!, icon: Globe, desc: "Página do seu perfil para visitantes" },
    { label: "Agenda Pública", url: agendaUrl!, icon: Calendar, desc: "Link para pacientes agendarem consultas", enabled: bookingEnabled },
    { label: "Planos Pacientes", url: patientPlansUrl!, icon: CreditCard, desc: "Envie para pacientes escolherem o plano" },
    { label: "Planos Profissionais", url: proPlansUrl!, icon: Crown, desc: "Envie para profissionais escolherem o plano" },
  ];

  return (
    <Card className="shadow-card border-primary/20">
      <CardHeader>
        <CardTitle className="font-display flex items-center gap-2">
          <Link2 className="w-5 h-5 text-primary" /> Meus Links Públicos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {links.map((link) => {
          const Icon = link.icon;
          const isDisabled = link.enabled === false;
          return (
            <div key={link.label} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
              isDisabled ? "border-border/30 opacity-50" : "border-border/50 hover:border-primary/30"
            }`}>
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium flex items-center gap-2">
                    {link.label}
                    {isDisabled && <Badge variant="secondary" className="text-[9px]">Desativado</Badge>}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">{link.url}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  size="sm"
                  variant={copied === link.label ? "default" : "outline"}
                  className="h-7 gap-1 text-[10px] px-2"
                  onClick={() => copyLink(link.url, link.label)}
                  disabled={isDisabled}
                >
                  {copied === link.label ? <CheckCircle2 className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied === link.label ? "Copiado" : "Copiar"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0"
                  onClick={() => window.open(link.url, "_blank")}
                  disabled={isDisabled}
                >
                  <ExternalLink className="w-3 h-3" />
                </Button>
              </div>
            </div>
          );
        })}
        <p className="text-[10px] text-muted-foreground text-center pt-1">
          Gerencie as configurações do perfil em <button className="text-primary underline" onClick={() => window.location.href = "/my-public-profile"}>Meu Perfil Público</button>
        </p>
      </CardContent>
    </Card>
  );
}

function DatabaseBackupCard() {
  const [generating, setGenerating] = useState(false);
  const [lastReport, setLastReport] = useState<{
    stats: Record<string, number>;
    warnings: string[];
    complete: boolean;
  } | null>(null);

  const handleBackup = async () => {
    setGenerating(true);
    setLastReport(null);
    toast.info("Gerando backup SQL completo... isso pode levar alguns segundos.");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Você precisa estar logado.");
        return;
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const res = await fetch(
        `${supabaseUrl}/functions/v1/generate-sql-backup`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Erro desconhecido" }));
        throw new Error(err.error || "Falha ao gerar backup");
      }

      const result = await res.json();
      const { sql, stats, warnings, complete } = result;

      // Download the SQL file
      const blob = new Blob([sql], { type: "application/sql" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fitjourney_backup_${new Date().toISOString().slice(0, 10)}.sql`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setLastReport({ stats, warnings, complete });

      if (complete) {
        toast.success(`Backup completo gerado! ${stats.tables} tabelas, ${stats.policies} policies, ${stats.functions} funções.`);
      } else {
        toast.warning("Backup gerado com avisos — verifique o relatório abaixo.");
      }
    } catch (err: any) {
      console.error("Backup error:", err);
      toast.error("Erro ao gerar backup: " + (err.message || "Tente novamente."));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Card className="shadow-card border-primary/20">
      <CardHeader>
        <CardTitle className="font-display flex items-center gap-2">
          <Database className="w-5 h-5 text-primary" /> Backup do Banco de Dados
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Gere um dump SQL estruturalmente validado com: tabelas, tipos, constraints, indexes, funções, triggers, views, RLS policies e dados.
        </p>
        <p className="text-xs text-muted-foreground/70">
          ℹ️ O arquivo segue ordem segura de restauração (sem dependência de superusuário). Para restore real, importe em um projeto separado e valide com o checklist oficial.
        </p>
        <p className="text-xs text-muted-foreground/70">
          ⚠️ Não inclui: auth.users, storage objects, Vault secrets, configurações de projeto. Consulte o guia de restore completo.
        </p>
        <Button
          onClick={handleBackup}
          disabled={generating}
          className="gradient-primary gap-2 shadow-glow"
        >
          {generating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          {generating ? "Gerando backup completo..." : "Gerar Backup SQL"}
        </Button>

        {lastReport && (
          <div className={`rounded-lg border p-4 space-y-2 text-sm ${lastReport.complete ? "border-green-500/30 bg-green-500/5" : "border-yellow-500/30 bg-yellow-500/5"}`}>
            <div className="flex items-center gap-2 font-semibold">
              {lastReport.complete ? (
                <><ShieldCheck className="w-4 h-4 text-green-500" /> Dump Estruturalmente Completo ✅</>
              ) : (
                <><AlertTriangle className="w-4 h-4 text-yellow-500" /> Dump Incompleto ⚠️</>
              )}
            </div>
            <p className="text-xs text-muted-foreground italic">
              Validação estrutural — restore real requer importação em projeto separado.
            </p>
            <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
              <span>Tabelas: {lastReport.stats.tables}</span>
              <span>Types: {lastReport.stats.enums}</span>
              <span>Constraints: {lastReport.stats.constraints}</span>
              <span>Indexes: {lastReport.stats.indexes}</span>
              <span>Funções: {lastReport.stats.functions}</span>
              <span>Triggers: {lastReport.stats.triggers}</span>
              <span>Views: {lastReport.stats.views}</span>
              <span>Extensions: {lastReport.stats.extensions}</span>
              <span className="font-semibold text-foreground">RLS Tables: {lastReport.stats.rls_tables}</span>
              <span className="font-semibold text-foreground">RLS Policies: {lastReport.stats.policies}</span>
              <span>Tabelas c/ dados: {lastReport.stats.data_tables}</span>
            </div>
            {lastReport.warnings.length > 0 && (
              <div className="mt-2 space-y-1">
                {lastReport.warnings.map((w, i) => (
                  <p key={i} className="text-xs text-yellow-600">⚠️ {w}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}