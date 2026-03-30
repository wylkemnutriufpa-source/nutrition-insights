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
import { User, Lock, Save, Bell, BellOff, Trophy, Eye, Camera, Database, Download, Loader2, CreditCard, Crown, ExternalLink, Settings as SettingsIcon, UtensilsCrossed } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import AvatarPicker from "@/components/profile/AvatarPicker";
import ProtocolFitJourneyToggle from "@/components/admin/ProtocolFitJourneyToggle";
import { useTranslation } from "react-i18next";
import ExperienceModeSwitcher from "@/components/settings/ExperienceModeSwitcher";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

export default function Settings() {
  const { t } = useTranslation();
  const { minMode } = useExperienceMode();
  const { user, profile, refreshProfile, isNutritionist, isPersonal, subscription, checkSubscription } = useAuth();
  const navigate = useNavigate();
  const { permission, isSubscribed, isSupported, loading: pushLoading, subscribe, unsubscribe } = usePushNotifications();
  const [portalLoading, setPortalLoading] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile?.avatar_url || null);
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const [showInRanking, setShowInRanking] = useState(false);
  const [rankingNickname, setRankingNickname] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("show_in_ranking, ranking_nickname").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => {
        if (data) {
          setShowInRanking(data.show_in_ranking || false);
          setRankingNickname(data.ranking_nickname || "");
        }
      });
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingProfile(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, phone: phone || null })
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
              <Button type="submit" className="gradient-primary gap-2" disabled={savingProfile}>
                <Save className="w-4 h-4" />
                {savingProfile ? t("common.saving") : t("settings.saveProfile")}
              </Button>
            </form>
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

        {/* Database Backup - ADVANCED only */}
        {minMode("advanced") && <DatabaseBackupCard />}
      </motion.div>
    </DashboardLayout>
  );
}

function DatabaseBackupCard() {
  const [generating, setGenerating] = useState(false);

  const handleBackup = async () => {
    setGenerating(true);
    toast.info("Gerando backup SQL... isso pode levar alguns segundos.");

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

      const sql = await res.text();
      const blob = new Blob([sql], { type: "application/sql" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fitjourney_backup_${new Date().toISOString().slice(0, 10)}.sql`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Backup SQL gerado e baixado com sucesso!");
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
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Gere um arquivo SQL completo com toda a estrutura (schemas, tabelas) e registros da plataforma.
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
          {generating ? "Gerando backup..." : "Gerar Backup SQL"}
        </Button>
      </CardContent>
    </Card>
  );
}