import { motion } from "framer-motion";
import { ReactNode } from "react";

interface MetallicTitleProps {
  children: ReactNode;
  variant?: "default" | "gold";
  className?: string;
  as?: "h1" | "h2" | "h3";
}

const gradients = {
  default: "linear-gradient(180deg, hsl(220 25% 18%) 0%, hsl(220 15% 40%) 35%, hsl(220 20% 60%) 55%, hsl(220 10% 75%) 70%, hsl(220 15% 35%) 100%)",
  gold: "linear-gradient(180deg, #B8860B 0%, #FFD700 25%, #FFFACD 50%, #FFD700 75%, #B8860B 100%)",
};

const shadows = {
  default: "0 2px 4px rgba(0,0,0,0.15), 0 1px 0 rgba(255,255,255,0.1)",
  gold: "0 2px 8px rgba(255,215,0,0.3), 0 1px 0 rgba(255,250,205,0.2)",
};

export default function MetallicTitle({ children, variant = "default", className = "", as: Tag = "h1" }: MetallicTitleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Tag
        className={`font-display font-bold ${className}`}
        style={{
          background: gradients[variant],
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          filter: `drop-shadow(${shadows[variant]})`,
        }}
      >
        {children}
      </Tag>
    </motion.div>
  );
}
