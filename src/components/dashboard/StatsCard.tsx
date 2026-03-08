import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: number; label: string };
  gradient?: boolean;
}

export default function StatsCard({ title, value, subtitle, icon: Icon, trend, gradient }: StatsCardProps) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className={`rounded-xl p-5 shadow-card ${gradient ? "gradient-primary text-primary-foreground" : "glass"}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className={`text-xs font-medium ${gradient ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
            {title}
          </p>
          <p className="font-display font-bold text-2xl mt-1">{value}</p>
          {subtitle && (
            <p className={`text-xs mt-0.5 ${gradient ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
              {subtitle}
            </p>
          )}
          {trend && (
            <div className={`flex items-center gap-1 mt-2 text-xs ${trend.value >= 0 ? "text-success" : "text-destructive"}`}>
              <span>{trend.value >= 0 ? "↑" : "↓"} {Math.abs(trend.value)}%</span>
              <span className={gradient ? "text-primary-foreground/50" : "text-muted-foreground"}>{trend.label}</span>
            </div>
          )}
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
          gradient ? "bg-primary-foreground/20" : "bg-primary/10"
        }`}>
          <Icon className={`w-5 h-5 ${gradient ? "text-primary-foreground" : "text-primary"}`} />
        </div>
      </div>
    </motion.div>
  );
}
