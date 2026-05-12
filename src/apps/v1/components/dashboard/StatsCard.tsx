import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: number; label: string };
  gradient?: boolean;
  href?: string;
  onClick?: () => void;
}

export default function StatsCard({ title, value, subtitle, icon: Icon, trend, gradient, href, onClick }: StatsCardProps) {
  const navigate = useNavigate();
  const handleClick = () => {
    if (onClick) onClick();
    else if (href) navigate(href);
  };
  const isClickable = !!href || !!onClick;
  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
      className={`rounded-xl p-5 shadow-card shimmer-sweep transition-all duration-300 ${
        gradient
          ? "gradient-primary text-primary-foreground shadow-glow"
          : "glass-premium metric-glow"
      } ${isClickable ? "cursor-pointer" : ""}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className={`text-xs font-medium ${gradient ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
            {title}
          </p>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
            className="font-display font-bold text-2xl mt-1 counter-animate"
          >
            {value}
          </motion.p>
          {subtitle && (
            <p className={`text-xs mt-0.5 ${gradient ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
              {subtitle}
            </p>
          )}
          {trend && (
            <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${
              trend.value >= 0 ? "text-success" : "text-destructive"
            }`}>
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: "spring" }}
                className="inline-flex items-center gap-0.5"
              >
                {trend.value >= 0 ? "↑" : "↓"} {Math.abs(trend.value)}%
              </motion.span>
              <span className={gradient ? "text-primary-foreground/50" : "text-muted-foreground"}>{trend.label}</span>
            </div>
          )}
        </div>
        <motion.div
          whileHover={{ rotate: 8 }}
          className={`w-11 h-11 rounded-xl flex items-center justify-center ${
            gradient ? "bg-primary-foreground/20" : "bg-primary/10"
          }`}
        >
          <Icon className={`w-5 h-5 ${gradient ? "text-primary-foreground" : "text-primary"}`} />
        </motion.div>
      </div>
    </motion.div>
  );
}
