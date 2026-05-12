import { motion } from "framer-motion";
import { Compass, ChevronRight, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { useFeatureExplorer } from "@/hooks/useFeatureExplorer";

export default function ExplorerProgressWidget() {
  const { progress, level, exploredCount, totalFeatures, unexploredFeatures, loading } = useFeatureExplorer();

  if (loading) return null;

  const nextTip = unexploredFeatures[0];

  return (
    <Link to="/v1/user-guide">
      <Card className="group relative overflow-hidden hover:border-primary/40 transition-all cursor-pointer">
        {/* Shimmer */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
        
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
              <Compass className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold">Explorador</p>
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                  {level}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {exploredCount}/{totalFeatures} funcionalidades descobertas
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>

          {/* Progress bar */}
          <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              className="h-full rounded-full bg-gradient-to-r from-primary via-accent to-warning"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1.5 text-right font-medium">{progress}%</p>

          {/* Next suggestion */}
          {nextTip && (
            <div className="mt-2 flex items-center gap-2 p-2 rounded-lg bg-muted/50 border border-border">
              <Sparkles className="w-3.5 h-3.5 text-warning flex-shrink-0" />
              <p className="text-xs text-muted-foreground truncate">
                <span className="font-medium text-foreground">Próxima:</span> {nextTip.label}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
