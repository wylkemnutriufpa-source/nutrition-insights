import ShaderBackground from "@/components/ui/shader-background";

export function PageLoader() {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-black">
      <ShaderBackground />
      <div className="relative z-10 flex flex-col items-center gap-4">
        <p
          className="text-xs font-medium tracking-[0.3em] uppercase animate-pulse"
          style={{
            background: "linear-gradient(90deg, hsl(270 80% 70%), hsl(45 100% 60%))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Carregando
        </p>
      </div>
    </div>
  );
}

export default PageLoader;
