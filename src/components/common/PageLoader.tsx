import ShaderBackground from "@/components/ui/shader-background";
import { motion } from "framer-motion";
import { Brain } from "lucide-react";

export function PageLoader() {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-black">
      <ShaderBackground />
      <div className="relative z-10 flex flex-col items-center">
        <motion.div
          animate={{ rotateY: [0, 360] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          style={{ perspective: 600 }}
        >
          <Brain className="w-10 h-10 text-primary drop-shadow-[0_0_16px_hsl(var(--primary)/0.5)]" />
        </motion.div>
      </div>
    </div>
  );
}

export default PageLoader;
