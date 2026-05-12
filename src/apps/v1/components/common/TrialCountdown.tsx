import { useAuth } from "@v1/lib/auth";
import { useEffect, useState } from "react";
import { Clock, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function TrialCountdown() {
  const { subscription, isNutritionist, isPersonal, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [timeLeft, setTimeLeft] = useState("");

  const isTrial = subscription.is_trial && subscription.trial_end;
  const show = isTrial && (isNutritionist || isPersonal) && !isAdmin;

  useEffect(() => {
    if (!show || !subscription.trial_end) return;

    const calc = () => {
      const end = new Date(subscription.trial_end!).getTime();
      const now = Date.now();
      const diff = end - now;
      if (diff <= 0) {
        setTimeLeft("Expirado");
        return;
      }
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h ${mins}m`);
      } else {
        setTimeLeft(`${hours}h ${mins}m ${secs}s`);
      }
    };

    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [show, subscription.trial_end]);

  if (!show) return null;

  const end = new Date(subscription.trial_end!).getTime();
  const isUrgent = end - Date.now() < 86400000; // less than 1 day

  return (
    <button
      onClick={() => navigate("/v1/pricing")}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer hover:scale-105 ${
        isUrgent
          ? "bg-destructive/15 text-destructive border border-destructive/30 animate-pulse"
          : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
      }`}
    >
      <Clock className="w-3.5 h-3.5" />
      <span>Trial: {timeLeft}</span>
      <Crown className="w-3 h-3 ml-0.5" />
    </button>
  );
}
