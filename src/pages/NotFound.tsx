import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft } from "lucide-react";
import { useEffect } from "react";

function getSafeHomePath(pathname: string) {
  if (pathname.startsWith("/~oauth/convite/")) return pathname;
  if (pathname.startsWith("/~oauth/intake/")) return pathname;
  if (pathname.startsWith("/~oauth/cadastro")) return `${pathname}${window.location.search}`;
  if (pathname.startsWith("/convite/")) return pathname;
  if (pathname.startsWith("/intake/")) return pathname;
  if (pathname.startsWith("/cadastro")) return `${pathname}${window.location.search}`;
  return "/";
}

export default function NotFound() {
  const location = useLocation();
  const safeHomePath = getSafeHomePath(location.pathname);

  useEffect(() => {
    console.error(`[Router] 404 Not Found: ${location.pathname}`);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md"
      >
        <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <span className="text-5xl font-display font-bold text-primary">404</span>
        </div>
        <h1 className="font-display text-2xl font-bold mb-2">Página não encontrada</h1>
        <p className="text-muted-foreground mb-6">
          A página que você procura não existe ou foi movida.
          <br />
          <span className="text-xs opacity-50 font-mono">{location.pathname}</span>
        </p>
        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={() => window.history.back()} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Button>
          <Link to={safeHomePath}>
            <Button className="gradient-primary gap-2">
              <Home className="w-4 h-4" /> Ir ao Início
            </Button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
