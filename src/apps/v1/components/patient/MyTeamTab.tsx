import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Users, MessageCircle, Dumbbell, UtensilsCrossed, Stethoscope, Brain, Sparkles } from "lucide-react";

const ROLE_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  nutritionist: { label: "Nutricionista", icon: UtensilsCrossed, color: "text-green-500" },
  trainer: { label: "Personal Trainer", icon: Dumbbell, color: "text-blue-500" },
  doctor: { label: "Médico", icon: Stethoscope, color: "text-red-500" },
  physiotherapist: { label: "Fisioterapeuta", icon: Brain, color: "text-purple-500" },
  psychologist: { label: "Psicólogo", icon: Brain, color: "text-pink-500" },
};

interface ProfessionalLink {
  id: string;
  professional_id: string;
  professional_role: string;
  link_status: string;
  created_at: string;
}

export default function MyTeamTab() {
  const { user } = useAuth();
  const [links, setLinks] = useState<ProfessionalLink[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("patient_professional_links")
        .select("*")
        .eq("patient_id", user.id)
        .eq("link_status", "active");

      const activeLinks = data || [];
      setLinks(activeLinks);

      if (activeLinks.length > 0) {
        const ids = activeLinks.map((l) => l.professional_id);
        const { data: profs } = await supabase.from("profiles").select("*").in("user_id", ids);
        const map: Record<string, any> = {};
        profs?.forEach((p) => { map[p.user_id] = p; });
        setProfiles(map);
      }
      setLoading(false);
    })();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <motion.div
          className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      </div>
    );
  }

  if (links.length === 0) {
    return (
      <div className="text-center py-16">
        <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
        <h3 className="text-lg font-semibold mb-1">Seu Time de Performance</h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          Quando profissionais vincularem você, eles aparecerão aqui. Seu time multidisciplinar em um só lugar.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Meu Time de Performance</h3>
        <Badge variant="outline" className="ml-auto">{links.length} profissionais</Badge>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {links.map((link, i) => {
          const profile = profiles[link.professional_id];
          const config = ROLE_CONFIG[link.professional_role] || ROLE_CONFIG.trainer;
          const Icon = config.icon;
          const initials = (profile?.full_name || "?")
            .split(" ")
            .map((n: string) => n[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();

          return (
            <motion.div
              key={link.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="border-primary/10 hover:border-primary/30 transition-all group">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <Avatar className="w-14 h-14 border-2 border-primary/20">
                        <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-card border-2 border-primary/20 flex items-center justify-center`}>
                        <Icon className={`w-3 h-3 ${config.color}`} />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{profile?.full_name || "Profissional"}</p>
                      <Badge variant="secondary" className="text-[10px] mt-0.5">
                        <Icon className="w-3 h-3 mr-1" />
                        {config.label}
                      </Badge>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Desde {new Date(link.created_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <Link to={`/chat?contact=${link.professional_id}`}>
                      <Button variant="ghost" size="icon" className="rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                        <MessageCircle className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
