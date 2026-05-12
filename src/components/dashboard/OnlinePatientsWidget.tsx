import { useOnlinePatients } from "@v1/hooks/useOnlinePatients";
import { useEffect, useState } from "react";
import { supabase } from "@v1/integrations/supabase/client";
import { useAuth } from "@v1/lib/auth";
import { Badge } from "@v1/components/ui/badge";
import { Card, CardContent } from "@v1/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@v1/components/ui/tooltip";
import { UsersRound, Crown, MessageSquare } from "lucide-react";
import { Link } from "react-router-dom";

interface OnlinePatientsWidgetProps {
  variant?: "card" | "badge" | "inline";
  showPremiumTag?: boolean;
}

interface OnlinePatientInfo {
  user_id: string;
  full_name: string;
}

export default function OnlinePatientsWidget({ variant = "card", showPremiumTag = true }: OnlinePatientsWidgetProps) {
  const { onlineCount, onlineUsers, loading } = useOnlinePatients();
  const { user } = useAuth();
  const [onlinePatients, setOnlinePatients] = useState<OnlinePatientInfo[]>([]);

  // Resolve online user_ids to names (only my patients)
  useEffect(() => {
    if (!user || onlineUsers.length === 0) {
      setOnlinePatients([]);
      return;
    }
    const resolve = async () => {
      const onlineIds = onlineUsers.map(u => u.user_id);
      // Get only my patients
      const { data: links } = await supabase
        .from("nutritionist_patients")
        .select("patient_id")
        .eq("nutritionist_id", user.id)
        .eq("status", "active")
        .in("patient_id", onlineIds);
      
      if (!links?.length) { setOnlinePatients([]); return; }
      const patientIds = links.map(l => l.patient_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", patientIds);
      
      setOnlinePatients((profiles || []).map(p => ({ user_id: p.user_id, full_name: p.full_name || "Paciente" })));
    };
    resolve();
  }, [user, onlineUsers]);

  if (variant === "badge") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-xs font-semibold text-primary">{loading ? "..." : onlineCount}</span>
              <UsersRound className="w-3 h-3 text-primary" />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{onlineCount} paciente{onlineCount !== 1 ? "s" : ""} online agora</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (variant === "inline") {
    return (
      <div className="flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
        </span>
        <span className="text-sm font-medium">{loading ? "..." : onlineCount}</span>
        <span className="text-xs text-muted-foreground">online</span>
      </div>
    );
  }

  return (
    <Card className="glass-premium shadow-card border-primary/20 relative overflow-hidden shimmer-sweep">
      {showPremiumTag && (
        <div className="absolute top-2 right-2">
          <Badge variant="outline" className="text-[10px] gap-1 border-amber-400/50 text-amber-500">
            <Crown className="w-3 h-3" /> Premium
          </Badge>
        </div>
      )}
      <CardContent className="py-4 space-y-3">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <UsersRound className="w-6 h-6 text-primary" />
            </div>
            <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-background" />
            </span>
          </div>
          <div>
            <p className="text-3xl font-bold font-display text-primary">
              {loading ? "..." : onlinePatients.length}
            </p>
            <p className="text-xs text-muted-foreground">
              Paciente{onlinePatients.length !== 1 ? "s" : ""} online agora
            </p>
          </div>
        </div>

        {/* Online patient list with chat links */}
        {onlinePatients.length > 0 && (
          <div className="space-y-1.5 max-h-32 overflow-y-auto">
            {onlinePatients.slice(0, 5).map(p => (
              <Link
                key={p.user_id}
                to={`/v1/chat?with=${p.user_id}`}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-primary/10 transition-colors group"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
                <span className="text-xs font-medium truncate flex-1">{p.full_name}</span>
                <MessageSquare className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
              </Link>
            ))}
            {onlinePatients.length > 5 && (
              <Link to="/v1/chat" className="text-[10px] text-primary hover:underline pl-2.5">
                +{onlinePatients.length - 5} mais online →
              </Link>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
